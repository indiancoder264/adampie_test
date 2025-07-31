
# How to Apply Database Migrations

As the RecipeRadar application evolves, its database schema may change. For instance, a new feature might require a new table or a new column on an existing table.

Migrations are individual, versioned SQL files that allow you to update your database schema incrementally and safely, without having to start from scratch.

---

## Applying New Migrations

When a new migration file is added to the `database/migrations/` directory, you need to manually run its content in your Supabase SQL Editor to update your existing database.

### Pending Migrations to Run:

Below is the list of migrations that have been added since the initial setup. Copy the content of each one and run it in the Supabase SQL Editor.

---

### Migration: `0001_add_rate_limiting.sql`

This migration adds the `rate_limits` table, which is required for the IP-based rate limiting feature to protect against brute-force and spam attacks. It also adds new columns to the `sessions` table for enhanced security monitoring.

**SQL to run:**

```sql
-- Add columns to the sessions table for security logging
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Create the rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create an index for efficient querying of recent actions by IP and type
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action_time ON rate_limits (ip_address, action_type, created_at);

-- Optional: Create a trigger function to auto-delete old records
-- This acts as a garbage collector to keep the table size manageable.
CREATE OR REPLACE FUNCTION delete_old_rate_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete records older than 1 hour
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists to avoid duplication errors
DROP TRIGGER IF EXISTS trigger_delete_old_rate_limits ON rate_limits;

-- Attach the trigger to the table, to run after every insert
CREATE TRIGGER trigger_delete_old_rate_limits
AFTER INSERT ON rate_limits
FOR EACH ROW
EXECUTE FUNCTION delete_old_rate_limits();

```
