import { 
    CommandInteraction, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
  } from 'discord.js';
  import { CLIENT_URL, supabase } from '../../config';
  import { getServerConfig, formatBalanceNumber } from '../../utils';
  
  export async function handleVerifyCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;
    const guild = interaction.guild!;
    const guildId = interaction.guildId!;
  
    await interaction.deferReply({ ephemeral: true });
  
    const serverConfig = await getServerConfig(guildId);
    if (!serverConfig) {
      const setupCmd = interaction.client.application?.commands.cache.find(
        (cmd) => cmd.name === "server-setup"
      );
      const cmdMention = setupCmd
        ? `</server-setup:${setupCmd.id}>`
        : "`/server-setup`";
      await interaction.editReply(
        `Verification has not been configured for this server yet. An administrator needs to run the ${cmdMention} command.`
      );
      return;
    }
  
    const { data: existingUser, error: userFetchError } = await supabase
      .from("holders")
      .select("addresses, active")
      .eq("discord_user_id", interaction.user.id)
      .eq("server_id", guildId)
      .maybeSingle();
  
    if (userFetchError) {
      console.error(
        `Error fetching holder data for ${interaction.user.id} in guild ${guildId}:`,
        userFetchError
      );
      await interaction.editReply(
        "There was a database error while checking your verification status. Please try again later."
      );
      return;
    }
  
    const row = new ActionRowBuilder<ButtonBuilder>();
    let requiredBalanceNum: number;
    try {
      requiredBalanceNum = Number(serverConfig.required_balance);
      if (isNaN(requiredBalanceNum))
        throw new Error("Invalid balance format in config");
    } catch (e) {
      console.error(
        `[Verify Command] Invalid required_balance in config for guild ${guildId}: ${serverConfig.required_balance}`
      );
      await interaction.editReply(
        "Server configuration error (invalid balance). Please contact an admin."
      );
      return;
    }
  
    const requiredBalanceFormatted = formatBalanceNumber(
      requiredBalanceNum,
      serverConfig.token_decimals
    );
    const tokenSymbolDisplay = serverConfig.token_symbol
      ? ` ${serverConfig.token_symbol}`
      : " tokens";
  
    const hasWallets = existingUser && existingUser.addresses?.length > 0;
  
    if (
      !existingUser ||
      !existingUser.addresses ||
      existingUser.addresses.length === 0
    ) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel("Connect Wallet")
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`new_wallet:${interaction.user.id}:${guildId}`)
      );
    } else {
      row.addComponents(
        new ButtonBuilder()
          .setLabel("Add Another Wallet")
          .setStyle(ButtonStyle.Success)
          .setCustomId(`add_wallet:${interaction.user.id}:${guildId}`)
      );
    }
  
    if (CLIENT_URL) {
      const params = new URLSearchParams({
        tokenMint: serverConfig.token_address,
        requiredRawAmount: serverConfig.required_balance,
        guildId: guildId,
        guildName: guild.name,
      });
      if (serverConfig.token_symbol) {
        params.set("tokenSymbol", serverConfig.token_symbol);
      }
      if (
        serverConfig.token_decimals !== null &&
        serverConfig.token_decimals !== undefined
      ) {
        params.set("tokenDecimals", serverConfig.token_decimals.toString());
      }
      const buyLink = `${CLIENT_URL}/buy?${params.toString()}`;
  
      row.addComponents(
        new ButtonBuilder()
          .setLabel(`Get ${requiredBalanceFormatted}${tokenSymbolDisplay}`)
          .setStyle(ButtonStyle.Link)
          .setURL(buyLink)
      );
    }
  
    const messageContent =
      `**Token Verification for ${guild.name}**\n` +
      `You need at least \`${requiredBalanceFormatted}${tokenSymbolDisplay}\` of the token (\`${serverConfig.token_address}\`) in a connected Solana wallet to get the <@&${serverConfig.role_id}> role.\n\n` +
      `${
        hasWallets
          ? `You currently have ${
              existingUser?.addresses?.length || 0
            } wallet(s) linked.`
          : "You haven't connected any wallets for this server yet."
      }\n\n` +
      `Please choose an option:`;
  
    await interaction.editReply({
      content: messageContent,
      components: row.components.length > 0 ? [row] : [],
      allowedMentions: { roles: [] },
    });
}