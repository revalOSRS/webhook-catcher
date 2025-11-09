# Per-Category Sync Implementation

## Problem Statement

When a player syncs their RuneLite plugin, different categories of data may be synced at different times:

1. **Quest data** - Always synced automatically on logout
2. **Achievement diaries** - Always synced automatically on logout
3. **Combat achievements** - Always synced automatically on logout
4. **Collection log** - **Requires manual button press** ⚠️

### The Edge Case

```
Timeline:
1. Player has 500 collection log items (never synced)
2. Player installs RuneLite plugin, logs in
3. Player does NOT press "Sync Collection Log"
4. Player logs out → SYNC runs with 0 clog items
5. Points awarded: Quests ✅, Diaries ✅, CAs ✅, Clog ❌ (0 points)

Later:
6. Player presses "Sync Collection Log" button
7. SYNC runs again with 500 clog items
8. OLD LOGIC: Treats as delta → Awards 500 items × 2 points
9. NEW LOGIC: Detects first clog sync → Awards FULL retroactive points
```

## Solution: Per-Category First Sync Tracking

### Core Logic

Each data category is tracked independently:

```typescript
interface SyncStatusFlags {
  isFirstOverallSync: boolean           // First time ANY data synced
  isFirstQuestSync: boolean             // First time quest data synced
  isFirstDiarySync: boolean             // First time diary data synced
  isFirstCombatAchievementSync: boolean // First time CA data synced
  isFirstCollectionLogSync: boolean     // First time clog data synced
}
```

### Detection Strategy

**For each category:**
1. Check if DB counter is 0/NULL
2. Check if payload has data for that category
3. If DB = 0 AND payload has data → **First sync for that category**

**Examples:**

| Category | DB Counter | Payload Has Data | Result |
|----------|-----------|------------------|---------|
| Quests | 0 QP | Yes (150 QP) | ✅ **First quest sync** |
| Diaries | 5 completed | Yes (6 completed) | ❌ Delta sync (not first) |
| Clog | 0 items | Yes (500 items) | ✅ **First clog sync** |
| CAs | 10 completed | Yes (10 completed) | ❌ Delta sync (no change) |

### Implementation

```typescript
async function checkSyncStatus(
  client: any, 
  accountId: number, 
  payload: SyncEventPayload
): Promise<SyncStatusFlags> {
  // Get current state from DB
  const account = await client.query(`
    SELECT 
      quests_completed,
      diary_total_count,
      ca_total_count,
      clog_items_obtained
    FROM osrs_accounts 
    WHERE id = $1
  `, [accountId])
  
  // Check each category independently
  return {
    isFirstQuestSync: !account.quests_completed || account.quests_completed.length === 0,
    isFirstDiarySync: account.diary_total_count === 0 && payload.achievementDiaries.totalCompleted > 0,
    isFirstCombatAchievementSync: account.ca_total_count === 0 && hasCaDataInPayload,
    isFirstCollectionLogSync: account.clog_items_obtained === 0 && payload.collectionLog.obtainedItems > 0,
    isFirstOverallSync: /* any of the above */
  }
}
```

### Points Calculation

```typescript
const pointsToAward: PointsBreakdown = {
  byCategory: {
    // Quests: Full points if first sync, delta otherwise
    quests: syncStatus.isFirstQuestSync 
      ? currentPoints.byCategory.quests 
      : currentPoints.byCategory.quests - previousPoints.quests,
    
    // Diaries: Full points if first sync, delta otherwise
    achievement_diaries: syncStatus.isFirstDiarySync
      ? currentPoints.byCategory.achievement_diaries
      : currentPoints.byCategory.achievement_diaries - previousPoints.achievement_diaries,
    
    // Combat Achievements: Full points if first sync, delta otherwise
    combat_achievements: syncStatus.isFirstCombatAchievementSync
      ? currentPoints.byCategory.combat_achievements
      : currentPoints.byCategory.combat_achievements - previousPoints.combat_achievements,
    
    // Collection Log: Full points if first sync, delta otherwise ⭐
    collection_log: syncStatus.isFirstCollectionLogSync
      ? currentPoints.byCategory.collection_log  // FULL RETROACTIVE POINTS
      : currentPoints.byCategory.collection_log - previousPoints.collection_log,
    
    // Boss kills and skills: Always delta (not retroactive)
    boss_kills: currentPoints.byCategory.boss_kills - previousPoints.boss_kills,
    skills: currentPoints.byCategory.skills - previousPoints.skills
  },
  total: /* sum of all categories */
}
```

