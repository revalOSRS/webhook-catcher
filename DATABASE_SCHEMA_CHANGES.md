# Database Schema Changes for RuneLite SYNC System

## Overview
This document outlines the required changes to the database schema to support the RuneLite plugin SYNC system, remove redundant tables, and consolidate static data into code.

## Executive Summary

### Tables to KEEP (with modifications)
- `osrs_accounts` - Main player accounts table
- `osrs_account_diary_completions` - Achievement diary progress
- `osrs_account_combat_achievements` - Combat achievement completion tracking
- `osrs_account_collection_log` - Collection log summary
- `osrs_account_collection_log_drops` - Individual collection log items
- `osrs_account_killcounts` - Boss kill counts
- `osrs_account_points_breakdown` - Points by category
- `osrs_account_events` - For non-SYNC events (loot, deaths, etc.)
- `osrs_account_daily_stats` - Daily aggregations
- `player_skills_snapshots` - From Wise Old Man
- `player_computed_snapshots` - From Wise Old Man
- `player_snapshots` - From Wise Old Man

### Tables to REMOVE/NOT CREATE
- `achievement_diary_tiers` ❌ - Static data, moved to code
- `collection_log_items` ❌ - Static data, moved to code
- `combat_achievements` ❌ - Static data, moved to code
- `point_rules` ❌ - Logic moved to code
- `player_activities_snapshots` ❌ - Replaced by our tracking
- `player_bosses_snapshots` ❌ - Replaced by our tracking

---

## Required Schema Changes

### 1. `osrs_accounts` Table

**Keep only essential denormalized fields for performance:**

```sql
ALTER TABLE osrs_accounts
-- Player identification
ADD COLUMN IF NOT EXISTS account_hash TEXT, -- RuneLite plugin hash
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'NORMAL', -- NORMAL, IRONMAN, etc.
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,

-- Denormalized counters (for fast leaderboards/API responses)
ADD COLUMN IF NOT EXISTS quest_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0, -- Overall achievement points
ADD COLUMN IF NOT EXISTS ca_points INTEGER DEFAULT 0, -- Combat achievement points from game
ADD COLUMN IF NOT EXISTS clog_items_obtained INTEGER DEFAULT 0,

-- Optional: Keep these ONLY if you display them separately
ADD COLUMN IF NOT EXISTS quests_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ca_total_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clog_total_items INTEGER DEFAULT 0;

-- Add unique constraint on username
ALTER TABLE osrs_accounts
ADD CONSTRAINT osrs_accounts_username_unique UNIQUE (username);
```

**Fields to REMOVE (redundant, get from detail tables):**
```sql
-- Remove these - query the osrs_account_diary_completions table instead
ALTER TABLE osrs_accounts
DROP COLUMN IF EXISTS diary_easy_count,
DROP COLUMN IF EXISTS diary_medium_count,
DROP COLUMN IF EXISTS diary_hard_count,
DROP COLUMN IF EXISTS diary_elite_count,
DROP COLUMN IF EXISTS diary_total_count;

-- Remove these - query osrs_account_combat_achievements table instead  
ALTER TABLE osrs_accounts
DROP COLUMN IF EXISTS ca_easy_count,
DROP COLUMN IF EXISTS ca_medium_count,
DROP COLUMN IF EXISTS ca_hard_count,
DROP COLUMN IF EXISTS ca_elite_count,
DROP COLUMN IF EXISTS ca_master_count,
DROP COLUMN IF EXISTS ca_grandmaster_count;

-- Remove these - query osrs_account_points_breakdown instead
DROP COLUMN IF EXISTS points_rank,
DROP COLUMN IF EXISTS points_last_updated;

-- Remove these - calculated from detail tables
DROP COLUMN IF EXISTS clog_completion_percentage;

-- Remove these - query osrs_account_events instead
DROP COLUMN IF EXISTS total_events,
DROP COLUMN IF EXISTS last_event_at;
```

### Why Keep SOME Denormalized Fields?

**Keep these for performance:**
- `quest_points` - Used in leaderboards, clan stats
- `total_points` - Main leaderboard sort field
- `ca_points` - Used for combat achievement rankings
- `clog_items_obtained` - Used for collection log rankings

