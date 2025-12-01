import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import compression from 'compression'

import { DinkService } from './modules/dink/index.js'
import { RuneLiteService } from './modules/runelite/index.js'

// Import route modules
import authRoutes from './routes/app/auth.routes.js'
import membersRoutes from './routes/app/members/index.js'
import clanRoutes from './routes/app/clan/index.js'
import activityRoutes from './routes/app/activity.routes.js'
import eventFiltersRoutes from './routes/app/event-filters.routes.js'
import clanEventsRoutes from './routes/app/clan-events/index.js'
import publicBingoRoutes from './routes/app/clan-events/public.routes.js'
import adminClanEventsRoutes from './routes/admin/clan-events/index.js'

// Import middleware
import { requireDiscordAdmin } from './middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// CORS configuration
app.use(cors({
  origin: [
    'https://www.revalosrs.ee',
    'http://localhost:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Member-Code', 'X-Admin-Key', 'X-Discord-Id', 'Content-Encoding']
}))

// Enable gzip compression for responses
app.use(compression())

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// RuneLite plugin webhook endpoint with large payload support
// app.post('/reval-webhook', express.json({ 
//   // limit: '50mb',  // Large limit for comprehensive collection log / combat achievement data
//   verify: (req, res, buf, encoding) => {
//     if (req.headers['content-encoding'] === 'gzip') {
//       console.log('Received gzip-compressed RuneLite plugin data')
//     }
//   }
// }), async (req, res) => {
//   try {    
//     const validation = RuneLiteService.validateRuneLiteEvent(req.body)
//     if (!validation.valid) {
//       console.error(`[RuneLite Webhook] Validation error: ${validation.error}`)
//       return res.status(400).json({ 
//         status: 'error', 
//         message: validation.error,
//         timestamp: new Date().toISOString()
//       })
//     }
    
//     console.log('RuneLite webhook received', JSON.stringify(req.body, null, 2))

//     // Process event through handler
//     const result = await RuneLiteService.handleRuneLiteEvent(req.body)
    
//     res.status(200).json({ 
//       status: 'success', 
//       message: 'RuneLite plugin data received and processed',
//       eventType: req.body.eventType,
//       result,
//       timestamp: new Date().toISOString()
//     })
//   } catch (error) {
//     console.error('RuneLite webhook processing error:', error)
//     res.status(500).json({ 
//       status: 'error', 
//       message: 'Failed to process RuneLite plugin data',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     })
//   }
// })

// Standard JSON parsing for all other endpoints (default 100kb limit)
app.use(express.json())

// Webhook endpoint for Dink notifications
app.post('/webhook', async (req, res) => {
  try {
    let result;

    if (req.headers['user-agent']?.includes('Dink')) {
      console.log('Received Dink webhook')
      result = await DinkService.processWebhook(req)
    } else {
      console.log('Received non-Dink webhook')
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ status: 'error', message: 'Failed to process webhook' })
  }
})

// Mount API routes
app.use('/api/auth', authRoutes)
app.use('/api/members', membersRoutes)
app.use('/api/clan', clanRoutes)
// app.use('/api/battleship', battleshipRoutes)
app.use('/api/activity-events', activityRoutes)
app.use('/api/app/clan-events', clanEventsRoutes)

// Public routes - no authentication required
app.use('/api/public/bingo', publicBingoRoutes)

// Admin routes - protected by Discord rank check
app.use('/api/admin/clan-events', requireDiscordAdmin, adminClanEventsRoutes)

// Public RuneLite plugin endpoint (no /api prefix for backward compatibility)
app.use('/event-filters', eventFiltersRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path
  })
})

export default app
