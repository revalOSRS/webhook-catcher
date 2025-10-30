import { Router } from 'express'
import { getMemberByDiscordId, upsertMember, loginWithCode } from '../db/services/member.js'
import { getDiscordAvatar } from '../services/discord.js'

const router = Router()

// Discord OAuth authentication
router.post('/discord', async (req, res) => {
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
        message: 'Server configuration error: Discord OAuth is not properly configured'
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
      console.error('Discord token exchange failed:', errorData)
      
      let errorMessage = 'Failed to authenticate with Discord'
      if (errorData.error === 'invalid_client') {
        errorMessage = 'Invalid Discord client credentials'
      } else if (errorData.error === 'invalid_grant') {
        errorMessage = 'Invalid or expired authorization code'
      } else if (errorData.error === 'redirect_uri_mismatch') {
        errorMessage = 'Redirect URI mismatch'
      }

      return res.status(401).json({ 
        status: 'error', 
        message: errorMessage,
        error_code: errorData.error
      })
    }

    const tokenData = await tokenResponse.json()

    // Fetch user details from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    })

    if (!userResponse.ok) {
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

    // Check if member exists
    let member = await getMemberByDiscordId(discordId)

    if (!member) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Discord account not registered. Please contact an administrator.',
        discord_id: discordId
      })
    }

    // Update discord_tag if changed
    if (discordTag && member.discord_tag !== discordTag) {
      member = await upsertMember({
        discord_id: discordId,
        discord_tag: discordTag
      })
    }

    // Fetch avatar
    const discordAvatar = await getDiscordAvatar(member.discord_id)

    return res.status(200).json({
      status: 'success',
      data: {
        id: member.id,
        discord_id: member.discord_id,
        discord_tag: member.discord_tag,
        discord_avatar: discordAvatar,
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

// Login with member code
router.post('/login', async (req, res) => {
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

export default router


