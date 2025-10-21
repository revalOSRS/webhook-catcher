import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

import { handler as dinkHandler } from './dink/handler.js'
import { getMemberProfile, getAllActiveMembers, loginWithCode, getMemberByDiscordId, upsertMember, getOsrsAccountsByDiscordId, getRecentDonations, getDonationStats } from './db/services/member.js'
import * as WOM from './services/wiseoldman.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// CORS configuration
app.use(cors({
  origin: [
    'https://reval-games.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Member-Code']
}))

app.use(express.json())

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/webhook', async (req, res) => {
  try {
    let result;

    if (req.headers['user-agent'].includes('Dink')) {
      console.log('Received Dink webhook')
      result = await dinkHandler(req)
    } else {
      console.log('Received non-Dink webhook')
      // result = await dinkHandler(req)
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ status: 'error', message: 'Failed to process webhook' })
  }
})

// Member authentication and profile endpoints

// Discord authentication endpoint
app.post('/api/auth/discord', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Discord authorization code is required' 
      })
    }

    // Validate environment variables
    const clientId = process.env.DISCORD_CLIENT_ID
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    const redirectUri = process.env.DISCORD_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing Discord OAuth configuration:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri
      })
      return res.status(500).json({ 
        status: 'error', 
        message: 'Server configuration error: Discord OAuth is not properly configured',
        details: {
          missingClientId: !clientId,
          missingClientSecret: !clientSecret,
          missingRedirectUri: !redirectUri
        }
      })
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Discord token exchange failed:', {
        status: tokenResponse.status,
        error: errorData,
        clientIdUsed: clientId.substring(0, 8) + '...',
        redirectUriUsed: redirectUri
      })
      
      let errorMessage = 'Failed to authenticate with Discord'
      if (errorData.error === 'invalid_client') {
        errorMessage = 'Invalid Discord client credentials. Please check DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET environment variables.'
      } else if (errorData.error === 'invalid_grant') {
        errorMessage = 'Invalid or expired authorization code. Please try logging in again.'
      } else if (errorData.error === 'redirect_uri_mismatch') {
        errorMessage = 'Redirect URI mismatch. Please check DISCORD_REDIRECT_URI matches your Discord app settings.'
      }

      return res.status(401).json({ 
        status: 'error', 
        message: errorMessage,
        error_code: errorData.error,
        error_description: errorData.error_description
      })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Fetch user details from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!userResponse.ok) {
      console.error('Failed to fetch Discord user data')
      return res.status(401).json({ 
        status: 'error', 
        message: 'Failed to fetch user data from Discord' 
      })
    }

    const discordUser = await userResponse.json()
    const discordId = discordUser.id
    const discordTag = discordUser.username ? 
      `${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}` : 
      null

    // Check if member exists in our database
    let member = await getMemberByDiscordId(discordId)

    if (!member) {
      // Member not found in database
      return res.status(404).json({ 
        status: 'error', 
        message: 'Discord account not registered. Please contact an administrator.',
        discord_id: discordId // Include for debugging/registration purposes
      })
    }

    // Update discord_tag if it has changed
    if (discordTag && member.discord_tag !== discordTag) {
      member = await upsertMember({
        discord_id: discordId,
        discord_tag: discordTag
      })
    }
    // Note: last_seen is managed by Discord bot sync, not updated here

    // Return member info
    return res.status(200).json({
      status: 'success',
      data: {
        id: member.id,
        discord_id: member.discord_id,
        discord_tag: member.discord_tag,
        member_code: member.member_code,
        is_active: member.is_active
      },
      message: 'Discord authentication successful'
    })

  } catch (error) {
    console.error('Discord auth error:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process Discord authentication' 
    })
  }
})

// Login endpoint - authenticate with member code
app.post('/api/login', async (req, res) => {
  try {
    const { code } = req.body

    if (!code || isNaN(parseInt(code))) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Valid member code is required' 
      })
    }

    const memberCode = parseInt(code)
    const memberInfo = await loginWithCode(memberCode)

    if (!memberInfo) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid member code' 
      })
    }

    if (!memberInfo.is_active) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Account is not active' 
      })
    }

    res.status(200).json({
      status: 'success',
      data: memberInfo,
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process login' 
    })
  }
})

// app.get('/api/members', async (req, res) => {
//   try {
//     const members = await getAllActiveMembers()
//     res.status(200).json({
//       status: 'success',
//       data: members,
//       count: members.length
//     })
//   } catch (error) {
//     console.error('Error fetching members:', error)
//     res.status(500).json({ 
//       status: 'error', 
//       message: 'Failed to fetch members' 
//     })
//   }
// })

