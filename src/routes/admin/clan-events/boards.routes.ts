import { Router, Request, Response } from 'express';
import { query } from '../../../db/connection.js';

const router = Router();

/**
 * GET /api/bingo/boards
 * Get all boards with optional filtering by event_id
 * Query params: event_id, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const { event_id, limit = '50', offset = '0' } = req.query;

		let sql = `
			SELECT 
				bb.*,
				e.name as event_name,
				e.status as event_status,
				COUNT(bbt.id) as total_tiles,
				COUNT(bbt.id) FILTER (WHERE bbt.is_completed = true) as completed_tiles
			FROM bingo_boards bb
			JOIN events e ON bb.event_id = e.id
			LEFT JOIN bingo_board_tiles bbt ON bb.id = bbt.board_id
			WHERE 1=1
		`;

		const params: any[] = [];
		let paramIndex = 1;

		if (event_id) {
			sql += ` AND bb.event_id = $${paramIndex}`;
			params.push(event_id);
			paramIndex++;
		}

		sql += `
			GROUP BY bb.id, e.name, e.status
			ORDER BY bb.created_at DESC
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		params.push(parseInt(limit as string), parseInt(offset as string));

		const boards = await query(sql, params);

		res.json({
			success: true,
			data: boards,
			pagination: {
				limit: parseInt(limit as string),
				offset: parseInt(offset as string)
			}
		});
	} catch (error: any) {
		console.error('Error fetching boards:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch boards',
			message: error.message
		});
	}
});

/**
 * GET /api/bingo/boards/:id
 * Get a single board with all its tiles
 */
router.get('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Get board details
		const boards = await query(`
			SELECT 
				bb.*,
				e.name as event_name,
				e.status as event_status,
				e.event_type
			FROM bingo_boards bb
			JOIN events e ON bb.event_id = e.id
			WHERE bb.id = $1
		`, [id]);

		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		const board = boards[0];

		// Get all tiles on this board
		const tiles = await query(`
			SELECT 
				bbt.*,
				bt.task,
				bt.category,
				bt.difficulty,
				bt.icon,
				bt.description,
				bt.base_points,
				bt.bonus_tiers,
				et.name as completed_by_team_name,
				et.color as completed_by_team_color
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			LEFT JOIN event_teams et ON bbt.completed_by_team_id = et.id
			WHERE bbt.board_id = $1
			ORDER BY bbt.position
		`, [id]);

		// Get row effects
		const rowEffects = await query(`
			SELECT 
				bre.*,
				bbd.name as buff_name,
				bbd.type as buff_type,
				bbd.effect_type,
				bbd.effect_value,
				bbd.icon as buff_icon
			FROM bingo_board_row_effects bre
			JOIN bingo_buffs_debuffs bbd ON bre.buff_debuff_id = bbd.id
			WHERE bre.board_id = $1 AND bre.is_active = true
			ORDER BY bre.row_number
		`, [id]);

		// Get column effects
		const columnEffects = await query(`
			SELECT 
				bce.*,
				bbd.name as buff_name,
				bbd.type as buff_type,
				bbd.effect_type,
				bbd.effect_value,
				bbd.icon as buff_icon
			FROM bingo_board_column_effects bce
			JOIN bingo_buffs_debuffs bbd ON bce.buff_debuff_id = bbd.id
			WHERE bce.board_id = $1 AND bce.is_active = true
			ORDER BY bce.column_letter
		`, [id]);

		res.json({
			success: true,
			data: {
				...board,
				tiles,
				row_effects: rowEffects,
				column_effects: columnEffects
			}
		});
	} catch (error: any) {
		console.error('Error fetching board:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch board',
			message: error.message
		});
	}
});

/**
 * POST /api/bingo/boards
 * Create a new board
 * Body: { event_id, name, description, columns, rows, show_row_column_buffs, metadata }
 */
router.post('/', async (req: Request, res: Response) => {
	try {
		const {
			event_id,
			name,
			description,
			columns = 7,
			rows = 7,
			show_row_column_buffs = false,
			metadata = {}
		} = req.body;

		// Validation
		if (!event_id || !name) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['event_id', 'name']
			});
		}

		// Check if event exists
		const eventCheck = await query('SELECT id FROM events WHERE id = $1', [event_id]);
		if (eventCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		// Validate grid size
		if (columns < 1 || columns > 20 || rows < 1 || rows > 20) {
			return res.status(400).json({
				success: false,
				error: 'Invalid grid size',
				message: 'Columns and rows must be between 1 and 20'
			});
		}

		const result = await query(`
			INSERT INTO bingo_boards (
				event_id, name, description, columns, rows, 
				show_row_column_buffs, metadata
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING *
		`, [event_id, name, description, columns, rows, show_row_column_buffs, JSON.stringify(metadata)]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Board created successfully'
		});
	} catch (error: any) {
		console.error('Error creating board:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create board',
			message: error.message
		});
	}
});

