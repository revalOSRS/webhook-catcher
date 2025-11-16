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

    // Get WiseOldMan group members
    let womMembers: any[] = []
    try {
      if (!CLAN_GROUP_ID || CLAN_GROUP_ID === 0) {
        return res.status(503).json({
          status: 'error',
          message: 'WiseOldMan group ID not configured. Set WOM_GROUP_ID environment variable.'
        })
      }
      
      womMembers = await getGroupMembers(CLAN_GROUP_ID)
    } catch (error) {
      console.error('Error fetching WOM members:', error)
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch clan members from WiseOldMan',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Apply search filter if provided
    let filteredMembers = womMembers
    if (search) {
      const searchLower = search.toLowerCase()
      filteredMembers = womMembers.filter((wm: any) => 
        wm.player.username.toLowerCase().includes(searchLower) ||
        wm.player.displayName?.toLowerCase().includes(searchLower)
      )
    }

    // Apply pagination
    const paginatedMembers = filteredMembers.slice(offset, offset + limit)

    // Get WOM player IDs for snapshot lookup
    const womIds = paginatedMembers.map((wm: any) => wm.player.id)
    
    let snapshotsMap = new Map()
    
    if (womIds.length > 0) {
      // Get latest snapshot for each player
      const snapshots = await query(`
        SELECT DISTINCT ON (player_id)
          ps.id as snapshot_id,
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
      const snapshotDbIds = snapshots.map((s: any) => s.snapshot_id)
      if (snapshotDbIds.length > 0) {
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
          WHERE ps.id = ANY($1)
          GROUP BY ps.player_id
        `, [snapshotDbIds])

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
          WHERE ps.id = ANY($1)
          GROUP BY ps.player_id
        `, [snapshotDbIds])

        bosses.forEach((boss: any) => {
          const snap = snapshotsMap.get(boss.player_id)
          if (snap) {
            snap.bosses = boss.bosses
          }
        })
      }
    }

    // Get Discord IDs for members from our database (to link WOM data to Discord users)
    const womIdsForDiscord = paginatedMembers.map((wm: any) => wm.player.id)
    const discordLinks = await query(`
      SELECT wom_player_id, discord_id
      FROM osrs_accounts
      WHERE wom_player_id = ANY($1)
    `, [womIdsForDiscord])

    const discordLinkMap = new Map()
    discordLinks.forEach((link: any) => {
      discordLinkMap.set(link.wom_player_id, link.discord_id)
    })

    // Combine data
    const enrichedMembers = paginatedMembers.map((wm: any) => {
      const player = wm.player
      const snapshot = snapshotsMap.has(player.id) 
        ? snapshotsMap.get(player.id) 
        : null

      return {
        wom_id: player.id,
        username: player.username,
        display_name: player.displayName,
        discord_id: discordLinkMap.get(player.id) || null,
        role: wm.role,
        joined_at: wm.createdAt,
        snapshot: snapshot ? {
          total_level: Number(snapshot.total_level),
          total_xp: Number(snapshot.total_xp),
          ehp: Number(snapshot.ehp),
          ehb: Number(snapshot.ehb),
          last_changed: snapshot.last_changed,
          last_imported_at: snapshot.last_imported_at,
          activities: snapshot.activities || null,
          bosses: snapshot.bosses || null
        } : null
      }
    })

    res.json({
      data: enrichedMembers,
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

