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
    const requiredGuildId = process.env.DISCORD_GUILD_ID || '1425080688063025286' // Add to your .env
    const requiredRoleIds = process.env.DISCORD_REQUIRED_ROLE_IDS?.split(',') || ['1433552611340189716'] // Add to your .env as comma-separated

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
    const accessToken = tokenData.access_token

    // Fetch user details from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
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

    // ========== NEW: Check if user is in required guild ==========
    if (requiredGuildId) {
      const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!guildsResponse.ok) {
        return res.status(401).json({ 
          status: 'error', 
          message: 'Failed to fetch guild membership from Discord' 
        })
      }

      const guilds = await guildsResponse.json()
      const isInGuild = guilds.some((guild: any) => guild.id === requiredGuildId)

      if (!isInGuild) {
        return res.status(403).json({ 
          status: 'error', 
          message: 'Sul puudub ligipääs. Pead olema Reval Discord serveri liige.',
          message_en: 'Access denied. You must be a member of the Reval Discord server.',
          discord_invite: 'https://discord.gg/7Fe5sWs4Su' // Add your Discord invite link
        })
      }

      // ========== NEW: Check if user has required role ==========
      if (requiredRoleIds.length > 0) {
        const memberResponse = await fetch(
          `https://discord.com/api/users/@me/guilds/${requiredGuildId}/member`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        )

        if (!memberResponse.ok) {
          return res.status(401).json({ 
            status: 'error', 
            message: 'Failed to fetch member roles from Discord' 
          })
        }

        const memberData = await memberResponse.json()
        const userRoles = memberData.roles || []

        const hasRequiredRole = requiredRoleIds.some((roleId) => 
          userRoles.includes(roleId.trim())
        )

        if (!hasRequiredRole) {
          return res.status(403).json({ 
            status: 'error', 
            message: 'Sul puudub ligipääs. Pead omama vajalikku rolli Reval Discord serveris.',
            message_en: 'Access denied. You must have the required role in the Reval Discord server.',
            discord_invite: 'https://discord.gg/7Fe5sWs4Su'
          })
        }
      }
    }
    // ========== END NEW ==========

    // Check if member exists
    let member = await getMemberByDiscordId(discordId)

    if (!member) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Discord konto pole registreeritud. Palun võta ühendust administraatoriga.',
        message_en: 'Discord account not registered. Please contact an administrator.',
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

export default router
