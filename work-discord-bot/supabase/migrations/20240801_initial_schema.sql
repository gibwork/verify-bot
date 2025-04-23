-- Initial baseline migration for work-discord-bot Supabase database

-- Create servers table
CREATE TABLE IF NOT EXISTS public.servers (
  server_id TEXT PRIMARY KEY,
  server_name TEXT NOT NULL,
  token_address TEXT NOT NULL,
  required_balance TEXT NOT NULL,
  role_id TEXT NOT NULL,
  rpc_url TEXT NOT NULL,
  admin_user_id TEXT,
  token_symbol TEXT,
  token_decimals INTEGER,
  setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create holders table
CREATE TABLE IF NOT EXISTS public.holders (
  id SERIAL PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  server_id TEXT NOT NULL REFERENCES public.servers(server_id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  addresses TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (discord_user_id, server_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_holders_server_id ON public.holders(server_id);
CREATE INDEX IF NOT EXISTS idx_holders_discord_user_id ON public.holders(discord_user_id);
