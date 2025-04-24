import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Partials, REST, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VerificationData } from '../types';

dotenv.config();

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_KEY = process.env.SUPABASE_KEY;
export const CLIENT_URL = process.env.CLIENT_URL;
export const PORT = process.env.PORT || 3001;

if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_KEY) throw new Error("SUPABASE_KEY is required");
if (!CLIENT_URL) throw new Error("CLIENT_URL is required");

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

export const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

export const commands = [
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
        "Minimum token balance required ( Raw amount i.e Balance * decimals)."
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

export const pendingVerifications = new Map<string, VerificationData>();
