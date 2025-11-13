import { Router, Request, Response } from 'express';
import { query } from '../../../../db/connection.js';

const router = Router();

/**
 * GET /api/bingo/buffs/library
 * Get all buffs/debuffs from the library
 * Query params: type, is_active, search, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const {
			type,
			is_active,
			search,
			limit = '100',
			offset = '0'
		} = req.query;

		let sql = 'SELECT * FROM bingo_buffs_debuffs WHERE 1=1';
		const params: any[] = [];
		let paramIndex = 1;

		if (type) {
			sql += ` AND type = $${paramIndex}`;
			params.push(type);
			paramIndex++;
		}

		if (is_active !== undefined) {
			sql += ` AND is_active = $${paramIndex}`;
			params.push(is_active === 'true');
			paramIndex++;
		}

		if (search) {
			sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`;
			params.push(`%${search}%`);
			paramIndex++;
		}

		sql += ` ORDER BY type, name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		params.push(parseInt(limit as string), parseInt(offset as string));

		const buffsDebuffs = await query(sql, params);

		// Get counts
		const stats = await query(`
			SELECT 
				COUNT(*) as total,
				COUNT(*) FILTER (WHERE is_active = true) as active,
				COUNT(*) FILTER (WHERE type = 'buff') as buffs,
				COUNT(*) FILTER (WHERE type = 'debuff') as debuffs
			FROM bingo_buffs_debuffs
		`);

		res.json({
			success: true,
			data: buffsDebuffs,
			stats: stats[0],
			pagination: {
				limit: parseInt(limit as string),
				offset: parseInt(offset as string)
			}
		});
	} catch (error: any) {
		console.error('Error fetching buffs/debuffs:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch buffs/debuffs',
			message: error.message
		});
	}
});

/**
 * GET /api/bingo/buffs/library/:id
 * Get a single buff/debuff by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const buffsDebuffs = await query('SELECT * FROM bingo_buffs_debuffs WHERE id = $1', [id]);

		if (buffsDebuffs.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Buff/debuff not found'
			});
		}

		// Get usage stats
		const usageStats = await query(`
			SELECT 
				COUNT(DISTINCT bbte.board_tile_id) as applied_to_tiles,
				COUNT(DISTINCT bbre.board_id) as applied_to_rows,
				COUNT(DISTINCT bbce.board_id) as applied_to_columns
			FROM bingo_buffs_debuffs bbd
			LEFT JOIN bingo_board_tile_effects bbte ON bbd.id = bbte.buff_debuff_id
			LEFT JOIN bingo_board_row_effects bbre ON bbd.id = bbre.buff_debuff_id
			LEFT JOIN bingo_board_column_effects bbce ON bbd.id = bbce.buff_debuff_id
			WHERE bbd.id = $1
		`, [id]);

		res.json({
			success: true,
			data: {
				...buffsDebuffs[0],
				usage_stats: usageStats[0]
			}
		});
	} catch (error: any) {
		console.error('Error fetching buff/debuff:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch buff/debuff',
			message: error.message
		});
	}
});

/**
 * POST /api/bingo/buffs/library
 * Create a new buff/debuff in the library
 * Body: { id, name, description, type, effect_type, effect_value, icon, metadata }
 */
router.post('/', async (req: Request, res: Response) => {
	try {
		const {
			id,
			name,
			description,
			type,
			effect_type,
			effect_value,
			icon,
			metadata = {},
			is_active = true
		} = req.body;

		// Validation
		if (!id || !name || !type || !effect_type || effect_value === undefined) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['id', 'name', 'type', 'effect_type', 'effect_value']
			});
		}

		const validTypes = ['buff', 'debuff'];
		if (!validTypes.includes(type)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid type',
				valid_types: validTypes
			});
		}

		// Check if ID already exists
		const existing = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [id]);
		if (existing.length > 0) {
			return res.status(409).json({
				success: false,
				error: 'Buff/debuff ID already exists'
			});
		}

		const result = await query(`
			INSERT INTO bingo_buffs_debuffs (
				id, name, description, type, effect_type, effect_value, icon, metadata, is_active
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *
		`, [id, name, description, type, effect_type, effect_value, icon, JSON.stringify(metadata), is_active]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Buff/debuff created successfully'
		});
	} catch (error: any) {
		console.error('Error creating buff/debuff:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create buff/debuff',
			message: error.message
		});
	}
});

/**
 * PATCH /api/bingo/buffs/library/:id
 * Update a buff/debuff in the library
 */
router.patch('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		// Check if buff/debuff exists
		const existing = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [id]);
		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Buff/debuff not found'
			});
		}

		// Build dynamic update query
		const allowedFields = ['name', 'description', 'type', 'effect_type', 'effect_value', 'icon', 'metadata', 'is_active'];
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
			UPDATE bingo_buffs_debuffs 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;

		const result = await query(sql, values);

		res.json({
			success: true,
			data: result[0],
			message: 'Buff/debuff updated successfully'
		});
	} catch (error: any) {
		console.error('Error updating buff/debuff:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update buff/debuff',
			message: error.message
		});
	}
});

/**
 * DELETE /api/bingo/buffs/library/:id
 * Delete a buff/debuff from the library
 */
router.delete('/:id', async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Check if buff/debuff is in use
		const usage = await query(`
			SELECT 
				(SELECT COUNT(*) FROM bingo_board_tile_effects WHERE buff_debuff_id = $1) +
				(SELECT COUNT(*) FROM bingo_board_row_effects WHERE buff_debuff_id = $1) +
				(SELECT COUNT(*) FROM bingo_board_column_effects WHERE buff_debuff_id = $1) as count
		`, [id]);

		if (parseInt(usage[0].count) > 0) {
			return res.status(409).json({
				success: false,
				error: 'Cannot delete buff/debuff',
				message: `This buff/debuff is applied to ${usage[0].count} board element(s). Remove it first.`
			});
		}

		const result = await query('DELETE FROM bingo_buffs_debuffs WHERE id = $1 RETURNING id', [id]);

		if (result.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Buff/debuff not found'
			});
		}

		res.json({
			success: true,
			message: 'Buff/debuff deleted successfully',
			deleted_id: result[0].id
		});
	} catch (error: any) {
		console.error('Error deleting buff/debuff:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete buff/debuff',
			message: error.message
		});
	}
});

export default router;