**Remove tier-specific counts because:**
- They're not used for sorting/filtering
- Can query detail tables when needed (rare)
- Reduces update complexity
- Less chance of data inconsistency

**Access Pattern Examples:**
```sql
-- Fast (using denormalized fields)
SELECT username, total_points, quest_points 
FROM osrs_accounts 
ORDER BY total_points DESC 
LIMIT 100;

-- Only when needed (join for details)
SELECT a.username, COUNT(d.id) as diary_count
FROM osrs_accounts a
LEFT JOIN osrs_account_diary_completions d ON d.osrs_account_id = a.id
WHERE d.tier = 'elite'
GROUP BY a.username;

### 2. `osrs_account_diary_completions` Table

```sql
CREATE TABLE IF NOT EXISTS osrs_account_diary_completions (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  diary_area TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('easy', 'medium', 'hard', 'elite')),
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, diary_area, tier)
);

CREATE INDEX idx_osrs_diary_completions_account 
ON osrs_account_diary_completions(osrs_account_id);
```

### 3. `osrs_account_combat_achievements` Table

```sql
CREATE TABLE IF NOT EXISTS osrs_account_combat_achievements (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('easy', 'medium', 'hard', 'elite', 'master', 'grandmaster')),
  points INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, task_id)
);

CREATE INDEX idx_osrs_ca_account 
ON osrs_account_combat_achievements(osrs_account_id);

