import { Events, ActivityType, Routes } from 'discord.js';
import { client, rest, commands, DISCORD_TOKEN } from '../config';
import { handleCommandInteraction } from './interactions/handleCommandInteraction';
import { handleButtonInteraction } from './interactions/handleButtonInteraction';
import { checkAllBalances } from './balance';

export async function setupBot() {
  // Set up Client Ready event handler
  client.once(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    console.log(
      `Bot Invite Link: https://discord.com/api/oauth2/authorize?client_id=${c.user.id}&permissions=268437504&scope=bot%20applications.commands`
    );
    
    client.user?.setPresence({
      activities: [{ name: "for /verify & /tip", type: ActivityType.Watching }],
      status: "online",
    });
    
    try {
      console.log(
        `Started refreshing ${commands.length} application (/) commands globally.`
      );
      const data: any = await rest.put(Routes.applicationCommands(c.user.id), {
        body: commands,
      });
      console.log(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
      
      setInterval(checkAllBalances, 60 * 1000);
      checkAllBalances();
    } catch (error) {
      console.error("Error refreshing application commands:", error);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleCommandInteraction(interaction);
      } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
      }
    } catch (error) {
      console.error("Error handling interaction:", error);
      if (interaction.isRepliable()) {
        const replyOptions = {
          content: "An error occurred while processing your request.",
          ephemeral: true,
        };
        if (interaction.deferred || interaction.replied) {
          await interaction
            .editReply(replyOptions)
            .catch((e) => console.error("Failed to edit reply on error:", e));
        } else {
          await interaction
            .reply(replyOptions)
            .catch((e) => console.error("Failed to reply on error:", e));
        }
      }
    }
  });

  // Login and return the promise
  return client.login(DISCORD_TOKEN).catch((err) => {
    console.error("FATAL: Failed to login to Discord:", err);
    process.exit(1);
  });
}

export * from './commands';
export * from './interactions';