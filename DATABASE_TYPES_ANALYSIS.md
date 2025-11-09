# Database Schema Critical Analysis

## Overview
This document provides a critical analysis of the current database schema, highlighting redundancies, missing columns, and potential improvements.

---

## ✅ Well-Designed Tables

### 1. `members` Table
**Purpose:** Core Discord member tracking  
**Status:** ✅ Good design  
**Notes:**
- Simple, focused responsibility
- Good indexes on discord_id
- `member_code` is useful for quick identification
- `token_balance` denormalization is justified (frequently accessed)

### 2. `osrs_accounts` Table  
**Purpose:** Multiple OSRS account support per Discord member  
**Status:** ⚠️ Needs review (see issues below)  
**Positives:**
- Good separation from Discord members
- Supports multiple accounts per member
- Foreign key to members table

### 3. `coffer_balance` & `coffer_movements` Tables
**Purpose:** Clan coffer (treasury) tracking  
**Status:** ✅ Excellent design  
**Notes:**
- Proper audit trail with movements
- Balance tracking with before/after
- Triggers handle balance updates automatically
- Good separation of concerns

### 4. `donations` & `donation_categories` Tables
**Purpose:** Donation approval workflow  
**Status:** ✅ Good design  
**Notes:**
- Proper workflow states (pending/approved/denied)
- Category system is flexible
- Links to Discord messages for context

### 5. Battleship Bingo System
**Purpose:** Complex event management  
**Status:** ✅ Excellent design  
**Notes:**
- Very well thought out
- Comprehensive state tracking
- Good use of JSONB for flexible data
- Proper foreign key relationships
- UUID usage is appropriate for distributed events

---

## ⚠️ Tables With Issues

### 1. `osrs_accounts` - Denormalization Overload

**Problem:** Too many denormalized counters that are rarely used

**Current Redundant Fields:**
```typescript
// Rarely used (can be derived from detail tables)
diary_easy_count      // Query: SELECT COUNT(*) FROM osrs_account_diary_completions WHERE tier='easy'
diary_medium_count    // Query: SELECT COUNT(*) FROM osrs_account_diary_completions WHERE tier='medium'
diary_hard_count      // Query: SELECT COUNT(*) FROM osrs_account_diary_completions WHERE tier='hard'
diary_elite_count     // Query: SELECT COUNT(*) FROM osrs_account_diary_completions WHERE tier='elite'
diary_total_count     // Redundant: easy + medium + hard + elite

ca_easy_count         // Query: SELECT COUNT(*) FROM osrs_account_combat_achievements WHERE tier='easy'
ca_medium_count       // Query: SELECT COUNT(*) FROM osrs_account_combat_achievements WHERE tier='medium'
ca_hard_count         // Query: SELECT COUNT(*) FROM osrs_account_combat_achievements WHERE tier='hard'
ca_elite_count        // Query: SELECT COUNT(*) FROM osrs_account_combat_achievements WHERE tier='elite'
ca_master_count       // Query: SELECT COUNT(*) FROM osrs_account_combat_achievements WHERE tier='master'
ca_grandmaster_count  // Query: SELECT COUNT(*) FROM osrs_account_combat_achievements WHERE tier='grandmaster'

clog_completion_percentage  // Redundant: (clog_items_obtained / clog_total_items) * 100

total_events          // Rarely queried, can be derived from osrs_account_events
last_event_at         // Rarely useful for filtering

points_rank           // Should be computed from materialized view, not stored
```

**Fields To KEEP (frequently used for sorting/filtering):**
```typescript
quest_points          // ✅ Used in leaderboards, API responses
total_points          // ✅ PRIMARY ranking field
ca_total_count        // ✅ Used in API responses
clog_items_obtained   // ✅ Used in leaderboards
clog_total_items      // ✅ Needed to calculate completion %
ehp                   // ✅ Primary ranking metric
ehb                   // ✅ Primary ranking metric
```

**Recommendation:**
- **DROP:** Tier-specific counters (easy/medium/hard/elite for diaries and CAs)
- **DROP:** `clog_completion_percentage` (compute on-the-fly)
- **DROP:** `total_events`, `last_event_at`, `points_rank`
- **KEEP:** Only top-level aggregates used in leaderboards/API

