/**
 * RuneLite SYNC Database Service
 * 
 * Handles all database operations for storing SYNC event data
 */

import { pool } from '../connection.js'
import type { SyncEventPayload, DiaryProgress } from '../../runelite/types/sync-event.type.js'
import { calculatePointsFromSync, type PointsBreakdown } from '../../services/points-system.js'

// ===== Main SYNC Storage Function =====

export async function storeSyncData(payload: SyncEventPayload): Promise<{
  accountId: number
  pointsAwarded: PointsBreakdown
  isFirstSync: boolean
  syncStatus: SyncStatusFlags
}> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('========================================')
    console.log('SYNC SERVICE - TESTING MODE')
    console.log('Only running steps: 1, 2, 6, 7, + Quest storage')
    console.log('========================================\n')
    
    // 1. Upsert OSRS account
    console.log('Step 1: Upsert OSRS account...')
    const account = await upsertOsrsAccount(client, payload)
    console.log('✅ Step 1 complete:')
    console.log(`   Account ID: ${account.id}`)
    console.log(`   Username: ${account.osrs_nickname}`)
    console.log(`   Is New Account: ${account.isNewAccount}`)
    console.log(`   Was Legacy: ${account.wasLegacy}\n`)
    
    // 2. Check sync status for each category
    console.log('Step 2: Check sync status for each category...')
    const syncStatus = await checkSyncStatus(client, account.id, payload)
    console.log('✅ Step 2 complete - Sync Status:')
    console.log(`   Overall First Sync: ${syncStatus.isFirstOverallSync}`)
    console.log(`   First Quest Sync: ${syncStatus.isFirstQuestSync}`)
    console.log(`   First Diary Sync: ${syncStatus.isFirstDiarySync}`)
    console.log(`   First Combat Achievement Sync: ${syncStatus.isFirstCombatAchievementSync}`)
    console.log(`   First Collection Log Sync: ${syncStatus.isFirstCollectionLogSync}\n`)
    
    // TEMPORARY: Skip steps 3-5 for testing
    console.log('⏭️  Skipping steps 3-5 (points calculation) for testing\n')
    
    // 3. Calculate points from current state
    // const currentPoints = calculatePointsFromSync(payload)
    
    // 4. Get previous points breakdown (if not first overall sync)
    // const previousPoints = syncStatus.isFirstOverallSync 
    //   ? null 
    //   : await getPreviousPointsBreakdown(client, account.id)
    
    // 5. Calculate points to award per category
    // Award FULL retroactive points for categories being synced for the first time
    // Award DELTA points for categories that have been synced before
    const pointsToAward: PointsBreakdown = {
      byCategory: {
        quests: 0, // syncStatus.isFirstQuestSync 
          // ? currentPoints.byCategory.quests 
          // : currentPoints.byCategory.quests - (previousPoints?.byCategory.quests || 0),
        
        achievement_diaries: 0, // syncStatus.isFirstDiarySync
          // ? currentPoints.byCategory.achievement_diaries
          // : currentPoints.byCategory.achievement_diaries - (previousPoints?.byCategory.achievement_diaries || 0),
        
        combat_achievements: 0, // syncStatus.isFirstCombatAchievementSync
          // ? currentPoints.byCategory.combat_achievements
          // : currentPoints.byCategory.combat_achievements - (previousPoints?.byCategory.combat_achievements || 0),
        
        collection_log: 0, // syncStatus.isFirstCollectionLogSync
          // ? currentPoints.byCategory.collection_log
          // : currentPoints.byCategory.collection_log - (previousPoints?.byCategory.collection_log || 0),
        
        boss_kills: 0, // currentPoints.byCategory.boss_kills - (previousPoints?.byCategory.boss_kills || 0),
        skills: 0 // currentPoints.byCategory.skills - (previousPoints?.byCategory.skills || 0)
      },
      total: 0
    }
    
    // 5.5. Store quest data (stored on osrs_accounts table directly)
    console.log('Step 5.5: Store quest data...')
    await storeQuests(client, account.id, payload.quests)
    console.log('✅ Step 5.5 complete')
    console.log(`   Quests completed: ${payload.quests.completedQuests}`)
    console.log(`   Quest points: ${payload.quests.questPoints}\n`)
    
    // 6. Store achievement diary completions
    console.log('Step 6: Store achievement diary completions...')
    await storeAchievementDiaries(client, account.id, payload.achievementDiaries)
    console.log('✅ Step 6 complete')
    console.log(`   Diaries stored: ${payload.achievementDiaries.totalCompleted}\n`)
    
    // 7. Store combat achievements
    console.log('Step 7: Store combat achievements...')
    await storeCombatAchievements(client, account.id, payload.combatAchievements)
    const caCompleted = Object.values(payload.combatAchievements.tierProgress)
      .reduce((sum, tier) => sum + tier.completed, 0)
    console.log('✅ Step 7 complete')
    console.log(`   Combat Achievements stored: ${caCompleted}`)
    console.log(`   CA Points: ${payload.combatAchievements.totalPoints}\n`)
    
    // TEMPORARY: Skip steps 8-11 for testing
    console.log('⏭️  Skipping steps 8-11 for testing\n')
    
    // 8. Store collection log data
    // await storeCollectionLog(client, account.id, payload.collectionLog)
    
    // 9. Store kill counts
    // await storeKillCounts(client, account.id, payload.collectionLog)
    
    // 10. Update points breakdown with current points (not delta)
    // await updatePointsBreakdown(client, account.id, pointsToAward)
    
    // 11. Update denormalized counters on osrs_accounts
    // await updateDenormalizedCounters(client, account.id, payload)
    
    await client.query('COMMIT')
    
    console.log('========================================')
    console.log('✅ TESTING MODE: Transaction committed')
    console.log('========================================\n')
    
    return {
      accountId: account.id,
      pointsAwarded: pointsToAward,
      isFirstSync: syncStatus.isFirstOverallSync,
      syncStatus
    }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ TESTING MODE: Transaction rolled back')
    console.error('Error:', error)
    throw error
  } finally {
    client.release()
  }
}

