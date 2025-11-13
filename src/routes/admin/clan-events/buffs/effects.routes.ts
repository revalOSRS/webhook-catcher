import { Router, Request, Response } from 'express';
import { query } from '../../../../db/connection.js';

const router = Router();

/**
 * POST /api/bingo/buffs/effects/tile
 * Apply a buff/debuff to a specific tile
 * Body: { board_tile_id, buff_debuff_id, applied_by, expires_at, metadata }
 */
router.post('/tile', async (req: Request, res: Response) => {
	try {
		const {
			board_tile_id,
			buff_debuff_id,
			applied_by,
			expires_at,
			metadata = {}
		} = req.body;

		// Validation
		if (!board_tile_id || !buff_debuff_id) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['board_tile_id', 'buff_debuff_id']
			});
		}

		// Check if board tile exists
		const tileCheck = await query('SELECT id FROM bingo_board_tiles WHERE id = $1', [board_tile_id]);
		if (tileCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board tile not found'
			});
		}

		// Check if buff/debuff exists
		const buffCheck = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [buff_debuff_id]);
		if (buffCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Buff/debuff not found'
			});
		}

		// Check if this buff/debuff is already applied to this tile
		const existing = await query(
			'SELECT id FROM bingo_board_tile_effects WHERE board_tile_id = $1 AND buff_debuff_id = $2',
			[board_tile_id, buff_debuff_id]
		);
		if (existing.length > 0) {
			return res.status(409).json({
				success: false,
				error: 'This buff/debuff is already applied to this tile'
			});
		}

		const result = await query(`
			INSERT INTO bingo_board_tile_effects (
				board_tile_id, buff_debuff_id, applied_by, expires_at, metadata
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING *
		`, [board_tile_id, buff_debuff_id, applied_by, expires_at, JSON.stringify(metadata)]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Effect applied to tile successfully'
		});
	} catch (error: any) {
		console.error('Error applying effect to tile:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to apply effect to tile',
			message: error.message
		});
	}
});

/**
 * POST /api/bingo/buffs/effects/row
 * Apply a buff/debuff to an entire row
 * Body: { board_id, row_number, buff_debuff_id, applied_by, expires_at, metadata }
 */
router.post('/row', async (req: Request, res: Response) => {
	try {
		const {
			board_id,
			row_number,
			buff_debuff_id,
			applied_by,
			expires_at,
			metadata = {}
		} = req.body;

		// Validation
		if (!board_id || row_number === undefined || !buff_debuff_id) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['board_id', 'row_number', 'buff_debuff_id']
			});
		}

		// Check if board exists
		const boardCheck = await query('SELECT id, rows FROM bingo_boards WHERE id = $1', [board_id]);
		if (boardCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		// Validate row number
		if (row_number < 1 || row_number > boardCheck[0].rows) {
			return res.status(400).json({
				success: false,
				error: 'Invalid row number',
				message: `Row number must be between 1 and ${boardCheck[0].rows}`
			});
		}

		// Check if buff/debuff exists
		const buffCheck = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [buff_debuff_id]);
		if (buffCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Buff/debuff not found'
			});
		}

		// Check if this buff/debuff is already applied to this row
		const existing = await query(
			'SELECT id FROM bingo_board_row_effects WHERE board_id = $1 AND row_number = $2 AND buff_debuff_id = $3',
			[board_id, row_number, buff_debuff_id]
		);
		if (existing.length > 0) {
			return res.status(409).json({
				success: false,
				error: 'This buff/debuff is already applied to this row'
			});
		}

		const result = await query(`
			INSERT INTO bingo_board_row_effects (
				board_id, row_number, buff_debuff_id, applied_by, expires_at, metadata
			)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *
		`, [board_id, row_number, buff_debuff_id, applied_by, expires_at, JSON.stringify(metadata)]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Effect applied to row successfully'
		});
	} catch (error: any) {
		console.error('Error applying effect to row:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to apply effect to row',
			message: error.message
		});
	}
});

/**
 * POST /api/bingo/buffs/effects/column
 * Apply a buff/debuff to an entire column
 * Body: { board_id, column_letter, buff_debuff_id, applied_by, expires_at, metadata }
 */
