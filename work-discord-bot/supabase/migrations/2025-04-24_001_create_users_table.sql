-- 2025-04-24: Create users table for Discord role assignment
CREATE TABLE users (
  id serial PRIMARY KEY,
  discord_user_id text NOT NULL UNIQUE,
  wallet_address text NOT NULL UNIQUE,
  token_balance integer NOT NULL DEFAULT 0,
  role_assigned text NULL,
  last_checked timestamp DEFAULT CURRENT_TIMESTAMP
);
