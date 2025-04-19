import {
  Client,
  Events,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  Interaction,
  REST,
  Routes,
  SlashCommandBuilder,
  ButtonInteraction,
  TextChannel,
  PermissionFlagsBits,
  GuildMember,
  Partials,
  ActivityType,
  Role,
  Guild,
} from "discord.js";
import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Connection, PublicKey } from "@solana/web3.js";
import * as nacl from "tweetnacl";

dotenv.config();

if (!process.env.DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required");
if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!process.env.SUPABASE_KEY) throw new Error("SUPABASE_KEY is required");
if (!process.env.CLIENT_URL) throw new Error("CLIENT_URL is required");

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL!;

const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

interface ServerConfig {
  server_id: string;
  server_name: string;
  token_address: string;
  required_balance: string;
  role_id: string;
  rpc_url: string;
  setup_complete: boolean;
  admin_user_id?: string;
  token_symbol?: string | null;
  token_decimals?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface Holder {
  id?: string;
  discord_user_id: string;
  server_id: string;
  username: string;
  addresses: string[];
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface VerificationData {
  userId: string;
  action: "new" | "add";
  guildId: string;
}

const pendingVerifications = new Map<string, VerificationData>();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

const commands = [
  new SlashCommandBuilder()
    .setName("server-setup")
    .setDescription(
      "Configure token verification for this server (Admin only)."
    )
    .addStringOption((option) =>
      option
        .setName("token_address")
        .setDescription("The Solana mint address of the token to verify.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("required_balance")
        .setDescription(
          "Minimum token balance required (raw amount, e.g., 200000)."
        )
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("role_to_grant")
        .setDescription("The role to grant to verified members.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("rpc_url")
        .setDescription("The Solana RPC URL (defaults to mainnet-beta).")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("token_symbol")
        .setDescription("Optional: Token symbol for display (e.g., WORK).")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("token_decimals")
        .setDescription("Optional: Token decimals for display (e.g., 6).")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(18)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("edit-config")
    .setDescription("Edit existing server configuration (Admin only).")
    .addStringOption((option) =>
      option
        .setName("token_address")
        .setDescription("New Solana mint address.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("required_balance")
        .setDescription("New minimum token balance (raw amount).")
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName("role_to_grant")
        .setDescription("New role to grant.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("rpc_url")
        .setDescription("New Solana RPC URL.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("token_symbol")
        .setDescription("New token symbol (or 'remove' to clear).")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("token_decimals")
        .setDescription("New token decimals (0-18).")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(18)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("verify")
    .setDescription(
      "Verify your Solana wallet token holdings for server roles."
    )
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("tip")
    .setDescription(
      "Tip a user with a specific amount (handled via external link)."
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to tip").setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount (e.g., USDC) to tip.")
        .setRequired(true)
        .setMinValue(0.01)
    )
    .setDMPermission(false)
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

const app = express();
app.use(cors());
app.use(express.json());

function verifySignature(
  message: string,
  signature: string,
  walletAddress: string
): boolean {
  try {
    const signatureBytes = Buffer.from(signature, "base64");
    const publicKeyBytes = new PublicKey(walletAddress).toBytes();
    const messageBytes = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error(
      `Error verifying signature for wallet ${walletAddress}:`,
      error
    );
    return false;
  }
}

async function handleEditConfigCommand(interaction: CommandInteraction) {
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

    const currentConfig: ServerConfig | null = await getServerConfig(guild.id);
    if (!currentConfig) {
      const setupCmd = client.application?.commands.cache.find(
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

    const updateData: Partial<
      Omit<
        ServerConfig,
        | "server_id"
        | "server_name"
        | "setup_complete"
        | "created_at"
        | "admin_user_id"
      >
    > & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

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
          guild.ownerId !== client.user?.id)
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

    const { error: updateError } = await supabase
      .from("servers")
      .update(updateData)
      .eq("server_id", guild.id);

    if (updateError) {
      console.error(
        `[Edit Command] Supabase error updating config for guild ${guild.id}:`,
        updateError
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

async function checkTokenBalanceRawNumber(
  walletAddress: string,
  tokenMintAddress: string,
  rpcUrl: string
): Promise<number> {
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenMintPublicKey = new PublicKey(tokenMintAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { mint: tokenMintPublicKey }
    );
    if (!tokenAccounts.value || tokenAccounts.value.length === 0) {
      return 0;
    }
    let totalRawBalance = 0;
    for (const accountInfo of tokenAccounts.value) {
      if (accountInfo?.account?.data?.parsed?.info?.tokenAmount?.amount) {
        totalRawBalance += Number(
          accountInfo.account.data.parsed.info.tokenAmount.amount
        );
      }
    }
    if (totalRawBalance > Number.MAX_SAFE_INTEGER) {
      console.warn(
        `[Precision Warning] Calculated raw balance ${totalRawBalance} for ${walletAddress} (Token: ${tokenMintAddress}) exceeds Number.MAX_SAFE_INTEGER.`
      );
    }
    return totalRawBalance;
  } catch (error) {
    console.error(
      `Error checking raw token balance (Number) for wallet ${walletAddress} (Token: ${tokenMintAddress}, RPC: ${rpcUrl}):`,
      error
    );
    return 0;
  }
}

async function checkAnyWalletHasSufficientBalanceNumber(
  addresses: string[] | null | undefined,
  tokenMintAddress: string,
  requiredBalance: number,
  rpcUrl: string
): Promise<boolean> {
  if (!addresses || addresses.length === 0) return false;
  if (requiredBalance > Number.MAX_SAFE_INTEGER) {
    console.warn(
      `[Precision Warning] Required balance ${requiredBalance} exceeds Number.MAX_SAFE_INTEGER.`
    );
  }
  for (const address of addresses) {
    const balance = await checkTokenBalanceRawNumber(
      address,
      tokenMintAddress,
      rpcUrl
    );
    if (balance >= requiredBalance) {
      return true;
    }
  }
  return false;
}

async function getServerConfig(guildId: string): Promise<ServerConfig | null> {
  try {
    const { data, error } = await supabase
      .from("servers")
      .select("*")
      .eq("server_id", guildId)
      .maybeSingle();
    if (error) {
      console.error(`Error fetching server config for ${guildId}:`, error);
      return null;
    }
    if (!data || !data.setup_complete) {
      return null;
    }

    return {
      ...data,
      required_balance: String(data.required_balance),
      token_decimals:
        data.token_decimals !== null ? Number(data.token_decimals) : null,
    } as ServerConfig;
  } catch (e) {
    console.error(`Unexpected error in getServerConfig for ${guildId}:`, e);
    return null;
  }
}

function formatBalanceNumber(
  rawBalance: number | string,
  decimals: number | null | undefined
): string {
  const balanceNum =
    typeof rawBalance === "string" ? parseFloat(rawBalance) : rawBalance;
  if (isNaN(balanceNum)) {
    return "NaN";
  }
  if (balanceNum > Number.MAX_SAFE_INTEGER) {
    console.warn(
      `[Precision Warning] Formatting balance ${balanceNum} which exceeds Number.MAX_SAFE_INTEGER.`
    );
  }
  const dec = decimals ?? 0;
  const divisor = Math.pow(10, dec);
  const uiAmount = balanceNum / divisor;
  return uiAmount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: dec,
  });
}

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
    setInterval(checkAllBalancesNumber, 60 * 1000);
    checkAllBalancesNumber();
  } catch (error) {
    console.error("Error refreshing application commands:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
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

async function handleCommandInteraction(interaction: CommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId || !interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
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

async function handleSetupCommand(interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "You need Administrator permissions to use this command.",
      ephemeral: true,
    });
    return;
  }
  const guild = interaction.guild!;

  try {
    await interaction.deferReply({ ephemeral: true });

    const tokenAddress = interaction.options.getString("token_address", true);
    const requiredBalanceInput = interaction.options.getString(
      "required_balance",
      true
    );
    const roleToGrant = interaction.options.getRole("role_to_grant", true);
    const rpcUrl =
      interaction.options.getString("rpc_url") ||
      "https://api.mainnet-beta.solana.com";
    const tokenSymbol = interaction.options.getString("token_symbol");
    const tokenDecimalsInput = interaction.options.getInteger("token_decimals");

    try {
      new PublicKey(tokenAddress);
    } catch (e) {
      await interaction.editReply("Invalid Solana token address format.");
      return;
    }
    try {
      new URL(rpcUrl);
    } catch (e) {
      await interaction.editReply("Invalid RPC URL format.");
      return;
    }
    if (!(roleToGrant instanceof Role)) {
      await interaction.editReply("Invalid role selected.");
      return;
    }
    if (!guild.members.me) {
      console.error(
        "[Setup Command] Cannot check bot permissions: guild.members.me is null."
      );
      await interaction.editReply(
        "Internal error: Could not verify bot permissions."
      );
      return;
    }
    if (roleToGrant.managed || roleToGrant.id === guild.roles.everyone.id) {
      await interaction.editReply(
        "Cannot assign a managed or the @everyone role."
      );
      return;
    }
    if (
      !guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) ||
      (roleToGrant.position >= guild.members.me.roles.highest.position &&
        guild.ownerId !== client.user?.id)
    ) {
      await interaction.editReply(
        `The bot lacks permissions or has insufficient hierarchy to assign the role \`${roleToGrant.name}\`. Ensure the bot's role is higher than this role and has 'Manage Roles' permission.`
      );
      return;
    }

    let requiredBalanceNumber: number;
    try {
      requiredBalanceNumber = Number(requiredBalanceInput.replace(/,/g, ""));
      if (isNaN(requiredBalanceNumber) || requiredBalanceNumber < 0)
        throw new Error("Balance must be a non-negative number");
      if (requiredBalanceNumber > Number.MAX_SAFE_INTEGER)
        console.warn(
          `[Setup Command] [Precision Warning] Input required balance ${requiredBalanceNumber} exceeds MAX_SAFE_INTEGER.`
        );
    } catch (e) {
      await interaction.editReply(
        "Invalid required balance format. Please provide the raw token amount (e.g., 1000000)."
      );
      return;
    }

    const tokenDecimals =
      tokenDecimalsInput !== null && tokenDecimalsInput >= 0
        ? tokenDecimalsInput
        : null;

    const upsertData = {
      server_id: guild.id,
      server_name: guild.name,
      token_address: tokenAddress,
      required_balance: requiredBalanceNumber.toString(),
      role_id: roleToGrant.id,
      rpc_url: rpcUrl,
      admin_user_id: interaction.user.id,
      token_symbol: tokenSymbol,
      token_decimals: tokenDecimals,
      setup_complete: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("servers")
      .upsert(upsertData, { onConflict: "server_id" });

    if (error) {
      console.error(
        `[Setup Command] Supabase error saving config for guild ${guild.id}:`,
        error
      );
      await interaction.editReply(
        "Failed to save server configuration to the database. Please try again later."
      );
      return;
    }

    const balanceDisplay = formatBalanceNumber(
      requiredBalanceNumber,
      tokenDecimals
    );
    const symbolDisplay = tokenSymbol ? ` ${tokenSymbol}` : " tokens";
    const decimalsDisplay =
      tokenDecimals !== null ? `\n- Token Decimals: ${tokenDecimals}` : "";
    await interaction.editReply(
      `✅ **Configuration updated successfully!**\n` +
        `- Token Address: \`${tokenAddress}\`\n` +
        `- Required Balance: \`${balanceDisplay}${symbolDisplay}\` (Raw: ${requiredBalanceNumber})\n` +
        `- Role Granted: ${roleToGrant} (\`${roleToGrant.name}\`)\n` +
        `- Solana RPC URL: \`${rpcUrl}\`${decimalsDisplay}\n\n` +
        `Members can now run \`/verify\` to get the role.`
    );
  } catch (setupError) {
    console.error(
      `[Setup Command] Unexpected error during setup for guild ${
        guild?.id || "unknown"
      }:`,
      setupError
    );
    if (interaction.isRepliable()) {
      try {
        const errorReplyOptions = {
          content:
            "An unexpected error occurred during setup. Please check the bot logs or contact support.",
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(errorReplyOptions);
        } else {
          await interaction.reply(errorReplyOptions);
        }
      } catch (replyError) {
        console.error(
          "[Setup Command] Failed to send error reply to interaction:",
          replyError
        );
      }
    }
  }
}

async function handleVerifyCommand(interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild!;
  const guildId = interaction.guildId!;

  await interaction.deferReply({ ephemeral: true });

  const serverConfig = await getServerConfig(guildId);
  if (!serverConfig) {
    const setupCmd = client.application?.commands.cache.find(
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

async function handleTipCommand(interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const mentionedUser = interaction.options.getUser("user", true);
  const amount = interaction.options.getNumber("amount", true);
  const guildId = interaction.guildId!;

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

  const receiverUsernameEncoded = encodeURIComponent(mentionedUser.username);
  const tipLink = `${CLIENT_URL}/tip?receiver_user_id=${mentionedUser.id}&receiver_username=${receiverUsernameEncoded}&amount=${amount}&guildId=${guildId}&sender_user_id=${interaction.user.id}`;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel(`Continue Tip (${amount} Units)`)
      .setStyle(ButtonStyle.Link)
      .setURL(tipLink)
  );

  await interaction.reply({
    content: `You are about to initiate a tip of **${amount}** units to ${mentionedUser.tag}.\nClick the button below to proceed on the web interface:`,
    components: [row],
    ephemeral: true,
  });
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
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

app.get("/api/verification-context", async (req: Request, res: Response) => {
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
  return;
});

app.post("/api/verify-wallet", async (req: Request, res: Response) => {
  const { verificationCode, walletAddress, signature, message } = req.body;
  const logPrefix = `[API Verify ${verificationCode?.substring(0, 6)}...]`;
  console.log(
    `${logPrefix} Request received for wallet ${walletAddress?.substring(
      0,
      6
    )}...`
  );

  if (!verificationCode || !walletAddress || !signature || !message) {
    console.log(`${logPrefix} Missing required fields.`);
    res.status(400).json({
      success: false,
      message:
        "Missing required fields (verificationCode, walletAddress, signature, message).",
    });
    return;
  }

  const verificationData = pendingVerifications.get(verificationCode);
  if (!verificationData) {
    console.log(`${logPrefix} Invalid or expired verification code.`);
    res.status(404).json({
      success: false,
      message:
        "Invalid or expired verification code. Please try /verify again.",
    });
    return;
  }

  pendingVerifications.delete(verificationCode);
  const { userId, action, guildId } = verificationData;
  console.log(
    `${logPrefix} Consumed code for user ${userId}, guild ${guildId}, action ${action}`
  );

  const serverConfig = await getServerConfig(guildId);
  if (!serverConfig) {
    console.log(`${logPrefix} Server config not found for guild ${guildId}`);
    res.status(404).json({
      success: false,
      message:
        "Server configuration associated with this verification link was not found or is incomplete.",
    });
    return;
  }

  const {
    token_address,
    required_balance: requiredBalanceStr,
    role_id,
    rpc_url,
    token_symbol,
    token_decimals,
  } = serverConfig;
  let requiredBalanceNum: number;
  try {
    requiredBalanceNum = Number(requiredBalanceStr);
    if (isNaN(requiredBalanceNum) || requiredBalanceNum < 0)
      throw new Error("Invalid balance in config");
  } catch {
    console.error(
      `${logPrefix} Invalid required_balance '${requiredBalanceStr}' in config for guild ${guildId}`
    );
    res.status(500).json({
      success: false,
      message: "Server configuration error (invalid balance requirement).",
    });
    return;
  }
  if (requiredBalanceNum > Number.MAX_SAFE_INTEGER)
    console.warn(
      `${logPrefix} [Precision Warning] Required balance ${requiredBalanceNum} for guild ${guildId} exceeds safe limits.`
    );

  const isSignatureValid = verifySignature(message, signature, walletAddress);
  if (!isSignatureValid) {
    console.log(
      `${logPrefix} Signature verification failed for ${walletAddress}`
    );
    res.status(401).json({
      success: false,
      message: "Wallet signature verification failed.",
    });
    return;
  }
  console.log(`${logPrefix} Signature verified for ${walletAddress}`);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error(`${logPrefix} Guild ${guildId} not found in bot cache.`);
    res.status(500).json({
      success: false,
      message: "Internal error: Bot is not currently in the associated server.",
    });
    return;
  }

  const role = guild.roles.cache.get(role_id);
  if (!role) {
    console.error(
      `${logPrefix} Role ${role_id} not found in guild ${guildId}. Config needs update.`
    );
    // Note: We continue processing to save the wallet, but won't assign the role.
  } else if (!guild.members.me) {
    console.error(
      `${logPrefix} Cannot check role permissions as guild.members.me is null.`
    );
    // Note: Continue processing, role assignment will likely fail later if attempted.
  } else if (
    !guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) ||
    (role.position >= guild.members.me.roles.highest.position &&
      guild.ownerId !== client.user?.id)
  ) {
    console.error(
      `${logPrefix} Bot lacks permission or hierarchy to manage role ${role_id} in guild ${guildId}.`
    );
    // Note: Continue processing, role assignment will fail later if attempted.
  }

  let member: GuildMember | null = null;
  try {
    member = await guild.members.fetch(userId);
  } catch (err) {
    console.error(
      `${logPrefix} Failed to fetch member ${userId} in guild ${guildId}:`,
      err
    );
    res.status(404).json({
      success: false,
      message:
        "Could not find you in the Discord server. Have you left since starting verification?",
    });
    return;
  }
  if (!member) {
    console.error(
      `${logPrefix} Member ${userId} fetched as null in guild ${guildId}`
    );
    res.status(404).json({
      success: false,
      message: "Could not find your user account in the Discord server.",
    });
    return;
  }

  let finalAddresses: string[];
  try {
    const { data: existingUser, error: fetchError } = await supabase
      .from("holders")
      .select("addresses")
      .eq("discord_user_id", userId)
      .eq("server_id", guildId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (action === "new" || !existingUser || !existingUser.addresses) {
      finalAddresses = [walletAddress];
    } else {
      finalAddresses = [...new Set([...existingUser.addresses, walletAddress])];
    }

    const finalActiveStatus = await checkAnyWalletHasSufficientBalanceNumber(
      finalAddresses,
      token_address,
      requiredBalanceNum,
      rpc_url
    );

    const holderData: Omit<Holder, "id" | "created_at"> & {
      created_at?: string;
    } = {
      discord_user_id: userId,
      server_id: guildId,
      username: member.user.username,
      addresses: finalAddresses,
      active: finalActiveStatus,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("holders")
      .upsert(holderData, { onConflict: "discord_user_id, server_id" });

    if (upsertError) throw upsertError;

    console.log(
      `${logPrefix} Upserted holder ${userId} for guild ${guildId}. Active: ${finalActiveStatus}`
    );

    let roleUpdated = false;
    let roleUpdateMessage = "";

    if (role) {
      try {
        const hasRole = member.roles.cache.has(role_id);
        if (finalActiveStatus && !hasRole) {
          await member.roles.add(role_id, "Verified token holder via bot");
          console.log(
            `${logPrefix} Added role ${role.name} (${role_id}) to ${member.user.tag}`
          );
          roleUpdated = true;
          roleUpdateMessage = "Role granted or confirmed.";
        } else if (!finalActiveStatus && hasRole) {
          await member.roles.remove(role_id, "Token balance below threshold");
          console.log(
            `${logPrefix} Removed role ${role.name} (${role_id}) from ${member.user.tag}`
          );
          roleUpdated = true;
          roleUpdateMessage = "Role removed due to insufficient balance.";
        } else if (finalActiveStatus && hasRole) {
          roleUpdateMessage = "Role confirmed.";
        } else {
          roleUpdateMessage = "Role not granted (insufficient balance).";
        }
      } catch (roleError: any) {
        console.error(
          `${logPrefix} Failed to update role ${role_id} for ${member.user.tag}:`,
          roleError
        );
        roleUpdateMessage =
          "Failed to update role due to a bot permission error.";
      }
    } else {
      roleUpdateMessage = "Configured role not found, cannot update roles.";
      console.warn(
        `${logPrefix} Role ${role_id} does not exist, skipping role update.`
      );
    }

    const walletDisplay = `${walletAddress.substring(
      0,
      4
    )}...${walletAddress.substring(walletAddress.length - 4)}`;

    if (finalActiveStatus) {
      res.status(200).json({
        success: true,
        message: `Wallet ${walletDisplay} verified successfully! ${roleUpdateMessage}`,
      });
      return;
    } else {
      const currentBalanceNum = await checkTokenBalanceRawNumber(
        walletAddress,
        token_address,
        rpc_url
      );
      const currentBalanceFormatted = formatBalanceNumber(
        currentBalanceNum,
        token_decimals
      );
      const requiredBalanceFormatted = formatBalanceNumber(
        requiredBalanceNum,
        token_decimals
      );
      const tokenSymbolDisplay = token_symbol
        ? ` ${token_symbol}`
        : ` token(s)`;

      let msg =
        `Wallet ${walletDisplay} linked, but it (or your combined wallets) currently holds insufficient balance. ` +
        `Required: ${requiredBalanceFormatted}${tokenSymbolDisplay}. This wallet balance: ${currentBalanceFormatted}${tokenSymbolDisplay}. ` +
        `${roleUpdateMessage}`;

      console.log(
        `${logPrefix} Insufficient balance for user ${userId}. ${msg}`
      );
      res.status(400).json({
        // Use 400 for insufficient balance as it's a client-side state issue
        success: false,
        message: msg,
      });
      return;
    }
  } catch (dbError) {
    console.error(`${logPrefix} Database error during verification:`, dbError);
    res.status(500).json({
      success: false,
      message: "A database error occurred while saving wallet information.",
    });
    return;
  }
});

app.post("/api/send-channel-message", async (req: Request, res: Response) => {
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
});

app.post("/api/send-direct-message", async (req: Request, res: Response) => {
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
});

async function checkAllBalancesNumber() {
  const logPrefix = "[Balance Check]";
  let serversChecked = 0;
  let usersChecked = 0;
  let usersProcessed = 0;
  let roleUpdates = 0;
  let dbUpdates = 0;

  try {
    const { data: servers, error: serverError } = await supabase
      .from("servers")
      .select("server_id, token_address, required_balance, role_id, rpc_url")
      .eq("setup_complete", true);

    if (serverError) {
      console.error(`${logPrefix} Error fetching servers:`, serverError);
      return;
    }
    if (!servers || servers.length === 0) {
      return;
    }

    for (const serverConfig of servers) {
      serversChecked++;
      const {
        server_id: guildId,
        token_address: tokenAddress,
        required_balance: requiredBalanceStr,
        role_id: roleId,
        rpc_url: rpcUrl,
      } = serverConfig;
      const serverLogPrefix = `${logPrefix} [Guild ${guildId}]`;

      let requiredBalanceNum: number;
      try {
        requiredBalanceNum = Number(requiredBalanceStr);
        if (isNaN(requiredBalanceNum) || requiredBalanceNum < 0)
          throw new Error("Invalid balance");
      } catch {
        console.error(
          `${serverLogPrefix} Invalid required_balance '${requiredBalanceStr}'. Skipping.`
        );
        continue;
      }
      if (requiredBalanceNum > Number.MAX_SAFE_INTEGER)
        console.warn(
          `${serverLogPrefix} [Precision Warning] Required balance ${requiredBalanceNum} exceeds safe limits.`
        );

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        // console.warn(`${serverLogPrefix} Guild not found in cache. Skipping.`);
        continue;
      }

      if (!guild.members.me) {
        console.warn(
          `${serverLogPrefix} Bot member object not found in cache. Skipping role checks for this guild.`
        );
        continue;
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.warn(`${serverLogPrefix} Role ${roleId} not found. Skipping.`);
        continue;
      }

      let canManageRoles = false;
      if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        console.warn(
          `${serverLogPrefix} Bot lacks ManageRoles permission. Cannot update roles.`
        );
      } else if (
        role.position >= guild.members.me.roles.highest.position &&
        guild.ownerId !== client.user?.id
      ) {
        console.warn(
          `${serverLogPrefix} Role ${role.name} (${roleId}) is too high. Cannot manage.`
        );
      } else {
        canManageRoles = true;
      }

      const { data: holders, error: holderError } = await supabase
        .from("holders")
        .select("discord_user_id, username, addresses, active")
        .eq("server_id", guildId);

      if (holderError) {
        console.error(
          `${serverLogPrefix} Error fetching holders:`,
          holderError
        );
        continue;
      }
      if (!holders || holders.length === 0) {
        continue;
      }

      usersProcessed += holders.length;
      for (const holder of holders) {
        usersChecked++;
        const userLogPrefix = `${serverLogPrefix} [User ${holder.discord_user_id}]`;
        let member: GuildMember | null = null;

        try {
          member = await guild.members
            .fetch(holder.discord_user_id)
            .catch(() => null);

          if (!member) {
            if (holder.active) {
              const { error: updateError } = await supabase
                .from("holders")
                .update({ active: false, updated_at: new Date().toISOString() })
                .match({
                  discord_user_id: holder.discord_user_id,
                  server_id: guildId,
                });
              if (updateError) {
                console.error(
                  `${userLogPrefix} Failed to mark user (left guild) as inactive:`,
                  updateError
                );
              } else {
                console.log(
                  `${userLogPrefix} Marked ${holder.username} as inactive (left guild).`
                );
                dbUpdates++;
              }
            }
            continue;
          }

          const hasSufficientBalance =
            await checkAnyWalletHasSufficientBalanceNumber(
              holder.addresses,
              tokenAddress,
              requiredBalanceNum,
              rpcUrl
            );

          const currentRoleStatus = member.roles.cache.has(roleId);
          const needsDbUpdate =
            holder.active !== hasSufficientBalance ||
            holder.username !== member.user.username;
          let roleUpdatedThisCheck = false;

          if (canManageRoles) {
            if (hasSufficientBalance && !currentRoleStatus) {
              try {
                await member.roles.add(
                  roleId,
                  "Verified token holder (periodic check)"
                );
                console.log(
                  `${userLogPrefix} Added role ${role.name} to ${member.user.tag}`
                );
                roleUpdates++;
                roleUpdatedThisCheck = true;
              } catch (roleAddError) {
                console.error(
                  `${userLogPrefix} Error adding role ${role.name} to ${member.user.tag}:`,
                  roleAddError
                );
              }
            } else if (!hasSufficientBalance && currentRoleStatus) {
              try {
                await member.roles.remove(
                  roleId,
                  "Token balance below threshold (periodic check)"
                );
                console.log(
                  `${userLogPrefix} Removed role ${role.name} from ${member.user.tag}`
                );
                roleUpdates++;
                roleUpdatedThisCheck = true;
              } catch (roleRemoveError) {
                console.error(
                  `${userLogPrefix} Error removing role ${role.name} from ${member.user.tag}:`,
                  roleRemoveError
                );
              }
            }
          } else if (holder.active !== hasSufficientBalance) {
            // Log if role *should* change but bot lacks permissions
            if (
              (hasSufficientBalance && !currentRoleStatus) ||
              (!hasSufficientBalance && currentRoleStatus)
            ) {
              console.warn(
                `${userLogPrefix} Role status needs update for ${member.user.tag} but bot lacks permissions/hierarchy.`
              );
            }
          }

          if (needsDbUpdate) {
            const updatePayload: Partial<Holder> & { updated_at: string } = {
              active: hasSufficientBalance,
              updated_at: new Date().toISOString(),
            };
            if (holder.username !== member.user.username) {
              updatePayload.username = member.user.username;
            }

            const { error: updateError } = await supabase
              .from("holders")
              .update(updatePayload)
              .match({
                discord_user_id: holder.discord_user_id,
                server_id: guildId,
              });

            if (updateError) {
              console.error(
                `${userLogPrefix} Failed to update DB status for ${member.user.tag} to active=${hasSufficientBalance}:`,
                updateError
              );
            } else {
              console.log(
                `${userLogPrefix} Updated DB status for ${member.user.tag} to active=${hasSufficientBalance}` +
                  (updatePayload.username ? ` (Username also updated)` : "")
              );
              dbUpdates++;
            }
          }
        } catch (userError) {
          console.error(
            `${userLogPrefix} Error processing holder ${
              holder.username || holder.discord_user_id
            }:`,
            userError
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `${logPrefix} Unhandled critical error during balance check:`,
      error
    );
  }
}
app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("FATAL: Failed to login to Discord:", err);
  process.exit(1);
});
