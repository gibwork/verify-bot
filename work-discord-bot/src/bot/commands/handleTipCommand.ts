import { 
  CommandInteraction, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { CLIENT_URL } from '../../config';

export async function handleTipCommand(interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const mentionedUser = interaction.options.getUser("user", true);
  const amount = interaction.options.getNumber("amount", true);

  if (mentionedUser.bot) {
    await interaction.reply({
      content: "You cannot tip bots.",
      ephemeral: true,
    });
    return;
  }
  if (mentionedUser.id === interaction.user.id) {
    await interaction.reply({
      content: "You cannot tip yourself.",
      ephemeral: true,
    });
    return;
  }

  const receiverUsername = mentionedUser.globalName || mentionedUser.username;
  const displayUsername = mentionedUser.globalName
    ? `@${mentionedUser.globalName}`
    : mentionedUser.username;
  const encodedReceiverUsername = encodeURIComponent(receiverUsername);
  const tipLink = `${CLIENT_URL}/tip?receiver_user_id=${mentionedUser.id}&receiver_username=${encodedReceiverUsername}&amount=${amount}`;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel(`Continue Tip (${amount} USDC)`)
      .setStyle(ButtonStyle.Link)
      .setURL(tipLink)
  );

  await interaction.reply({
    content: `**You're about to tip ${displayUsername} with ${amount} USDC**\nClick the button below to complete the transaction on our secure website:`,
    components: [row],
    ephemeral: true,
    allowedMentions: { users: [] },
  });
}