app.get('/api/member/:id', async (req, res) => {
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
        message: 'Valid member code is required (provide as query parameter ?code=XXX or header X-Member-Code)' 
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

// Get comprehensive player profile with WOM data
app.get('/api/player/:discordId', async (req, res) => {
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

    // Get donation stats
    const donationStats = await getDonationStats(discordId)
    const recentDonations = await getRecentDonations(discordId, 10)

    // Get WOM data for primary account (if exists)
    const primaryAccount = osrsAccounts.find(acc => acc.is_primary) || osrsAccounts[0]
    let womData = null

    if (primaryAccount && primaryAccount.osrs_nickname) {
      try {
        womData = await WOM.getComprehensivePlayerData(primaryAccount.osrs_nickname)
      } catch (error) {
        console.error('Failed to fetch WOM data:', error)
        // Continue without WOM data
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        member: {
          id: member.id,
          discord_id: member.discord_id,
          discord_tag: member.discord_tag,
          member_code: member.member_code,
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
        wom: womData
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

// WiseOldMan Endpoints

// Get WOM player data by OSRS username
app.get('/api/wom/player/:username', async (req, res) => {
  try {
    const { username } = req.params
    const player = await WOM.searchPlayer(username)

    if (!player) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Player not found on WiseOldMan' 
      })
    }

    res.status(200).json({
      status: 'success',
      data: player
    })
  } catch (error) {
    console.error('Error fetching WOM player:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch WOM player data' 
    })
  }
})

// Update WOM player (trigger hiscores refresh)
app.post('/api/wom/player/:username/update', async (req, res) => {
  try {
    const { username } = req.params
    const updatedPlayer = await WOM.updatePlayer(username)

    res.status(200).json({
      status: 'success',
      data: updatedPlayer,
      message: 'Player updated successfully'
    })
  } catch (error) {
    console.error('Error updating WOM player:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update WOM player' 
    })
  }
})

// Get player gains
app.get('/api/wom/player/:username/gains', async (req, res) => {
  try {
    const { username } = req.params
    const period = (req.query.period as 'day' | 'week' | 'month' | 'year') || 'week'

    const gains = await WOM.getPlayerGains(username, period)

    res.status(200).json({
      status: 'success',
      data: gains
    })
  } catch (error) {
    console.error('Error fetching WOM gains:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player gains' 
    })
  }
})

// Get player achievements
app.get('/api/wom/player/:username/achievements', async (req, res) => {
  try {
    const { username } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20

    const achievements = await WOM.getPlayerAchievements(username, limit)

    res.status(200).json({
      status: 'success',
      data: achievements,
      count: achievements.length
    })
  } catch (error) {
    console.error('Error fetching WOM achievements:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player achievements' 
    })
  }
})

// Get player records
app.get('/api/wom/player/:username/records', async (req, res) => {
  try {
    const { username } = req.params
    const period = (req.query.period as string) || 'week'
    const metric = req.query.metric as string | undefined

    const records = await WOM.getPlayerRecords(username, period, metric)

    res.status(200).json({
      status: 'success',
      data: records,
      count: records.length
    })
  } catch (error) {
    console.error('Error fetching WOM records:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player records' 
    })
  }
})

// Get player snapshots
app.get('/api/wom/player/:username/snapshots', async (req, res) => {
  try {
    const { username } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

    const snapshots = await WOM.getPlayerSnapshots(username, limit)

    res.status(200).json({
      status: 'success',
      data: snapshots,
      count: snapshots.length
    })
  } catch (error) {
    console.error('Error fetching WOM snapshots:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player snapshots' 
    })
  }
})

// Get player groups/clans
app.get('/api/wom/player/:username/groups', async (req, res) => {
  try {
    const { username } = req.params
    const groups = await WOM.getPlayerGroups(username)

    res.status(200).json({
      status: 'success',
      data: groups,
      count: groups.length
    })
  } catch (error) {
    console.error('Error fetching WOM groups:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player groups' 
    })
  }
})

// Get comprehensive WOM data
app.get('/api/wom/player/:username/comprehensive', async (req, res) => {
  try {
    const { username } = req.params
    const data = await WOM.getComprehensivePlayerData(username)

    res.status(200).json({
      status: 'success',
      data: data
    })
  } catch (error) {
    console.error('Error fetching comprehensive WOM data:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch comprehensive WOM data' 
    })
  }
})

export default app
