import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'

import { handler as dinkHandler } from './dink/handler.js'

// Import route modules
import authRoutes from './routes/auth.routes.js'
import membersRoutes from './routes/members.routes.js'
import womRoutes from './routes/wom.routes.js'
import battleshipRoutes from './routes/battleship/index.js'
import activityRoutes from './routes/activity.routes.js'

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Member-Code', 'X-Admin-Key']
}))

app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Webhook endpoint for Dink notifications
app.post('/webhook', async (req, res) => {
  try {
    let result;

    if (req.headers['user-agent']?.includes('Dink')) {
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

// Mount API routes
app.use('/api/auth', authRoutes)
app.use('/api/member', membersRoutes) // /api/member/:id endpoint
app.use('/api/player', membersRoutes) // /api/player/:discordId endpoint
app.use('/api/admin/members', membersRoutes) // /api/admin/members/all endpoint
app.use('/api/wom', womRoutes)
app.use('/api/battleship', battleshipRoutes)
app.use('/api/activity-events', activityRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path
  })
})

export default app
