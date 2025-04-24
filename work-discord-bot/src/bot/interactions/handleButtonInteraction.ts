import { 
    ButtonInteraction, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
  } from 'discord.js';
  import crypto from 'crypto';
  import { CLIENT_URL, pendingVerifications } from '../../config';
  import { getServerConfig } from '../../utils';
  
  export async function handleButtonInteraction(interaction: ButtonInteraction) {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({
        content: "Error: Missing server context for this action.",
        ephemeral: true,
      });
      return;
    }
  
    const [action, userId, buttonGuildId] = interaction.customId.split(":");
  
    if (userId !== interaction.user.id) {
      await interaction.reply({
        content: "This button wasn't meant for you.",
        ephemeral: true,
      });
      return;
    }
    if (buttonGuildId !== interaction.guildId) {
      await interaction.reply({
        content: "This button belongs to a different server configuration.",
        ephemeral: true,
      });
      return;
    }
  
    if (action === "new_wallet" || action === "add_wallet") {
      await interaction.deferReply({ ephemeral: true });
  
      const serverConfig = await getServerConfig(interaction.guildId);
      if (!serverConfig) {
        await interaction.editReply(
          "Verification setup is missing or incomplete for this server."
        );
        return;
      }
  
      const verificationCode = crypto.randomBytes(32).toString("hex");
      const actionType = (action === "new_wallet" ? "new" : "add") as
        | "new"
        | "add";
  
      pendingVerifications.set(verificationCode, {
        userId,
        action: actionType,
        guildId: buttonGuildId,
      });
  
      const verificationLink = `${CLIENT_URL}/?code=${verificationCode}`;
  
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Connect Solana Wallet")
          .setStyle(ButtonStyle.Link)
          .setURL(verificationLink)
      );
  
      const actionText =
        actionType === "new" ? "Connect New Wallet" : "Add Another Wallet";
      await interaction.editReply({
        content: `**${actionText}**\nClick the button below to connect your Solana wallet via our secure site.\n\n⚠️ **This link is unique to you and will expire in 5 minutes.** Do not share it.`,
        components: [row],
      });
  
      setTimeout(() => {
        if (pendingVerifications.delete(verificationCode)) {
          console.log(
            `Verification code ${verificationCode.substring(
              0,
              6
            )}... expired for user ${userId}.`
          );
        }
      }, 5 * 60 * 1000);
    } else {
      console.warn(`Unknown button action received: ${action}`);
      await interaction.reply({
        content: "Unknown button action.",
        ephemeral: true,
      });
    }
}