**Impact:**
- Reduces table width by ~15 columns
- Simplifies triggers
- Minimal performance impact (tier breakdowns are rarely queried)

---

### 2. `achievement_diary_tiers` Table

**Problem:** Static data that should be in code

**Current Schema:**
```sql
CREATE TABLE achievement_diary_tiers (
  id SERIAL PRIMARY KEY,
  diary_name VARCHAR(50),
  tier VARCHAR(10),
  total_tasks INTEGER,
  ...
)
```

**Issues:**
- This is game data that **never changes** without game updates
- Requires database inserts/updates for static information
- Foreign key adds complexity
- Migration 014 inserts 48 static rows

**Recommendation:**
```typescript
// src/constants/achievement-diaries.ts
export const ACHIEVEMENT_DIARIES = {
  'Ardougne': { easy: 10, medium: 11, hard: 14, elite: 13 },
  'Desert': { easy: 12, medium: 11, hard: 11, elite: 10 },
  // ... etc
} as const

export const DIARY_POINTS = {
  easy: 5,
  medium: 10,
  hard: 20,
  elite: 50
} as const
```

**New Schema:**
```sql
-- Simplified: Just store what player completed
CREATE TABLE osrs_account_diary_completions (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER REFERENCES osrs_accounts(id),
  diary_name VARCHAR(50),    -- e.g. 'Ardougne'
  tier VARCHAR(10),           -- e.g. 'elite'
  completed_at TIMESTAMP,
  UNIQUE(osrs_account_id, diary_name, tier)
)
```

**Benefits:**
- No static reference table needed
- Simpler schema
- Easier to update game data (just update code)
- Faster queries (no JOIN needed)

---

### 3. `combat_achievements` Table

**Problem:** Same issue as achievement_diary_tiers

**Current Schema:**
```sql
CREATE TABLE combat_achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150),
  tier VARCHAR(20),
  type VARCHAR(50),
  monster VARCHAR(100),
  description TEXT
  ...
)
```

**Issues:**
- 500+ static rows for all Combat Achievements
- Never changes except with game updates
- Foreign key complexity

**Recommendation:**
```typescript
// src/constants/combat-achievements.ts
export const COMBAT_ACHIEVEMENTS = [
  { name: 'Crystalline Hunllef Speed-Chaser', tier: 'grandmaster', type: 'Speed', monster: 'Crystalline Hunllef' },
  // ... 500+ more
] as const
```

**New Schema:**
```sql
CREATE TABLE osrs_account_combat_achievements (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER REFERENCES osrs_accounts(id),
  achievement_name VARCHAR(150),  -- Direct reference to achievement name
  completed_at TIMESTAMP,
  UNIQUE(osrs_account_id, achievement_name)
)
```

---

### 4. `collection_log_items` Table

**Problem:** Same static data issue

**Current Schema:**
```sql
CREATE TABLE collection_log_items (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(150),
  category VARCHAR(100),
  subcategory VARCHAR(150),
  rarity VARCHAR(20),
  wiki_url TEXT
  ...
)
```

**Issues:**
- 1,500+ static rows for all collection log items
- Requires maintenance
- Wiki URLs can become outdated

**Recommendation:**
```typescript
// src/constants/collection-log.ts
export const COLLECTION_LOG_STRUCTURE = {
  'Bosses': {
    'God Wars Dungeon': {
      'Kree\'arra': ['Armadyl helmet', 'Armadyl chestplate', ...],
      // ...
    }
  },
  // ...
} as const
```

**New Schema:**
```sql
-- Just store what the player has
CREATE TABLE osrs_account_collection_log (
  id SERIAL PRIMARY KEY,
  osrs_account_id INTEGER REFERENCES osrs_accounts(id),
  item_name VARCHAR(150),
  category VARCHAR(100),
  subcategory VARCHAR(150),
  quantity INTEGER DEFAULT 1,
  obtained_at TIMESTAMP,
  UNIQUE(osrs_account_id, item_name, subcategory)
)
```

