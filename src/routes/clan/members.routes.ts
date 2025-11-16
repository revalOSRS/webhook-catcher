import { Router, Request, Response } from 'express'
import { query } from '../../db/connection.js'
import { getGroupMembers } from '../../services/wiseoldman.js'

const router = Router()

// WiseOldMan group ID for your clan
const CLAN_GROUP_ID = parseInt(process.env.WOM_GROUP_ID || '14350')

/**
 * GET /api/clan/members
 * Get list of clan members with their info, Discord rank, and latest snapshot data
 * Query params: limit, offset, search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100
    const offset = parseInt(req.query.offset as string) || 0
    const search = req.query.search as string

    // Build query with optional search
    // Get members with their primary OSRS account's WOM ID
    let sql = `
      SELECT 
        m.id,
        m.ingame_name,
        m.discord_username,
        m.discord_id,
        m.is_active,
        m.joined_date,
        m.left_date,
        oa.wom_player_id as wom_id,
        oa.osrs_nickname
      FROM members m
      LEFT JOIN osrs_accounts oa ON oa.discord_id = m.discord_id AND oa.is_primary = true
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramIndex = 1

    if (search) {
      sql += ` AND (m.ingame_name ILIKE $${paramIndex} OR m.discord_username ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    sql += ` ORDER BY m.is_active DESC, m.ingame_name ASC`
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const members = await query(sql, params)

    // Get WiseOldMan group members to get roles
    let womMembers: any[] = []
    try {
      if (CLAN_GROUP_ID && CLAN_GROUP_ID !== 0) {
        womMembers = await getGroupMembers(CLAN_GROUP_ID)
      }
    } catch (error) {
      console.error('Error fetching WOM members:', error)
      // Continue without WOM data
    }

    // Create a map of WOM member data by player ID
    const womMemberMap = new Map()
    womMembers.forEach((wm: any) => {
      womMemberMap.set(wm.player.id, {
        role: wm.role,
        joinedAt: wm.createdAt
      })
    })

    // Get latest snapshots for members with WOM IDs
    const womIds = members
      .filter((m: any) => m.wom_id)
      .map((m: any) => m.wom_id)
    
    let snapshotsMap = new Map()
    
    if (womIds.length > 0) {
      // Get latest snapshot for each player
      const snapshots = await query(`
        SELECT DISTINCT ON (player_id)
          ps.player_id,
          ps.total_level,
          ps.total_exp as total_xp,
          ps.ehp,
          ps.ehb,
          ps.last_changed_at as last_changed,
          ps.last_imported_at
        FROM player_snapshots ps
        WHERE ps.player_id = ANY($1)
        ORDER BY ps.player_id, ps.snapshot_date DESC, ps.last_imported_at DESC
      `, [womIds])

      snapshots.forEach((snap: any) => {
        snapshotsMap.set(snap.player_id, snap)
      })

      // Get activities for these snapshots
      const snapshotIds = snapshots.map((s: any) => s.player_id)
      if (snapshotIds.length > 0) {
        const activities = await query(`
          SELECT 
            ps.player_id,
            jsonb_object_agg(pa.activity, 
              jsonb_build_object(
                'score', pa.score,
                'rank', pa.rank
              )
            ) as activities
          FROM player_snapshots ps
          INNER JOIN player_activities_snapshots pa ON pa.player_snapshot_id = ps.id
          WHERE ps.player_id = ANY($1)
            AND ps.id IN (
              SELECT DISTINCT ON (player_id) id
              FROM player_snapshots
              WHERE player_id = ANY($1)
              ORDER BY player_id, snapshot_date DESC, last_imported_at DESC
            )
          GROUP BY ps.player_id
        `, [snapshotIds])

        activities.forEach((act: any) => {
          const snap = snapshotsMap.get(act.player_id)
          if (snap) {
            snap.activities = act.activities
          }
        })

        // Get bosses for these snapshots
        const bosses = await query(`
          SELECT 
            ps.player_id,
            jsonb_object_agg(pb.boss, 
              jsonb_build_object(
                'kills', pb.kills,
                'rank', pb.rank,
                'ehb', pb.ehb
              )
            ) as bosses
          FROM player_snapshots ps
          INNER JOIN player_bosses_snapshots pb ON pb.player_snapshot_id = ps.id
          WHERE ps.player_id = ANY($1)
            AND ps.id IN (
              SELECT DISTINCT ON (player_id) id
              FROM player_snapshots
              WHERE player_id = ANY($1)
              ORDER BY player_id, snapshot_date DESC, last_imported_at DESC
            )
          GROUP BY ps.player_id
        `, [snapshotIds])

        bosses.forEach((boss: any) => {
          const snap = snapshotsMap.get(boss.player_id)
          if (snap) {
            snap.bosses = boss.bosses
          }
        })
      }
    }

    // Combine data
    const enrichedMembers = members.map((member: any) => {
      const snapshot = member.wom_id && snapshotsMap.has(member.wom_id) 
        ? snapshotsMap.get(member.wom_id) 
        : null

      return {
        id: member.id,
        ingame_name: member.ingame_name,
        discord_username: member.discord_username,
        discord_id: member.discord_id,
        is_active: member.is_active,
        joined_date: member.joined_date,
        left_date: member.left_date,
        wom_id: member.wom_id,
        osrs_nickname: member.osrs_nickname,
        role: member.wom_id && womMemberMap.has(member.wom_id) 
          ? womMemberMap.get(member.wom_id).role 
          : null,
        snapshot: snapshot ? {
          total_level: snapshot.total_level,
          total_xp: snapshot.total_xp,
          ehp: snapshot.ehp,
          ehb: snapshot.ehb,
          last_changed: snapshot.last_changed,
          last_imported_at: snapshot.last_imported_at,
          activities: snapshot.activities || null,
          bosses: snapshot.bosses || null
        } : null
      }
    })

    res.json({
      status: 'success',
      data: enrichedMembers,
      count: enrichedMembers.length,
      pagination: {
        limit,
        offset
      }
    })
  } catch (error: any) {
    console.error('Error fetching clan members:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch clan members',
      error: error?.message || 'Unknown error'
    })
  }
})

export default router

