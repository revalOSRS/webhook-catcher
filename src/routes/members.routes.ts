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
import { query } from '../db/connection.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

// Admin endpoint - Get all members
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const allMembers = await query(
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

export default router