// ===== Helper Functions =====

/**
 * Upsert OSRS Account
 * 
 * Logic:
 * 1. If account_hash exists → Search by hash (hash is immutable identifier)
 *    - Update username (in case of name change) and account_type
 * 2. If account_hash is null (shouldn't happen but handle gracefully)
 *    - Search by username
 * 3. If username exists but no hash → Legacy account, add hash
 * 4. If nothing found → Create new account
 * 
 * Key insight: account_hash is the PRIMARY identifier (never changes)
 *              username can change (name change in OSRS)
 */
async function upsertOsrsAccount(client: any, payload: SyncEventPayload) {
  const { player } = payload
  const accountHash = player.accountHash || null
  const username = player.username
  const accountType = player.accountType || 'NORMAL'
  
  // Strategy 1: If we have a hash, search by hash first (most reliable)
  if (accountHash) {
    const existingByHash = await client.query(
      'SELECT id, osrs_nickname, account_hash FROM osrs_accounts WHERE account_hash = $1',
      [accountHash]
    )
    
    if (existingByHash.rows.length > 0) {
      // Account exists with this hash - update username (may have changed) and account_type
      const account = existingByHash.rows[0]
      
      await client.query(`
        UPDATE osrs_accounts
        SET 
          osrs_nickname = $1,
          account_type = $2,
          last_synced_at = NOW()
        WHERE id = $3
      `, [username, accountType, account.id])
      
      return {
        id: account.id,
        osrs_nickname: username,
        isNewAccount: false,
        wasLegacy: false
      }
    }
    
    // Hash not found, check if username exists (legacy account scenario)
    const existingByUsername = await client.query(
      'SELECT id, osrs_nickname, account_hash FROM osrs_accounts WHERE osrs_nickname = $1',
      [username]
    )
    
    if (existingByUsername.rows.length > 0) {
      const account = existingByUsername.rows[0]
      
      if (account.account_hash === null) {
        // Legacy account found - add hash and account_type
        console.log(`🔄 Upgrading legacy account: ${username} (ID: ${account.id})`)
        console.log(`   Adding account_hash: ${accountHash}`)
        console.log(`   Adding account_type: ${accountType}`)
        
        await client.query(`
          UPDATE osrs_accounts
          SET 
            account_hash = $1,
            account_type = $2,
            last_synced_at = NOW(),
            updated_at = NOW()
          WHERE id = $3
        `, [accountHash, accountType, account.id])
        
        console.log(`✅ Upgraded legacy account: ${username} (ID: ${account.id})`)
        
        return {
          id: account.id,
          osrs_nickname: username,
          isNewAccount: false,
          wasLegacy: true
        }
      } else {
        // Username exists with DIFFERENT hash - this is a conflict!
        // Someone else is using this username, or account was transferred
        console.error(`⚠️ CONFLICT: Username "${username}" exists with different hash`)
        console.error(`   Existing hash: ${account.account_hash}`)
        console.error(`   New hash: ${accountHash}`)
        throw new Error(`Account hash mismatch for username "${username}". This may indicate account transfer or username conflict.`)
      }
    }
    
    // Neither hash nor username found - create new account
    const result = await client.query(`
      INSERT INTO osrs_accounts (
        osrs_nickname,
        account_hash,
        account_type,
        last_synced_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, NOW(), NOW(), NOW())
      RETURNING id, osrs_nickname
    `, [username, accountHash, accountType])
    
    console.log(`✅ Created new account: ${username} (ID: ${result.rows[0].id})`)
    
    return {
      id: result.rows[0].id,
      osrs_nickname: result.rows[0].osrs_nickname,
      isNewAccount: true,
      wasLegacy: false
    }
  }
  
  // Strategy 2: No hash provided (shouldn't happen with RuneLite plugin, but handle it)
  console.warn(`⚠️ No account_hash provided for username: ${username}`)
  
  const existingByUsername = await client.query(
    'SELECT id, osrs_nickname, account_hash FROM osrs_accounts WHERE osrs_nickname = $1',
    [username]
  )
  
  if (existingByUsername.rows.length > 0) {
    const account = existingByUsername.rows[0]
    
    // Update account_type and last_synced_at
    await client.query(`
      UPDATE osrs_accounts
      SET 
        account_type = $1,
        last_synced_at = NOW()
      WHERE id = $2
    `, [accountType, account.id])
    
    return {
      id: account.id,
      osrs_nickname: account.osrs_nickname,
      isNewAccount: false,
      wasLegacy: account.account_hash === null
    }
  }
  
  // Create new account without hash (not ideal, but valid for testing)
  const result = await client.query(`
    INSERT INTO osrs_accounts (
      osrs_nickname,
      account_type,
      last_synced_at,
      created_at,
      updated_at
    ) VALUES ($1, $2, NOW(), NOW(), NOW())
    RETURNING id, osrs_nickname
  `, [username, accountType])
  
  console.log(`✅ Created new account without hash: ${username} (ID: ${result.rows[0].id})`)
  
  return {
    id: result.rows[0].id,
    osrs_nickname: result.rows[0].osrs_nickname,
    isNewAccount: true,
    wasLegacy: false
  }
}

