# work-discord-bot

## Supabase Database Migrations

This project uses Supabase for its database backend. To manage database schema changes in a safe, versioned, and automated way, we use Supabase CLI migrations.

### Setup

1. Install dependencies:

```bash
pnpm install
```

2. Install the Supabase CLI globally:

- Using npm:

```bash
npm install -g supabase
```

- Or follow the official installation guide: https://supabase.com/docs/guides/cli#installing

3. Configure your Supabase project URL and API key in environment variables (`SUPABASE_URL` and `SUPABASE_KEY`).

### Migration Workflow

- **Create a new migration:**

```bash
pnpm run migrate:create <migration_name>
```

This creates a new migration file in `supabase/migrations` with the given name and a timestamp.

- **Apply migrations:**

```bash
pnpm run migrate:up
```

This applies all pending migrations to your Supabase database.

- **Rollback last migration:**

```bash
pnpm run migrate:down
```

This rolls back the last applied migration.

### Notes

- The initial migration `20240801_initial_schema.sql` represents the current production schema to ensure retrocompatibility.
- Always create new migrations for any schema changes.
- Keep migration files under version control to synchronize database state across environments.
- Review migration files before applying to avoid accidental data loss.
- For automated deployment, include `pnpm run migrate:up` as part of your deployment/startup scripts.

### Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Database Migrations Best Practices](https://supabase.com/docs/guides/database/migrations)
