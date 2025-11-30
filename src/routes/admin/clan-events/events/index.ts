/**
 * Events Admin Routes
 * 
 * CRUD operations for clan events using the EventsEntity class.
 * Supports event lifecycle management (activate, pause, complete, cancel).
 */

import { Router, Request, Response } from 'express';
import { query } from '../../../../db/connection.js';
import { EventsEntity, type Event } from '../../../../modules/events/entities/events.entity.js';
import { EventTeamsEntity } from '../../../../modules/events/entities/event-teams.entity.js';
import { EventRegistrationsEntity } from '../../../../modules/events/entities/event-registrations.entity.js';
import { BoardInitializationService } from '../../../../modules/events/bingo/board-initialization.service.js';
import { EventStatus } from '../../../../modules/events/types/event-status.type.js';
import { EventType } from '../../../../modules/events/types/event-type.type.js';
import registrationsRouter from './registrations.routes.js';

const router = Router();

// Instantiate entities
const eventsEntity = new EventsEntity();
const teamsEntity = new EventTeamsEntity();
const registrationsEntity = new EventRegistrationsEntity();
const boardInitService = new BoardInitializationService();

// ============================================================================
// EVENTS CRUD
// ============================================================================

/**
 * GET /api/admin/clan-events/events
 * List all events with optional filtering
 * 
 * Query params: event_type, status, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { event_type, status, limit = '50', offset = '0' } = req.query;

    const events = await eventsEntity.findAllFiltered({
      eventType: event_type as EventType | undefined,
      status: status as EventStatus | undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: events,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching events:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message
    });
  }
});

/**
 * GET /api/admin/clan-events/events/:id
 * Get a single event by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await eventsEntity.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching event:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message
    });
  }
});

/**
 * GET /api/admin/clan-events/events/:id/statistics
 * Get event statistics including team counts, completion rates, etc.
 */
router.get('/:id/statistics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await eventsEntity.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Get team count and stats
    const teamCount = await teamsEntity.countByEventId(id);
    const registrationCount = await registrationsEntity.countByEventId(id);

    // Get completion statistics from boards
    const boardStats = await query(`
      SELECT 
        COUNT(DISTINCT bb.id) as total_boards,
        COUNT(bbt.id) as total_tiles,
        COUNT(bbt.id) FILTER (WHERE bbt.is_completed = true) as completed_tiles,
        COALESCE(SUM(btp.progress_value), 0) as total_progress_value
      FROM bingo_boards bb
      LEFT JOIN bingo_board_tiles bbt ON bb.id = bbt.board_id
      LEFT JOIN bingo_tile_progress btp ON bbt.id = btp.board_tile_id
      WHERE bb.event_id = $1
    `, [id]);

    // Get top teams
    const topTeams = await query(`
      SELECT id, name, score, color, icon
      FROM event_teams
      WHERE event_id = $1
      ORDER BY score DESC
      LIMIT 5
    `, [id]);

    const stats = boardStats[0];
    const totalTiles = parseInt(stats?.totalTiles || '0');
    const completedTiles = parseInt(stats?.completedTiles || '0');
    const completionPercentage = totalTiles > 0 ? (completedTiles / totalTiles) * 100 : 0;

    res.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          status: event.status,
          eventType: event.eventType
        },
        teams: {
          total: teamCount,
          topTeams
        },
        registrations: {
          total: registrationCount
        },
        tiles: {
          total: totalTiles,
          completed: completedTiles,
          completionPercentage: Math.round(completionPercentage * 100) / 100
        },
        totalProgressValue: parseFloat(stats?.totalProgressValue || '0')
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching event statistics:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event statistics',
      message
    });
  }
});

/**
 * GET /api/admin/clan-events/events/:id/leaderboard
 * Get event-wide leaderboard (all teams ranked by score)
 */
