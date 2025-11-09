# Database Migrations

A simple but effective migration system for managing database schema changes.

## Overview

Instead of dropping and recreating tables (which loses data), migrations allow you to:
- **Incrementally** update your database schema
- **Track** which changes have been applied
- **Rollback** changes if needed
- **Share** schema changes with your team

## How It Works

1. Each migration is a JavaScript file with `up()` and `down()` functions
2. Migrations are numbered (001, 002, 003, etc.) and run in order
3. Applied migrations are tracked in a `migrations` table
4. When you run migrations, only new ones are applied

## Directory Structure

```
src/connections/database/
├── migrations/
│   ├── index.js                                    # Migration runner
│   ├── 001_add_in_discord_and_movements.js        # First migration
│   └── 002_your_next_migration.js                 # Future migrations
├── migrate.js                                      # CLI tool
└── setup.js                                        # Setup script (includes migrations)
```

## Commands

### Run Pending Migrations
```bash
npm run db:migrate
# or
node src/connections/database/migrate.js up
```

This applies all migrations that haven't been run yet.

### Check Migration Status
```bash
npm run db:migrate:status
# or
node src/connections/database/migrate.js status
```

Output example:
```
📊 Migration Status:

  ✅ Applied  001_add_in_discord_and_movements
  ⏳ Pending  002_add_clan_points

Total: 2 migration(s)
Applied: 1
Pending: 1
```

### Rollback Last Migration
```bash
npm run db:migrate:down
# or
node src/connections/database/migrate.js down
```

⚠️ **Use carefully!** This runs the `down()` function of the last migration.

### Setup (First Time)
```bash
npm run db:setup
# or
node src/connections/database/setup.js
```

This creates all tables AND runs any pending migrations.

## Current Migrations

### 001_add_in_discord_and_movements.js

**What it does:**
- Adds `in_discord` column to `members` table
- Creates `member_movements` table
- Adds indexes for the new table
- Sets default value for existing members

**When to run:**
- If you had a database before this feature was added
- Automatically runs on `npm run db:setup`

## Creating New Migrations

### Step 1: Create Migration File

Create a new file in `src/connections/database/migrations/` with the format:
```
<number>_<description>.js
```

Example: `002_add_clan_points.js`

### Step 2: Write Migration

```javascript
/**
 * Migration: Add clan points system
 * Created: 2025-10-17
 */

const { query } = require('../index');

/**
 * Apply migration
 */
async function up() {
    console.log('Running migration: 002_add_clan_points');
    
    // Add new column
    console.log('  - Adding clan_points column...');
    await query(`
        ALTER TABLE members 
        ADD COLUMN IF NOT EXISTS clan_points INTEGER DEFAULT 0
    `);
    
    // Create new table
    console.log('  - Creating clan_events table...');
    await query(`
        CREATE TABLE IF NOT EXISTS clan_events (
            id SERIAL PRIMARY KEY,
            member_id INTEGER NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            points INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    console.log('  ✅ Migration completed successfully');
}

/**
 * Rollback migration
 */
async function down() {
    console.log('Rolling back migration: 002_add_clan_points');
    
    await query(`DROP TABLE IF EXISTS clan_events`);
    await query(`ALTER TABLE members DROP COLUMN IF EXISTS clan_points`);
    
    console.log('  ✅ Rollback completed successfully');
}

module.exports = { up, down };
```

### Step 3: Run Migration

```bash
npm run db:migrate
```

## Migration Best Practices

### 1. Always Use IF EXISTS / IF NOT EXISTS

✅ **Good:**
```sql
ALTER TABLE members ADD COLUMN IF NOT EXISTS new_field VARCHAR(50);
CREATE TABLE IF NOT EXISTS new_table (...);
DROP TABLE IF EXISTS old_table;
```

❌ **Bad:**
```sql
ALTER TABLE members ADD COLUMN new_field VARCHAR(50);  -- Fails if exists
CREATE TABLE new_table (...);  -- Fails if exists
```

### 2. Set Default Values for Existing Rows

When adding NOT NULL columns:
```javascript
// Add column as nullable first
await query(`ALTER TABLE members ADD COLUMN new_field VARCHAR(50)`);

// Set values for existing rows
await query(`UPDATE members SET new_field = 'default' WHERE new_field IS NULL`);

// Then add NOT NULL constraint if needed
await query(`ALTER TABLE members ALTER COLUMN new_field SET NOT NULL`);
```

### 3. Create Indexes for Foreign Keys

```javascript
await query(`
    CREATE INDEX IF NOT EXISTS idx_table_foreign_id 
    ON table_name(foreign_id)
`);
```

### 4. Use Transactions for Complex Migrations

```javascript
async function up() {
    await query('BEGIN');
    try {
        await query('...');
        await query('...');
        await query('COMMIT');
    } catch (error) {
        await query('ROLLBACK');
        throw error;
    }
}
```

### 5. Test Rollback

Always test your `down()` function:
```bash
npm run db:migrate          # Apply
npm run db:migrate:down     # Rollback
npm run db:migrate          # Apply again
```

### 6. Never Edit Applied Migrations

Once a migration has been applied (especially in production), **never edit it**.
Instead, create a new migration to make additional changes.

## Troubleshooting

### Migration Failed Midway

If a migration fails:
1. Check the error message
2. Fix the issue in your database manually (or use rollback if safe)
3. Remove the failed migration from the `migrations` table:
   ```sql
   DELETE FROM migrations WHERE name = '002_failed_migration';
   ```
4. Fix the migration file
5. Run migrations again

### Migration Applied But Not Tracked

Manually add it to the tracking table:
```sql
INSERT INTO migrations (name) VALUES ('001_add_in_discord_and_movements');
```

### Want to Start Fresh (Development Only!)

⚠️ **WARNING: This deletes all data!**

```sql
DROP TABLE IF EXISTS member_movements;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS migrations;
```

Then run:
```bash
npm run db:setup
```

## Integration with Setup

The `setup.js` script automatically runs migrations, so new developers just need to:

1. Get the code
2. Set up `.env` with `NEON_DATABASE_URL`
3. Run `npm run db:setup`

Everything is created and migrated automatically! ✨

## Migration Tracking Table

Migrations are tracked in the `migrations` table:

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Auto-generated ID |
| name | VARCHAR(255) | Migration filename (without .js) |
| applied_at | TIMESTAMP | When it was applied |

Example:
```
id | name                              | applied_at
---+-----------------------------------+-------------------------
 1 | 001_add_in_discord_and_movements | 2025-10-16 15:30:45.123
 2 | 002_add_clan_points              | 2025-10-17 09:15:22.456
```

## See Also

- [Database Setup Guide](./README.md)
- [Neon Migration Guide](./NEON_MIGRATION.md)
- [Member Movement Tracking](./models/MOVEMENT_TRACKING.md)

