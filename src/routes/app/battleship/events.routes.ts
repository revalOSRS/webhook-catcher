import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import * as battleshipService from '../../db/services/battleship.service.js'

const router = Router()

// Create a new event (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { event_type, name, description, start_time, end_time, metadata } = req.body

    if (!event_type || !name || !start_time || !end_time) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: event_type, name, start_time, end_time'
      })
    }

    // Create the main event
    const event = await battleshipService.createEvent({
      event_type,
      name,
      description,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      created_by_discord_id: req.body.created_by_discord_id || 'admin',
      metadata
    })

    // If it's a battleship_bingo event, create the specific event data
    if (event_type === 'battleship_bingo' && req.body.board_config) {
      const bbEvent = await battleshipService.createBattleshipBingoEvent({
        event_id: event.id,
        board_config: req.body.board_config,
        rules_config: req.body.rules_config || {},
        total_tiles: req.body.total_tiles || 0
      })

      return res.status(201).json({
        status: 'success',
        data: {
          event,
          battleship_bingo_event: bbEvent
        },
        message: 'Battleship Bingo event created successfully'
      })
    }

    res.status(201).json({
      status: 'success',
      data: event,
      message: 'Event created successfully'
    })
  } catch (error) {
    console.error('Error creating event:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to create event'
    })
  }
})

// Get all events
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      event_type: req.query.event_type as string | undefined
    }

    const events = await battleshipService.getAllEvents(filters)

    res.status(200).json({
      status: 'success',
      data: events,
      count: events.length
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch events'
    })
  }
})

// Get event by ID
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params

    const event = await battleshipService.getEventById(eventId)

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      })
    }

    // If it's a battleship bingo event, include that data
    if (event.event_type === 'battleship_bingo') {
      const bbEvent = await battleshipService.getBattleshipBingoEvent(eventId)
      return res.status(200).json({
        status: 'success',
        data: {
          event,
          battleship_bingo_event: bbEvent
        }
      })
    }

    res.status(200).json({
      status: 'success',
      data: event
    })
  } catch (error) {
    console.error('Error fetching event:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch event'
    })
  }
})

// Update event status (admin only)
router.patch('/:eventId/status', requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'Status is required'
      })
    }

    const event = await battleshipService.updateEventStatus(eventId, status)

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      })
    }

    // Log the action
    await battleshipService.logEventAction({
      event_id: eventId,
      action_type: 'status_change',
      details: { old_status: event.status, new_status: status }
    })

    res.status(200).json({
      status: 'success',
      data: event,
      message: 'Event status updated successfully'
    })
  } catch (error) {
    console.error('Error updating event status:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to update event status'
    })
  }
})

// Get event logs
router.get('/:eventId/logs', async (req, res) => {
  try {
    const { eventId } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100

    const logs = await battleshipService.getEventLogs(eventId, limit)

    res.status(200).json({
      status: 'success',
      data: logs,
      count: logs.length
    })
  } catch (error) {
    console.error('Error fetching event logs:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch event logs'
    })
  }
})

export default router


