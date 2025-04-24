import { Interaction } from 'discord.js';
import { handleSetupCommand } from '../commands/handleSetupCommand';
import { handleEditConfigCommand } from '../commands/handleEditConfigCommand';
import { handleVerifyCommand } from '../commands/handleVerifyCommand';
import { handleTipCommand } from '../commands/handleTipCommand';

export async function handleCommandInteraction(interaction: Interaction) {
  if (!interaction.inGuild() || !interaction.guildId || !interaction.guild) {
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
    }
    return;
  }
  
  if (!interaction.isChatInputCommand()) {
    return;
  }

  switch (interaction.commandName) {
    case "server-setup":
      await handleSetupCommand(interaction);
      break;
    case "edit-config":
      await handleEditConfigCommand(interaction);
      break;
    case "verify":
      await handleVerifyCommand(interaction);
      break;
    case "tip":
      await handleTipCommand(interaction);
      break;
    default:
      console.warn(`Received unknown command: ${interaction.commandName}`);
      await interaction.reply({ content: "Unknown command.", ephemeral: true });
  }
}