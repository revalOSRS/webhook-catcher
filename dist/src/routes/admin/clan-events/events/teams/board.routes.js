import { Router } from 'express';
import { query } from '../../../../../db/connection.js';
const router = Router({ mergeParams: true }); // mergeParams to access :eventId and :teamId
/**
 * Map progress entry (DB now returns camelCase automatically)
 */
const mapProgressEntry = (p) => ({
    id: p.id,
    osrsAccountId: p.osrsAccountId,
    progressValue: p.progressValue,
    progressMetadata: p.progressMetadata,
    completionType: p.completionType,
    completedAt: p.completedAt,
    completedByOsrsAccountId: p.completedByOsrsAccountId,
    completedByMemberId: p.completedByMemberId,
    recordedAt: p.recordedAt
});
/**
 * Map tile (DB now returns camelCase automatically)
 */
const mapBoardTile = (tile) => ({
    id: tile.id,
    boardId: tile.boardId,
    tileId: tile.tileId,
    position: tile.position,
    isCompleted: tile.isCompleted,
    completedAt: tile.completedAt,
    metadata: tile.metadata,
    task: tile.task,
    category: tile.category,
    difficulty: tile.difficulty,
    icon: tile.icon,
    description: tile.description,
    points: tile.points,
    requirements: tile.requirements,
    progressEntries: (tile.progressEntries || []).map(mapProgressEntry),
    teamTotalXpGained: tile.teamTotalXpGained
});
/**
 * Map tile effect (DB now returns camelCase automatically)
 */
const mapTileEffect = (e) => ({
    id: e.id,
    boardTileId: e.boardTileId,
    buffDebuffId: e.buffDebuffId,
    isActive: e.isActive,
    expiresAt: e.expiresAt,
    buffName: e.buffName,
    buffType: e.buffType,
    effectType: e.effectType,
    effectValue: e.effectValue,
    buffIcon: e.buffIcon
});
/**
 * Map line effect (DB now returns camelCase automatically)
 */
const mapLineEffect = (e) => ({
    id: e.id,
    boardId: e.boardId,
    lineType: e.lineType,
    lineIdentifier: e.lineIdentifier,
    buffDebuffId: e.buffDebuffId,
    isActive: e.isActive,
    expiresAt: e.expiresAt,
    buffName: e.buffName,
    buffType: e.buffType,
    effectType: e.effectType,
    effectValue: e.effectValue,
    buffIcon: e.buffIcon
});
/**
 * GET /api/admin/clan-events/:eventId/teams/:teamId/board
 * Get a team's board with all tiles, tile effects, and line effects
 *
 * Returns: BoardResponse
 */
