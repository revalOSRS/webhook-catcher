/**
 * OSRS Accounts Routes
 * 
 * Routes for getting detailed OSRS account data with snapshots
 */

import { Router } from 'express'
import * as db from '../../db/connection.js'
import { requireMemberAuth } from '../../middleware/auth.js'

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

    // Fetch all related snapshot data in parallel
    const [skills, bosses, activities, computed] = await Promise.all([
      db.query<any>(`
        SELECT skill, experience, level, rank, ehp
        FROM player_skills_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY skill
      `, [playerSnapshot.id]),
      
      db.query<any>(`
        SELECT boss, kills, rank, ehb
        FROM player_bosses_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY boss
      `, [playerSnapshot.id]),
      
      db.query<any>(`
        SELECT activity, score, rank
        FROM player_activities_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY activity
      `, [playerSnapshot.id]),
      
      db.query<any>(`
        SELECT metric, value, rank
        FROM player_computed_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY metric
      `, [playerSnapshot.id])
    ])

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
        snapshot: {
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
          bosses: bosses.map(boss => ({
            boss: boss.boss,
            kills: boss.kills,
            rank: boss.rank,
            ehb: parseFloat(boss.ehb)
          })),
          activities: activities.map(activity => ({
            activity: activity.activity,
            score: activity.score,
            rank: activity.rank
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