---

### 5. `point_rules` Table

**Problem:** Business logic should not be in database

**Current Schema:**
```sql
CREATE TABLE point_rules (
  id SERIAL PRIMARY KEY,
  rule_type VARCHAR(50),
  rule_key VARCHAR(100),
  points INTEGER,
  description TEXT,
  is_active BOOLEAN
  ...
)
```

**Issues:**
- Point rules are **business logic**, not data
- Changes require database migrations
- Can't easily version control
- Hard to test
- `is_active` flag is a code smell (should just not exist)

**Recommendation:**
```typescript
// src/services/points-system.ts
export const POINT_RULES = {
  quest: {
    per_point: 1,
    milestones: { 100: 50, 200: 100, 300: 200 }
  },
  diary: {
    easy: 5,
    medium: 10,
    hard: 20,
    elite: 50
  },
  combat_achievement: {
    // Uses in-game points directly
  },
  collection_log: {
    per_item: 2,
    milestones: { 100: 100, 250: 250, 500: 500, 1000: 1000, 1500: 1500 }
  },
  boss_kc: {
    milestones: [50, 100, 250, 500, 1000, 2500, 5000],
    points: 10 // per milestone
  }
} as const
```

**Benefits:**
- Version controlled
- Easy to test
- No database migration needed to change rules
- Can be hot-reloaded in development
- Immutable (`as const`)

---

### 6. Player Snapshots - Potential Redundancy

**Tables:**
- `player_snapshots`
- `player_skills_snapshots`
- `player_bosses_snapshots`
- `player_activities_snapshots`
- `player_computed_snapshots`

**Question:** Do we need `player_bosses_snapshots` and `player_activities_snapshots`?

**Analysis:**
- We're now tracking boss KC in `osrs_account_killcounts` from RuneLite plugin
- We're now tracking activities in `osrs_account_events` from RuneLite plugin
- **Wise Old Man snapshots** are good for historical tracking
- **RuneLite data** is real-time and more accurate

**Recommendation:**
- **KEEP** `player_skills_snapshots` - Wise Old Man skill tracking is good
- **KEEP** `player_computed_snapshots` - EHP/EHB calculations
- **CONSIDER:** Do we need WOM boss/activity snapshots if we have real-time data?
  - **Pro keeping:** Historical comparison, external validation
  - **Pro removing:** Reduces data duplication, simplifies system

**Verdict:** Keep for now, but monitor usage. If rarely queried, consider removing.

---

## 🔴 Missing Columns

### 1. `osrs_accounts` Missing Fields

**Missing:**
```sql
ALTER TABLE osrs_accounts
ADD COLUMN account_hash VARCHAR(255),      -- ✅ Migration 020 adds this
ADD COLUMN account_type VARCHAR(20),       -- Missing! (NORMAL, IRONMAN, HARDCORE, ULTIMATE, GROUP)
ADD COLUMN ca_points INTEGER DEFAULT 0;    -- Missing! (In-game CA points for ranking)
```

**Need:**
- `account_type` - For filtering ironman vs main accounts
- `ca_points` - RuneLite sends this, useful for CA leaderboards

### 2. `osrs_account_diary_completions` Simplified

**Current:**
```sql
diary_tier_id INTEGER REFERENCES achievement_diary_tiers(id)
```

**Should be:**
```sql
diary_name VARCHAR(50),  -- 'Ardougne', 'Desert', etc.
tier VARCHAR(10)         -- 'easy', 'medium', 'hard', 'elite'
```

### 3. `osrs_account_events` Partition Management

**Current:** Manual partition creation every month

**Missing:**
```sql
-- Automated partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  end_date := start_date + INTERVAL '1 month';
  partition_name := 'osrs_account_events_' || TO_CHAR(start_date, 'YYYY_MM');
  
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I
    PARTITION OF osrs_account_events
    FOR VALUES FROM (%L) TO (%L)
  ', partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

**Recommendation:** Add cron job or trigger to auto-create partitions

---

## 📊 Index Analysis

### Good Indexes

✅ Foreign keys are properly indexed  
✅ Frequently queried fields have indexes  
✅ Composite indexes for common query patterns  

### Missing Indexes

**Recommended additions:**
```sql
-- For leaderboard queries (frequently accessed together)
CREATE INDEX idx_osrs_accounts_leaderboard 
ON osrs_accounts(total_points DESC, quest_points DESC, clog_items_obtained DESC);

