import { 
    CommandInteraction, 
    PermissionFlagsBits,
    Role,
  } from 'discord.js';
  import { createOrUpdateServerConfig } from '../../utils';
  import { formatBalanceNumber } from '../../utils';
  import { PublicKey } from '@solana/web3.js';
  
  export async function handleSetupCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }
  
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "You need Administrator permissions to use this command.",
        ephemeral: true,
      });
      return;
    }
    const guild = interaction.guild!;
  
    try {
      await interaction.deferReply({ ephemeral: true });
  
      const tokenAddress = interaction.options.getString("token_address", true);
      const requiredBalanceInput = interaction.options.getString(
        "required_balance",
        true
      );
      const roleToGrant = interaction.options.getRole("role_to_grant", true);
      const rpcUrl =
        interaction.options.getString("rpc_url") ||
        "https://api.mainnet-beta.solana.com";
      const tokenSymbol = interaction.options.getString("token_symbol");
      const tokenDecimalsInput = interaction.options.getInteger("token_decimals");
  
      try {
        new PublicKey(tokenAddress);
      } catch (e) {
        await interaction.editReply("Invalid Solana token address format.");
        return;
      }
      try {
        new URL(rpcUrl);
      } catch (e) {
        await interaction.editReply("Invalid RPC URL format.");
        return;
      }
      if (!(roleToGrant instanceof Role)) {
        await interaction.editReply("Invalid role selected.");
        return;
      }
      if (!guild.members.me) {
        console.error(
          "[Setup Command] Cannot check bot permissions: guild.members.me is null."
        );
        await interaction.editReply(
          "Internal error: Could not verify bot permissions."
        );
        return;
      }
      if (roleToGrant.managed || roleToGrant.id === guild.roles.everyone.id) {
        await interaction.editReply(
          "Cannot assign a managed or the @everyone role."
        );
        return;
      }
      if (
        !guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) ||
        (roleToGrant.position >= guild.members.me.roles.highest.position &&
          guild.ownerId !== interaction.client.user?.id)
      ) {
        await interaction.editReply(
          `The bot lacks permissions or has insufficient hierarchy to assign the role \`${roleToGrant.name}\`. Ensure the bot's role is higher than this role and has 'Manage Roles' permission.`
        );
        return;
      }
  
      let requiredBalanceNumber: number;
      try {
        requiredBalanceNumber = Number(requiredBalanceInput.replace(/,/g, ""));
        if (isNaN(requiredBalanceNumber) || requiredBalanceNumber < 0)
          throw new Error("Balance must be a non-negative number");
        if (requiredBalanceNumber > Number.MAX_SAFE_INTEGER)
          console.warn(
            `[Setup Command] [Precision Warning] Input required balance ${requiredBalanceNumber} exceeds MAX_SAFE_INTEGER.`
          );
      } catch (e) {
        await interaction.editReply(
          "Invalid required balance format. Please provide the raw token amount (e.g., 1000000)."
        );
        return;
      }
  
      const tokenDecimals =
        tokenDecimalsInput !== null && tokenDecimalsInput >= 0
          ? tokenDecimalsInput
          : null;
  
      const serverConfig = {
        server_id: guild.id,
        server_name: guild.name,
        token_address: tokenAddress,
        required_balance: requiredBalanceNumber.toString(),
        role_id: roleToGrant.id,
        rpc_url: rpcUrl,
        admin_user_id: interaction.user.id,
        token_symbol: tokenSymbol,
        token_decimals: tokenDecimals,
        setup_complete: true
      };
  
      const success = await createOrUpdateServerConfig(serverConfig);
  
      if (!success) {
        console.error(
          `[Setup Command] Database error saving config for guild ${guild.id}`
        );
        await interaction.editReply(
          "Failed to save server configuration to the database. Please try again later."
        );
        return;
      }
  
      const balanceDisplay = formatBalanceNumber(
        requiredBalanceNumber,
        tokenDecimals
      );
      const symbolDisplay = tokenSymbol ? ` ${tokenSymbol}` : " tokens";
      const decimalsDisplay =
        tokenDecimals !== null ? `\n- Token Decimals: ${tokenDecimals}` : "";
      await interaction.editReply(
        `✅ **Configuration updated successfully!**\n` +
        `- Token Address: \`${tokenAddress}\`\n` +
        `- Required Balance: \`${balanceDisplay}${symbolDisplay}\` (Raw: ${requiredBalanceNumber})\n` +
        `- Role Granted: ${roleToGrant} (\`${roleToGrant.name}\`)\n` +
        `- Solana RPC URL: \`${rpcUrl}\`${decimalsDisplay}\n\n` +
        `Members can now run \`/verify\` to get the role.`
      );
    } catch (setupError) {
      console.error(
        `[Setup Command] Unexpected error during setup for guild ${
          guild?.id || "unknown"
        }:`,
        setupError
      );
      if (interaction.isRepliable()) {
        try {
          const errorReplyOptions = {
            content:
              "An unexpected error occurred during setup. Please check the bot logs or contact support.",
            ephemeral: true,
          };
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(errorReplyOptions);
          } else {
            await interaction.reply(errorReplyOptions);
          }
        } catch (replyError) {
          console.error(
            "[Setup Command] Failed to send error reply to interaction:",
            replyError
          );
        }
      }
    }
  }