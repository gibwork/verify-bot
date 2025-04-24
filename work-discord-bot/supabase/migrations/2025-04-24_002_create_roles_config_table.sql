-- 2025-04-24: Create roles configuration table
CREATE TABLE roles_config (
  id serial PRIMARY KEY,
  role_name text NOT NULL,
  token_threshold integer NOT NULL,
  assigned_role text NOT NULL
);
