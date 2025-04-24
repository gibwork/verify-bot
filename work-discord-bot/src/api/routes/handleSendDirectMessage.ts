import { Request, Response } from 'express';
import { client } from '../../config';

export async function handleSendDirectMessage(req: Request, res: Response) {
  const { message, userId, guildId } = req.body;
  const logPrefix = `[API DMsg ${guildId}/${userId}]`;
  console.log(`${logPrefix} Request received.`);

  if (!message || !userId || !guildId) {
    console.log(`${logPrefix} Missing required fields.`);
    res.status(400).json({
      success: false,
      message: "Missing required fields (message, userId, guildId).",
    });
    return;
  }

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.log(`${logPrefix} Guild ${guildId} not found.`);
      res.status(404).json({
        success: false,
        message: "Bot is not in the specified server context for this request.",
      });
      return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);

    if (member) {
      try {
        await member.send(String(message)); // Ensure message is string
        console.log(`${logPrefix} DM sent successfully.`);
        res.status(200).json({
          success: true,
          message: "Direct message sent successfully!",
        });
        return;
      } catch (dmError: any) {
        console.error(`${logPrefix} API Error sending DM:`, dmError);
        if (dmError.code === 50007) {
          console.log(`${logPrefix} Cannot send DM (user settings or block).`);
          res.status(403).json({
            success: false,
            message:
              "Cannot send direct message to this user. They may have DMs disabled or have blocked the bot.",
          });
          return;
        } else {
          res.status(500).json({
            success: false,
            message:
              "An internal server error occurred while attempting to send the direct message.",
          });
          return;
        }
      }
    } else {
      console.log(`${logPrefix} User ${userId} not found in guild ${guildId}.`);
      res.status(404).json({
        success: false,
        message: "User not found in the specified server.",
      });
      return;
    }
  } catch (error) {
    console.error(
      `${logPrefix} API Error (outer scope) processing DM request:`,
      error
    );
    res.status(500).json({
      success: false,
      message: "An unexpected internal server error occurred.",
    });
    return;
  }
}