import { Router } from 'express';
import { query } from '../../../../db/connection.js';
import { validateRequirement } from '../../../../utils/requirement-validator.js';
const router = Router();
/**
 * GET /api/admin/clan-events/bingo/tiles
 * Get all tiles from the library with optional filtering
 * Query params: category, difficulty, is_active, search, limit, offset
 */
router.get('/', async (req, res) => {
    try {
        const { category, difficulty, is_active, search, limit = '100', offset = '0' } = req.query;
        let sql = 'SELECT * FROM bingo_tiles WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (category) {
            sql += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        if (difficulty) {
            sql += ` AND difficulty = $${paramIndex}`;
            params.push(difficulty);
            paramIndex++;
        }
        if (is_active !== undefined) {
            sql += ` AND is_active = $${paramIndex}`;
            params.push(is_active === 'true');
            paramIndex++;
        }
        if (search) {
            sql += ` AND (task ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        sql += ` ORDER BY category, difficulty, task LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        const tiles = await query(sql, params);
        // Get counts by category and difficulty
        const stats = await query(`
			SELECT 
				COUNT(*) as total,
				COUNT(*) FILTER (WHERE is_active = true) as active,
				COUNT(*) FILTER (WHERE difficulty = 'easy') as easy,
				COUNT(*) FILTER (WHERE difficulty = 'medium') as medium,
				COUNT(*) FILTER (WHERE difficulty = 'hard') as hard,
				COUNT(*) FILTER (WHERE difficulty = 'extreme') as extreme
			FROM bingo_tiles
		`);
        res.json({
            success: true,
            data: tiles,
            stats: stats[0],
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    }
    catch (error) {
        console.error('Error fetching tiles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tiles',
            message: error.message
        });
    }
});
/**
 * GET /api/admin/clan-events/bingo/tiles/:id
 * Get a single tile by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tiles = await query('SELECT * FROM bingo_tiles WHERE id = $1', [id]);
        if (tiles.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found'
            });
        }
        // Get usage stats for this tile
        const usageStats = await query(`
			SELECT 
				COUNT(DISTINCT bbt.board_id) as used_on_boards,
				COUNT(*) FILTER (WHERE bbt.is_completed = true) as times_completed,
				COUNT(*) as total_placements
			FROM bingo_board_tiles bbt
			WHERE bbt.tile_id = $1
		`, [id]);
        res.json({
            success: true,
            data: {
                ...tiles[0],
                usage_stats: usageStats[0]
            }
        });
    }
    catch (error) {
        console.error('Error fetching tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tile',
            message: error.message
        });
    }
});
/**
 * POST /api/admin/clan-events/bingo/tiles
 * Create a new tile in the library
 * Body: { id, task, category, difficulty, icon, description, base_points, requirements, metadata }
 */
router.post('/', async (req, res) => {
    try {
        const { id, task, category, difficulty, icon, description, base_points, requirements = [], metadata = {}, is_active = true } = req.body;
        // Validation
        if (!id || !task || !category || !difficulty || base_points === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['id', 'task', 'category', 'difficulty', 'base_points']
            });
        }
        // Validate base_points is a number
        if (typeof base_points !== 'number' || base_points < 0) {
            return res.status(400).json({
                success: false,
                error: 'base_points must be a non-negative number'
            });
        }
        const validDifficulties = ['easy', 'medium', 'hard', 'extreme'];
        if (!validDifficulties.includes(difficulty)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid difficulty',
                valid_difficulties: validDifficulties
            });
        }
        // Validate requirements if provided
        if (requirements) {
            const validation = validateRequirement(requirements);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid requirements',
                    validation_errors: validation.errors
                });
            }
        }
        // Check if ID already exists
        const existing = await query('SELECT id FROM bingo_tiles WHERE id = $1', [id]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Tile ID already exists'
            });
        }
        const result = await query(`
			INSERT INTO bingo_tiles (
				id, task, category, difficulty, icon, description,
				base_points, requirements, metadata, is_active
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING *
		`, [
            id, task, category, difficulty, icon, description,
            base_points,
            JSON.stringify(requirements),
            JSON.stringify(metadata),
            is_active
        ]);
        res.status(201).json({
            success: true,
            data: result[0],
            message: 'Tile created successfully'
        });
    }
    catch (error) {
        console.error('Error creating tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create tile',
            message: error.message
        });
    }
});
/**
 * POST /api/admin/clan-events/bingo/tiles/bulk
 * Create multiple tiles at once
 * Body: { tiles: [...] }
 */