-- For activity feed queries
CREATE INDEX idx_osrs_account_events_account_type_time 
ON osrs_account_events(osrs_account_id, event_type, created_at DESC);

-- For collection log category queries
CREATE INDEX idx_clog_category_subcategory 
ON osrs_account_collection_log(category, subcategory);
```

---

## 🎯 Summary of Recommendations

### High Priority (Do Now)

1. ✅ **Add `account_hash`** to `osrs_accounts` - **DONE** (Migration 020)
2. ⚠️ **Add `account_type`** to `osrs_accounts` - **NEEDED**
3. ⚠️ **Add `ca_points`** to `osrs_accounts` - **NEEDED**

### Medium Priority (Plan)

4. **Remove redundant static tables:**
   - `achievement_diary_tiers` → Move to code
   - `combat_achievements` → Move to code
   - `collection_log_items` → Move to code
   - `point_rules` → Move to code

5. **Simplify `osrs_accounts` denormalization:**
   - Remove tier-specific counters
   - Keep only frequently-used aggregates

### Low Priority (Monitor)

6. **Evaluate snapshot tables:**
   - Monitor usage of `player_bosses_snapshots`
   - Monitor usage of `player_activities_snapshots`
   - Consider removing if RuneLite data is sufficient

7. **Automated partition management:**
   - Add function for auto-creating monthly partitions

---

## 💡 Design Principles Applied

### When to Denormalize (Keep Redundant Fields)
✅ Field is used in ORDER BY for leaderboards  
✅ Field is returned in every API response  
✅ Field is filtered on frequently  
✅ Computing it requires expensive JOINs or aggregations  

### When NOT to Denormalize
❌ Field is rarely queried  
❌ Field can be computed with a simple COUNT() query  
❌ Field is only used in detail views  
❌ Maintaining consistency requires complex triggers  

### When to Use Static Tables
✅ Data changes frequently in production  
✅ Different deployments need different data  
✅ Users can customize data  

### When to Use Code Constants
✅ Data is defined by game mechanics  
✅ Data only changes with game updates  
✅ Data is identical across all deployments  
✅ Data needs version control  

---

## 📈 Performance Impact Estimate

### Current Schema
- `osrs_accounts`: ~25 columns (including redundant ones)
- Query time (leaderboard): ~50ms
- Storage per player: ~2KB

### Optimized Schema
- `osrs_accounts`: ~15 columns (remove redundant ones)
- Query time (leaderboard): ~45ms (5ms faster - less data to scan)
- Storage per player: ~1.5KB (25% reduction)

### At Scale (10,000 players)
- **Storage saved:** ~5MB (not significant)
- **Time saved per query:** 5ms (not significant)
- **Maintenance saved:** Significant (fewer triggers, simpler schema)

**Verdict:** Changes are more about **code maintainability** than performance

---

## 🔧 Migration Strategy

### Phase 1: Additions (Non-Breaking)
1. Add `account_type` and `ca_points` to `osrs_accounts`
2. Add missing indexes
3. Add partition auto-creation function

### Phase 2: Code Refactor (Non-Breaking)
1. Move static data to code constants
2. Update services to use code constants
3. Run alongside existing tables for validation

### Phase 3: Cleanup (Breaking - Requires Testing)
1. Remove redundant static tables
2. Remove redundant denormalized columns
3. Simplify triggers
4. Update all queries

---

## ✅ Conclusion

The current schema is **generally well-designed** with good use of:
- Foreign keys
- Indexes
- Triggers
- Partitioning (for events)
- JSONB for flexible data

Main improvements:
- **Reduce denormalization** to only frequently-used fields
- **Move static game data** to code constants
- **Move business logic** (point rules) to code
- **Add missing fields** for account type and CA points

The battleship bingo system is **exemplary** - very well thought out and comprehensive.