router.get('/:id/leaderboard', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await eventsEntity.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const leaderboard = await query(`
      SELECT 
        et.id,
        et.name,
        et.color,
        et.icon,
        et.score,
        COUNT(etm.id) as member_count,
        COUNT(DISTINCT bbt.id) FILTER (WHERE bbt.is_completed = true) as tiles_completed,
        COUNT(DISTINCT bbt.id) as total_tiles
      FROM event_teams et
      LEFT JOIN event_team_members etm ON et.id = etm.team_id
      LEFT JOIN bingo_boards bb ON bb.team_id = et.id AND bb.event_id = et.event_id
      LEFT JOIN bingo_board_tiles bbt ON bb.id = bbt.board_id
      WHERE et.event_id = $1
      GROUP BY et.id
      ORDER BY et.score DESC, tiles_completed DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          status: event.status
        },
        leaderboard: leaderboard.map((team, index) => ({
          rank: index + 1,
          ...team,
          memberCount: parseInt(team.memberCount),
          tilesCompleted: parseInt(team.tilesCompleted),
          totalTiles: parseInt(team.totalTiles)
        }))
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching event leaderboard:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event leaderboard',
      message
    });
  }
});

/**
 * POST /api/admin/clan-events/events
 * Create a new event
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      eventType,
      status = 'draft',
      startDate,
      endDate,
      config = {}
    } = req.body;

    // Validation
    if (!name || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'eventType']
      });
    }

    const validEventTypes = Object.values(EventType);
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid eventType',
        validTypes: validEventTypes
      });
    }

    const validStatuses = Object.values(EventStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses: validStatuses
      });
    }

    // Validate bingo config if provided
    if (eventType === EventType.BINGO && config.board) {
      const board = config.board;
      if (board.columns && (board.columns < 1 || board.columns > 20)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid board columns (must be 1-20)'
        });
      }
      if (board.rows && (board.rows < 1 || board.rows > 20)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid board rows (must be 1-20)'
        });
      }
    }

    const event = await eventsEntity.create({
      name,
      description,
      eventType: eventType as EventType,
      status: status as EventStatus,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      config
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating event:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message
    });
  }
});

/**
 * POST /api/admin/clan-events/events/:id/duplicate
 * Duplicate an event (creates a copy without teams/registrations)
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, includeTeams = false } = req.body;

    const original = await eventsEntity.findById(id);
    if (!original) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Create new event with draft status
    const newEvent = await eventsEntity.create({
      name: name || `${original.name} (Copy)`,
      description: original.description,
      eventType: original.eventType,
      status: EventStatus.DRAFT,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      config: original.config
    });

    let teamsCreated = 0;

    // Optionally duplicate teams
    if (includeTeams) {
      const teams = await teamsEntity.findByEventId(id);
      for (const team of teams) {
        await teamsEntity.create({
          eventId: newEvent.id,
          name: team.name,
          color: team.color,
          icon: team.icon,
          metadata: team.metadata
        });
        teamsCreated++;
      }
    }

    res.status(201).json({
      success: true,
      data: newEvent,
      teamsCreated,
      message: 'Event duplicated successfully'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error duplicating event:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate event',
      message
    });
  }
});

/**
 * PATCH /api/admin/clan-events/events/:id
 * Update an event
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status, startDate, endDate, config } = req.body;

    const existing = await eventsEntity.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (config !== undefined) updateData.config = config;

    const updatedEvent = await eventsEntity.update(id, updateData);

    // Initialize boards when activating a bingo event
    if (status === EventStatus.ACTIVE && existing.eventType === EventType.BINGO) {
      try {
        await boardInitService.initializeBoardsForEvent(id);
      } catch (initError) {
        console.error('[Events] Error initializing boards:', initError);
      }
    }

    res.json({
      success: true,
      data: updatedEvent,
      message: 'Event updated successfully'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating event:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      message
    });
  }
});

// ============================================================================
// EVENT LIFECYCLE ACTIONS
// ============================================================================

/**
 * Valid status transitions:
 * - draft -> scheduled, active, cancelled
 * - scheduled -> active, paused, cancelled
 * - active -> paused, completed, cancelled
 * - paused -> active, completed, cancelled
 * - completed -> (none)
 * - cancelled -> (none)
 */
const validTransitions: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.SCHEDULED, EventStatus.ACTIVE, EventStatus.CANCELLED],
  [EventStatus.SCHEDULED]: [EventStatus.ACTIVE, EventStatus.PAUSED, EventStatus.CANCELLED],
  [EventStatus.ACTIVE]: [EventStatus.PAUSED, EventStatus.COMPLETED, EventStatus.CANCELLED],
  [EventStatus.PAUSED]: [EventStatus.ACTIVE, EventStatus.COMPLETED, EventStatus.CANCELLED],
  [EventStatus.COMPLETED]: [],
  [EventStatus.CANCELLED]: []
};

const changeEventStatus = async (
  req: Request, 
  res: Response, 
  targetStatus: EventStatus, 
  successMessage: string
) => {
  try {
    const { id } = req.params;
    const event = await eventsEntity.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check valid transition
    const allowedTransitions = validTransitions[event.status];
    if (!allowedTransitions.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from ${event.status} to ${targetStatus}`,
        allowedTransitions
      });
    }

    const updatedEvent = await eventsEntity.updateStatus(id, targetStatus);

    // Initialize boards when activating
    if (targetStatus === EventStatus.ACTIVE && event.eventType === EventType.BINGO) {
      try {
        await boardInitService.initializeBoardsForEvent(id);
      } catch (initError) {
        console.error('[Events] Error initializing boards:', initError);
      }
    }

    res.json({
      success: true,
      data: updatedEvent,
      message: successMessage,
      previousStatus: event.status
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error changing event status to ${targetStatus}:`, message);
    res.status(500).json({
      success: false,
      error: `Failed to change event status`,
      message
    });
  }
};

/**
 * POST /api/admin/clan-events/events/:id/activate
 * Activate an event (starts it, initializes boards for bingo)
 */
router.post('/:id/activate', (req, res) => 
  changeEventStatus(req, res, EventStatus.ACTIVE, 'Event activated successfully')
);

/**
 * POST /api/admin/clan-events/events/:id/pause
 * Pause an active event
 */
router.post('/:id/pause', (req, res) => 
  changeEventStatus(req, res, EventStatus.PAUSED, 'Event paused successfully')
);

/**
 * POST /api/admin/clan-events/events/:id/complete
 * Complete an event (marks as finished)
 */
router.post('/:id/complete', (req, res) => 
  changeEventStatus(req, res, EventStatus.COMPLETED, 'Event completed successfully')
);

/**
 * POST /api/admin/clan-events/events/:id/cancel
 * Cancel an event
 */
router.post('/:id/cancel', (req, res) => 
  changeEventStatus(req, res, EventStatus.CANCELLED, 'Event cancelled successfully')
);

/**
 * POST /api/admin/clan-events/events/:id/schedule
 * Schedule an event for future activation
 */
router.post('/:id/schedule', (req, res) => 
  changeEventStatus(req, res, EventStatus.SCHEDULED, 'Event scheduled successfully')
);

/**
 * POST /api/admin/clan-events/events/:id/recalculate-scores
 * Recalculate all team scores based on completed tiles
 */
router.post('/:id/recalculate-scores', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await eventsEntity.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Get all teams for this event
    const teams = await teamsEntity.findByEventId(id);
    const results: Array<{ teamId: string; teamName: string; oldScore: number; newScore: number }> = [];

    for (const team of teams) {
      // Calculate score from completed tiles
      const scoreResult = await query(`
        SELECT COALESCE(SUM(bt.base_points), 0) as total_points
        FROM bingo_board_tiles bbt
        JOIN bingo_boards bb ON bbt.board_id = bb.id
        JOIN bingo_tiles bt ON bbt.tile_id = bt.id
        WHERE bb.team_id = $1 AND bb.event_id = $2 AND bbt.is_completed = true
      `, [team.id, id]);

      const newScore = parseInt(scoreResult[0]?.totalPoints || '0');
      
      if (newScore !== team.score) {
        await teamsEntity.updateScore(team.id, newScore);
        results.push({
          teamId: team.id,
          teamName: team.name,
          oldScore: team.score,
          newScore
        });
      }
    }

    res.json({
      success: true,
      data: {
        teamsUpdated: results.length,
        changes: results
      },
      message: `Recalculated scores for ${results.length} teams`
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error recalculating scores:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate scores',
      message
    });
  }
});

/**
 * DELETE /api/admin/clan-events/events/:id
 * Delete an event (cascades to teams, boards, etc.)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await eventsEntity.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully',
      deleted_id: id
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting event:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      message
    });
  }
});

// Mount registrations routes
router.use('/:eventId/registrations', registrationsRouter);

export default router;
