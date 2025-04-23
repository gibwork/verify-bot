-- Adds a test_flag column to users table
ALTER TABLE users ADD COLUMN test_flag BOOLEAN DEFAULT FALSE;
