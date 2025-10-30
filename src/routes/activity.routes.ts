import { Router } from 'express'
import { getRecentActivityEvents } from '../dink/handler.js'

const router = Router()

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

export default router

