# Running the New Event System Migrations

This guide explains how to apply the new event system migrations that replace the old battleship bingo and events tables.

## ⚠️ Important Warning

**These migrations will permanently delete data from the following tables:**
- All battleship bingo tables
- `event_log`
- `game_events`
- `teams` and `team_members`
- `osrs_account_events` and `osrs_account_daily_stats`
- Event summary columns from `osrs_accounts` table

**Backup your database before running these migrations!**

## Prerequisites

Ensure you have a database connection configured in your environment.

## Running Migrations

### Option 1: Run All Pending Migrations

```bash
cd src/db/database
node migrate.js
```

This will automatically detect and run migrations 036-041 in order.

### Option 2: Check Migration Status First

```bash
cd src/db/database
node migrate.js status
```

This shows which migrations are applied and which are pending.

## Migration Order

The migrations will run in this order:

1. **036_remove_old_event_tables.js**
   - Removes all old battleship bingo and event tables
   - Cleans up triggers and functions

2. **037_add_new_events_system.js**
   - Creates `events` table
   - Creates `event_teams` table
   - Creates `event_team_members` table

3. **038_add_bingo_tiles_library.js**
   - Creates `bingo_tiles` table (reusable tile library)

4. **039_add_bingo_boards_system.js**
   - Creates `bingo_boards` table
   - Creates `bingo_board_tiles` table (tiles placed on boards)

5. **040_add_bingo_tile_progress_tracking.js**
   - Creates `bingo_tile_progress` table (individual contributions)

6. **041_add_bingo_buffs_debuffs_system.js**
   - Creates `bingo_buffs_debuffs` table (library)
   - Creates `bingo_board_tile_effects` table
   - Creates `bingo_board_row_effects` table
   - Creates `bingo_board_column_effects` table

## Rolling Back

If you need to rollback the migrations (in reverse order):

```bash
cd src/db/database
node migrate.js rollback
```

This will rollback the last applied migration. Run it multiple times to rollback multiple migrations.

**Note:** Rolling back migration 036 cannot restore the deleted data. You would need to restore from backup and re-run migrations 010 and 018.

## Verification

After running the migrations, verify the schema:

```sql
-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'bingo_%' 
  OR table_name LIKE 'event_%'
ORDER BY table_name;

-- Check for old tables (should return empty)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name LIKE 'battleship_%' 
    OR table_name = 'game_events'
    OR table_name = 'event_log'
    OR table_name = 'teams'
    OR table_name = 'team_members'
  );
```

## Next Steps

After migrations are complete:

1. **Populate Tile Library**: Insert your bingo tiles into `bingo_tiles`
2. **Populate Buffs/Debuffs**: Insert your buffs and debuffs into `bingo_buffs_debuffs`
3. **Create Events**: Create your first event in the `events` table
4. **Create Board**: Create a bingo board linked to your event
5. **Place Tiles**: Add tiles to your board in `bingo_board_tiles`

See `NEW_EVENT_SYSTEM_SCHEMA.md` for detailed usage examples.

## Troubleshooting

### Migration Fails Partway Through

If a migration fails:
1. Check the error message in the console
2. Fix the underlying issue (e.g., database connection, permissions)
3. Re-run migrations - they will skip already-applied ones

### Need to Start Fresh

To completely reset and start over:
```bash
# This drops ALL tables and reruns ALL migrations
cd src/db/database
node setup.js
```

**Warning:** This will delete ALL data in your database!

## Database Backup Commands

### PostgreSQL Backup
```bash
pg_dump -U your_username -d your_database > backup_before_migration.sql
```

### PostgreSQL Restore
```bash
psql -U your_username -d your_database < backup_before_migration.sql
```

## Support

For issues or questions about the new schema, refer to:
- `NEW_EVENT_SYSTEM_SCHEMA.md` - Detailed schema documentation
- Migration files in `src/db/database/migrations/` - Source code with comments