router.post('/column', async (req: Request, res: Response) => {
	try {
		const {
			board_id,
			column_letter,
			buff_debuff_id,
			applied_by,
			expires_at,
			metadata = {}
		} = req.body;

		// Validation
		if (!board_id || !column_letter || !buff_debuff_id) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['board_id', 'column_letter', 'buff_debuff_id']
			});
		}

		// Check if board exists
		const boardCheck = await query('SELECT id, columns FROM bingo_boards WHERE id = $1', [board_id]);
		if (boardCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		// Validate column letter (A-Z)
		const columnIndex = column_letter.toUpperCase().charCodeAt(0) - 65;
		if (columnIndex < 0 || columnIndex >= boardCheck[0].columns) {
			return res.status(400).json({
				success: false,
				error: 'Invalid column letter',
				message: `Column must be between A and ${String.fromCharCode(65 + boardCheck[0].columns - 1)}`
			});
		}

		// Check if buff/debuff exists
		const buffCheck = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [buff_debuff_id]);
		if (buffCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Buff/debuff not found'
			});
		}

		// Check if this buff/debuff is already applied to this column
		const existing = await query(
			'SELECT id FROM bingo_board_column_effects WHERE board_id = $1 AND column_letter = $2 AND buff_debuff_id = $3',
			[board_id, column_letter.toUpperCase(), buff_debuff_id]
		);
		if (existing.length > 0) {
			return res.status(409).json({
				success: false,
				error: 'This buff/debuff is already applied to this column'
			});
		}

		const result = await query(`
			INSERT INTO bingo_board_column_effects (
				board_id, column_letter, buff_debuff_id, applied_by, expires_at, metadata
			)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *
		`, [board_id, column_letter.toUpperCase(), buff_debuff_id, applied_by, expires_at, JSON.stringify(metadata)]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Effect applied to column successfully'
		});
	} catch (error: any) {
		console.error('Error applying effect to column:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to apply effect to column',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/buffs/effects/tile/:id
 * Remove a buff/debuff from a tile
 */
router.delete('/tile/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const result = await query('DELETE FROM bingo_board_tile_effects WHERE id = $1 RETURNING id', [id]);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Tile effect not found'
			});
		}

		res.json({
			success: true,
			message: 'Effect removed from tile successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error removing effect from tile:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to remove effect from tile',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/buffs/effects/row/:id
 * Remove a buff/debuff from a row
 */
router.delete('/row/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const result = await query('DELETE FROM bingo_board_row_effects WHERE id = $1 RETURNING id', [id]);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Row effect not found'
			});
		}

		res.json({
			success: true,
			message: 'Effect removed from row successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error removing effect from row:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to remove effect from row',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/buffs/effects/column/:id
 * Remove a buff/debuff from a column
 */
router.delete('/column/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const result = await query('DELETE FROM bingo_board_column_effects WHERE id = $1 RETURNING id', [id]);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Column effect not found'
			});
		}

		res.json({
			success: true,
			message: 'Effect removed from column successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error removing effect from column:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to remove effect from column',
			message: error.message
		});
	}
});

/**
 * PATCH /api/bingo/buffs/effects/tile/:id
 * Update a tile effect (activate/deactivate, extend expiration, etc.)
 */
router.patch('/tile/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		// Check if effect exists
		const existing = await query('SELECT id FROM bingo_board_tile_effects WHERE id = $1', [id]);
		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Tile effect not found'
			});
		}

		// Build dynamic update query
		const allowedFields = ['is_active', 'expires_at', 'metadata'];
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
			UPDATE bingo_board_tile_effects 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;

		const result = await query(sql, values);

		res.json({
			success: true,
			data: result[0],
			message: 'Tile effect updated successfully'
		});
	} catch (error: any) {
		console.error('Error updating tile effect:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update tile effect',
			message: error.message
		});
	}
});

/**
 * GET /api/bingo/buffs/effects/board/:boardId
 * Get all effects for a specific board (tiles, rows, columns)
 */
router.get('/board/:boardId', async (req: Request, res: Response) => {
	try {
		const { boardId } = req.params;

		// Check if board exists
		const boardCheck = await query('SELECT id FROM bingo_boards WHERE id = $1', [boardId]);
		if (boardCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		// Get tile effects
		const tileEffects = await query(`
			SELECT 
				bbte.*,
				bbd.name as buff_name,
				bbd.type,
				bbd.effect_type,
				bbd.effect_value,
				bbd.icon,
				bbt.position as tile_position
			FROM bingo_board_tile_effects bbte
			JOIN bingo_buffs_debuffs bbd ON bbte.buff_debuff_id = bbd.id
			JOIN bingo_board_tiles bbt ON bbte.board_tile_id = bbt.id
			WHERE bbt.board_id = $1 AND bbte.is_active = true
			ORDER BY bbt.position
		`, [boardId]);

		// Get row effects
		const rowEffects = await query(`
			SELECT 
				bbre.*,
				bbd.name as buff_name,
				bbd.type,
				bbd.effect_type,
				bbd.effect_value,
				bbd.icon
			FROM bingo_board_row_effects bbre
			JOIN bingo_buffs_debuffs bbd ON bbre.buff_debuff_id = bbd.id
			WHERE bbre.board_id = $1 AND bbre.is_active = true
			ORDER BY bbre.row_number
		`, [boardId]);

		// Get column effects
		const columnEffects = await query(`
			SELECT 
				bbce.*,
				bbd.name as buff_name,
				bbd.type,
				bbd.effect_type,
				bbd.effect_value,
				bbd.icon
			FROM bingo_board_column_effects bbce
			JOIN bingo_buffs_debuffs bbd ON bbce.buff_debuff_id = bbd.id
			WHERE bbce.board_id = $1 AND bbce.is_active = true
			ORDER BY bbce.column_letter
		`, [boardId]);

		res.json({
			success: true,
			data: {
				tile_effects: tileEffects,
				row_effects: rowEffects,
				column_effects: columnEffects,
				totals: {
					tiles: tileEffects.length,
					rows: rowEffects.length,
					columns: columnEffects.length
				}
			}
		});
	} catch (error: any) {
		console.error('Error fetching board effects:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch board effects',
			message: error.message
		});
	}
});

export default router;

