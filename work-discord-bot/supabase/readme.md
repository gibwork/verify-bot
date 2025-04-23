# Supabase Database Migrations

This directory contains the database migration files for the work-discord-bot project. The migrations are managed using Supabase CLI and ensure consistent database schema across all environments.

## Directory Structure

```
supabase/
├── migrations/           # Migration files
│   └── 20250423000000_initial_schema.sql
├── config.toml          # Supabase configuration
└── README.md           # This file
```

## Prerequisites

1. Install Supabase CLI:
```bash
pnpm add -D supabase
```

2. Set up environment variables (copy from .env.example):
```bash
cp .env.example .env
```

3. Login to Supabase CLI:
```bash
supabase login
```

## Migration Commands

### Create a New Migration

```bash
pnpm migration:new your_migration_name
```

This creates a new timestamped migration file in the `migrations` directory.

### Apply Migrations

```bash
pnpm migration:up
```

This applies all pending migrations to the database.

### Rollback Migrations

```bash
pnpm migration:down
```

This resets the database to its initial state.

### List Migrations

```bash
pnpm migration:list
```

Shows all migrations and their status.

### Fix Migration Issues

```bash
pnpm migration:repair
```

Repairs the migration history table if there are inconsistencies.

## Best Practices

1. **One Change Per Migration**: Each migration should handle one specific change to maintain clarity and make rollbacks easier.

2. **Always Test Migrations**: Test migrations in development before applying to production.

3. **Backup Before Migration**: Always backup production database before applying migrations.

4. **Use Transactions**: Wrap complex migrations in transactions to ensure atomicity.

5. **Idempotency**: Make migrations idempotent using `IF EXISTS` and `IF NOT EXISTS` clauses.

## Migration File Format

```sql
-- Enable EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Tables
CREATE TABLE IF NOT EXISTS your_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Indexes
CREATE INDEX IF NOT EXISTS idx_your_table_id ON your_table(id);

-- Add Foreign Keys
ALTER TABLE your_table
  ADD CONSTRAINT fk_other_table
  FOREIGN KEY (other_id) 
  REFERENCES other_table(id);
```

## Environment-Specific Migrations

For environment-specific migrations (dev, staging, prod), use conditional logic:

```sql
DO $$
BEGIN
  IF current_database() = 'dev_db' THEN
    -- Development-only migrations
  ELSIF current_database() = 'prod_db' THEN
    -- Production-only migrations
  END IF;
END $$;
```

## Troubleshooting

1. **Migration Failed**: 
   - Check the error message
   - Use `pnpm migration:repair` if needed
   - Rollback using `pnpm migration:down`

2. **Inconsistent State**:
   - List migrations with `pnpm migration:list`
   - Compare with production state
   - Use `pnpm migration:repair` if needed

3. **Conflicts**:
   - Always pull latest changes before creating new migrations
   - Coordinate with team on migration timing
   - Use descriptive migration names

## Security Considerations

1. Never commit sensitive data in migration files
2. Use environment variables for credentials
3. Restrict migration execution permissions
4. Backup data before running migrations
5. Test migrations in staging environment first