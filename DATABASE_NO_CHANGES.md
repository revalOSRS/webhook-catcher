# Database Schema - No Changes Needed

## Decision

We've decided **NOT** to modify the existing database schema at this time. The current schema with all denormalized fields will remain as-is.

## Current Schema Works With

The RuneLite SYNC system has been implemented to work with the existing `osrs_accounts` table structure, including all current fields:

### Existing Fields (Kept):
- `quest_points`
- `quests_completed`
- `diary_easy_count`
- `diary_medium_count`
- `diary_hard_count`
- `diary_elite_count`
- `diary_total_count`
- `ca_total_count`
- `ca_points`
- `clog_items_obtained`
- `clog_total_items`
- And all other existing fields

### Only Addition Needed:
```sql
ALTER TABLE osrs_accounts
ADD COLUMN IF NOT EXISTS account_hash TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
```

## New Tables Still Need Creation

The following tables are still required for the SYNC system:

1. `osrs_account_diary_completions`
2. `osrs_account_combat_achievements`
3. `osrs_account_collection_log`
4. `osrs_account_collection_log_drops`
5. `osrs_account_killcounts`
6. `osrs_account_points_breakdown`

See `DATABASE_SCHEMA_CHANGES.md` sections 2-7 for these table definitions.

## Migration Script (Simplified)

```sql
BEGIN;

-- Add new fields to osrs_accounts
ALTER TABLE osrs_accounts
ADD COLUMN IF NOT EXISTS account_hash TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Create new tables (copy from DATABASE_SCHEMA_CHANGES.md sections 2-7)
-- ... table creation SQL here ...

COMMIT;
```

## Benefits of Keeping Current Schema

1. **No migration risk** - Existing data remains untouched
2. **No application changes needed** - Current queries still work
3. **Gradual transition** - Can optimize later if needed
4. **Backward compatible** - Old code continues to function

The SYNC system will populate both the denormalized fields AND the detail tables, giving you the flexibility to optimize queries later without breaking anything now.

