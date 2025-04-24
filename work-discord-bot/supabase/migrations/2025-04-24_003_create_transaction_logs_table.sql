-- 2025-04-24: Create transaction log table
CREATE TABLE transaction_logs (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id),
  transaction_type text NOT NULL,
  token_balance_before integer NOT NULL,
  token_balance_after integer NOT NULL,
  timestamp timestamp DEFAULT CURRENT_TIMESTAMP
);