router.get('/', async (req, res) => {
    try {
        const { eventId, teamId } = req.params;
        // Validate event and team exist and are linked
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        // Get or create board for this team
        let boards = await query('SELECT * FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        // If no board exists, get generic board from event config and create team board
        if (boards.length === 0) {
            const event = await query('SELECT config FROM events WHERE id = $1', [eventId]);
            if (event.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Event not found'
                });
            }
            const eventConfig = event[0].config || {};
            const genericBoard = eventConfig.board || {};
            // Create team board from generic board config
            // Include show_tile_buffs setting in metadata (defaults to true)
            const boardMetadata = {
                ...(genericBoard.metadata || {}),
                showTileEffects: genericBoard.metadata?.showTileEffects !== false,
                showRowColumnBuffs: genericBoard.metadata?.showRowColumnBuffs !== false
            };
            const newBoard = await query(`
				INSERT INTO bingo_boards (
					event_id, team_id, name, description, columns, rows, metadata
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				RETURNING *
			`, [
                eventId,
                teamId,
                genericBoard.name || 'Team Board',
                genericBoard.description || null,
                genericBoard.columns || 7,
                genericBoard.rows || 7,
                JSON.stringify(boardMetadata)
            ]);
            boards = newBoard;
            // If generic board has tiles, create them on the team board
            if (genericBoard.tiles && Array.isArray(genericBoard.tiles)) {
                for (const tile of genericBoard.tiles) {
                    await query(`
						INSERT INTO bingo_board_tiles (board_id, tile_id, position, metadata)
						VALUES ($1, $2, $3, $4)
						ON CONFLICT (board_id, position) DO NOTHING
					`, [
                        newBoard[0].id,
                        tile.tileId,
                        tile.position,
                        JSON.stringify(tile.metadata || {})
                    ]);
                }
            }
        }
        const board = boards[0];
        // Get all tiles on this board with progress information
        const tiles = await query(`
			SELECT 
				bbt.*,
				bt.task,
				bt.category,
				bt.difficulty,
				bt.icon,
				bt.description,
				bt.points,
				bt.requirements,
				COALESCE(
					json_agg(
						json_build_object(
							'id', btp.id,
							'progressValue', btp.progress_value,
							'progressMetadata', btp.progress_metadata,
							'completionType', btp.completion_type,
							'completedAt', btp.completed_at,
							'completedByOsrsAccountId', btp.completed_by_osrs_account_id,
							'createdAt', btp.created_at,
							'updatedAt', btp.updated_at
						)
					) FILTER (WHERE btp.id IS NOT NULL),
					'[]'::json
				) as progress_entries,
				-- For EXPERIENCE requirements, calculate team total XP gained
				CASE 
					WHEN bt.requirements->>'match_type' IS NOT NULL 
						AND EXISTS (
							SELECT 1 FROM jsonb_array_elements(COALESCE(bt.requirements->'requirements', '[]'::jsonb)) req
							WHERE req->>'type' = 'EXPERIENCE'
						)
					THEN (
						SELECT COALESCE(SUM((progress_metadata->>'gained_xp')::numeric), 0)
						FROM bingo_tile_progress
						WHERE board_tile_id = bbt.id
							AND progress_metadata->>'gained_xp' IS NOT NULL
					)
					WHEN bt.requirements->'tiers' IS NOT NULL
						AND EXISTS (
							SELECT 1 FROM jsonb_array_elements(bt.requirements->'tiers') tier
							WHERE tier->'requirement'->>'type' = 'EXPERIENCE'
						)
					THEN (
						SELECT COALESCE(SUM((progress_metadata->>'gained_xp')::numeric), 0)
						FROM bingo_tile_progress
						WHERE board_tile_id = bbt.id
							AND progress_metadata->>'gained_xp' IS NOT NULL
					)
					ELSE NULL
				END as team_total_xp_gained
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			LEFT JOIN bingo_tile_progress btp ON btp.board_tile_id = bbt.id
			WHERE bbt.board_id = $1
			GROUP BY bbt.id, bt.task, bt.category, bt.difficulty, bt.icon, bt.description, bt.points, bt.requirements
			ORDER BY bbt.position
		`, [board.id]);
        // Get tile effects (only active ones, or all if show_tile_buffs is true)
        const tileEffects = await query(`
			SELECT 
				bbte.*,
				bbd.name as buff_name,
				bbd.type as buff_type,
				bbd.effect_type,
				bbd.effect_value,
				bbd.icon as buff_icon
			FROM bingo_board_tile_effects bbte
			JOIN bingo_buffs_debuffs bbd ON bbte.buff_debuff_id = bbd.id
			WHERE bbte.board_tile_id IN (SELECT id FROM bingo_board_tiles WHERE board_id = $1)
			AND (bbte.is_active = true OR $2 = true)
			ORDER BY bbte.applied_at DESC
		`, [board.id, board.metadata?.show_tile_buffs !== false]);
        // Get line effects
        const lineEffects = await query(`
			SELECT 
				bble.*,
				bbd.name as buff_name,
				bbd.type as buff_type,
				bbd.effect_type,
				bbd.effect_value,
				bbd.icon as buff_icon
			FROM bingo_board_line_effects bble
			JOIN bingo_buffs_debuffs bbd ON bble.buff_debuff_id = bbd.id
			WHERE bble.board_id = $1 AND bble.is_active = true
			ORDER BY bble.line_type, bble.line_identifier
		`, [board.id]);
        // Separate row and column effects and map to camelCase
        const rowEffects = lineEffects.filter((e) => e.lineType === 'row').map(mapLineEffect);
        const columnEffects = lineEffects.filter((e) => e.lineType === 'column').map(mapLineEffect);
        const response = {
            id: board.id,
            eventId: board.eventId,
            teamId: board.teamId,
            columns: board.columns,
            rows: board.rows,
            metadata: board.metadata,
            tiles: tiles.map(mapBoardTile),
            tileEffects: tileEffects.map(mapTileEffect),
            rowEffects,
            columnEffects
        };
        res.json({
            success: true,
            data: response
        });
    }
    catch (error) {
        console.error('Error fetching team board:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team board',
            message: error.message
        });
    }
});
/**
 * PATCH /api/admin/clan-events/:eventId/teams/:teamId/board
 * Update board configuration
 * Body: { name, description, columns, rows, metadata }
 * Note: showRowColumnBuffs should be in metadata.showRowColumnBuffs
 *
 * Returns: Updated board
 */