router.post('/bulk', async (req, res) => {
    try {
        const { tiles } = req.body;
        if (!Array.isArray(tiles) || tiles.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request: tiles must be a non-empty array'
            });
        }
        const validDifficulties = ['easy', 'medium', 'hard', 'extreme'];
        const results = [];
        const errors = [];
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            // Validate each tile
            if (!tile.id || !tile.task || !tile.category || !tile.difficulty) {
                errors.push({
                    index: i,
                    tile_id: tile.id,
                    error: 'Missing required fields'
                });
                continue;
            }
            if (!validDifficulties.includes(tile.difficulty)) {
                errors.push({
                    index: i,
                    tile_id: tile.id,
                    error: `Invalid difficulty: ${tile.difficulty}`
                });
                continue;
            }
            // Validate base_points
            if (tile.base_points === undefined || typeof tile.base_points !== 'number' || tile.base_points < 0) {
                errors.push({
                    index: i,
                    tile_id: tile.id,
                    error: 'base_points is required and must be a non-negative number'
                });
                continue;
            }
            // Validate requirements if provided
            if (tile.requirements) {
                const validation = validateRequirement(tile.requirements);
                if (!validation.valid) {
                    errors.push({
                        index: i,
                        tile_id: tile.id,
                        error: 'Invalid requirements',
                        validation_errors: validation.errors
                    });
                    continue;
                }
            }
            try {
                // Check if ID already exists
                const existing = await query('SELECT id FROM bingo_tiles WHERE id = $1', [tile.id]);
                if (existing.length > 0) {
                    errors.push({
                        index: i,
                        tile_id: tile.id,
                        error: 'Tile ID already exists'
                    });
                    continue;
                }
                const result = await query(`
					INSERT INTO bingo_tiles (
						id, task, category, difficulty, icon, description,
						base_points, requirements, metadata, is_active
					)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
					RETURNING *
				`, [
                    tile.id,
                    tile.task,
                    tile.category,
                    tile.difficulty,
                    tile.icon || null,
                    tile.description || null,
                    tile.base_points,
                    JSON.stringify(tile.requirements || []),
                    JSON.stringify(tile.metadata || {}),
                    tile.is_active !== undefined ? tile.is_active : true
                ]);
                results.push(result[0]);
            }
            catch (error) {
                errors.push({
                    index: i,
                    tile_id: tile.id,
                    error: error.message
                });
            }
        }
        res.status(201).json({
            success: true,
            data: {
                created: results.length,
                failed: errors.length,
                tiles: results,
                errors: errors.length > 0 ? errors : undefined
            },
            message: `Created ${results.length} tiles, ${errors.length} failed`
        });
    }
    catch (error) {
        console.error('Error bulk creating tiles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk create tiles',
            message: error.message
        });
    }
});
/**
 * PATCH /api/admin/clan-events/bingo/tiles/:id
 * Update a tile in the library
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Check if tile exists
        const existing = await query('SELECT id FROM bingo_tiles WHERE id = $1', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found'
            });
        }
        // Build dynamic update query
        const allowedFields = [
            'task', 'category', 'difficulty', 'icon', 'description',
            'base_points', 'requirements', 'metadata', 'is_active'
        ];
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        // Validate requirements if being updated
        if (updates.requirements) {
            const validation = validateRequirement(updates.requirements);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid requirements',
                    validation_errors: validation.errors
                });
            }
        }
        // Validate difficulty if being updated
        if (updates.difficulty) {
            const validDifficulties = ['easy', 'medium', 'hard', 'extreme'];
            if (!validDifficulties.includes(updates.difficulty)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid difficulty',
                    valid_difficulties: validDifficulties
                });
            }
        }
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex}`);
                // Convert arrays/objects to JSON strings for JSONB fields
                if (['requirements', 'metadata'].includes(key)) {
                    values.push(JSON.stringify(value));
                }
                else {
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
			UPDATE bingo_tiles 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;
        const result = await query(sql, values);
        res.json({
            success: true,
            data: result[0],
            message: 'Tile updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update tile',
            message: error.message
        });
    }
});
/**
 * DELETE /api/admin/clan-events/bingo/tiles/:id
 * Delete a tile from the library
 * Note: This will fail if the tile is used on any boards (foreign key constraint)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if tile is in use
        const usage = await query('SELECT COUNT(*) as count FROM bingo_board_tiles WHERE tile_id = $1', [id]);
        if (parseInt(usage[0].count) > 0) {
            return res.status(409).json({
                success: false,
                error: 'Cannot delete tile',
                message: `This tile is used on ${usage[0].count} board(s). Remove it from all boards first.`
            });
        }
        const result = await query('DELETE FROM bingo_tiles WHERE id = $1 RETURNING id', [id]);
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found'
            });
        }
        res.json({
            success: true,
            message: 'Tile deleted successfully',
            deleted_id: result[0].id
        });
    }
    catch (error) {
        console.error('Error deleting tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete tile',
            message: error.message
        });
    }
});
/**
 * GET /api/admin/clan-events/bingo/tiles/categories/list
 * Get list of all unique categories
 */
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await query(`
			SELECT 
				category,
				COUNT(*) as tile_count,
				COUNT(*) FILTER (WHERE is_active = true) as active_count
			FROM bingo_tiles
			GROUP BY category
			ORDER BY category
		`);
        res.json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            message: error.message
        });
    }
});
export default router;
