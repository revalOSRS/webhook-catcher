/**
 * OSRS Accounts Routes
 * 
 * Routes for getting detailed OSRS account data with snapshots
 */

import { Router } from 'express'
import * as db from '../../../db/connection.js'
import { requireMemberAuth } from '../../../middleware/auth.js'

const router = Router()

// Get detailed OSRS account with snapshots - /:memberId/osrs-accounts/:osrsAccountId
router.get('/:memberId/osrs-accounts/:osrsAccountId', requireMemberAuth, async (req, res) => {
  try {
    const { osrsAccountId } = req.params
    const authenticatedMember = (req as any).authenticatedMember
    const discordId = authenticatedMember.discord_id

    // Get the OSRS account
    const osrsAccount = await db.queryOne<any>(`
      SELECT 
        id, discord_id, osrs_nickname, dink_hash, wom_player_id, wom_rank,
        ehp, ehb, is_primary, last_synced_at, created_at, updated_at
      FROM osrs_accounts
      WHERE id = $1 AND discord_id = $2
    `, [parseInt(osrsAccountId), discordId])

    if (!osrsAccount) {
      return res.status(404).json({
        status: 'error',
        message: 'OSRS account not found'
      })
    }

    // Check if the account has a WOM player ID to fetch snapshots
    if (!osrsAccount.wom_player_id) {
      return res.status(200).json({
        status: 'success',
        data: {
          osrs_account: osrsAccount,
          snapshots: null,
          message: 'This OSRS account has no WiseOldMan ID linked'
        }
      })
    }

    // Get the latest clan snapshot
    const latestClanSnapshot = await db.queryOne<any>(`
      SELECT id, snapshot_date, group_name
      FROM clan_statistics_snapshots
      ORDER BY snapshot_date DESC
      LIMIT 1
    `)

    if (!latestClanSnapshot) {
      return res.status(200).json({
        status: 'success',
        data: {
          osrs_account: osrsAccount,
          snapshots: null,
          message: 'No clan snapshots available yet'
        }
      })
    }

    // Get player snapshot for this OSRS account from latest clan snapshot
    const playerSnapshot = await db.queryOne<any>(`
      SELECT 
        id, player_id, username, display_name, snapshot_date,
        player_type, player_build, country, status, patron,
        total_exp, total_level, combat_level,
        ehp, ehb, ttm, tt200m,
        registered_at, updated_at, last_changed_at, last_imported_at
      FROM player_snapshots
      WHERE player_id = $1 AND clan_snapshot_id = $2
    `, [osrsAccount.wom_player_id, latestClanSnapshot.id])

    if (!playerSnapshot) {
      return res.status(200).json({
        status: 'success',
        data: {
          osrs_account: osrsAccount,
          snapshots: null,
          message: 'No snapshot found for this OSRS account in the latest clan snapshot'
        }
      })
    }

    // Fetch all related snapshot data and achievement data in parallel
    const [
      skills,
      computed,
      collectionLogItems,
      collectionLogDrops,
      combatAchievements,
      diaryCompletions,
      killCounts,
      questsData
    ] = await Promise.all([
      // WOM Skills Snapshot
      db.query<any>(`
        SELECT skill, experience, level, rank, ehp
        FROM player_skills_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY skill
      `, [playerSnapshot.id]),
      
      // WOM Computed Metrics
      db.query<any>(`
        SELECT metric, value, rank
        FROM player_computed_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY metric
      `, [playerSnapshot.id]),
      
      // Collection Log Items (current state)
      db.query<any>(`
        SELECT 
          category,
          source,
          item_id,
          item_name,
          quantity,
          total_items,
          last_updated_at
        FROM osrs_account_collection_log
        WHERE osrs_account_id = $1
        ORDER BY category, source, item_name
      `, [osrsAccount.id]),
      
      // Collection Log Drops (historical events from Dink)
      db.query<any>(`
        SELECT 
          category,
          source,
          item_id,
          item_name,
          quantity,
          killcount_at_drop,
          obtained_at,
          event_data
        FROM osrs_account_collection_log_drops
        WHERE osrs_account_id = $1
        ORDER BY obtained_at DESC
        LIMIT 100
      `, [osrsAccount.id]),
      
      // Combat Achievements
      db.query<any>(`
        SELECT 
          ca.name,
          ca.tier,
          ca.type,
          ca.monster,
          ca.description,
          oaca.completed_at
        FROM osrs_account_combat_achievements oaca
        JOIN combat_achievements ca ON oaca.combat_achievement_id = ca.id
        WHERE oaca.osrs_account_id = $1
        ORDER BY 
          CASE ca.tier
            WHEN 'Easy' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'Hard' THEN 3
            WHEN 'Elite' THEN 4
            WHEN 'Master' THEN 5
            WHEN 'Grandmaster' THEN 6
          END,
          ca.name
      `, [osrsAccount.id]),
      
      // Diary Completions
      db.query<any>(`
        SELECT 
          adt.diary_name,
          adt.tier,
          adt.total_tasks,
          oadc.completed_at
        FROM osrs_account_diary_completions oadc
        JOIN achievement_diary_tiers adt ON oadc.diary_tier_id = adt.id
        WHERE oadc.osrs_account_id = $1
        ORDER BY adt.diary_name, 
          CASE adt.tier
            WHEN 'easy' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'hard' THEN 3
            WHEN 'elite' THEN 4
          END
      `, [osrsAccount.id]),
      
      // Kill Counts
      db.query<any>(`
        SELECT 
          boss_name,
          kill_count,
          category,
          last_updated_at
        FROM osrs_account_killcounts
        WHERE osrs_account_id = $1
        ORDER BY kill_count DESC
      `, [osrsAccount.id]),
      
      // Quests Data (stored on osrs_accounts table)
      db.queryOne<any>(`
        SELECT 
          quests_completed,
          quest_points,
          quests_last_updated
        FROM osrs_accounts
        WHERE id = $1
      `, [osrsAccount.id])
    ])

    // Group collection log items by category for better organization
    const collectionLogByCategory = collectionLogItems.reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = {}
      }
      if (!acc[item.category][item.source]) {
        acc[item.category][item.source] = []
      }
      acc[item.category][item.source].push({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity
      })
      return acc
    }, {})

    // Count unique items (by item_id) across all sources
    // OSRS collection log counts unique items, not unique (item + source) combinations
    const uniqueItemIds = new Set(collectionLogItems.map((item: any) => item.item_id))
    const totalUniqueItems = uniqueItemIds.size

    // Group diary completions by area
    const diariesByArea = diaryCompletions.reduce((acc: any, diary: any) => {
      if (!acc[diary.diary_name]) {
        acc[diary.diary_name] = {}
      }
      acc[diary.diary_name][diary.tier] = {
        total_tasks: diary.total_tasks,
        completed_at: diary.completed_at
      }
      return acc
    }, {})

    // Group combat achievements by tier
    const combatAchievementsByTier = combatAchievements.reduce((acc: any, ca: any) => {
      if (!acc[ca.tier]) {
        acc[ca.tier] = []
      }
      acc[ca.tier].push({
        name: ca.name,
        type: ca.type,
        monster: ca.monster,
        description: ca.description,
        completed_at: ca.completed_at
      })
      return acc
    }, {})

    // Format the response
    res.status(200).json({
      status: 'success',
      data: {
        osrs_account: {
          id: osrsAccount.id,
          discord_id: osrsAccount.discord_id,
          osrs_nickname: osrsAccount.osrs_nickname,
          dink_hash: osrsAccount.dink_hash,
          wom_player_id: osrsAccount.wom_player_id,
          wom_rank: osrsAccount.wom_rank,
          ehp: parseFloat(osrsAccount.ehp || 0),
          ehb: parseFloat(osrsAccount.ehb || 0),
          is_primary: osrsAccount.is_primary,
          last_synced_at: osrsAccount.last_synced_at,
          created_at: osrsAccount.created_at,
          updated_at: osrsAccount.updated_at
        },
        
        // WOM Snapshot Data
        wom_snapshot: {
          id: playerSnapshot.id,
          player_id: playerSnapshot.player_id,
          username: playerSnapshot.username,
          display_name: playerSnapshot.display_name,
          snapshot_date: playerSnapshot.snapshot_date,
          player_type: playerSnapshot.player_type,
          player_build: playerSnapshot.player_build,
          country: playerSnapshot.country,
          status: playerSnapshot.status,
          patron: playerSnapshot.patron,
          stats: {
            total_exp: parseInt(playerSnapshot.total_exp),
            total_level: playerSnapshot.total_level,
            combat_level: playerSnapshot.combat_level,
            ehp: parseFloat(playerSnapshot.ehp),
            ehb: parseFloat(playerSnapshot.ehb),
            ttm: parseFloat(playerSnapshot.ttm),
            tt200m: parseFloat(playerSnapshot.tt200m)
          },
          skills: skills.map(skill => ({
            skill: skill.skill,
            experience: parseInt(skill.experience),
            level: skill.level,
            rank: skill.rank,
            ehp: parseFloat(skill.ehp)
          })),
          computed: computed.map(comp => ({
            metric: comp.metric,
            value: parseFloat(comp.value),
            rank: comp.rank
          })),
          timestamps: {
            registered_at: playerSnapshot.registered_at,
            updated_at: playerSnapshot.updated_at,
            last_changed_at: playerSnapshot.last_changed_at,
            last_imported_at: playerSnapshot.last_imported_at
          }
        },
        
        // Achievement & Progress Data
        achievements: {
          quests: {
            completed: questsData?.quests_completed || [],
            quest_points: questsData?.quest_points || 0,
            total_completed: questsData?.quests_completed?.length || 0,
            last_updated: questsData?.quests_last_updated
          },
          
          diaries: {
            by_area: diariesByArea,
            total_completed: diaryCompletions.length,
            summary: {
              easy: diaryCompletions.filter((d: any) => d.tier === 'easy').length,
              medium: diaryCompletions.filter((d: any) => d.tier === 'medium').length,
              hard: diaryCompletions.filter((d: any) => d.tier === 'hard').length,
              elite: diaryCompletions.filter((d: any) => d.tier === 'elite').length
            }
          },
          
          combat_achievements: {
            by_tier: combatAchievementsByTier,
            total_completed: combatAchievements.length,
            summary: {
              easy: combatAchievements.filter((ca: any) => ca.tier === 'Easy').length,
              medium: combatAchievements.filter((ca: any) => ca.tier === 'Medium').length,
              hard: combatAchievements.filter((ca: any) => ca.tier === 'Hard').length,
              elite: combatAchievements.filter((ca: any) => ca.tier === 'Elite').length,
              master: combatAchievements.filter((ca: any) => ca.tier === 'Master').length,
              grandmaster: combatAchievements.filter((ca: any) => ca.tier === 'Grandmaster').length
            }
          }
        },
        
        // Collection Log Data
        collection_log: {
          items: collectionLogByCategory,
          total_obtained: totalUniqueItems, // Count unique items, not (item + source) combinations
          total_unique_sources: Object.keys(collectionLogByCategory).reduce((count: number, category: string) => {
            return count + Object.keys(collectionLogByCategory[category]).length
          }, 0),
          by_category: Object.keys(collectionLogByCategory).map(category => {
            // Count unique item_ids per category
            const categoryItems = Object.values(collectionLogByCategory[category]).flat() as any[]
            const uniqueItemIdsInCategory = new Set(categoryItems.map((item: any) => item.item_id))
            
            return {
              category,
              obtained: uniqueItemIdsInCategory.size, // Count unique items, not duplicates
              sources: Object.keys(collectionLogByCategory[category]).length
            }
          }),
          recent_drops: collectionLogDrops.map((drop: any) => ({
            category: drop.category,
            source: drop.source,
            item_id: drop.item_id,
            item_name: drop.item_name,
            quantity: drop.quantity,
            killcount_at_drop: drop.killcount_at_drop,
            obtained_at: drop.obtained_at,
            event_data: drop.event_data
          }))
        },
        
        // Kill Counts
        kill_counts: {
          bosses: killCounts.map((kc: any) => ({
            boss_name: kc.boss_name,
            kill_count: kc.kill_count,
            category: kc.category,
            last_updated_at: kc.last_updated_at
          })),
          total_bosses: killCounts.length,
          total_kills: killCounts.reduce((sum: number, kc: any) => sum + (kc.kill_count || 0), 0),
          by_category: killCounts.reduce((acc: any, kc: any) => {
            if (!acc[kc.category]) {
              acc[kc.category] = { count: 0, total_kills: 0 }
            }
            acc[kc.category].count++
            acc[kc.category].total_kills += kc.kill_count || 0
            return acc
          }, {})
        },
        
        clan_snapshot: {
          id: latestClanSnapshot.id,
          snapshot_date: latestClanSnapshot.snapshot_date,
          group_name: latestClanSnapshot.group_name
        }
      }
    })

  } catch (error) {
    console.error('Error fetching OSRS account with snapshots:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch OSRS account snapshot data' 
    })
  }
})

export default router

