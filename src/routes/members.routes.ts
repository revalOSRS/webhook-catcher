import { Router } from 'express'
import { 
  getMemberProfile, 
  getMemberByDiscordId, 
  getOsrsAccountsByDiscordId, 
  getRecentDonations, 
  getDonationStats, 
  getTokenMovements 
} from '../db/services/member.js'
import { getDiscordAvatar } from '../services/discord.js'
import * as db from '../db/connection.js'
import { requireAdmin, requireMemberAuth } from '../middleware/auth.js'

const router = Router()

// Admin endpoint - Get all members
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const allMembers = await db.query(
      `SELECT 
        m.*,
        COUNT(DISTINCT oa.id) as osrs_accounts_count,
        COALESCE(SUM(CASE WHEN d.status = 'approved' THEN d.amount ELSE 0 END), 0) as total_donations
       FROM members m
       LEFT JOIN osrs_accounts oa ON m.discord_id = oa.discord_id
       LEFT JOIN donations d ON m.discord_id = d.player_discord_id
       GROUP BY m.id
       ORDER BY m.created_at DESC`
    )

    res.status(200).json({
      status: 'success',
      data: allMembers,
      count: allMembers.length
    })
  } catch (error) {
    console.error('Error fetching all members:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch members' 
    })
  }
})