router.patch('/', async (req, res) => {
    try {
        const { eventId, teamId } = req.params;
        const updates = req.body;
        // Validate team exists
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        // Get or create board
        let boards = await query('SELECT id, metadata FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            // Create board if it doesn't exist
            const event = await query('SELECT config FROM events WHERE id = $1', [eventId]);
            const eventConfig = event[0]?.config || {};
            const genericBoard = eventConfig.board || {};
            const boardMetadata = {
                ...(genericBoard.metadata || {}),
                ...(updates.metadata || {}),
                showTileEffects: updates.metadata?.showTileEffects ?? genericBoard.metadata?.showTileEffects ?? true,
                showRowColumnBuffs: updates.metadata?.showRowColumnBuffs ?? genericBoard.metadata?.showRowColumnBuffs ?? false
            };
            const newBoard = await query(`
				INSERT INTO bingo_boards (
					event_id, team_id, name, description, columns, rows, metadata
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				RETURNING id
			`, [
                eventId,
                teamId,
                updates.name || genericBoard.name || 'Team Board',
                updates.description || genericBoard.description || null,
                updates.columns || genericBoard.columns || 7,
                updates.rows || genericBoard.rows || 7,
                JSON.stringify(boardMetadata)
            ]);
            boards = newBoard;
        }
        const boardId = boards[0].id;
        const existingMetadata = boards[0].metadata || {};
        // Build dynamic update query
        // If updating metadata, merge with existing metadata
        const allowedFields = ['name', 'description', 'columns', 'rows', 'metadata'];
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex}`);
                if (key === 'metadata') {
                    // Merge with existing metadata and ensure showTileEffects and showRowColumnBuffs are preserved
                    const metadataValue = (typeof value === 'object' && value !== null ? value : {});
                    const metadataWithSetting = {
                        ...existingMetadata,
                        ...metadataValue,
                        showTileEffects: metadataValue.showTileEffects ?? existingMetadata.showTileEffects ?? true,
                        showRowColumnBuffs: metadataValue.showRowColumnBuffs ?? existingMetadata.showRowColumnBuffs ?? false
                    };
                    values.push(JSON.stringify(metadataWithSetting));
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
        values.push(boardId);
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
    }
    catch (error) {
        console.error('Error updating board:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update board',
            message: error.message
        });
    }
});
/**
 * POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles
 * Add a tile to the board
 * Body: { tile_id, position, metadata }
 *
 * Returns: Created board tile
 */
router.post('/tiles', async (req, res) => {
    try {
        const { eventId, teamId } = req.params;
        const { tileId, position, metadata = {} } = req.body;
        if (!tileId || !position) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['tileId', 'position']
            });
        }
        // Validate team
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        // Get or create board
        let boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found. Please create the board first.'
            });
        }
        const boardId = boards[0].id;
        // Check if tile exists in library
        const tileCheck = await query('SELECT id FROM bingo_tiles WHERE id = $1', [tileId]);
        if (tileCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found in library'
            });
        }
        // Check if position is already taken
        const positionCheck = await query('SELECT id FROM bingo_board_tiles WHERE board_id = $1 AND position = $2', [boardId, position]);
        if (positionCheck.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Position already occupied',
                message: `Position ${position} is already taken on this board`
            });
        }
        const result = await query(`
			INSERT INTO bingo_board_tiles (
				board_id, tile_id, position, metadata
			)
			VALUES ($1, $2, $3, $4)
			RETURNING *
		`, [boardId, tileId, position, JSON.stringify(metadata)]);
        res.status(201).json({
            success: true,
            data: result[0],
            message: 'Tile added to board successfully'
        });
    }
    catch (error) {
        console.error('Error adding tile to board:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add tile to board',
            message: error.message
        });
    }
});
/**
 * PATCH /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId
 * Update a board tile
 * Body: { position, is_completed, completed_at, metadata }
 *
 * Returns: Updated board tile
 */
router.patch('/tiles/:tileId', async (req, res) => {
    try {
        const { eventId, teamId, tileId } = req.params;
        const updates = req.body;
        // Validate team
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        // Get board
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        const boardId = boards[0].id;
        // Check if board tile exists
        const existing = await query('SELECT id, position FROM bingo_board_tiles WHERE board_id = $1 AND id = $2', [boardId, tileId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board tile not found'
            });
        }
        // If updating position, check if new position is available
        if (updates.position && updates.position !== existing[0].position) {
            const posCheck = await query('SELECT id FROM bingo_board_tiles WHERE board_id = $1 AND position = $2 AND id != $3', [boardId, updates.position, tileId]);
            if (posCheck.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Position already occupied'
                });
            }
        }
        // Build dynamic update query
        const allowedFields = ['position', 'is_completed', 'completed_at', 'metadata'];
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex}`);
                if (key === 'metadata') {
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
    }
    catch (error) {
        console.error('Error updating board tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update board tile',
            message: error.message
        });
    }
});
/**
 * DELETE /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId
 * Remove a tile from the board
 *
 * Returns: Deleted tile ID
 */
router.delete('/tiles/:tileId', async (req, res) => {
    try {
        const { eventId, teamId, tileId } = req.params;
        // Validate team
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        // Get board
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        const boardId = boards[0].id;
        const result = await query('DELETE FROM bingo_board_tiles WHERE board_id = $1 AND id = $2 RETURNING id', [boardId, tileId]);
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board tile not found'
            });
        }
        res.json({
            success: true,
            message: 'Tile removed from board successfully',
            deletedId: result[0].id
        });
    }
    catch (error) {
        console.error('Error removing tile from board:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove tile from board',
            message: error.message
        });
    }
});
/**
 * POST /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs
 * Apply a buff/debuff to a specific tile
 * Body: { board_tile_id, buff_debuff_id, applied_by, expires_at, metadata }
 *
 * Returns: Created tile effect
 */
router.post('/tile-buffs', async (req, res) => {
    try {
        const { eventId, teamId } = req.params;
        const { boardTileId, buffDebuffId, appliedBy, expiresAt, metadata = {} } = req.body;
        if (!boardTileId || !buffDebuffId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['boardTileId', 'buffDebuffId']
            });
        }
        // Validate team and board
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        // Check if board tile belongs to this board
        const tileCheck = await query('SELECT id FROM bingo_board_tiles WHERE id = $1 AND board_id = $2', [boardTileId, boards[0].id]);
        if (tileCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board tile not found or does not belong to this board'
            });
        }
        // Check if buff/debuff exists
        const buffCheck = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [buffDebuffId]);
        if (buffCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Buff/debuff not found'
            });
        }
        // Check if already applied
        const existing = await query('SELECT id FROM bingo_board_tile_effects WHERE board_tile_id = $1 AND buff_debuff_id = $2', [boardTileId, buffDebuffId]);
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
		`, [boardTileId, buffDebuffId, appliedBy, expiresAt, JSON.stringify(metadata)]);
        res.status(201).json({
            success: true,
            data: result[0],
            message: 'Effect applied to tile successfully'
        });
    }
    catch (error) {
        console.error('Error applying effect to tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to apply effect to tile',
            message: error.message
        });
    }
});
/**
 * PATCH /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs/:effectId
 * Update a tile effect
 * Body: { is_active, expires_at, metadata }
 *
 * Returns: Updated tile effect
 */
router.patch('/tile-buffs/:effectId', async (req, res) => {
    try {
        const { eventId, teamId, effectId } = req.params;
        const updates = req.body;
        // Validate team and board
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        // Check if effect exists and belongs to this board
        const existing = await query(`
			SELECT bbte.id 
			FROM bingo_board_tile_effects bbte
			JOIN bingo_board_tiles bbt ON bbte.board_tile_id = bbt.id
			WHERE bbte.id = $1 AND bbt.board_id = $2
		`, [effectId, boards[0].id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tile effect not found or does not belong to this board'
            });
        }
        // Build dynamic update query
        const allowedFields = ['is_active', 'expires_at', 'metadata'];
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex}`);
                if (key === 'metadata') {
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
        values.push(effectId);
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
    }
    catch (error) {
        console.error('Error updating tile effect:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update tile effect',
            message: error.message
        });
    }
});
/**
 * DELETE /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs/:effectId
 * Remove a buff/debuff from a tile
 *
 * Returns: Deleted effect ID
 */
