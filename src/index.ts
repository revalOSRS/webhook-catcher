import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

import { handler as dinkHandler } from './dink/handler.js'
import { getMemberProfile, getAllActiveMembers, loginWithCode, getMemberByDiscordId, upsertMember } from './db/services/member.js'

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

// app.get('/', (req, res) => {
//   res.type('html').send(`
//     <!doctype html>
//     <html>
//       <head>
//         <meta charset="utf-8"/>
//         <title>Express on Vercel</title>
//         <link rel="stylesheet" href="/style.css" />
//       </head>
//       <body>
//         <nav>
//           <a href="/">Home</a>
//           <a href="/about">About</a>
//           <a href="/api-data">API Data</a>
//           <a href="/healthz">Health</a>
//         </nav>
//         <h1>Welcome to Express on Vercel 🚀</h1>
//         <p>This is a minimal example without a database or forms.</p>
//         <img src="/logo.png" alt="Logo" width="120" />
//       </body>
//     </html>
//   `)
// })


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

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || ''
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Discord token exchange failed:', errorData)
      return res.status(401).json({ 
        status: 'error', 
        message: 'Failed to authenticate with Discord' 
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

    // Update discord_tag if changed and update last_seen
    if (discordTag && member.discord_tag !== discordTag) {
      member = await upsertMember({
        discord_id: discordId,
        discord_tag: discordTag
      })
    } else {
      // Just update last_seen
      await upsertMember({
        discord_id: discordId
      })
      member = await getMemberByDiscordId(discordId)
    }

    if (!member) {
      throw new Error('Failed to update member data')
    }

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

export default app