## Benefits

### ✅ Handles Collection Log Edge Case

Player can press "Sync Collection Log" at ANY time and still get full retroactive points.

### ✅ Handles Partial Data Scenarios

```
Scenario 1: Player completes diary after first sync
- First SYNC: 5 diaries completed → Award full points
- Second SYNC: 6 diaries completed → Award delta (1 diary)

Scenario 2: Player syncs clog late
- First SYNC: 0 clog items → Award 0 points
- Second SYNC: 500 clog items → Award full retroactive points ✅

Scenario 3: Player never syncs clog
- All SYNCs: 0 clog items → Award 0 points (correct)
```

### ✅ Fair Point Distribution

- Players get credit for existing achievements when data FIRST appears
- No penalty for forgetting to press "Sync Collection Log" immediately
- No exploits (can't get retroactive points twice for same category)

### ✅ Clear Logging

```
Database storage complete!
Account ID: 123
Overall First Sync: No

Sync Status (Per Category):
  ✅ Quests: Delta sync
  ✅ Diaries: Delta sync
  ✅ Combat Achievements: Delta sync
  ✅ Collection Log: FIRST SYNC (retroactive points) ⭐

Points Awarded:
  Total: 1,042 points
  Quests: 0 points
  Diaries: 0 points
  Combat Achievements: 0 points
  Collection Log: 1,000 points ⭐
  Boss Kills: 42 points
```

## Edge Cases Handled

### 1. Account with No Data

```
DB: All counters = 0
Payload: Has data
Result: All categories marked as "first sync" ✅
```

### 2. Account with Some Data

```
DB: Quests = 150, Diaries = 5, CAs = 10, Clog = 0
Payload: Quests = 155, Diaries = 5, CAs = 12, Clog = 500
Result:
  - Quests: Delta (+5)
  - Diaries: Delta (0)
  - CAs: Delta (+2)
  - Clog: FIRST SYNC (full 500 items) ✅
```

### 3. Legacy Account Migration

```
DB: All counters = NULL/0 (legacy account)
Payload: Full data
Result: All categories marked as "first sync" ✅
Account gets full retroactive points for everything
```

### 4. Player Never Presses Sync Button

```
All SYNCs: Clog items = 0
Result: 0 clog points (correct - player hasn't synced it) ✅
When they finally press it: Full retroactive points ✅
```

## Why Not Simpler Approaches?

### ❌ Single "First Sync" Flag

```typescript
// BAD: Only checks overall first sync
const isFirstSync = !account.quests_completed

// Problem: If player syncs without clog data, then syncs WITH clog data:
// - First SYNC: isFirstSync = true, but clog = 0
// - Second SYNC: isFirstSync = false, clog = 500 → Only delta points!
```

### ❌ Check Points Breakdown

```typescript
// BAD: Check if points exist
const isFirstSync = pointsBreakdown.total === 0

// Problem: Player might get points from EVENTS before SYNC
// - Event: Rare drop → +500 points
// - SYNC: Has achievements → isFirstSync = false → No retroactive points!
```

### ❌ Check Any Detail Table

```typescript
// BAD: Check diary completions table
const isFirstSync = diaryCompletions.length === 0

// Problem: Player might complete diary before syncing other categories
// - Diary event: Completes elite diary → Recorded in table
// - SYNC: Has quests/CAs/clog → isFirstSync = false → No retroactive points!
```

## Testing Checklist

- [ ] First sync with all data → All categories "first sync"
- [ ] Second sync with changes → All categories "delta sync"
- [ ] First sync without clog → Clog shows 0 points
- [ ] Second sync with clog → Clog shows "FIRST SYNC" + full points
- [ ] Legacy account → All categories "first sync"
- [ ] Partial data sync → Only populated categories show points
- [ ] Points calculation matches expected values
- [ ] Database counters update correctly

## Files Modified

1. **`src/db/services/sync.service.ts`**
   - Added `SyncStatusFlags` interface
   - Added `checkSyncStatus()` function
   - Updated `storeSyncData()` to use per-category logic
   - Updated points calculation to handle retroactive points per category

2. **`src/runelite/events/sync.ts`**
   - Updated logging to show per-category sync status
   - Shows "FIRST SYNC (retroactive points)" vs "Delta sync"

## Conclusion

This implementation correctly handles the collection log edge case and any similar scenarios where data categories are synced at different times. Each category is treated independently for retroactive point awards, ensuring fairness and preventing lost points.

