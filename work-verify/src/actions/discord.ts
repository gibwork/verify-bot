"use server";

import { DISCORD_API_URL, ANNOUNCE_CHANNEL_ID, GUILD_ID } from "@/utils/config";

export const sendDiscordTipAnnounce = async ({
  receiverId,
  senderId,
  amount,
}: {
  senderId: string;
  receiverId: string;
  amount: number;
}) => {
  await fetch(`${DISCORD_API_URL}/send-channel-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `<@${senderId}> just sent **${amount} USDC** to <@${receiverId}>!`,
      channelId: ANNOUNCE_CHANNEL_ID,
      guildId: GUILD_ID,
    }),
  });
};

export const sendDiscordTipDirectMessage = async ({
  receiverId,
  senderId,
  amount,
  claimUrl,
}: {
  senderId: string;
  receiverId: string;
  amount: number;
  claimUrl: string;
}) => {
  const claimFinalUrl = `${claimUrl}/vault`;

  await fetch(`${DISCORD_API_URL}/send-direct-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: receiverId,
      message:
        `🎉 You just received **${amount} USDC** from <@${senderId}>!\n` +
        `👉 [Go to vault to claim it](${claimFinalUrl})`,
    }),
  });
};
