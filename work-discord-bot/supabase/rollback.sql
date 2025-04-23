-- Manual rollback: Removes test_flag column from users table
ALTER TABLE users DROP COLUMN test_flag;