router.delete('/tile-buffs/:effectId', async (req, res) => {
    try {
        const { eventId, teamId, effectId } = req.params;
        // Validate team and board
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        // Check if effect exists and belongs to this board
        const existing = await query(`
			SELECT bbte.id 
			FROM bingo_board_tile_effects bbte
			JOIN bingo_board_tiles bbt ON bbte.board_tile_id = bbt.id
			WHERE bbte.id = $1 AND bbt.board_id = $2
		`, [effectId, boards[0].id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tile effect not found or does not belong to this board'
            });
        }
        const result = await query('DELETE FROM bingo_board_tile_effects WHERE id = $1 RETURNING id', [effectId]);
        res.json({
            success: true,
            message: 'Effect removed from tile successfully',
            deletedId: result[0].id
        });
    }
    catch (error) {
        console.error('Error removing effect from tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove effect from tile',
            message: error.message
        });
    }
});
/**
 * POST /api/admin/clan-events/:eventId/teams/:teamId/board/line-buffs
 * Apply a buff/debuff to a row or column
 * Body: { line_type ('row' or 'column'), line_identifier (row number or column letter), buff_debuff_id, applied_by, expires_at, metadata }
 *
 * Returns: Created line effect
 */
router.post('/line-buffs', async (req, res) => {
    try {
        const { eventId, teamId } = req.params;
        const { lineType, lineIdentifier, buffDebuffId, appliedBy, expiresAt, metadata = {} } = req.body;
        if (!lineType || !lineIdentifier || !buffDebuffId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['lineType', 'lineIdentifier', 'buffDebuffId']
            });
        }
        if (!['row', 'column'].includes(lineType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lineType',
                validTypes: ['row', 'column']
            });
        }
        // Validate team and board
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        const boards = await query('SELECT id, columns, rows FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        const board = boards[0];
        // Validate lineIdentifier
        if (lineType === 'row') {
            const rowNum = parseInt(lineIdentifier);
            if (isNaN(rowNum) || rowNum < 1 || rowNum > board.rows) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid row number',
                    message: `Row must be between 1 and ${board.rows}`
                });
            }
        }
        else {
            const columnIndex = lineIdentifier.toUpperCase().charCodeAt(0) - 65;
            if (columnIndex < 0 || columnIndex >= board.columns) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid column letter',
                    message: `Column must be between A and ${String.fromCharCode(65 + board.columns - 1)}`
                });
            }
        }
        // Check if buff/debuff exists
        const buffCheck = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [buffDebuffId]);
        if (buffCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Buff/debuff not found'
            });
        }
        // Check if already applied
        const existing = await query('SELECT id FROM bingo_board_line_effects WHERE board_id = $1 AND line_type = $2 AND line_identifier = $3 AND buff_debuff_id = $4', [board.id, lineType, lineType === 'column' ? lineIdentifier.toUpperCase() : lineIdentifier, buffDebuffId]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'This buff/debuff is already applied to this line'
            });
        }
        const result = await query(`
			INSERT INTO bingo_board_line_effects (
				board_id, line_type, line_identifier, buff_debuff_id, applied_by, expires_at, metadata
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING *
		`, [
            board.id,
            lineType,
            lineType === 'column' ? lineIdentifier.toUpperCase() : lineIdentifier,
            buffDebuffId,
            appliedBy,
            expiresAt,
            JSON.stringify(metadata)
        ]);
        res.status(201).json({
            success: true,
            data: result[0],
            message: 'Effect applied to line successfully'
        });
    }
    catch (error) {
        console.error('Error applying effect to line:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to apply effect to line',
            message: error.message
        });
    }
});
/**
 * PATCH /api/admin/clan-events/:eventId/teams/:teamId/board/line-buffs/:effectId
 * Update a line effect
 * Body: { is_active, expires_at, metadata }
 *
 * Returns: Updated line effect
 */