// Get count of active members in the clan
router.get('/count/active', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM members
       WHERE is_active = true AND in_discord = true`
    )

    const count = parseInt(result[0]?.count || '0')

    res.status(200).json({
      status: 'success',
      data: {
        active_members: count
      }
    })
  } catch (error) {
    console.error('Error fetching active member count:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch active member count' 
    })
  }
})

// Get member profile by ID (requires member code)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const memberCode = req.query.code || req.headers['x-member-code']

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Valid member ID is required' 
      })
    }

    if (!memberCode || isNaN(parseInt(memberCode as string))) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Valid member code is required' 
      })
    }

    const memberId = parseInt(id)
    const code = parseInt(memberCode as string)

    const profile = await getMemberProfile(memberId, code)

    if (!profile) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Member not found or invalid member code' 
      })
    }

    res.status(200).json({
      status: 'success',
      data: profile
    })
  } catch (error) {
    console.error('Error fetching member profile:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch member profile' 
    })
  }
})

// Get player profile by Discord ID
router.get('/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params
    const memberCode = req.query.code || req.headers['x-member-code']

    if (!discordId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Discord ID is required' 
      })
    }

    // Get member info
    const member = await getMemberByDiscordId(discordId)
    if (!member) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Member not found' 
      })
    }

    // Verify member code if provided
    if (memberCode && member.member_code !== parseInt(memberCode as string)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Invalid member code' 
      })
    }

    // Get OSRS accounts
    const osrsAccounts = await getOsrsAccountsByDiscordId(discordId)

    // Get donation stats and token movements in parallel
    const [donationStats, recentDonations, tokenMovements, discordAvatar] = await Promise.all([
      getDonationStats(discordId),
      getRecentDonations(discordId, 10),
      getTokenMovements(discordId, 20),
      getDiscordAvatar(member.discord_id)
    ])

    res.status(200).json({
      status: 'success',
      data: {
        member: {
          id: member.id,
          discord_id: member.discord_id,
          discord_tag: member.discord_tag,
          discord_avatar: discordAvatar,
          member_code: member.member_code,
          token_balance: member.token_balance,
          is_active: member.is_active,
          created_at: member.created_at,
          last_seen: member.last_seen
        },
        osrs_accounts: osrsAccounts,
        donations: {
          total_approved: donationStats.total_approved,
          total_pending: donationStats.total_pending,
          recent: recentDonations
        },
        token_movements: tokenMovements
      }
    })
  } catch (error) {
    console.error('Error fetching player profile:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player profile' 
    })
  }
})

// Get member by member ID (REQUIRES AUTHENTICATION)
router.get('/:memberId', requireMemberAuth, async (req, res) => {
  try {
    const member = (req as any).authenticatedMember
    
    // Get member's OSRS accounts
    const osrsAccounts = await getOsrsAccountsByDiscordId(member.discord_id)
    
    // Get Discord avatar
    const discordAvatar = await getDiscordAvatar(member.discord_id)
    
    res.status(200).json({
      status: 'success',
      data: {
        member: {
          id: member.id,
          discord_id: member.discord_id,
          discord_tag: member.discord_tag,
          discord_avatar: discordAvatar,
          token_balance: member.token_balance,
          is_active: member.is_active,
          created_at: member.created_at,
          last_seen: member.last_seen
        },
        osrs_accounts: osrsAccounts
      }
    })
    
  } catch (error) {
    console.error('Error fetching member:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch member' 
    })
  }
})

// Get member's detailed snapshot by member ID (REQUIRES AUTHENTICATION)
router.get('/:memberId/snapshot', requireMemberAuth, async (req, res) => {
  try {
    const member = (req as any).authenticatedMember
    
    // Get member's primary OSRS account to get WOM player ID
    const osrsAccounts = await db.query<any>(`
      SELECT osrs_nickname, wom_player_id, is_primary
      FROM osrs_accounts
      WHERE discord_id = $1
      ORDER BY is_primary DESC, created_at DESC
    `, [member.discord_id])
    
    if (osrsAccounts.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No OSRS accounts found for this member'
      })
    }
    
    // Get the primary account (or first account if no primary)
    const primaryAccount = osrsAccounts.find(acc => acc.is_primary) || osrsAccounts[0]
    
    if (!primaryAccount.wom_player_id) {
      return res.status(404).json({
        status: 'error',
        message: 'This member has no WiseOldMan ID linked'
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
      return res.status(404).json({
        status: 'error',
        message: 'No clan snapshots available yet'
      })
    }
    
    // Get player snapshot for this member from latest clan snapshot
    const playerSnapshot = await db.queryOne<any>(`
      SELECT 
        id, player_id, username, display_name, snapshot_date,
        player_type, player_build, country, status, patron,
        total_exp, total_level, combat_level,
        ehp, ehb, ttm, tt200m,
        registered_at, updated_at, last_changed_at
      FROM player_snapshots
      WHERE player_id = $1 AND clan_snapshot_id = $2
    `, [primaryAccount.wom_player_id, latestClanSnapshot.id])
    
    if (!playerSnapshot) {
      return res.status(404).json({
        status: 'error',
        message: 'No snapshot found for this member in the latest clan snapshot'
      })
    }
    
    // Fetch all related data in parallel
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
    const responseData = {
      member: {
        id: member.id,
        discordId: member.discord_id,
        discordTag: member.discord_tag
      },
      osrsAccounts: osrsAccounts.map(acc => ({
        username: acc.osrs_nickname,
        isPrimary: acc.is_primary,
        womPlayerId: acc.wom_player_id
      })),
      clanSnapshot: {
        id: latestClanSnapshot.id,
        snapshotDate: latestClanSnapshot.snapshot_date,
        groupName: latestClanSnapshot.group_name
      },
      snapshot: {
        id: playerSnapshot.id,
        playerId: playerSnapshot.player_id,
        username: playerSnapshot.username,
        displayName: playerSnapshot.display_name,
        snapshotDate: playerSnapshot.snapshot_date,
        type: playerSnapshot.player_type,
        build: playerSnapshot.player_build,
        country: playerSnapshot.country,
        status: playerSnapshot.status,
        patron: playerSnapshot.patron,
        stats: {
          totalExp: parseInt(playerSnapshot.total_exp),
          totalLevel: playerSnapshot.total_level,
          combatLevel: playerSnapshot.combat_level,
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
          registeredAt: playerSnapshot.registered_at,
          updatedAt: playerSnapshot.updated_at,
          lastChangedAt: playerSnapshot.last_changed_at
        }
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: responseData
    })
    
  } catch (error) {
    console.error('Error fetching member snapshot:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch member snapshot data' 
    })
  }
})

export default router

