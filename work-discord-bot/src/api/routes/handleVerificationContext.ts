import { Request, Response } from 'express';
import { pendingVerifications } from '../../config';
import { getServerConfig } from '../../utils';

export async function handleVerificationContext(req: Request, res: Response) {
  const verificationCode = req.query.code as string;
  const logPrefix = `[API Context ${verificationCode?.substring(0, 6)}...]`;
  console.log(`${logPrefix} Request received.`);

  if (!verificationCode) {
    console.log(`${logPrefix} Missing verification code`);
    res.status(400).json({
      success: false,
      message: "Missing verification code query parameter.",
    });
    return;
  }

  const verificationData = pendingVerifications.get(verificationCode);
  if (!verificationData) {
    console.log(`${logPrefix} Code not found or expired`);
    res.status(404).json({
      success: false,
      message:
        "Invalid or expired verification code. Please try /verify again.",
    });
    return;
  }
  const { guildId, userId, action } = verificationData;
  console.log(
    `${logPrefix} Found code for user ${userId}, guild ${guildId}, action ${action}`
  );

  const serverConfig = await getServerConfig(guildId);
  if (!serverConfig) {
    console.log(`[API Context] Server config not found for guild: ${guildId}`);
    res.status(404).json({
      success: false,
      message:
        "Server configuration not found or incomplete for this verification link. Please contact an admin.",
    });
    return;
  }
  console.log(`[API Context] Found server config for guild: ${guildId}`);

  res.status(200).json({
    success: true,
    message: "Verification context retrieved successfully.",
    context: {
      userId: userId,
      action: action,
      guildId: guildId,
      tokenAddress: serverConfig.token_address,
      requiredBalance: serverConfig.required_balance,
      tokenSymbol: serverConfig.token_symbol,
      tokenDecimals: serverConfig.token_decimals,
      serverName: serverConfig.server_name,
    },
  });
}