router.patch('/line-buffs/:effectId', async (req, res) => {
    try {
        const { eventId, teamId, effectId } = req.params;
        const updates = req.body;
        // Validate team and board
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        // Check if effect exists and belongs to this board
        const existing = await query('SELECT id FROM bingo_board_line_effects WHERE id = $1 AND board_id = $2', [effectId, boards[0].id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Line effect not found or does not belong to this board'
            });
        }
        // Build dynamic update query
        const allowedFields = ['is_active', 'expires_at', 'metadata'];
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex}`);
                if (key === 'metadata') {
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
        values.push(effectId);
        const sql = `
			UPDATE bingo_board_line_effects 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;
        const result = await query(sql, values);
        res.json({
            success: true,
            data: result[0],
            message: 'Line effect updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating line effect:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update line effect',
            message: error.message
        });
    }
});
/**
 * DELETE /api/admin/clan-events/:eventId/teams/:teamId/board/line-buffs/:effectId
 * Remove a buff/debuff from a row or column
 *
 * Returns: Deleted effect ID
 */
router.delete('/line-buffs/:effectId', async (req, res) => {
    try {
        const { eventId, teamId, effectId } = req.params;
        // Validate team and board
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        // Check if effect exists and belongs to this board
        const existing = await query('SELECT id FROM bingo_board_line_effects WHERE id = $1 AND board_id = $2', [effectId, boards[0].id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Line effect not found or does not belong to this board'
            });
        }
        const result = await query('DELETE FROM bingo_board_line_effects WHERE id = $1 RETURNING id', [effectId]);
        res.json({
            success: true,
            message: 'Effect removed from line successfully',
            deletedId: result[0].id
        });
    }
    catch (error) {
        console.error('Error removing effect from line:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove effect from line',
            message: error.message
        });
    }
});
/**
 * POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId/complete
 * Manually mark a tile as completed (admin action)
 * Body: { completion_type: 'manual_admin', completed_by_osrs_account_id? (optional), notes? (optional) }
 *
 * Returns: Updated tile with completion info
 */
router.post('/tiles/:tileId/complete', async (req, res) => {
    try {
        const { eventId, teamId, tileId } = req.params;
        const { completionType = 'manual_admin', completedByOsrsAccountId, notes } = req.body;
        // Validate team and board
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        const boardId = boards[0].id;
        // Check if tile exists on this board
        const tileCheck = await query('SELECT id, is_completed FROM bingo_board_tiles WHERE id = $1 AND board_id = $2', [tileId, boardId]);
        if (tileCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found on this board'
            });
        }
        if (tileCheck[0].isCompleted) {
            return res.status(409).json({
                success: false,
                error: 'Tile is already completed'
            });
        }
        // Mark tile as completed
        await query(`
			UPDATE bingo_board_tiles
			SET 
				is_completed = true,
				completed_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`, [tileId]);
        // Get tile requirements to determine the type
        const tileData = await query(`
			SELECT bt.requirements 
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			WHERE bbt.id = $1
		`, [tileId]);
        const requirements = tileData[0]?.requirements || {};
        const totalReqs = requirements.requirements?.length || 1;
        const firstReqType = requirements.requirements?.[0]?.type ||
            requirements.tiers?.[0]?.requirement?.type || 'ITEM_DROP';
        // Create proper TileProgressMetadata structure
        const createEmptyProgressMetadata = () => {
            const reqProgress = {};
            for (let i = 0; i < totalReqs; i++) {
                reqProgress[String(i)] = {
                    isCompleted: true,
                    progressValue: 1,
                    progressMetadata: {
                        requirementType: firstReqType,
                        targetValue: 1,
                        lastUpdateAt: new Date().toISOString(),
                        currentTotalCount: 1,
                        playerContributions: []
                    }
                };
            }
            return {
                totalRequirements: totalReqs,
                completedRequirementIndices: Array.from({ length: totalReqs }, (_, i) => i),
                requirementProgress: reqProgress
            };
        };
        // Create or update progress entry
        // We should only have one progress entry per board_tile_id
        const existingProgress = await query('SELECT id, progress_metadata FROM bingo_tile_progress WHERE board_tile_id = $1 LIMIT 1', [tileId]);
        if (existingProgress.length > 0) {
            // Update existing progress - merge with existing metadata
            const existingMeta = existingProgress[0].progressMetadata || {};
            const updatedMeta = existingMeta.requirementProgress
                ? {
                    ...existingMeta,
                    completedRequirementIndices: Array.from({ length: totalReqs }, (_, i) => i)
                }
                : createEmptyProgressMetadata();
            await query(`
				UPDATE bingo_tile_progress
				SET 
					completion_type = $1,
					completed_at = CURRENT_TIMESTAMP,
					completed_by_osrs_account_id = $2,
					progress_metadata = $3::jsonb,
					updated_at = CURRENT_TIMESTAMP
				WHERE id = $4
			`, [
                completionType,
                completedByOsrsAccountId || null,
                JSON.stringify(updatedMeta),
                existingProgress[0].id
            ]);
        }
        else {
            // Insert new progress entry with proper structure
            await query(`
				INSERT INTO bingo_tile_progress (
					board_tile_id, progress_value, progress_metadata,
					completion_type, completed_at, completed_by_osrs_account_id
				)
				VALUES ($1, 1, $2, $3, CURRENT_TIMESTAMP, $4)
			`, [
                tileId,
                JSON.stringify(createEmptyProgressMetadata()),
                completionType,
                completedByOsrsAccountId || null
            ]);
        }
        // Get updated tile with team/event info for notification
        const updatedTile = await query(`
			SELECT 
				bbt.*,
				bt.task, bt.category, bt.difficulty, bt.icon, bt.description,
				bt.points, bt.requirements,
				et.id as team_id, et.name as team_name,
				e.name as event_name
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			JOIN event_teams et ON bb.team_id = et.id
			JOIN events e ON bb.event_id = e.id
			WHERE bbt.id = $1
		`, [tileId]);
        // Award points to the team
        if (updatedTile.length > 0) {
            const tile = updatedTile[0];
            const basePoints = tile.points || 0;
            // Award base points for tile completion
            if (basePoints > 0) {
                await query('UPDATE event_teams SET score = score + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [basePoints, teamId]);
                console.log(`[Admin] Awarded ${basePoints} points to team ${teamId} for completing tile ${tileId}`);
            }
        }
        // Send Discord notification for manual completion
        if (updatedTile.length > 0) {
            try {
                const tile = updatedTile[0];
                const progressData = existingProgress.length > 0
                    ? await query('SELECT progress_value, progress_metadata FROM bingo_tile_progress WHERE id = $1', [existingProgress[0].id])
                    : null;
                let playerName = 'Admin';
                if (completedByOsrsAccountId) {
                    const accounts = await query('SELECT osrs_nickname FROM osrs_accounts WHERE id = $1 LIMIT 1', [completedByOsrsAccountId]);
                    if (accounts.length > 0) {
                        playerName = accounts[0].osrsNickname || 'Admin';
                    }
                }
                const { DiscordNotificationsService } = await import('../../../../../modules/events/bingo/discord-notifications.service.js');
                await DiscordNotificationsService.sendTileProgressNotification({
                    teamId: tile.teamId,
                    teamName: tile.teamName,
                    eventName: tile.eventName,
                    tileId: tile.tileId,
                    tileTask: tile.task,
                    tilePosition: tile.position,
                    playerName,
                    progressValue: progressData?.[0]?.progressValue || 1,
                    progressMetadata: progressData?.[0]?.progressMetadata || {},
                    isCompleted: true,
                    completionType: 'manual_admin',
                    completedTiers: progressData?.[0]?.progressMetadata?.completedTiers,
                    totalTiers: progressData?.[0]?.progressMetadata?.totalTiers
                });
            }
            catch (error) {
                console.error('[BoardRoutes] Error sending Discord notification:', error);
                // Don't fail the request if notification fails
            }
        }
        res.json({
            success: true,
            data: updatedTile[0],
            message: 'Tile marked as completed successfully'
        });
    }
    catch (error) {
        console.error('Error completing tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete tile',
            message: error.message
        });
    }
});
/**
 * POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId/revert
 * Revert a completed tile back to incomplete (admin action)
 *
 * Returns: Updated tile
 */
