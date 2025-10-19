import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

import { handler as dinkHandler } from './dink/handler.js'
import { getMemberProfile, getAllActiveMembers } from './db/services/member.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

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

// Member profile endpoints
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
