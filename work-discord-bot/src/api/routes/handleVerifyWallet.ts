import { Request, Response } from 'express';
import { client, pendingVerifications, supabase } from '../../config';
import { 
  getServerConfig, 
  verifySignature, 
  validateAuthTx, 
  checkTokenBalanceRawNumber, 
  checkAnyWalletHasSufficientBalanceNumber, 
  formatBalanceNumber,
  createOrUpdateHolder
} from '../../utils';
import { PermissionFlagsBits, GuildMember } from 'discord.js';

export async function handleVerifyWallet(req: Request, res: Response) {
  const { verificationCode, walletAddress, signature, message, isLedgerFlow } = req.body;
  const logPrefix = `[API Verify ${verificationCode?.substring(0, 6)}...]`;
  console.log(
    `${logPrefix} Request received for wallet ${walletAddress?.substring(
      0,
      6
    )}...`
  );

  if (!verificationCode || !walletAddress || !signature || !message) {
    console.log(`${logPrefix} Missing required fields.`);
    res.status(400).json({
      success: false,
      message:
        "Missing required fields (verificationCode, walletAddress, signature, message).",
    });
    return;
  }

  const verificationData = pendingVerifications.get(verificationCode);
  if (!verificationData) {
    console.log(`${logPrefix} Invalid or expired verification code.`);
    res.status(404).json({
      success: false,
      message:
        "Invalid or expired verification code. Please try /verify again.",
    });
    return;
  }

  pendingVerifications.delete(verificationCode);
  const { userId, action, guildId } = verificationData;
  console.log(
    `${logPrefix} Consumed code for user ${userId}, guild ${guildId}, action ${action}`
  );

  const serverConfig = await getServerConfig(guildId);
  if (!serverConfig) {
    console.log(`${logPrefix} Server config not found for guild ${guildId}`);
    res.status(404).json({
      success: false,
      message:
        "Server configuration associated with this verification link was not found or is incomplete.",
    });
    return;
  }

  const {
    token_address,
    required_balance: requiredBalanceStr,
    role_id,
    rpc_url,
    token_symbol,
    token_decimals,
  } = serverConfig;
  let requiredBalanceNum: number;
  try {
    requiredBalanceNum = Number(requiredBalanceStr);
    if (isNaN(requiredBalanceNum) || requiredBalanceNum < 0)
      throw new Error("Invalid balance in config");
  } catch {
    console.error(
      `${logPrefix} Invalid required_balance '${requiredBalanceStr}' in config for guild ${guildId}`
    );
    res.status(500).json({
      success: false,
      message: "Server configuration error (invalid balance requirement).",
    });
    return;
  }
  if (requiredBalanceNum > Number.MAX_SAFE_INTEGER)
    console.warn(
      `${logPrefix} [Precision Warning] Required balance ${requiredBalanceNum} for guild ${guildId} exceeds safe limits.`
    );

  let isSignatureValid = false;

  if (isLedgerFlow) {
    const expectedNonce = `Verify wallet ownership for Discord role: ${verificationCode}`;
    isSignatureValid = await validateAuthTx(signature, expectedNonce, walletAddress, rpc_url);
  } else {
    isSignatureValid = verifySignature(message, signature, walletAddress);
  }

  if (!isSignatureValid) {
    console.log(
      `${logPrefix} Signature verification failed for ${walletAddress}`
    );
    res.status(401).json({
      success: false,
      message: "Wallet signature verification failed.",
    });
    return;
  }
  console.log(`${logPrefix} Signature verified for ${walletAddress}`);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error(`${logPrefix} Guild ${guildId} not found in bot cache.`);
    res.status(500).json({
      success: false,
      message: "Internal error: Bot is not currently in the associated server.",
    });
    return;
  }

  const role = guild.roles.cache.get(role_id);
  if (!role) {
    console.error(
      `${logPrefix} Role ${role_id} not found in guild ${guildId}. Config needs update.`
    );
  } else if (!guild.members.me) {
    console.error(
      `${logPrefix} Cannot check role permissions as guild.members.me is null.`
    );
  } else if (
    !guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) ||
    (role.position >= guild.members.me.roles.highest.position &&
      guild.ownerId !== client.user?.id)
  ) {
    console.error(
      `${logPrefix} Bot lacks permission or hierarchy to manage role ${role_id} in guild ${guildId}.`
    );
  }

  let member: GuildMember | null = null;
  try {
    member = await guild.members.fetch(userId);
  } catch (err) {
    console.error(
      `${logPrefix} Failed to fetch member ${userId} in guild ${guildId}:`,
      err
    );
    res.status(404).json({
      success: false,
      message:
        "Could not find you in the Discord server. Have you left since starting verification?",
    });
    return;
  }
  if (!member) {
    console.error(
      `${logPrefix} Member ${userId} fetched as null in guild ${guildId}`
    );
    res.status(404).json({
      success: false,
      message: "Could not find your user account in the Discord server.",
    });
    return;
  }

  let finalAddresses: string[];
  try {
    const { data: existingUser, error: fetchError } = await supabase
      .from("holders")
      .select("addresses")
      .eq("discord_user_id", userId)
      .eq("server_id", guildId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (action === "new" || !existingUser || !existingUser.addresses) {
      finalAddresses = [walletAddress];
    } else {
      finalAddresses = [...new Set([...existingUser.addresses, walletAddress])];
    }

    const finalActiveStatus = await checkAnyWalletHasSufficientBalanceNumber(
      finalAddresses,
      token_address,
      requiredBalanceNum,
      rpc_url
    );

    const holderData = {
      discord_user_id: userId,
      server_id: guildId,
      username: member.user.username,
      addresses: finalAddresses,
      active: finalActiveStatus
    };

    const success = await createOrUpdateHolder(holderData);

    if (!success) throw new Error("Failed to update holder data");

    console.log(
      `${logPrefix} Upserted holder ${userId} for guild ${guildId}. Active: ${finalActiveStatus}`
    );

    let roleUpdated = false;
    let roleUpdateMessage = "";

    if (role) {
      try {
        const hasRole = member.roles.cache.has(role_id);
        if (finalActiveStatus && !hasRole) {
          await member.roles.add(role_id, "Verified token holder via bot");
          console.log(
            `${logPrefix} Added role ${role.name} (${role_id}) to ${member.user.tag}`
          );
          roleUpdated = true;
          roleUpdateMessage = "Role granted or confirmed.";
        } else if (!finalActiveStatus && hasRole) {
          await member.roles.remove(role_id, "Token balance below threshold");
          console.log(
            `${logPrefix} Removed role ${role.name} (${role_id}) from ${member.user.tag}`
          );
          roleUpdated = true;
          roleUpdateMessage = "Role removed due to insufficient balance.";
        } else if (finalActiveStatus && hasRole) {
          roleUpdateMessage = "Role confirmed.";
        } else {
          roleUpdateMessage = "Role not granted (insufficient balance).";
        }
      } catch (roleError: any) {
        console.error(
          `${logPrefix} Failed to update role ${role_id} for ${member.user.tag}:`,
          roleError
        );
        roleUpdateMessage =
          "Failed to update role due to a bot permission error.";
      }
    } else {
      roleUpdateMessage = "Configured role not found, cannot update roles.";
      console.warn(
        `${logPrefix} Role ${role_id} does not exist, skipping role update.`
      );
    }

    const walletDisplay = `${walletAddress.substring(
      0,
      4
    )}...${walletAddress.substring(walletAddress.length - 4)}`;

    if (finalActiveStatus) {
      res.status(200).json({
        success: true,
        message: `Wallet ${walletDisplay} verified successfully! ${roleUpdateMessage}`,
      });
      return;
    } else {
      const currentBalanceNum = await checkTokenBalanceRawNumber(
        walletAddress,
        token_address,
        rpc_url
      );
      const currentBalanceFormatted = formatBalanceNumber(
        currentBalanceNum,
        token_decimals
      );
      const requiredBalanceFormatted = formatBalanceNumber(
        requiredBalanceNum,
        token_decimals
      );
      const tokenSymbolDisplay = token_symbol
        ? ` ${token_symbol}`
        : ` token(s)`;

      let msg =
        `Wallet ${walletDisplay} linked, but it (or your combined wallets) currently holds insufficient balance. ` +
        `Required: ${requiredBalanceFormatted}${tokenSymbolDisplay}. This wallet balance: ${currentBalanceFormatted}${tokenSymbolDisplay}. ` +
        `${roleUpdateMessage}`;

      console.log(
        `${logPrefix} Insufficient balance for user ${userId}. ${msg}`
      );
      res.status(400).json({
        success: false,
        message: msg,
      });
      return;
    }
  } catch (dbError) {
    console.error(`${logPrefix} Database error during verification:`, dbError);
    res.status(500).json({
      success: false,
      message: "A database error occurred while saving wallet information.",
    });
    return;
  }
}