router.post('/tiles/:tileId/revert', async (req, res) => {
    try {
        const { eventId, teamId, tileId } = req.params;
        // Validate team and board
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        const boards = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (boards.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        const boardId = boards[0].id;
        // Check if tile exists and is completed
        const tileCheck = await query('SELECT id, is_completed FROM bingo_board_tiles WHERE id = $1 AND board_id = $2', [tileId, boardId]);
        if (tileCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tile not found on this board'
            });
        }
        if (!tileCheck[0].isCompleted) {
            return res.status(409).json({
                success: false,
                error: 'Tile is not completed'
            });
        }
        // Revert tile
        await query(`
			UPDATE bingo_board_tiles
			SET 
				is_completed = false,
				completed_at = NULL
			WHERE id = $1
		`, [tileId]);
        // Update progress (remove completion but keep progress)
        await query(`
			UPDATE bingo_tile_progress
			SET 
				completion_type = NULL,
				completed_at = NULL,
				completed_by_osrs_account_id = NULL
			WHERE board_tile_id = $1
		`, [tileId]);
        // Get tile info for points subtraction
        const tileInfo = await query(`
			SELECT 
				bbt.*,
				bt.task, bt.category, bt.difficulty, bt.icon, bt.description,
				bt.points, bt.requirements
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			WHERE bbt.id = $1
		`, [tileId]);
        // Subtract points from the team
        if (tileInfo.length > 0) {
            const tile = tileInfo[0];
            const basePoints = tile.points || 0;
            if (basePoints > 0) {
                await query('UPDATE event_teams SET score = GREATEST(0, score - $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2', [basePoints, teamId]);
                console.log(`[Admin] Subtracted ${basePoints} points from team ${teamId} for reverting tile ${tileId}`);
            }
        }
        res.json({
            success: true,
            data: tileInfo[0],
            message: 'Tile reverted successfully'
        });
    }
    catch (error) {
        console.error('Error reverting tile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to revert tile',
            message: error.message
        });
    }
});
/**
 * PUT /api/admin/clan-events/:eventId/teams/:teamId/board/bulk
 * Bulk update entire board - tiles, positions, and progress
 *
 * This is a comprehensive endpoint to modify everything about a team's board in one request.
 *
 * Body: {
 *   board?: {
 *     columns?: number,
 *     rows?: number,
 *     metadata?: object
 *   },
 *   tiles?: [
 *     {
 *       boardTileId?: string,        // If provided, updates existing tile. If not, creates new
 *       tileId: string,              // Reference to bingo_tiles.id
 *       position: string,            // e.g. "A1", "B2"
 *       metadata?: object,
 *       isCompleted?: boolean,
 *       progress?: {
 *         progressValue?: number,
 *         progressMetadata?: object,
 *         completedByOsrsAccountId?: number,
 *         completionType?: 'auto' | 'manual_admin'
 *       }
 *     }
 *   ],
 *   removeTileIds?: string[],        // Board tile IDs to remove
 *   resetAllProgress?: boolean       // If true, resets all tile progress
 * }
 *
 * Returns: Updated board with all tiles
 */