/**
 * Sync Status Flags
 * 
 * Tracks whether this is the first sync for each data category.
 * Important for awarding retroactive points correctly.
 * 
 * Example scenario:
 * - Player logs in, doesn't press "Sync Collection Log"
 * - SYNC runs with 0 clog items
 * - Later, player presses button → SYNC runs with 500 items
 * - isFirstCollectionLogSync = true → Award full retroactive points
 */
interface SyncStatusFlags {
  isFirstOverallSync: boolean           // First time ANY data synced
  isFirstQuestSync: boolean             // First time quest data synced
  isFirstDiarySync: boolean             // First time diary data synced
  isFirstCombatAchievementSync: boolean // First time CA data synced
  isFirstCollectionLogSync: boolean     // First time clog data synced
}

/**
 * Check First Sync Status Per Category
 * 
 * Determines if this is the first time we're syncing each category of data.
 * Each category is tracked independently because:
 * 
 * 1. Collection log requires manual button press
 * 2. Player might complete achievements before syncing
 * 3. Points should be awarded retroactively when data FIRST appears
 * 
 * Detection strategy:
 * - Quests: Check if quests_completed is NULL/empty (only from SYNC)
 * - Diaries: Check if diary_total_count is 0 AND payload has diaries
 * - Combat Achievements: Check if ca_total_count is 0 AND payload has CAs
 * - Collection Log: Check if clog_items_obtained is 0 AND payload has items
 * 
 * Why this works:
 * - If counter is 0 but payload has data → First time seeing this data
 * - If counter is > 0 → We've seen this data before, award deltas only
 */
