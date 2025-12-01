import { Router } from 'express';
import { BingoTilesEntity } from '../../../../modules/events/bingo/entities/bingo-tiles.entity.js';
import { validateRequirement } from '../../../../utils/requirement-validator.js';
const router = Router();
const tilesEntity = new BingoTilesEntity();
/**
 * Helper to map tile to response format (camelCase)
 */
const mapTileToResponse = (tile) => ({
    id: tile.id,
    task: tile.task,
    description: tile.description,
    category: tile.category,
    difficulty: tile.difficulty,
    icon: tile.icon,
    requirements: tile.requirements,
    points: tile.points,
    createdAt: tile.createdAt,
    updatedAt: tile.updatedAt
});
/**
 * GET /api/admin/clan-events/bingo/tiles
 * Get all tiles from the library with optional filtering
 * Query params: category, difficulty, search, limit, offset
 */
router.get('/', async (req, res) => {
    try {
        const { category, difficulty, search, limit = '100', offset = '0' } = req.query;
        // Use entity for basic operations, raw query for filtering
        let tiles;
        if (search) {
            // Use search method
            tiles = await tilesEntity.search(search);
        }
        else if (category) {
            // Filter by category
            tiles = await tilesEntity.findByCategory(category);
        }
        else if (difficulty) {
            // Filter by difficulty
            tiles = await tilesEntity.findByDifficulty(difficulty);
        }
        else {
            // Get all
            tiles = await tilesEntity.findAll();
        }
        // Apply limit/offset manually (for now)
        const offsetNum = parseInt(offset);
        const limitNum = parseInt(limit);
        const paginatedTiles = tiles.slice(offsetNum, offsetNum + limitNum);
        // Calculate stats
        const stats = {
            total: tiles.length,
            easy: tiles.filter(t => t.difficulty === 'easy').length,
            medium: tiles.filter(t => t.difficulty === 'medium').length,
            hard: tiles.filter(t => t.difficulty === 'hard').length,
            extreme: tiles.filter(t => t.difficulty === 'extreme').length
        };
        res.json({
            success: true,
            data: paginatedTiles.map(mapTileToResponse),
            stats,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                total: tiles.length
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
 * GET /api/admin/clan-events/bingo/tiles/categories/list
 * Get list of all unique categories
 */
router.get('/categories/list', async (req, res) => {
    try {
        const tiles = await tilesEntity.findAll();
        // Group by category
        const categoryMap = new Map();
        tiles.forEach(tile => {
            categoryMap.set(tile.category, (categoryMap.get(tile.category) || 0) + 1);
        });
        const categories = Array.from(categoryMap.entries()).map(([category, tileCount]) => ({
            category,
            tileCount
        })).sort((a, b) => a.category.localeCompare(b.category));
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
/**
 * GET /api/admin/clan-events/bingo/tiles/:id
 * Get a single tile by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tile = await tilesEntity.findById(id);
        if (!tile) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found'
            });
        }
        res.json({
            success: true,
            data: mapTileToResponse(tile)
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
 * Body: { id, task, category, difficulty, icon, description, points, requirements }
 */
router.post('/', async (req, res) => {
    try {
        const { id, task, category, difficulty, icon, description, points = 0, requirements = {} } = req.body;
        // Validation
        if (!id || !task || !category || !difficulty) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['id', 'task', 'category', 'difficulty']
            });
        }
        // Validate points is a number
        if (typeof points !== 'number' || points < 0) {
            return res.status(400).json({
                success: false,
                error: 'points must be a non-negative number'
            });
        }
        const validDifficulties = ['easy', 'medium', 'hard', 'extreme'];
        if (!validDifficulties.includes(difficulty)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid difficulty',
                validDifficulties
            });
        }
        // Validate requirements if provided
        if (requirements && Object.keys(requirements).length > 0) {
            const validation = validateRequirement(requirements);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid requirements',
                    validationErrors: validation.errors
                });
            }
        }
        // Check if ID already exists
        const existing = await tilesEntity.findById(id);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Tile ID already exists'
            });
        }
        const tile = await tilesEntity.createTile({
            id,
            task,
            category,
            difficulty,
            icon,
            description,
            points,
            requirements
        });
        res.status(201).json({
            success: true,
            data: mapTileToResponse(tile),
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
                    tileId: tile.id,
                    error: 'Missing required fields'
                });
                continue;
            }
            if (!validDifficulties.includes(tile.difficulty)) {
                errors.push({
                    index: i,
                    tileId: tile.id,
                    error: `Invalid difficulty: ${tile.difficulty}`
                });
                continue;
            }
            // Validate requirements if provided
            if (tile.requirements && Object.keys(tile.requirements).length > 0) {
                const validation = validateRequirement(tile.requirements);
                if (!validation.valid) {
                    errors.push({
                        index: i,
                        tileId: tile.id,
                        error: 'Invalid requirements',
                        validationErrors: validation.errors
                    });
                    continue;
                }
            }
            try {
                // Check if ID already exists
                const existing = await tilesEntity.findById(tile.id);
                if (existing) {
                    errors.push({
                        index: i,
                        tileId: tile.id,
                        error: 'Tile ID already exists'
                    });
                    continue;
                }
                const created = await tilesEntity.createTile({
                    id: tile.id,
                    task: tile.task,
                    category: tile.category,
                    difficulty: tile.difficulty,
                    icon: tile.icon,
                    description: tile.description,
                    points: tile.points || 0,
                    requirements: tile.requirements || {}
                });
                results.push(created);
            }
            catch (error) {
                errors.push({
                    index: i,
                    tileId: tile.id,
                    error: error.message
                });
            }
        }
        res.status(201).json({
            success: true,
            data: {
                created: results.length,
                failed: errors.length,
                tiles: results.map(mapTileToResponse),
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
        const existing = await tilesEntity.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found'
            });
        }
        // Validate requirements if being updated
        if (updates.requirements && Object.keys(updates.requirements).length > 0) {
            const validation = validateRequirement(updates.requirements);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid requirements',
                    validationErrors: validation.errors
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
                    validDifficulties
                });
            }
        }
        const tile = await tilesEntity.update(id, updates);
        if (!tile) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update tile'
            });
        }
        res.json({
            success: true,
            data: mapTileToResponse(tile),
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
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await tilesEntity.delete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found'
            });
        }
        res.json({
            success: true,
            message: 'Tile deleted successfully',
            deletedId: id
        });
    }
    catch (error) {
        // Handle foreign key constraint error
        if (error.message?.includes('foreign key constraint')) {
            return res.status(409).json({
                success: false,
                error: 'Cannot delete tile',
                message: 'This tile is used on one or more boards. Remove it from all boards first.'
            });
        }
        console.error('Error deleting tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete tile',
            message: error.message
        });
    }
});
export default router;