router.put('/bulk', async (req, res) => {
    try {
        const { eventId, teamId } = req.params;
        const { board, tiles, removeTileIds, resetAllProgress } = req.body;
        // Validate team exists
        const teamCheck = await query('SELECT id FROM event_teams WHERE id = $1 AND event_id = $2', [teamId, eventId]);
        if (teamCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or does not belong to this event'
            });
        }
        // Get or create board
        let boards = await query('SELECT id, metadata, columns, rows FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        let boardId;
        if (boards.length === 0) {
            // Create board
            const event = await query('SELECT config FROM events WHERE id = $1', [eventId]);
            const eventConfig = event[0]?.config || {};
            const genericBoard = eventConfig.board || {};
            const newBoard = await query(`
				INSERT INTO bingo_boards (
					event_id, team_id, name, columns, rows, metadata
				)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id
			`, [
                eventId,
                teamId,
                'Team Board',
                board?.columns || genericBoard.columns || 5,
                board?.rows || genericBoard.rows || 5,
                JSON.stringify(board?.metadata || genericBoard.metadata || {})
            ]);
            boardId = newBoard[0].id;
        }
        else {
            boardId = boards[0].id;
            // Update board config if provided
            if (board) {
                const existingMetadata = boards[0].metadata || {};
                const updateParts = [];
                const updateValues = [];
                let paramIdx = 1;
                if (board.columns !== undefined) {
                    updateParts.push(`columns = $${paramIdx++}`);
                    updateValues.push(board.columns);
                }
                if (board.rows !== undefined) {
                    updateParts.push(`rows = $${paramIdx++}`);
                    updateValues.push(board.rows);
                }
                if (board.metadata !== undefined) {
                    updateParts.push(`metadata = $${paramIdx++}`);
                    updateValues.push(JSON.stringify({ ...existingMetadata, ...board.metadata }));
                }
                if (updateParts.length > 0) {
                    updateValues.push(boardId);
                    await query(`
						UPDATE bingo_boards 
						SET ${updateParts.join(', ')}, updated_at = NOW()
						WHERE id = $${paramIdx}
					`, updateValues);
                }
            }
        }
        const results = {
            boardUpdated: false,
            tilesCreated: 0,
            tilesUpdated: 0,
            tilesRemoved: 0,
            progressUpdated: 0,
            progressReset: false
        };
        if (board) {
            results.boardUpdated = true;
        }
        // Reset all progress if requested
        if (resetAllProgress) {
            await query(`
				UPDATE bingo_board_tiles
				SET is_completed = false, completed_at = NULL
				WHERE board_id = $1
			`, [boardId]);
            await query(`
				DELETE FROM bingo_tile_progress
				WHERE board_tile_id IN (
					SELECT id FROM bingo_board_tiles WHERE board_id = $1
				)
			`, [boardId]);
            results.progressReset = true;
        }
        // Remove tiles if specified
        if (removeTileIds && removeTileIds.length > 0) {
            // Delete progress first (foreign key)
            await query(`
				DELETE FROM bingo_tile_progress
				WHERE board_tile_id = ANY($1::uuid[])
			`, [removeTileIds]);
            // Delete tile effects
            await query(`
				DELETE FROM bingo_board_tile_effects
				WHERE board_tile_id = ANY($1::uuid[])
			`, [removeTileIds]);
            // Delete tiles
            const deleteResult = await query(`
				DELETE FROM bingo_board_tiles
				WHERE id = ANY($1::uuid[]) AND board_id = $2
				RETURNING id
			`, [removeTileIds, boardId]);
            results.tilesRemoved = deleteResult.length;
        }
        // Process tiles
        if (tiles && tiles.length > 0) {
            for (const tile of tiles) {
                const { boardTileId, tileId, position, metadata, isCompleted, progress } = tile;
                // Validate tile exists in bingo_tiles
                const tileCheck = await query('SELECT id FROM bingo_tiles WHERE id = $1', [tileId]);
                if (tileCheck.length === 0) {
                    continue; // Skip invalid tiles
                }
                let currentBoardTileId;
                if (boardTileId) {
                    // Update existing board tile
                    const existingTile = await query('SELECT id, metadata FROM bingo_board_tiles WHERE id = $1 AND board_id = $2', [boardTileId, boardId]);
                    if (existingTile.length === 0) {
                        continue; // Skip if tile doesn't exist
                    }
                    const existingMeta = existingTile[0].metadata || {};
                    await query(`
						UPDATE bingo_board_tiles
						SET 
							tile_id = $1,
							position = $2,
							metadata = $3,
							is_completed = COALESCE($4, is_completed),
							completed_at = CASE WHEN $4 = true AND completed_at IS NULL THEN NOW() 
								WHEN $4 = false THEN NULL 
								ELSE completed_at END,
							updated_at = NOW()
						WHERE id = $5
					`, [
                        tileId,
                        position,
                        JSON.stringify({ ...existingMeta, ...(metadata || {}) }),
                        isCompleted,
                        boardTileId
                    ]);
                    currentBoardTileId = boardTileId;
                    results.tilesUpdated++;
                }
                else {
                    // Check if position is already occupied
                    const positionCheck = await query('SELECT id FROM bingo_board_tiles WHERE board_id = $1 AND position = $2', [boardId, position]);
                    if (positionCheck.length > 0) {
                        // Update existing tile at this position
                        await query(`
							UPDATE bingo_board_tiles
							SET 
								tile_id = $1,
								metadata = $2,
								is_completed = COALESCE($3, is_completed),
								completed_at = CASE WHEN $3 = true AND completed_at IS NULL THEN NOW() 
									WHEN $3 = false THEN NULL 
									ELSE completed_at END,
								updated_at = NOW()
							WHERE id = $4
						`, [
                            tileId,
                            JSON.stringify(metadata || {}),
                            isCompleted,
                            positionCheck[0].id
                        ]);
                        currentBoardTileId = positionCheck[0].id;
                        results.tilesUpdated++;
                    }
                    else {
                        // Create new board tile
                        const newTile = await query(`
							INSERT INTO bingo_board_tiles (board_id, tile_id, position, metadata, is_completed, completed_at)
							VALUES ($1, $2, $3, $4, COALESCE($5, false), CASE WHEN $5 = true THEN NOW() ELSE NULL END)
							RETURNING id
						`, [
                            boardId,
                            tileId,
                            position,
                            JSON.stringify(metadata || {}),
                            isCompleted
                        ]);
                        currentBoardTileId = newTile[0].id;
                        results.tilesCreated++;
                    }
                }
                // Update progress if provided
                if (progress) {
                    const existingProgress = await query('SELECT id, progress_metadata FROM bingo_tile_progress WHERE board_tile_id = $1', [currentBoardTileId]);
                    if (existingProgress.length > 0) {
                        // Update existing progress
                        const existingMeta = existingProgress[0].progressMetadata || {};
                        const hasCompletionType = progress.completionType != null;
                        await query(`
							UPDATE bingo_tile_progress
							SET 
								progress_value = COALESCE($1, progress_value),
								progress_metadata = $2,
								completed_by_osrs_account_id = COALESCE($3, completed_by_osrs_account_id),
								completion_type = COALESCE($4::text, completion_type),
								completed_at = CASE 
									WHEN $5 = true AND completed_at IS NULL THEN NOW()
									ELSE completed_at 
								END,
								updated_at = NOW()
							WHERE board_tile_id = $6
						`, [
                            progress.progressValue,
                            JSON.stringify({ ...existingMeta, ...(progress.progressMetadata || {}) }),
                            progress.completedByOsrsAccountId || null,
                            progress.completionType || null,
                            hasCompletionType,
                            currentBoardTileId
                        ]);
                    }
                    else {
                        // Create new progress record
                        const hasCompletionType = progress.completionType != null;
                        await query(`
							INSERT INTO bingo_tile_progress (
								board_tile_id, progress_value, progress_metadata, 
								completed_by_osrs_account_id, completion_type, completed_at
							)
							VALUES ($1, $2, $3, $4, $5, $6)
						`, [
                            currentBoardTileId,
                            progress.progressValue || 0,
                            JSON.stringify(progress.progressMetadata || {}),
                            progress.completedByOsrsAccountId || null,
                            progress.completionType || null,
                            hasCompletionType ? new Date().toISOString() : null
                        ]);
                    }
                    results.progressUpdated++;
                }
            }
        }
        // Fetch the complete updated board
        const updatedBoard = await query(`
			SELECT id, event_id, team_id, columns, rows, metadata
			FROM bingo_boards WHERE id = $1
		`, [boardId]);
        const updatedTiles = await query(`
			SELECT 
				bbt.id, bbt.board_id, bbt.tile_id, bbt.position, 
				bbt.is_completed, bbt.completed_at, bbt.metadata,
				bt.task, bt.category, bt.difficulty, bt.icon, 
				bt.description, bt.points, bt.requirements,
				btp.progress_value, btp.progress_metadata, 
				btp.completion_type, btp.completed_at as progress_completed_at,
				btp.completed_by_osrs_account_id
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			LEFT JOIN bingo_tile_progress btp ON btp.board_tile_id = bbt.id
			WHERE bbt.board_id = $1
			ORDER BY bbt.position
		`, [boardId]);
        res.json({
            success: true,
            message: 'Board bulk update completed',
            summary: results,
            data: {
                board: {
                    id: updatedBoard[0].id,
                    eventId: updatedBoard[0].eventId,
                    teamId: updatedBoard[0].teamId,
                    columns: updatedBoard[0].columns,
                    rows: updatedBoard[0].rows,
                    metadata: updatedBoard[0].metadata
                },
                tiles: updatedTiles.map((t) => ({
                    id: t.id,
                    boardId: t.boardId,
                    tileId: t.tileId,
                    position: t.position,
                    isCompleted: t.isCompleted,
                    completedAt: t.completedAt,
                    metadata: t.metadata,
                    task: t.task,
                    category: t.category,
                    difficulty: t.difficulty,
                    icon: t.icon,
                    description: t.description,
                    points: t.points,
                    requirements: t.requirements,
                    progress: t.progressValue !== null ? {
                        progressValue: t.progressValue,
                        progressMetadata: t.progressMetadata,
                        completionType: t.completionType,
                        completedAt: t.progressCompletedAt,
                        completedByOsrsAccountId: t.completedByOsrsAccountId
                    } : null
                }))
            }
        });
    }
    catch (error) {
        console.error('Error in bulk board update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk update',
            message: error.message
        });
    }
});
export default router;