CREATE INDEX idx_osrs_ca_tier 
ON osrs_account_combat_achievements(tier);
```

### 4. `osrs_account_collection_log` Table

```sql
CREATE TABLE IF NOT EXISTS osrs_account_collection_log (
  osrs_account_id INTEGER PRIMARY KEY REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  total_obtained INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. `osrs_account_collection_log_drops` Table

```sql
CREATE TABLE IF NOT EXISTS osrs_account_collection_log_drops (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  obtained_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, item_id, source)
);

CREATE INDEX idx_osrs_clog_drops_account 
ON osrs_account_collection_log_drops(osrs_account_id);

CREATE INDEX idx_osrs_clog_drops_category 
ON osrs_account_collection_log_drops(category);
```

### 6. `osrs_account_killcounts` Table

```sql
CREATE TABLE IF NOT EXISTS osrs_account_killcounts (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  boss_name TEXT NOT NULL,
  kill_count INTEGER DEFAULT 0,
  category TEXT,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, boss_name)
);

CREATE INDEX idx_osrs_kc_account 
ON osrs_account_killcounts(osrs_account_id);

CREATE INDEX idx_osrs_kc_boss 
ON osrs_account_killcounts(boss_name);
```

### 7. `osrs_account_points_breakdown` Table

```sql
CREATE TABLE IF NOT EXISTS osrs_account_points_breakdown (
  osrs_account_id INTEGER PRIMARY KEY REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  quest_points INTEGER DEFAULT 0,
  diary_points INTEGER DEFAULT 0,
  combat_achievement_points INTEGER DEFAULT 0,
  collection_log_points INTEGER DEFAULT 0,
  boss_kill_points INTEGER DEFAULT 0,
  skill_points INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_osrs_points_total 
ON osrs_account_points_breakdown(total_points DESC);
```

### 8. `osrs_account_events` Table (Keep for non-SYNC events)

```sql
-- This table should be kept for tracking events like loot, deaths, etc.
-- SYNC events update the tables directly, not via this table

CREATE TABLE IF NOT EXISTS osrs_account_events (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  event_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_osrs_events_account 
ON osrs_account_events(osrs_account_id);

CREATE INDEX idx_osrs_events_type 
ON osrs_account_events(event_type);

CREATE INDEX idx_osrs_events_timestamp 
ON osrs_account_events(event_timestamp DESC);
```

### 9. `osrs_account_daily_stats` Table

```sql
CREATE TABLE IF NOT EXISTS osrs_account_daily_stats (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  quest_points INTEGER DEFAULT 0,
  diaries_completed INTEGER DEFAULT 0,
  ca_completed INTEGER DEFAULT 0,
  clog_items INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, stat_date)
);

CREATE INDEX idx_osrs_daily_stats_account_date 
ON osrs_account_daily_stats(osrs_account_id, stat_date DESC);
```

---

## Migration Script

Here's the complete migration to run:

```sql
-- Migration: RuneLite SYNC System Schema

BEGIN;

-- 1. Modify osrs_accounts table (keep only essential denormalized fields)
ALTER TABLE osrs_accounts
ADD COLUMN IF NOT EXISTS account_hash TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS quest_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quests_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ca_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ca_total_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clog_items_obtained INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clog_total_items INTEGER DEFAULT 0;

-- Remove redundant tier-specific counters (query detail tables instead)
ALTER TABLE osrs_accounts
DROP COLUMN IF EXISTS diary_easy_count,
DROP COLUMN IF EXISTS diary_medium_count,
DROP COLUMN IF EXISTS diary_hard_count,
DROP COLUMN IF EXISTS diary_elite_count,
DROP COLUMN IF EXISTS diary_total_count,
DROP COLUMN IF EXISTS ca_easy_count,
DROP COLUMN IF EXISTS ca_medium_count,
DROP COLUMN IF EXISTS ca_hard_count,
DROP COLUMN IF EXISTS ca_elite_count,
DROP COLUMN IF EXISTS ca_master_count,
DROP COLUMN IF EXISTS ca_grandmaster_count,
DROP COLUMN IF EXISTS clog_completion_percentage,
DROP COLUMN IF EXISTS total_events,
DROP COLUMN IF EXISTS last_event_at,
DROP COLUMN IF EXISTS points_rank,
DROP COLUMN IF EXISTS points_last_updated;

-- 2. Create diary completions table
CREATE TABLE IF NOT EXISTS osrs_account_diary_completions (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  diary_area TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('easy', 'medium', 'hard', 'elite')),
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, diary_area, tier)
);

CREATE INDEX IF NOT EXISTS idx_osrs_diary_completions_account 
ON osrs_account_diary_completions(osrs_account_id);

-- 3. Create combat achievements table
CREATE TABLE IF NOT EXISTS osrs_account_combat_achievements (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('easy', 'medium', 'hard', 'elite', 'master', 'grandmaster')),
  points INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_osrs_ca_account 
ON osrs_account_combat_achievements(osrs_account_id);

CREATE INDEX IF NOT EXISTS idx_osrs_ca_tier 
ON osrs_account_combat_achievements(tier);

-- 4. Create collection log summary table
CREATE TABLE IF NOT EXISTS osrs_account_collection_log (
  osrs_account_id INTEGER PRIMARY KEY REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  total_obtained INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create collection log drops table
CREATE TABLE IF NOT EXISTS osrs_account_collection_log_drops (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  obtained_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, item_id, source)
);

CREATE INDEX IF NOT EXISTS idx_osrs_clog_drops_account 
ON osrs_account_collection_log_drops(osrs_account_id);

CREATE INDEX IF NOT EXISTS idx_osrs_clog_drops_category 
ON osrs_account_collection_log_drops(category);

-- 6. Create killcounts table
CREATE TABLE IF NOT EXISTS osrs_account_killcounts (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  boss_name TEXT NOT NULL,
  kill_count INTEGER DEFAULT 0,
  category TEXT,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, boss_name)
);

CREATE INDEX IF NOT EXISTS idx_osrs_kc_account 
ON osrs_account_killcounts(osrs_account_id);

CREATE INDEX IF NOT EXISTS idx_osrs_kc_boss 
ON osrs_account_killcounts(boss_name);

-- 7. Create points breakdown table
CREATE TABLE IF NOT EXISTS osrs_account_points_breakdown (
  osrs_account_id INTEGER PRIMARY KEY REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  quest_points INTEGER DEFAULT 0,
  diary_points INTEGER DEFAULT 0,
  combat_achievement_points INTEGER DEFAULT 0,
  collection_log_points INTEGER DEFAULT 0,
  boss_kill_points INTEGER DEFAULT 0,
  skill_points INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_osrs_points_total 
ON osrs_account_points_breakdown(total_points DESC);

-- 8. Create events table
CREATE TABLE IF NOT EXISTS osrs_account_events (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  event_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_osrs_events_account 
ON osrs_account_events(osrs_account_id);

CREATE INDEX IF NOT EXISTS idx_osrs_events_type 
ON osrs_account_events(event_type);

CREATE INDEX IF NOT EXISTS idx_osrs_events_timestamp 
ON osrs_account_events(event_timestamp DESC);

-- 9. Create daily stats table
CREATE TABLE IF NOT EXISTS osrs_account_daily_stats (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER NOT NULL REFERENCES osrs_accounts(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  quest_points INTEGER DEFAULT 0,
  diaries_completed INTEGER DEFAULT 0,
  ca_completed INTEGER DEFAULT 0,
  clog_items INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (osrs_account_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_osrs_daily_stats_account_date 
ON osrs_account_daily_stats(osrs_account_id, stat_date DESC);

-- 10. Drop redundant tables (if they exist)
DROP TABLE IF EXISTS achievement_diary_tiers CASCADE;
DROP TABLE IF EXISTS collection_log_items CASCADE;
DROP TABLE IF EXISTS combat_achievements CASCADE;
DROP TABLE IF EXISTS point_rules CASCADE;
DROP TABLE IF EXISTS player_activities_snapshots CASCADE;
DROP TABLE IF EXISTS player_bosses_snapshots CASCADE;

COMMIT;
```

---

## Rationale for Changes

### Why Remove Static Data Tables?

**`achievement_diary_tiers`, `collection_log_items`, `combat_achievements`:**
- These contain static game data that rarely changes
- Better maintained in code where it can be versioned and updated easily
- Eliminates database queries for static lookups
- Reduces complexity and potential sync issues

**`point_rules`:**
- Point calculation logic is better in application code
- More flexible and easier to modify
- Can be tested independently
- No risk of database state causing unexpected behavior

### Why Remove Snapshot Tables?

**`player_activities_snapshots`, `player_bosses_snapshots`:**
- Replaced by our own tracking via RuneLite plugin
- More accurate real-time data
- Eliminates dependency on third-party APIs for this data
- Wise Old Man snapshots (`player_skills_snapshots`, etc.) are kept because they track XP gains over time, which we don't need to duplicate

---

## Points System (Now in Code)

The points system is now defined in `/src/services/points-system.ts` with the following rules:

### Point Awards
- **Quest Points:** 1 point per quest point
- **Achievement Diaries:**
  - Easy: 5 points
  - Medium: 10 points
  - Hard: 20 points
  - Elite: 50 points
- **Combat Achievements:** Uses in-game points directly
- **Collection Log:** 2 points per unique item + milestone bonuses
  - 100 items: +50 points
  - 250 items: +100 points
  - 500 items: +250 points
  - 1000 items: +500 points
  - 1500 items: +1000 points
- **Boss Kills:** 10 points per milestone (50, 100, 250, 500, 1000, 2500, 5000 KC)

---

## Implementation Notes

1. **First Sync:** When a player syncs for the first time, they receive full retroactive points for all completed achievements

2. **Subsequent Syncs:** Only new achievements award points (delta calculation)

3. **Data Freshness:** All SYNC operations update `last_synced_at` timestamp

4. **Cascading Deletes:** All foreign key relationships use `ON DELETE CASCADE` for clean data management

5. **Indexes:** Strategic indexes on frequently queried columns (account_id, dates, leaderboard sorting)

---

## Testing Checklist

- [ ] Verify all tables created successfully
- [ ] Test SYNC event with new player (first sync)
- [ ] Test SYNC event with existing player (delta sync)
- [ ] Verify points calculation is correct
- [ ] Test leaderboard queries performance
- [ ] Verify cascade deletes work properly
- [ ] Test with various account types (normal, ironman, etc.)
- [ ] Verify denormalized counters update correctly

---

## Questions?

Contact the backend team for any clarifications or issues with this migration.

