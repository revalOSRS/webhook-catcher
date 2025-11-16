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
    let sql = `
      SELECT 
        m.id,
        m.ingame_name,
        m.discord_username,
        m.discord_id,
        m.wom_id,
        m.is_active,
        m.joined_date,
        m.left_date,
        s.total_level,
        s.total_xp,
        s.ehp,
        s.ehb,
        s.last_changed,
        s.last_imported_at,
        s.activities,
        s.bosses
      FROM members m
      LEFT JOIN snapshots s ON s.member_id = m.id
        AND s.last_imported_at = (
          SELECT MAX(last_imported_at) 
          FROM snapshots 
          WHERE member_id = m.id
        )
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramIndex = 1

    if (search) {
      sql += ` AND (m.ingame_name ILIKE $${paramIndex} OR m.discord_username ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    sql += ` ORDER BY m.is_active DESC, s.total_level DESC NULLS LAST, m.ingame_name ASC`
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

    // Combine data
    const enrichedMembers = members.map((member: any) => ({
      id: member.id,
      ingame_name: member.ingame_name,
      discord_username: member.discord_username,
      discord_id: member.discord_id,
      is_active: member.is_active,
      joined_date: member.joined_date,
      left_date: member.left_date,
      wom_id: member.wom_id,
      
      role: member.wom_id && womMemberMap.has(member.wom_id) 
        ? womMemberMap.get(member.wom_id).role 
        : null,
      snapshot: member.total_level ? {
        total_level: member.total_level,
        total_xp: member.total_xp,
        ehp: member.ehp,
        ehb: member.ehb,
        last_changed: member.last_changed,
        last_imported_at: member.last_imported_at,
        activities: member.activities || null,
        bosses: member.bosses || null
      } : null
    }))

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