async function checkSyncStatus(client: any, accountId: number, payload: SyncEventPayload): Promise<SyncStatusFlags> {
  const result = await client.query(`
    SELECT 
      quests_completed,
      diary_total_count,
      ca_total_count,
      clog_items_obtained
    FROM osrs_accounts 
    WHERE id = $1
  `, [accountId])
  
  if (result.rows.length === 0) {
    // Account doesn't exist (shouldn't happen, but handle it)
    return {
      isFirstOverallSync: true,
      isFirstQuestSync: true,
      isFirstDiarySync: true,
      isFirstCombatAchievementSync: true,
      isFirstCollectionLogSync: true
    }
  }
  
  const account = result.rows[0]
  
  // Check if quests have ever been synced
  const hasQuestData = account.quests_completed && account.quests_completed.length > 0
  const isFirstQuestSync = !hasQuestData
  
  // Check if diaries have ever been synced
  // First sync if: DB has 0 AND payload has diaries
  const hasDiaryDataInDb = account.diary_total_count > 0
  const hasDiaryDataInPayload = payload.achievementDiaries.totalCompleted > 0
  const isFirstDiarySync = !hasDiaryDataInDb && hasDiaryDataInPayload
  
  // Check if combat achievements have ever been synced
  // First sync if: DB has 0 AND payload has CAs
  const hasCaDataInDb = account.ca_total_count > 0
  const hasCaDataInPayload = Object.values(payload.combatAchievements.tierProgress)
    .some(tier => tier.completed > 0)
  const isFirstCombatAchievementSync = !hasCaDataInDb && hasCaDataInPayload
  
  // Check if collection log has ever been synced
  // First sync if: DB has 0 AND payload has items
  const hasClogDataInDb = account.clog_items_obtained > 0
  const hasClogDataInPayload = payload.collectionLog.obtainedItems > 0
  const isFirstCollectionLogSync = !hasClogDataInDb && hasClogDataInPayload
  
  // Overall first sync if any category is first sync
  const isFirstOverallSync = isFirstQuestSync || isFirstDiarySync || 
                             isFirstCombatAchievementSync || isFirstCollectionLogSync
  
  return {
    isFirstOverallSync,
    isFirstQuestSync,
    isFirstDiarySync,
    isFirstCombatAchievementSync,
    isFirstCollectionLogSync
  }
}

async function getPreviousPointsBreakdown(tx: any, accountId: number): Promise<PointsBreakdown> {
  const result = await tx`
    SELECT 
      total_points,
      quest_points,
      diary_points,
      combat_achievement_points,
      collection_log_points,
      boss_kill_points,
      skill_points
    FROM osrs_account_points_breakdown
    WHERE osrs_account_id = ${accountId}
  `
  
  if (result.length === 0) {
    return {
      total: 0,
      byCategory: {
        quests: 0,
        achievement_diaries: 0,
        combat_achievements: 0,
        collection_log: 0,
        boss_kills: 0,
        skills: 0
      }
    }
  }
  
  const row = result[0]
  return {
    total: row.total_points,
    byCategory: {
      quests: row.quest_points,
      achievement_diaries: row.diary_points,
      combat_achievements: row.combat_achievement_points,
      collection_log: row.collection_log_points,
      boss_kills: row.boss_kill_points,
      skills: row.skill_points
    }
  }
}

function calculatePointsDelta(current: PointsBreakdown, previous: PointsBreakdown): PointsBreakdown {
  return {
    total: current.total - previous.total,
    byCategory: {
      quests: current.byCategory.quests - previous.byCategory.quests,
      achievement_diaries: current.byCategory.achievement_diaries - previous.byCategory.achievement_diaries,
      combat_achievements: current.byCategory.combat_achievements - previous.byCategory.combat_achievements,
      collection_log: current.byCategory.collection_log - previous.byCategory.collection_log,
      boss_kills: current.byCategory.boss_kills - previous.byCategory.boss_kills,
      skills: current.byCategory.skills - previous.byCategory.skills
    }
  }
}

/**
 * Store Quest Completions
 * 
 * Quests are stored as an array on osrs_accounts table.
 * Strategy: UPDATE the array field directly
 */
