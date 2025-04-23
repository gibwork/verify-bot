CREATE TABLE IF NOT EXISTS holders (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  discord_user_id TEXT UNIQUE NOT NULL,
  address TEXT[] NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'holders_discord_id_idx') THEN
    CREATE INDEX holders_discord_id_idx ON holders(discord_user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'holders_active_idx') THEN
    CREATE INDEX holders_active_idx ON holders(active);
  END IF;
END $$;

ALTER TABLE holders 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_holders_updated_at ON holders;
CREATE TRIGGER update_holders_updated_at
    BEFORE UPDATE ON holders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();