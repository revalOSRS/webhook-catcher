import { Router, Request, Response } from 'express';
import { query } from '../../../db/connection.js';

const router = Router();

/**
 * GET /api/bingo/events
 * Get all events with optional filtering
 * Query params: status, event_type, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const { status, event_type, limit = '50', offset = '0' } = req.query;

		let sql = `
			SELECT 
				e.*,
				COUNT(et.id) as team_count,
				COUNT(DISTINCT etm.member_id) as participant_count
			FROM events e
			LEFT JOIN event_teams et ON e.id = et.event_id
			LEFT JOIN event_team_members etm ON et.id = etm.team_id
			WHERE 1=1
		`;
		
		const params: any[] = [];
		let paramIndex = 1;

		if (status) {
			sql += ` AND e.status = $${paramIndex}`;
			params.push(status);
			paramIndex++;
		}

		if (event_type) {
			sql += ` AND e.event_type = $${paramIndex}`;
			params.push(event_type);
			paramIndex++;
		}

		sql += `
			GROUP BY e.id
			ORDER BY e.created_at DESC
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		params.push(parseInt(limit as string), parseInt(offset as string));

		const events = await query(sql, params);

		res.json({
			success: true,
			data: events,
			pagination: {
				limit: parseInt(limit as string),
				offset: parseInt(offset as string),
				total: events.length
			}
		});
	} catch (error: any) {
		console.error('Error fetching events:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch events',
			message: error.message
		});
	}
});

/**
 * GET /api/bingo/events/:id
 * Get a single event by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const events = await query(`
			SELECT 
				e.*,
				json_agg(
					DISTINCT jsonb_build_object(
						'id', et.id,
						'name', et.name,
						'color', et.color,
						'icon', et.icon,
						'score', et.score,
						'member_count', (
							SELECT COUNT(*) 
							FROM event_team_members etm2 
							WHERE etm2.team_id = et.id
						)
					)
				) FILTER (WHERE et.id IS NOT NULL) as teams
			FROM events e
			LEFT JOIN event_teams et ON e.id = et.event_id
			WHERE e.id = $1
			GROUP BY e.id
		`, [id]);

		if (events.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		res.json({
			success: true,
			data: events[0]
		});
	} catch (error: any) {
		console.error('Error fetching event:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch event',
			message: error.message
		});
	}
});

/**
 * POST /api/bingo/events
 * Create a new event
 * Body: { name, description, event_type, status, start_date, end_date, config, metadata, created_by }
 */
router.post('/', async (req: Request, res: Response) => {
	try {
		const {
			name,
			description,
			event_type,
			status = 'draft',
			start_date,
			end_date,
			config = {},
			metadata = {},
			created_by
		} = req.body;

		// Validation
		if (!name || !event_type) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['name', 'event_type']
			});
		}

		const validEventTypes = ['bingo', 'battleship_bingo', 'dungeoncrawler_bingo', 'risk_bingo', 'hide_and_seek', 'puzzle', 'reval_games'];
		if (!validEventTypes.includes(event_type)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid event_type',
				valid_types: validEventTypes
			});
		}

		const validStatuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid status',
				valid_statuses: validStatuses
			});
		}

		const result = await query(`
			INSERT INTO events (
				name, description, event_type, status, 
				start_date, end_date, config, metadata, created_by
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *
		`, [name, description, event_type, status, start_date, end_date, JSON.stringify(config), JSON.stringify(metadata), created_by]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Event created successfully'
		});
	} catch (error: any) {
		console.error('Error creating event:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create event',
			message: error.message
		});
	}
});

/**
 * PATCH /api/bingo/events/:id
 * Update an existing event
 * Body: Any event fields to update
 */
router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		// Check if event exists
		const existing = await query('SELECT id FROM events WHERE id = $1', [id]);
		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		// Build dynamic update query
		const allowedFields = ['name', 'description', 'event_type', 'status', 'start_date', 'end_date', 'config', 'metadata'];
		const updateFields: string[] = [];
		const values: any[] = [];
		let paramIndex = 1;

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key)) {
				updateFields.push(`${key} = $${paramIndex}`);
				// Convert objects to JSON strings for JSONB fields
				if (key === 'config' || key === 'metadata') {
					values.push(JSON.stringify(value));
				} else {
					values.push(value);
				}
				paramIndex++;
			}
		}

		if (updateFields.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'No valid fields to update',
				allowed_fields: allowedFields
			});
		}

		values.push(id);
		const sql = `
			UPDATE events 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;

		const result = await query(sql, values);

		res.json({
			success: true,
			data: result[0],
			message: 'Event updated successfully'
		});
	} catch (error: any) {
		console.error('Error updating event:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update event',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/events/:id
 * Delete an event (and all associated data via CASCADE)
 */
router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const result = await query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		res.json({
			success: true,
			message: 'Event deleted successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error deleting event:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete event',
			message: error.message
		});
	}
});

/**
 * GET /api/bingo/events/:id/stats
 * Get detailed statistics for an event
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Check if event exists
		const eventCheck = await query('SELECT id FROM events WHERE id = $1', [id]);
		if (eventCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		// Get comprehensive stats
		const stats = await query(`
			SELECT
				e.id,
				e.name,
				e.status,
				COUNT(DISTINCT et.id) as total_teams,
				COUNT(DISTINCT etm.member_id) as total_participants,
				COUNT(DISTINCT bb.id) as total_boards,
				COUNT(DISTINCT bbt.id) as total_tiles_placed,
				COUNT(DISTINCT bbt.id) FILTER (WHERE bbt.is_completed = true) as completed_tiles,
				COALESCE(SUM(et.score), 0) as total_score
			FROM events e
			LEFT JOIN event_teams et ON e.id = et.event_id
			LEFT JOIN event_team_members etm ON et.id = etm.team_id
			LEFT JOIN bingo_boards bb ON e.id = bb.event_id
			LEFT JOIN bingo_board_tiles bbt ON bb.id = bbt.board_id
			WHERE e.id = $1
			GROUP BY e.id, e.name, e.status
		`, [id]);

		res.json({
			success: true,
			data: stats[0]
		});
	} catch (error: any) {
		console.error('Error fetching event stats:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch event stats',
			message: error.message
		});
	}
});

export default router;