async function storeQuests(client: any, accountId: number, quests: any) {
  // Extract completed quest names from the quests array
  const completedQuestNames = quests.quests
    .filter((quest: any) => quest.status === 'COMPLETED')
    .map((quest: any) => quest.name)
  
  await client.query(`
    UPDATE osrs_accounts
    SET 
      quests_completed = $1,
      quest_points = $2,
      quests_last_updated = NOW()
    WHERE id = $3
  `, [completedQuestNames, quests.questPoints, accountId])
}

/**
 * Store Combat Achievements
 * 
 * Strategy: 
 * 1. Verify existing completions match incoming data (data integrity check)
 * 2. INSERT only NEW completions using FK to combat_achievements table
 * 
 * Once a combat achievement is completed, it's permanent and never gets uncompleted.
 * If existing data conflicts with incoming data, we throw an error to prevent data corruption.
 */
async function storeCombatAchievements(client: any, accountId: number, combatAchievements: any) {
  // Extract all completed tasks from tierProgress
  interface CompletedTask {
    tier: string
    taskName: string
    type: string
  }
  
  const completedTasks: CompletedTask[] = []
  
  for (const [tierName, tierData] of Object.entries(combatAchievements.tierProgress) as [string, any][]) {
    if (tierData.tasks && Array.isArray(tierData.tasks)) {
      for (const task of tierData.tasks) {
        if (task.isComplete) {
          completedTasks.push({
            tier: tierName,
            taskName: task.name,
            type: task.type
          })
        }
      }
    }
  }
  
  // Get existing combat achievements from DB (join with reference table to get names)
  const existingResult = await client.query(`
    SELECT ca.name
    FROM osrs_account_combat_achievements oaca
    JOIN combat_achievements ca ON oaca.combat_achievement_id = ca.id
    WHERE oaca.osrs_account_id = $1
  `, [accountId])
  
  const existingTaskNames = new Set<string>(existingResult.rows.map((row: any) => row.name as string))
  const incomingTaskNames = new Set<string>(completedTasks.map(task => task.taskName))
  
  // Check for discrepancies: tasks in DB but not in incoming data
  const missingTasks = Array.from(existingTaskNames).filter(name => !incomingTaskNames.has(name))
  
  if (missingTasks.length > 0) {
    console.error('❌ COMBAT ACHIEVEMENT DATA INTEGRITY ERROR')
    console.error(`   Account ID: ${accountId}`)
    console.error(`   Existing tasks in DB: ${existingTaskNames.size}`)
    console.error(`   Incoming tasks: ${incomingTaskNames.size}`)
    console.error(`   Missing tasks (in DB but not in sync): ${missingTasks.length}`)
    console.error(`   First 10 missing: ${missingTasks.slice(0, 10).join(', ')}`)
    
    throw new Error(
      `Combat Achievement data integrity error: ${missingTasks.length} completed tasks are missing from sync data. ` +
      `This should never happen as combat achievements cannot be uncompleted. ` +
      `Refusing to update to prevent data loss.`
    )
  }
  
  // Insert new completed tasks only (using FK to combat_achievements)
  const newTasks = completedTasks.filter(task => !existingTaskNames.has(task.taskName))
  
  if (newTasks.length > 0) {
    // First, ensure all tasks exist in combat_achievements reference table
    // (Upsert tasks into reference table if they don't exist)
    for (const task of newTasks) {
      await client.query(`
        INSERT INTO combat_achievements (name, tier, type)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [task.taskName, task.tier, task.type])
    }
    
    // Now insert completions using FK lookup
    const values: string[] = []
    const params: any[] = []
    let paramIndex = 1
    
    for (const task of newTasks) {
      values.push(`(
        $${paramIndex},
        (SELECT id FROM combat_achievements WHERE name = $${paramIndex + 1}),
        NOW()
      )`)
      params.push(accountId, task.taskName)
      paramIndex += 2
    }
    
    await client.query(`
      INSERT INTO osrs_account_combat_achievements (
        osrs_account_id,
        combat_achievement_id,
        completed_at
      ) VALUES ${values.join(', ')}
    `, params)
    
    console.log(`   ✅ Inserted ${newTasks.length} new combat achievements`)
  } else {
    console.log(`   ℹ️  No new combat achievements to insert`)
  }
}

/**
 * Store Achievement Diary Completions
 * 
 * Strategy: INSERT only NEW completions (ON CONFLICT DO NOTHING)
 * Achievement diaries, once completed, are permanent and never get uncompleted.
 * Uses FK to achievement_diary_tiers table.
 */
async function storeAchievementDiaries(client: any, accountId: number, diaries: any) {
  // Build list of completed diaries
  interface DiaryEntry {
    area: string
    tier: string
  }
  
  const entries: DiaryEntry[] = []
  for (const [area, progress] of Object.entries(diaries.progress) as [string, any][]) {
    if (progress.easy) entries.push({ area, tier: 'easy' })
    if (progress.medium) entries.push({ area, tier: 'medium' })
    if (progress.hard) entries.push({ area, tier: 'hard' })
    if (progress.elite) entries.push({ area, tier: 'elite' })
  }
  
  // Insert current completions using FK lookup (skip if already exists)
  if (entries.length > 0) {
    const values: string[] = []
    const params: any[] = []
    let paramIndex = 1
    
    for (const entry of entries) {
      // Lookup diary_tier_id from achievement_diary_tiers table
      values.push(`(
        $${paramIndex}, 
        (SELECT id FROM achievement_diary_tiers WHERE diary_name = $${paramIndex + 1} AND tier = $${paramIndex + 2}),
        NOW()
      )`)
      params.push(accountId, entry.area, entry.tier)
      paramIndex += 3
    }
    
    await client.query(`
      INSERT INTO osrs_account_diary_completions (
        osrs_account_id,
        diary_tier_id,
        completed_at
      ) VALUES ${values.join(', ')}
      ON CONFLICT (osrs_account_id, diary_tier_id) DO NOTHING
    `, params)
  }
}

/**
 * Store Collection Log Data
 * 
 * Strategy: 
 * 1. Upsert summary (total obtained/total items)
 * 2. DELETE all drops, INSERT current state
 * 
 * Note: We store ALL obtained items, not just new ones
 * This ensures data integrity if player loses an item or data gets corrupted
 */
async function storeCollectionLog(client: any, accountId: number, collectionLog: any) {
  // Upsert collection log summary
  await client.query(`
    INSERT INTO osrs_account_collection_log (
      osrs_account_id,
      total_obtained,
      total_items,
      last_updated_at
    ) VALUES ($1, $2, $3, NOW())
    ON CONFLICT (osrs_account_id)
    DO UPDATE SET
      total_obtained = $2,
      total_items = $3,
      last_updated_at = NOW()
  `, [accountId, collectionLog.obtainedItems, collectionLog.totalItems])
  
  // Delete existing drops
  await client.query(
    'DELETE FROM osrs_account_collection_log_drops WHERE osrs_account_id = $1',
    [accountId]
  )
  
  // Build list of obtained items
  interface ObtainedItem {
    category: string
    source: string
    item_id: number
    item_name: string
    quantity: number
  }
  
  const obtainedItems: ObtainedItem[] = []
  
  for (const [categoryName, category] of Object.entries(collectionLog.categories)) {
    for (const [entryName, entry] of Object.entries(category as any)) {
      const items = (entry as any).items
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.obtained) {
            obtainedItems.push({
              category: categoryName,
              source: entryName,
              item_id: item.id,
              item_name: item.name,
              quantity: item.quantity
            })
          }
        }
      }
    }
  }
  
  // Insert all obtained items
  if (obtainedItems.length > 0) {
    const values: string[] = []
    const params: any[] = []
    let paramIndex = 1
    
    for (const item of obtainedItems) {
      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, NOW())`)
      params.push(
        accountId,
        item.category,
        item.source,
        item.item_id,
        item.item_name,
        item.quantity
      )
      paramIndex += 6
    }
    
    await client.query(`
      INSERT INTO osrs_account_collection_log_drops (
        osrs_account_id,
        category,
        source,
        item_id,
        item_name,
        quantity,
        obtained_at
      ) VALUES ${values.join(', ')}
    `, params)
  }
}

