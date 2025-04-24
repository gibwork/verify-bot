import { Request, Response } from 'express';
import { client } from '../../config';
import { TextChannel, PermissionFlagsBits } from 'discord.js';

export async function handleSendChannelMessage(req: Request, res: Response) {
  const { message, channelId, guildId } = req.body;
  const logPrefix = `[API ChanMsg ${guildId}/${channelId}]`;
  console.log(`${logPrefix} Request received.`);

  if (!message || !channelId || !guildId) {
    console.log(`${logPrefix} Missing required fields.`);
    res.status(400).json({
      success: false,
      message: "Missing required fields (message, channelId, guildId).",
    });
    return;
  }

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.log(`${logPrefix} Guild ${guildId} not found.`);
      res.status(404).json({
        success: false,
        message: "Bot is not in the specified server.",
      });
      return;
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (channel?.isTextBased() && channel instanceof TextChannel) {
      if (!guild.members.me) {
        console.error(
          `${logPrefix} Cannot check permissions as guild.members.me is null.`
        );
        res.status(500).json({
          success: false,
          message: "Internal bot error checking permissions.",
        });
        return;
      }
      if (
        !channel
          .permissionsFor(guild.members.me)
          ?.has(PermissionFlagsBits.SendMessages)
      ) {
        console.error(`${logPrefix} Bot lacks SendMessages permission.`);
        res.status(403).json({
          success: false,
          message: "Bot lacks permission to send messages in this channel.",
        });
        return;
      }

      await channel.send(String(message)); // Ensure message is string
      console.log(`${logPrefix} Message sent successfully.`);
      res.status(200).json({
        success: true,
        message: "Message sent successfully!",
      });
      return;
    } else {
      console.log(`${logPrefix} Channel not found or not a text channel.`);
      res.status(404).json({
        success: false,
        message: "Channel not found or is not a valid text channel.",
      });
      return;
    }
  } catch (error) {
    console.error(`${logPrefix} API Error sending channel message:`, error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred while sending the message.",
    });
    return;
  }
}