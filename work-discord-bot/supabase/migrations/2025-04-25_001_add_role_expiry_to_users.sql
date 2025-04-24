-- 2025-04-25: Add role_expiry field to users table
ALTER TABLE users ADD COLUMN role_expiry timestamp;