/**
 * PATCH /api/bingo/boards/:id
 * Update a board
 */
router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		// Check if board exists
		const existing = await query('SELECT id FROM bingo_boards WHERE id = $1', [id]);
		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		// Build dynamic update query
		const allowedFields = ['name', 'description', 'columns', 'rows', 'show_row_column_buffs', 'metadata'];
		const updateFields: string[] = [];
		const values: any[] = [];
		let paramIndex = 1;

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key)) {
				updateFields.push(`${key} = $${paramIndex}`);
				if (key === 'metadata') {
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
			UPDATE bingo_boards 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;

		const result = await query(sql, values);

		res.json({
			success: true,
			data: result[0],
			message: 'Board updated successfully'
		});
	} catch (error: any) {
		console.error('Error updating board:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update board',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/boards/:id
 * Delete a board
 */
router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const result = await query('DELETE FROM bingo_boards WHERE id = $1 RETURNING id', [id]);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		res.json({
			success: true,
			message: 'Board deleted successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error deleting board:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete board',
			message: error.message
		});
	}
});

/**
 * POST /api/bingo/boards/:id/tiles
 * Add a tile to the board
 * Body: { tile_id, position, custom_points, metadata }
 */
router.post('/:id/tiles', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { tile_id, position, custom_points, metadata = {} } = req.body;

		// Validation
		if (!tile_id || !position) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['tile_id', 'position']
			});
		}

		// Check if board exists
		const boardCheck = await query('SELECT id FROM bingo_boards WHERE id = $1', [id]);
		if (boardCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		// Check if tile exists
		const tileCheck = await query('SELECT id FROM bingo_tiles WHERE id = $1', [tile_id]);
		if (tileCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Tile not found in library'
			});
		}

		// Check if position is already taken
		const positionCheck = await query(
			'SELECT id FROM bingo_board_tiles WHERE board_id = $1 AND position = $2',
			[id, position]
		);
		if (positionCheck.length > 0) {
			return res.status(409).json({
				success: false,
				error: 'Position already occupied',
				message: `Position ${position} is already taken on this board`
			});
		}

		const result = await query(`
			INSERT INTO bingo_board_tiles (
				board_id, tile_id, position, custom_points, metadata
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING *
		`, [id, tile_id, position, custom_points, JSON.stringify(metadata)]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Tile added to board successfully'
		});
	} catch (error: any) {
		console.error('Error adding tile to board:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to add tile to board',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/boards/:boardId/tiles/:tileId
 * Remove a tile from the board
 */
router.delete('/:boardId/tiles/:tileId', async (req: Request, res: Response) => {
	try {
		const { boardId, tileId } = req.params;

		const result = await query(
			'DELETE FROM bingo_board_tiles WHERE board_id = $1 AND id = $2 RETURNING id',
			[boardId, tileId]
		);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board tile not found'
			});
		}

		res.json({
			success: true,
			message: 'Tile removed from board successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error removing tile from board:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to remove tile from board',
			message: error.message
		});
	}
});

/**
 * PATCH /api/bingo/boards/:boardId/tiles/:tileId
 * Update a board tile (position, custom_points, completion status, etc.)
 */
router.patch('/:boardId/tiles/:tileId', async (req: Request, res: Response) => {
	try {
		const { boardId, tileId } = req.params;
		const updates = req.body;

		// Check if board tile exists
		const existing = await query(
			'SELECT id FROM bingo_board_tiles WHERE board_id = $1 AND id = $2',
			[boardId, tileId]
		);
		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board tile not found'
			});
		}

		// Build dynamic update query
		const allowedFields = ['position', 'custom_points', 'is_completed', 'completed_by_team_id', 'completed_at', 'metadata'];
		const updateFields: string[] = [];
		const values: any[] = [];
		let paramIndex = 1;

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key)) {
				// If trying to update position, check if new position is available
				if (key === 'position' && value !== existing[0].position) {
					const posCheck = await query(
						'SELECT id FROM bingo_board_tiles WHERE board_id = $1 AND position = $2 AND id != $3',
						[boardId, value, tileId]
					);
					if (posCheck.length > 0) {
						return res.status(409).json({
							success: false,
							error: 'Position already occupied'
						});
					}
				}

				updateFields.push(`${key} = $${paramIndex}`);
				if (key === 'metadata') {
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

		values.push(tileId);
		const sql = `
			UPDATE bingo_board_tiles 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;

		const result = await query(sql, values);

		res.json({
			success: true,
			data: result[0],
			message: 'Board tile updated successfully'
		});
	} catch (error: any) {
		console.error('Error updating board tile:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update board tile',
			message: error.message
		});
	}
});

export default router;