/**
 * Store Kill Counts
 * 
 * Extracts KC from collection log entries and stores in dedicated table.
 * Strategy: DELETE all existing, INSERT current state
 */
async function storeKillCounts(client: any, accountId: number, collectionLog: any) {
  // Delete existing KC
  await client.query(
    'DELETE FROM osrs_account_killcounts WHERE osrs_account_id = $1',
    [accountId]
  )
  
  // Build list of KC entries
  interface KcEntry {
    boss_name: string
    kill_count: number
    category: string
  }
  
  const kcEntries: KcEntry[] = []
  
  for (const [categoryName, category] of Object.entries(collectionLog.categories)) {
    for (const [bossName, entry] of Object.entries(category as any)) {
      const kc = (entry as any).kc
      if (typeof kc === 'number' && kc > 0) {
        kcEntries.push({
          boss_name: bossName,
          kill_count: kc,
          category: categoryName
        })
      }
    }
  }
  
  // Insert current KC
  if (kcEntries.length > 0) {
    const values: string[] = []
    const params: any[] = []
    let paramIndex = 1
    
    for (const kc of kcEntries) {
      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, NOW())`)
      params.push(
        accountId,
        kc.boss_name,
        kc.kill_count,
        kc.category
      )
      paramIndex += 4
    }
    
    await client.query(`
      INSERT INTO osrs_account_killcounts (
        osrs_account_id,
        boss_name,
        kill_count,
        category,
        last_updated_at
      ) VALUES ${values.join(', ')}
    `, params)
  }
}

async function updatePointsBreakdown(tx: any, accountId: number, points: PointsBreakdown) {
  await tx`
    INSERT INTO osrs_account_points_breakdown (
      osrs_account_id,
      total_points,
      quest_points,
      diary_points,
      combat_achievement_points,
      collection_log_points,
      boss_kill_points,
      skill_points,
      last_updated_at
    ) VALUES (
      ${accountId},
      ${points.total},
      ${points.byCategory.quests},
      ${points.byCategory.achievement_diaries},
      ${points.byCategory.combat_achievements},
      ${points.byCategory.collection_log},
      ${points.byCategory.boss_kills},
      ${points.byCategory.skills},
      NOW()
    )
    ON CONFLICT (osrs_account_id)
    DO UPDATE SET
      total_points = ${points.total},
      quest_points = ${points.byCategory.quests},
      diary_points = ${points.byCategory.achievement_diaries},
      combat_achievement_points = ${points.byCategory.combat_achievements},
      collection_log_points = ${points.byCategory.collection_log},
      boss_kill_points = ${points.byCategory.boss_kills},
      skill_points = ${points.byCategory.skills},
      last_updated_at = NOW()
  `
}

async function updateDenormalizedCounters(client: any, accountId: number, payload: SyncEventPayload) {
  const diaryCompletions = Object.values(payload.achievementDiaries.progress) as DiaryProgress[]
  const caCompleted = Object.values(payload.combatAchievements.tierProgress)
    .reduce((sum, tier) => sum + tier.completed, 0)
  
  // Get total points from points breakdown
  const pointsResult = await client.query(
    'SELECT total_points FROM osrs_account_points_breakdown WHERE osrs_account_id = $1',
    [accountId]
  )
  const totalPoints = pointsResult.rows[0]?.total_points || 0
  
  await client.query(`
    UPDATE osrs_accounts
    SET
      quest_points = $1,
      quests_completed = $2,
      diary_easy_count = $3,
      diary_medium_count = $4,
      diary_hard_count = $5,
      diary_elite_count = $6,
      diary_total_count = $7,
      ca_total_count = $8,
      ca_points = $9,
      clog_items_obtained = $10,
      clog_total_items = $11,
      total_points = $12,
      last_synced_at = NOW()
    WHERE id = $13
  `, [
    payload.quests.questPoints,
    payload.quests.completedQuests,
    diaryCompletions.filter(d => d.easy).length,
    diaryCompletions.filter(d => d.medium).length,
    diaryCompletions.filter(d => d.hard).length,
    diaryCompletions.filter(d => d.elite).length,
    payload.achievementDiaries.totalCompleted,
    caCompleted,
    payload.combatAchievements.totalPoints,
    payload.collectionLog.obtainedItems,
    payload.collectionLog.totalItems,
    totalPoints,
    accountId
  ])
}

