# Collection Log & Kill Count Sync Implementation

## Overview
Implemented full collection log and kill count syncing from RuneLite plugin to the database.

## Changes Made

### 1. **Database Schema Update** (`034_simplify_collection_log_schema.js`)
Created a new migration to align the database schema with the actual code implementation:

#### Changes to `osrs_account_collection_log`:
- **Before**: Stored individual items with FK to `collection_log_items`
- **After**: Stores only summary data (total obtained, total items, last updated)
- **Columns**: 
  - `osrs_account_id` (UNIQUE)
  - `total_obtained`
  - `total_items`
  - `last_updated_at`

#### Changes to `osrs_account_collection_log_drops`:
- **Before**: Used FK to `collection_log_items` table
- **After**: Stores items directly (no FK required)
- **Columns**:
  - `osrs_account_id`
  - `category` (e.g., "Bosses", "Raids", "Clues")
  - `source` (e.g., "Araxxor", "Chambers of Xeric")
  - `item_id` (OSRS item ID)
  - `item_name`
  - `quantity`
  - `obtained_at`

#### Changes to `osrs_account_killcounts`:
- Renamed columns to match code usage:
  - `activity_name` → `boss_name`
  - `killcount` → `kill_count`
  - `last_updated` → `last_updated_at`
- Added `category` column (VARCHAR 100)
- Updated constraint: `unique_account_activity` → `unique_account_boss`

### 2. **Sync Service Updates** (`src/db/services/sync.service.ts`)
Enabled collection log and kill count storage in the main sync flow:

#### Steps Now Running:
1. ✅ Upsert OSRS account
2. ✅ Check sync status (per category)
3. ❌ Calculate points (skipped for testing)
4. ❌ Get previous points (skipped for testing)
5. ❌ Calculate delta points (skipped for testing)
6. ✅ **5.5. Store quest data**
7. ✅ **6. Store achievement diary completions**
8. ✅ **7. Store combat achievements**
9. ✅ **8. Store collection log data** ⬅️ NOW ENABLED
10. ✅ **9. Store kill counts** ⬅️ NOW ENABLED
11. ❌ Update points breakdown (skipped for testing)
12. ❌ Update denormalized counters (skipped for testing)

### 3. **Collection Log Seed Data**
Created extensive seed data migrations (024-033) covering:
- **Bosses** (~530 items)
- **Raids** (~230 items)
- **Clues** (Beginner → Master, 3rd Age, Gilded, ~582 items)
- **Minigames** (Barbarian Assault, Castle Wars, Last Man Standing, etc., ~286 items)
- **Other** (All Pets, Slayer, Forestry, TzHaar, Miscellaneous, ~663 items)

**Total: ~2,400+ collection log items** across 10 migrations

## How It Works

### Collection Log Storage (`storeCollectionLog`)
1. **Upserts summary**: Updates `total_obtained` and `total_items` in `osrs_account_collection_log`
2. **Deletes old drops**: Removes all existing drops for the account
3. **Inserts current state**: Stores ALL currently obtained items
4. **Strategy**: Full state sync (not delta) to ensure data integrity

### Kill Count Storage (`storeKillCounts`)
1. **Extracts KC from collection log**: Each collection log entry has a `kc` field
2. **Deletes old KC**: Removes all existing kill counts for the account
3. **Inserts current state**: Stores all current kill counts with category
4. **Strategy**: Full state sync (not delta)

Example KC data stored:
```javascript
{
  boss_name: "Araxxor",
  kill_count: 20,
  category: "Bosses",
  last_updated_at: "2025-11-09 12:00:00"
}
```

## Data Flow

```
RuneLite Plugin
     ↓
SYNC Event Webhook
     ↓
src/runelite/events/sync.ts (handleSyncEvent)
     ↓
src/db/services/sync.service.ts (storeSyncData)
     ↓
├─ storeCollectionLog()
│  ├─ Upsert summary (total obtained/total items)
│  ├─ DELETE all existing drops
│  └─ INSERT all currently obtained items
│
└─ storeKillCounts()
   ├─ DELETE all existing kill counts
   └─ INSERT all current kill counts from collection log
```

## Testing Status

### Ready to Test:
- ✅ Collection log item storage
- ✅ Kill count storage
- ✅ Summary data updates
- ✅ All seed data migrations

### Still Disabled (for testing):
- ❌ Points calculation
- ❌ Points breakdown updates
- ❌ Denormalized counter updates

## Next Steps

1. **Run migrations**:
   ```bash
   npm run migrate
   ```
   This will:
   - Seed all collection log items (migrations 024-033)
   - Update collection log schema (migration 034)

2. **Test with RuneLite plugin**:
   - Send a SYNC event from RuneLite
   - Verify collection log items are stored
   - Verify kill counts are stored correctly
   - Check logs for step 8 and 9 completion

3. **Enable remaining steps**:
   - Once collection log storage is verified
   - Uncomment steps 10-11 (points and denormalized counters)
   - Test full sync flow

## Database Tables

### `osrs_account_collection_log` (Summary)
Stores overall collection log progress per account.

### `osrs_account_collection_log_drops` (Items)
Stores individual obtained items with full details.
- No foreign key to `collection_log_items` (flexible sync)
- Includes category and source for filtering
- Full state sync on each update

### `osrs_account_killcounts` (Kill Counts)
Stores kill counts extracted from collection log data.
- Boss name, kill count, category
- Full state sync on each update
- Indexed for fast leaderboard queries

### `collection_log_items` (Reference Data)
Static reference table with all possible collection log items.
- Used for seed data (migrations 024-033)
- Can be used for validation/lookups in future
- NOT used as FK (allows flexible syncing)

## Benefits of This Approach

1. **Simple Sync Logic**: No need to calculate deltas for collection log
2. **Data Integrity**: Full state sync ensures consistency
3. **No FK Constraints**: Flexible for RuneLite plugin data format
4. **Fast Queries**: Direct item storage with proper indexes
5. **Category Tracking**: Kill counts include category for better organization
6. **Efficient Storage**: Only obtained items are stored (not all possible items)

## Performance Considerations

- **DELETE + INSERT**: Used for collection log and KC (acceptable for user-triggered syncs)
- **Indexes**: Added on account_id, item_id, category, source for fast queries
- **Batch Inserts**: All items inserted in single query with parameterized values
- **Transaction**: Everything wrapped in BEGIN/COMMIT for atomicity

