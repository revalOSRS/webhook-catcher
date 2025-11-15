import { Router } from 'express'
import { getRecentActivityEvents } from '../dink/handler.js'
import { getGroupActivity } from '../services/wiseoldman.js'

const router = Router()

// WiseOldMan group ID for your clan (update this with your actual group ID)
const CLAN_GROUP_ID = parseInt(process.env.WOM_GROUP_ID || '14350')

/**
 * GET /api/activity-events
 * Get recent activity events from cache
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 7
    const events = getRecentActivityEvents(limit)
    
    res.json({
      status: 'success',
      data: events,
      count: events.length,
    })
  } catch (error) {
    console.error('Error fetching activity events:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activity events',
    })
  }
})

/**
 * GET /api/activity-events/wom
 * Get clan activity from WiseOldMan (joins, leaves, rank changes)
 * Query params: limit, offset
 */
router.get('/wom', async (req, res) => {
  try {
    if (!CLAN_GROUP_ID || CLAN_GROUP_ID === 0) {
      return res.status(503).json({
        status: 'error',
        message: 'WiseOldMan group ID not configured. Set WOM_GROUP_ID environment variable.',
      })
    }

    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0

    const activity = await getGroupActivity(CLAN_GROUP_ID, limit, offset)
    
    res.json({
      status: 'success',
      data: activity,
      count: activity.length,
      pagination: {
        limit,
        offset
      }
    })
  } catch (error: any) {
    console.error('Error fetching WiseOldMan activity:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch clan activity from WiseOldMan',
      error: error?.message || 'Unknown error'
    })
  }
})

export default router
