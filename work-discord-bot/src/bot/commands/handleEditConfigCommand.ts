import { 
    CommandInteraction,
    PermissionFlagsBits,
    Guild,
    Role
  } from 'discord.js';
  import { PublicKey } from '@solana/web3.js';
  import { getServerConfig, updateServerConfig } from '../../utils';
  import { formatBalanceNumber } from '../../utils';
  
  export async function handleEditConfigCommand(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) {
      console.warn(
        "handleEditConfigCommand called with non-chat input command interaction"
      );
      if (interaction.isRepliable())
        await interaction
          .reply({ content: "Invalid command type received.", ephemeral: true })
          .catch(() => {});
      return;
    }
  
    if (!interaction.guild) {
      console.error("[Edit Command] Guild is null in handleEditConfigCommand");
      await interaction.reply({
        content: "Error: Guild context is missing.",
        ephemeral: true,
      });
      return;
    }
    const guild: Guild = interaction.guild;
  
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "You need Administrator permissions to use this command.",
        ephemeral: true,
      });
      return;
    }
  
    try {
      await interaction.deferReply({ ephemeral: true });
  
      const currentConfig = await getServerConfig(guild.id);
      if (!currentConfig) {
        const setupCmd = interaction.client.application?.commands.cache.find(
          (cmd) => cmd.name === "server-setup"
        );
        const cmdMention = setupCmd
          ? `</server-setup:${setupCmd.id}>`
          : "`server-setup`";
        await interaction.editReply(
          `No configuration found for this server. Please run ${cmdMention} first.`
        );
        return;
      }
      const newTokenAddress = interaction.options.getString("token_address");
      const newRequiredBalanceInput =
        interaction.options.getString("required_balance");
      const newRole = interaction.options.getRole("role_to_grant");
      const newRpcUrl = interaction.options.getString("rpc_url");
      const newTokenSymbolInput = interaction.options.getString("token_symbol");
      const newTokenDecimalsInput =
        interaction.options.getInteger("token_decimals");
  
      const updateData: any = {};
  
      const changes: string[] = [];
      let validationError = false;
  
      if (newTokenAddress !== null) {
        try {
          new PublicKey(newTokenAddress);
          updateData.token_address = newTokenAddress;
          changes.push(`- Token Address: \`${newTokenAddress}\``);
        } catch (e) {
          await interaction.editReply(
            "Invalid Solana token address format provided."
          );
          validationError = true;
        }
      }
  
      if (newRequiredBalanceInput !== null && !validationError) {
        try {
          const balanceNum = Number(newRequiredBalanceInput.replace(/,/g, ""));
          if (isNaN(balanceNum) || balanceNum < 0)
            throw new Error("Balance must be a non-negative number");
          if (balanceNum > Number.MAX_SAFE_INTEGER)
            console.warn(
              `[Edit Command] [Precision Warning] Input required balance ${balanceNum} exceeds MAX_SAFE_INTEGER.`
            );
          updateData.required_balance = balanceNum.toString();
          const decimalsForFormat =
            newTokenDecimalsInput !== null
              ? newTokenDecimalsInput
              : currentConfig.token_decimals ?? undefined;
          changes.push(
            `- Required Balance: \`${formatBalanceNumber(
              balanceNum,
              decimalsForFormat
            )}\` (Raw: ${balanceNum})`
          );
        } catch (e) {
          await interaction.editReply(
            "Invalid required balance format. Please provide the raw token amount (e.g., `1000000`)."
          );
          validationError = true;
        }
      }
  
      if (newRole !== null && !validationError) {
        if (!(newRole instanceof Role)) {
          await interaction.editReply("Invalid role selected.");
          validationError = true;
        } else if (!guild.members.me) {
          console.error(
            "[Edit Command] Cannot check bot permissions: guild.members.me is null."
          );
          await interaction.editReply(
            "Internal error: Could not verify bot permissions."
          );
          validationError = true;
        } else if (newRole.managed || newRole.id === guild.roles.everyone.id) {
          await interaction.editReply(
            "Cannot assign a managed role or the `@everyone` role."
          );
          validationError = true;
        } else if (
          !guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) ||
          (newRole.position >= guild.members.me.roles.highest.position &&
            guild.ownerId !== interaction.client.user?.id)
        ) {
          await interaction.editReply(
            `The bot lacks permissions or has insufficient hierarchy to assign the role \`${newRole.name}\`. Ensure the bot's role is higher than this role and has 'Manage Roles' permission.`
          );
          validationError = true;
        } else {
          updateData.role_id = newRole.id;
          changes.push(`- Role Granted: ${newRole} (\`${newRole.name}\`)`);
        }
      }
  
      if (newRpcUrl !== null && !validationError) {
        try {
          new URL(newRpcUrl);
          updateData.rpc_url = newRpcUrl;
          changes.push(`- Solana RPC URL: \`${newRpcUrl}\``);
        } catch (e) {
          await interaction.editReply("Invalid RPC URL format provided.");
          validationError = true;
        }
      }
  
      if (newTokenSymbolInput !== null && !validationError) {
        if (newTokenSymbolInput.toLowerCase() === "remove") {
          updateData.token_symbol = null;
          changes.push(`- Token Symbol: *(Removed)*`);
        } else {
          updateData.token_symbol = newTokenSymbolInput;
          changes.push(`- Token Symbol: ${newTokenSymbolInput}`);
        }
      }
  
      if (newTokenDecimalsInput !== null && !validationError) {
        if (newTokenDecimalsInput >= 0 && newTokenDecimalsInput <= 18) {
          updateData.token_decimals = newTokenDecimalsInput;
          changes.push(`- Token Decimals: ${newTokenDecimalsInput}`);
        } else {
          await interaction.editReply("Token decimals must be between 0 and 18.");
          validationError = true;
        }
      }
  
      if (validationError) {
        return;
      }
  
      if (changes.length === 0) {
        await interaction.editReply(
          "No valid changes specified. Please provide at least one option to modify the configuration."
        );
        return;
      }
  
      const success = await updateServerConfig(guild.id, updateData);
  
      if (!success) {
        console.error(
          `[Edit Command] Database error updating config for guild ${guild.id}`
        );
        await interaction.editReply(
          "Failed to update server configuration in the database. Please try again later."
        );
        return;
      }
  
      await interaction.editReply(
        `✅ **Configuration updated successfully!**\n\n**Changes:**\n${changes.join(
          "\n"
        )}\n\n*Note: Role assignments may take up to a minute to update based on the next balance check cycle.*`
      );
  
    } catch (editError) {
      console.error(
        `[Edit Command] Unexpected error during edit for guild ${
          guild?.id ?? "unknown"
        }:`,
        editError
      );
      if (interaction.isRepliable()) {
        try {
          const errorReplyOptions = {
            content:
              "An unexpected error occurred while editing the configuration. Please check the bot logs or contact support.",
            ephemeral: true,
          };
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(errorReplyOptions);
          } else {
            await interaction.reply(errorReplyOptions);
          }
        } catch (replyError) {
          console.error(
            "[Edit Command] Failed to send error reply to interaction:",
            replyError
          );
        }
      }
    }
}