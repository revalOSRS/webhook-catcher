import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import compression from 'compression'

import { handler as dinkHandler } from './dink/handler.js'

// Import route modules
import authRoutes from './routes/auth.routes.js'
import membersRoutes from './routes/members/index.js'
import clanRoutes from './routes/clan/index.js'
import battleshipRoutes from './routes/battleship/index.js'
import activityRoutes from './routes/activity.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// CORS configuration
app.use(cors({
  origin: [
    'https://www.revalosrs.ee',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Member-Code', 'X-Admin-Key', 'X-Discord-Id', 'Content-Encoding']
}))

// Enable gzip compression for responses
app.use(compression())

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// RuneLite plugin webhook endpoint with large payload support
app.post('/reval-webhook', express.json({ 
  limit: '50mb',  // Large limit for comprehensive collection log / combat achievement data
  verify: (req, res, buf, encoding) => {
    if (req.headers['content-encoding'] === 'gzip') {
      console.log('Received gzip-compressed RuneLite plugin data')
    }
  }
}), async (req, res) => {
  try {
    console.log('========================================')
    console.log('Received RuneLite plugin data')
    console.log('========================================')
    
    // Log basic info
    console.log('Player Name:', req.body.playerName)
    console.log('Account Hash:', req.body.accountHash)
    console.log('Timestamp:', req.body.timestamp)
    console.log('Data size:', JSON.stringify(req.body).length, 'bytes')
    console.log('Content-Encoding:', req.headers['content-encoding'] || 'none')
    
    // Log top-level keys
    console.log('\nTop-level keys:', Object.keys(req.body))
    
    // Log nested structure details
    console.log('\n--- Quests ---')
    if (req.body.quests) {
      console.log('Completed:', req.body.quests.completed)
      console.log('In Progress:', req.body.quests.inProgress)
      console.log('Not Started:', req.body.quests.notStarted)
      console.log('Quest Points:', req.body.quests.questPoints)
      console.log('Quest States Keys:', req.body.quests.questStates ? Object.keys(req.body.quests.questStates).length : 0)
    }
    
    console.log('\n--- Collection Log ---')
    if (req.body.collectionLog) {
      console.log('Keys:', Object.keys(req.body.collectionLog))
      console.log('Unique Items Obtained:', req.body.collectionLog.uniqueItemsObtained)
      if (req.body.collectionLog.tabs) {
        console.log('Tab Count:', Object.keys(req.body.collectionLog.tabs).length)
        console.log('Tab Names:', Object.keys(req.body.collectionLog.tabs))
      }
      if (req.body.collectionLog.sampleKillCounts) {
        console.log('Sample Kill Counts:', req.body.collectionLog.sampleKillCounts)
      }
    }
    
    console.log('\n--- Combat Achievements ---')
    if (req.body.combatAchievements) {
      console.log('Keys:', Object.keys(req.body.combatAchievements))
      console.log('Current Tier:', req.body.combatAchievements.currentTier)
      if (req.body.combatAchievements.tierProgress) {
        console.log('Tier Progress:', req.body.combatAchievements.tierProgress)
      }
      if (req.body.combatAchievements.tasks) {
        console.log('Total Tasks:', req.body.combatAchievements.tasks.length || 'N/A')
      }
      if (req.body.combatAchievements.tasksByMonster) {
        console.log('Monsters with tasks:', Object.keys(req.body.combatAchievements.tasksByMonster).length)
      }
    }
    
    console.log('\n--- Achievement Diaries ---')
    if (req.body.achievementDiaries) {
      console.log('Keys:', Object.keys(req.body.achievementDiaries))
      console.log('Total Diaries:', req.body.achievementDiaries.totalDiaries)
      console.log('Total Completed:', req.body.achievementDiaries.totalCompleted)
      if (req.body.achievementDiaries.progress) {
        console.log('Regions:', Object.keys(req.body.achievementDiaries.progress))
      }
    }
    
    console.log('\n========================================')
    console.log('Full payload structure:')
    console.log(JSON.stringify(req.body, null, 2).substring(0, 2000) + '...(truncated)')
    console.log('========================================\n')
    
    res.status(200).json({ 
      status: 'success', 
      message: 'RuneLite plugin data received',
      timestamp: new Date().toISOString(),
      debug: {
        playerName: req.body.playerName,
        dataSize: JSON.stringify(req.body).length,
        topLevelKeys: Object.keys(req.body)
      }
    })
  } catch (error) {
    console.error('RuneLite webhook processing error:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to process RuneLite plugin data',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Standard JSON parsing for all other endpoints (default 100kb limit)
app.use(express.json())

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
app.use('/api/members', membersRoutes)
app.use('/api/clan', clanRoutes)
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
