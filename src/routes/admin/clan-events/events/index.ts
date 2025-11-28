import { Router, Request, Response } from 'express';
import { query } from '../../../../db/connection.js';

const router = Router();

/**
 * Types for event responses
 */
interface EventResponse {
	id: string;
	name: string;
	description: string | null;
	event_type: string;
	status: string;
	start_date: string | null;
	end_date: string | null;
	config: any;
	metadata: any;
	created_by: number | null;
	created_at: string;
	updated_at: string;
}

/**
 * GET /api/admin/clan-events/events
 * Get all events with optional filtering
 * Query params: event_type, status, limit, offset
 * 
 * Returns: Array<EventResponse> with pagination
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const { event_type, status, limit = '50', offset = '0' } = req.query;

		let sql = 'SELECT * FROM events WHERE 1=1';
		const params: any[] = [];
		let paramIndex = 1;

		if (event_type) {
			sql += ` AND event_type = $${paramIndex}`;
			params.push(event_type);
			paramIndex++;
		}

		if (status) {
			sql += ` AND status = $${paramIndex}`;
			params.push(status);
			paramIndex++;
		}

		sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		params.push(parseInt(limit as string), parseInt(offset as string));

		const events = await query(sql, params);

		res.json({
			success: true,
			data: events,
			pagination: {
				limit: parseInt(limit as string),
				offset: parseInt(offset as string)
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
 * GET /api/admin/clan-events/events/:id
 * Get a single event by ID
 * 
 * Returns: EventResponse
 */
router.get('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const events = await query('SELECT * FROM events WHERE id = $1', [id]);

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
 * POST /api/admin/clan-events/events
 * Create a new event
 * Body: { name, description, event_type, status, start_date, end_date, config, metadata, created_by }
 * 
 * For bingo events, config should contain:
 * - board: {
 *     columns: number (1-20),
 *     rows: number (1-20),
 *     name?: string,
 *     description?: string,
 *     show_row_column_buffs?: boolean,
 *     show_tile_buffs?: boolean (default: true),
 *     tiles?: Array<{ tile_id: string, position: string, custom_points?: number, metadata?: any }>,
 *     row_effects?: Array<{ row_number: number, buff_debuff_id: string }>,
 *     column_effects?: Array<{ column_letter: string, buff_debuff_id: string }>,
 *     tile_effects?: Array<{ tile_position: string, buff_debuff_id: string }>,
 *     metadata?: any
 *   }
 * 
 * Returns: Event object with config containing generic board template
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

		// For bingo events, validate config structure
		if (event_type === 'bingo' && config.board) {
			const board = config.board;
			if (board.columns && (board.columns < 1 || board.columns > 20)) {
				return res.status(400).json({
					success: false,
					error: 'Invalid board columns',
					message: 'Columns must be between 1 and 20'
				});
			}
			if (board.rows && (board.rows < 1 || board.rows > 20)) {
				return res.status(400).json({
					success: false,
					error: 'Invalid board rows',
					message: 'Rows must be between 1 and 20'
				});
			}
		}

		const result = await query(`
			INSERT INTO events (
				name, description, event_type, status, 
				start_date, end_date, config, metadata, created_by
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *
		`, [
			name, description, event_type, status,
			start_date || null, end_date || null,
			JSON.stringify(config), JSON.stringify(metadata), created_by || null
		]);

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
 * PATCH /api/admin/clan-events/events/:id
 * Update an event
 * Body: { name?, description?, status?, start_date?, end_date?, config?, metadata? }
 * 
 * Returns: Updated event object
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
		const allowedFields = ['name', 'description', 'status', 'start_date', 'end_date', 'config', 'metadata'];
		const updateFields: string[] = [];
		const values: any[] = [];
		let paramIndex = 1;

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key)) {
				updateFields.push(`${key} = $${paramIndex}`);
				if (['config', 'metadata'].includes(key)) {
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
		const updatedEvent = result[0];

		// If event is being activated and it's a bingo event, initialize boards for all teams
		if (updates.status === 'active' && updatedEvent.event_type === 'bingo') {
			try {
				const { initializeBoardsForEvent } = await import('../../../../modules/events/bingo/board-initialization.service.js')
				// Initialize boards asynchronously (don't block response)
				initializeBoardsForEvent(id).catch((error) => {
					console.error('[Events] Error initializing boards for event:', error)
				})
			} catch (error) {
				console.error('[Events] Error importing board initialization service:', error)
			}
		}

		res.json({
			success: true,
			data: updatedEvent,
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
 * DELETE /api/admin/clan-events/events/:id
 * Delete an event (cascades to teams, boards, etc.)
 * 
 * Returns: Deleted event ID
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

import registrationsRouter from './registrations.routes.js';

// Mount registrations routes
router.use('/:eventId/registrations', registrationsRouter);

export default router;

