import { Router, Request, Response } from 'express';
import { query } from '../../../../../db/connection.js';

const router = Router({ mergeParams: true }); // mergeParams to access :eventId and :teamId

/**
 * Types for board responses
 */
interface TileProgressEntry {
	id: string;
	osrs_account_id: number | null;
	progress_value: number;
	progress_metadata: Record<string, any>;
	completion_type: 'auto' | 'manual_admin' | null;
	completed_at: string | null;
	completed_by_osrs_account_id: number | null;
	completed_by_member_id: number | null;
	recorded_at: string;
}

interface BoardTile {
	id: string;
	board_id: string;
	tile_id: string;
	position: string;
	custom_points: number | null;
	is_completed: boolean;
	completed_by_team_id: string | null;
	completed_at: string | null;
	metadata: any;
	task: string;
	category: string;
	difficulty: string;
	icon: string | null;
	description: string | null;
	base_points: number;
	bonus_tiers: any[];
	requirements: any;
	progress_entries: TileProgressEntry[];
	team_total_xp_gained?: number | null; // For EXPERIENCE requirements, total XP gained by team
}

interface TileEffect {
	id: string;
	board_tile_id: string;
	buff_debuff_id: string;
	is_active: boolean;
	expires_at: string | null;
	buff_name: string;
	buff_type: 'buff' | 'debuff';
	effect_type: string;
	effect_value: number;
	buff_icon: string | null;
}

interface LineEffect {
	id: string;
	board_id: string;
	line_type: 'row' | 'column';
	line_identifier: string;
	buff_debuff_id: string;
	is_active: boolean;
	expires_at: string | null;
	buff_name: string;
	buff_type: 'buff' | 'debuff';
	effect_type: string;
	effect_value: number;
	buff_icon: string | null;
}

interface BoardResponse {
	id: string;
	event_id: string;
	team_id: string;
	name: string;
	description: string | null;
	columns: number;
	rows: number;
	show_row_column_buffs: boolean;
	metadata: any;
	tiles: BoardTile[];
	tile_effects: TileEffect[];
	row_effects: LineEffect[];
	column_effects: LineEffect[];
}

/**
 * GET /api/admin/clan-events/:eventId/teams/:teamId/board
 * Get a team's board with all tiles, tile effects, and line effects
 * 
 * Returns: BoardResponse
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId } = req.params;

		// Validate event and team exist and are linked
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		// Get or create board for this team
		let boards = await query(
			'SELECT * FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);

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
				show_tile_buffs: genericBoard.metadata?.show_tile_buffs !== false
			};

			const newBoard = await query(`
				INSERT INTO bingo_boards (
					event_id, team_id, name, description, columns, rows, show_row_column_buffs, metadata
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				RETURNING *
			`, [
				eventId,
				teamId,
				genericBoard.name || 'Team Board',
				genericBoard.description || null,
				genericBoard.columns || 7,
				genericBoard.rows || 7,
				genericBoard.show_row_column_buffs || false,
				JSON.stringify(boardMetadata)
			]);

			boards = newBoard;

			// If generic board has tiles, create them on the team board
			if (genericBoard.tiles && Array.isArray(genericBoard.tiles)) {
				for (const tile of genericBoard.tiles) {
					await query(`
						INSERT INTO bingo_board_tiles (board_id, tile_id, position, custom_points, metadata)
						VALUES ($1, $2, $3, $4, $5)
						ON CONFLICT (board_id, position) DO NOTHING
					`, [
						newBoard[0].id,
						tile.tile_id,
						tile.position,
						tile.custom_points || null,
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
				bt.base_points,
				bt.bonus_tiers,
				bt.requirements,
				COALESCE(
					json_agg(
						json_build_object(
							'id', btp.id,
							'osrs_account_id', btp.osrs_account_id,
							'progress_value', btp.progress_value,
							'progress_metadata', btp.progress_metadata,
							'completion_type', btp.completion_type,
							'completed_at', btp.completed_at,
							'completed_by_osrs_account_id', btp.completed_by_osrs_account_id,
							'completed_by_member_id', btp.completed_by_member_id,
							'recorded_at', btp.recorded_at
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
			GROUP BY bbt.id, bt.task, bt.category, bt.difficulty, bt.icon, bt.description, bt.base_points, bt.bonus_tiers, bt.requirements
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

		// Separate row and column effects
		const rowEffects = lineEffects.filter((e: any) => e.line_type === 'row');
		const columnEffects = lineEffects.filter((e: any) => e.line_type === 'column');

		const response: BoardResponse = {
			...board,
			tiles: tiles as BoardTile[],
			tile_effects: tileEffects as TileEffect[],
			row_effects: rowEffects as LineEffect[],
			column_effects: columnEffects as LineEffect[]
		};

		res.json({
			success: true,
			data: response
		});
	} catch (error: any) {
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
 * Body: { name, description, columns, rows, show_row_column_buffs, metadata }
 * 
 * Returns: Updated board
 */
router.patch('/', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId } = req.params;
		const updates = req.body;

		// Validate team exists
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		// Get or create board
		let boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);

		if (boards.length === 0) {
			// Create board if it doesn't exist
			const event = await query('SELECT config FROM events WHERE id = $1', [eventId]);
			const eventConfig = event[0]?.config || {};
			const genericBoard = eventConfig.board || {};

			const newBoard = await query(`
				INSERT INTO bingo_boards (
					event_id, team_id, name, description, columns, rows, show_row_column_buffs, metadata
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				RETURNING id
			`, [
				eventId,
				teamId,
				updates.name || genericBoard.name || 'Team Board',
				updates.description || genericBoard.description || null,
				updates.columns || genericBoard.columns || 7,
				updates.rows || genericBoard.rows || 7,
				updates.show_row_column_buffs !== undefined ? updates.show_row_column_buffs : (genericBoard.show_row_column_buffs || false),
				JSON.stringify(updates.metadata || genericBoard.metadata || {})
			]);
			boards = newBoard;
		}

		const boardId = boards[0].id;

		// Build dynamic update query
		// If updating metadata, ensure show_tile_buffs is preserved or set
		const allowedFields = ['name', 'description', 'columns', 'rows', 'show_row_column_buffs', 'metadata'];
		const updateFields: string[] = [];
		const values: any[] = [];
		let paramIndex = 1;

		for (const [key, value] of Object.entries(updates)) {
			if (allowedFields.includes(key)) {
				updateFields.push(`${key} = $${paramIndex}`);
				if (key === 'metadata') {
					// Ensure show_tile_buffs is included in metadata
					// Ensure value is an object before spreading
					const metadataValue = typeof value === 'object' && value !== null ? value : {};
					const metadataWithSetting = {
						...metadataValue,
						show_tile_buffs: (metadataValue as any).show_tile_buffs !== false
					};
					values.push(JSON.stringify(metadataWithSetting));
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
 * POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles
 * Add a tile to the board
 * Body: { tile_id, position, custom_points, metadata }
 * 
 * Returns: Created board tile
 */
router.post('/tiles', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId } = req.params;
		const { tile_id, position, custom_points, metadata = {} } = req.body;

		if (!tile_id || !position) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['tile_id', 'position']
			});
		}

		// Validate team
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		// Get or create board
		let boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);

		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found. Please create the board first.'
			});
		}

		const boardId = boards[0].id;

		// Check if tile exists in library
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
			[boardId, position]
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
		`, [boardId, tile_id, position, custom_points, JSON.stringify(metadata)]);

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
 * PATCH /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId
 * Update a board tile
 * Body: { position, custom_points, is_completed, completed_by_team_id, completed_at, metadata }
 * 
 * Returns: Updated board tile
 */
router.patch('/tiles/:tileId', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId, tileId } = req.params;
		const updates = req.body;

		// Validate team
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		// Get board
		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		const boardId = boards[0].id;

		// Check if board tile exists
		const existing = await query(
			'SELECT id, position FROM bingo_board_tiles WHERE board_id = $1 AND id = $2',
			[boardId, tileId]
		);
		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board tile not found'
			});
		}

		// If updating position, check if new position is available
		if (updates.position && updates.position !== existing[0].position) {
			const posCheck = await query(
				'SELECT id FROM bingo_board_tiles WHERE board_id = $1 AND position = $2 AND id != $3',
				[boardId, updates.position, tileId]
			);
			if (posCheck.length > 0) {
				return res.status(409).json({
					success: false,
					error: 'Position already occupied'
				});
			}
		}

		// Build dynamic update query
		const allowedFields = ['position', 'custom_points', 'is_completed', 'completed_by_team_id', 'completed_at', 'metadata'];
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

/**
 * DELETE /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId
 * Remove a tile from the board
 * 
 * Returns: Deleted tile ID
 */
router.delete('/tiles/:tileId', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId, tileId } = req.params;

		// Validate team
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		// Get board
		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		const boardId = boards[0].id;

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
 * POST /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs
 * Apply a buff/debuff to a specific tile
 * Body: { board_tile_id, buff_debuff_id, applied_by, expires_at, metadata }
 * 
 * Returns: Created tile effect
 */
router.post('/tile-buffs', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId } = req.params;
		const { board_tile_id, buff_debuff_id, applied_by, expires_at, metadata = {} } = req.body;

		if (!board_tile_id || !buff_debuff_id) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['board_tile_id', 'buff_debuff_id']
			});
		}

		// Validate team and board
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		// Check if board tile belongs to this board
		const tileCheck = await query(
			'SELECT id FROM bingo_board_tiles WHERE id = $1 AND board_id = $2',
			[board_tile_id, boards[0].id]
		);
		if (tileCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board tile not found or does not belong to this board'
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

		// Check if already applied
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
 * PATCH /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs/:effectId
 * Update a tile effect
 * Body: { is_active, expires_at, metadata }
 * 
 * Returns: Updated tile effect
 */
router.patch('/tile-buffs/:effectId', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId, effectId } = req.params;
		const updates = req.body;

		// Validate team and board
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
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
 * DELETE /api/admin/clan-events/:eventId/teams/:teamId/board/tile-buffs/:effectId
 * Remove a buff/debuff from a tile
 * 
 * Returns: Deleted effect ID
 */
router.delete('/tile-buffs/:effectId', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId, effectId } = req.params;

		// Validate team and board
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
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
 * POST /api/admin/clan-events/:eventId/teams/:teamId/board/line-buffs
 * Apply a buff/debuff to a row or column
 * Body: { line_type ('row' or 'column'), line_identifier (row number or column letter), buff_debuff_id, applied_by, expires_at, metadata }
 * 
 * Returns: Created line effect
 */
router.post('/line-buffs', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId } = req.params;
		const {
			line_type,
			line_identifier,
			buff_debuff_id,
			applied_by,
			expires_at,
			metadata = {}
		} = req.body;

		if (!line_type || !line_identifier || !buff_debuff_id) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				required: ['line_type', 'line_identifier', 'buff_debuff_id']
			});
		}

		if (!['row', 'column'].includes(line_type)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid line_type',
				valid_types: ['row', 'column']
			});
		}

		// Validate team and board
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		const boards = await query(
			'SELECT id, columns, rows FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		const board = boards[0];

		// Validate line_identifier
		if (line_type === 'row') {
			const rowNum = parseInt(line_identifier);
			if (isNaN(rowNum) || rowNum < 1 || rowNum > board.rows) {
				return res.status(400).json({
					success: false,
					error: 'Invalid row number',
					message: `Row must be between 1 and ${board.rows}`
				});
			}
		} else {
			const columnIndex = line_identifier.toUpperCase().charCodeAt(0) - 65;
			if (columnIndex < 0 || columnIndex >= board.columns) {
				return res.status(400).json({
					success: false,
					error: 'Invalid column letter',
					message: `Column must be between A and ${String.fromCharCode(65 + board.columns - 1)}`
				});
			}
		}

		// Check if buff/debuff exists
		const buffCheck = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [buff_debuff_id]);
		if (buffCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Buff/debuff not found'
			});
		}

		// Check if already applied
		const existing = await query(
			'SELECT id FROM bingo_board_line_effects WHERE board_id = $1 AND line_type = $2 AND line_identifier = $3 AND buff_debuff_id = $4',
			[board.id, line_type, line_type === 'column' ? line_identifier.toUpperCase() : line_identifier, buff_debuff_id]
		);
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
			line_type,
			line_type === 'column' ? line_identifier.toUpperCase() : line_identifier,
			buff_debuff_id,
			applied_by,
			expires_at,
			JSON.stringify(metadata)
		]);

		res.status(201).json({
			success: true,
			data: result[0],
			message: 'Effect applied to line successfully'
		});
	} catch (error: any) {
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
router.patch('/line-buffs/:effectId', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId, effectId } = req.params;
		const updates = req.body;

		// Validate team and board
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		// Check if effect exists and belongs to this board
		const existing = await query(
			'SELECT id FROM bingo_board_line_effects WHERE id = $1 AND board_id = $2',
			[effectId, boards[0].id]
		);

		if (existing.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Line effect not found or does not belong to this board'
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
	} catch (error: any) {
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
router.delete('/line-buffs/:effectId', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId, effectId } = req.params;

		// Validate team and board
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		// Check if effect exists and belongs to this board
		const existing = await query(
			'SELECT id FROM bingo_board_line_effects WHERE id = $1 AND board_id = $2',
			[effectId, boards[0].id]
		);

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
			deleted_id: result[0].id
		});
	} catch (error: any) {
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
router.post('/tiles/:tileId/complete', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId, tileId } = req.params;
		const { completion_type = 'manual_admin', completed_by_osrs_account_id, notes } = req.body;

		// Validate team and board
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		const boardId = boards[0].id;

		// Check if tile exists on this board
		const tileCheck = await query(
			'SELECT id, is_completed FROM bingo_board_tiles WHERE id = $1 AND board_id = $2',
			[tileId, boardId]
		);
		if (tileCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Tile not found on this board'
			});
		}

		if (tileCheck[0].is_completed) {
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
				completed_at = CURRENT_TIMESTAMP,
				completed_by_team_id = $1
			WHERE id = $2
		`, [teamId, tileId]);

		// Create or update progress entry
		// Check for ANY existing progress for this board_tile_id (regardless of osrs_account_id)
		// to prevent duplicates - we should only have one progress entry per board_tile_id
		const existingProgress = await query(
			'SELECT id, osrs_account_id FROM bingo_tile_progress WHERE board_tile_id = $1 LIMIT 1',
			[tileId]
		);

		if (existingProgress.length > 0) {
			// Update existing progress entry
			await query(`
				UPDATE bingo_tile_progress
				SET 
					completion_type = $1,
					completed_at = CURRENT_TIMESTAMP,
					completed_by_osrs_account_id = $2,
					progress_metadata = COALESCE(progress_metadata, '{}'::jsonb) || $3::jsonb,
					updated_at = CURRENT_TIMESTAMP
				WHERE id = $4
			`, [
				completion_type,
				completed_by_osrs_account_id || null,
				JSON.stringify({ manual_completion: true, notes: notes || null }),
				existingProgress[0].id
			]);
		} else {
			// Insert new progress entry only if none exists
			await query(`
				INSERT INTO bingo_tile_progress (
					board_tile_id, osrs_account_id, progress_value, progress_metadata,
					completion_type, completed_at, completed_by_osrs_account_id
				)
				VALUES ($1, $2, 1, $3, $4, CURRENT_TIMESTAMP, $5)
			`, [
				tileId,
				completed_by_osrs_account_id || null,
				JSON.stringify({ manual_completion: true, notes: notes || null }),
				completion_type,
				completed_by_osrs_account_id || null
			]);
		}

		// Get updated tile with team/event info for notification
		const updatedTile = await query(`
			SELECT 
				bbt.*,
				bt.task, bt.category, bt.difficulty, bt.icon, bt.description,
				bt.base_points, bt.bonus_tiers, bt.requirements,
				et.id as team_id, et.name as team_name,
				e.name as event_name
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			JOIN event_teams et ON bb.team_id = et.id
			JOIN events e ON bb.event_id = e.id
			WHERE bbt.id = $1
		`, [tileId]);

		// Send Discord notification for manual completion
		if (updatedTile.length > 0) {
			try {
				const tile = updatedTile[0]
				const progressData = existingProgress.length > 0 
					? await query('SELECT progress_value, progress_metadata FROM bingo_tile_progress WHERE id = $1', [existingProgress[0].id])
					: null
				
				let playerName = 'Admin'
				if (completed_by_osrs_account_id) {
					const accounts = await query('SELECT osrs_nickname FROM osrs_accounts WHERE id = $1 LIMIT 1', [completed_by_osrs_account_id])
					if (accounts.length > 0) {
						playerName = accounts[0].osrs_nickname || 'Admin'
					}
				}

				const { sendTileProgressNotification } = await import('../../../../../modules/events/bingo/discord-notifications.service.js')
				await sendTileProgressNotification({
					teamId: tile.team_id,
					teamName: tile.team_name,
					eventName: tile.event_name,
					tileId: tile.tile_id,
					tileTask: tile.task,
					tilePosition: tile.position,
					playerName,
					progressValue: progressData?.[0]?.progress_value || 1,
					progressMetadata: progressData?.[0]?.progress_metadata || { manual_completion: true, notes: notes || null },
					isCompleted: true,
					completionType: 'manual_admin',
					completedTiers: progressData?.[0]?.progress_metadata?.completed_tiers,
					totalTiers: progressData?.[0]?.progress_metadata?.total_tiers
				})
			} catch (error) {
				console.error('[BoardRoutes] Error sending Discord notification:', error)
				// Don't fail the request if notification fails
			}
		}

		res.json({
			success: true,
			data: updatedTile[0],
			message: 'Tile marked as completed successfully'
		});
	} catch (error: any) {
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
router.post('/tiles/:tileId/revert', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId, tileId } = req.params;

		// Validate team and board
		const teamCheck = await query(
			'SELECT id FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Board not found'
			});
		}

		const boardId = boards[0].id;

		// Check if tile exists and is completed
		const tileCheck = await query(
			'SELECT id, is_completed FROM bingo_board_tiles WHERE id = $1 AND board_id = $2',
			[tileId, boardId]
		);
		if (tileCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Tile not found on this board'
			});
		}

		if (!tileCheck[0].is_completed) {
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
				completed_at = NULL,
				completed_by_team_id = NULL
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

		// Get updated tile
		const updatedTile = await query(`
			SELECT 
				bbt.*,
				bt.task, bt.category, bt.difficulty, bt.icon, bt.description,
				bt.base_points, bt.bonus_tiers, bt.requirements
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			WHERE bbt.id = $1
		`, [tileId]);

		res.json({
			success: true,
			data: updatedTile[0],
			message: 'Tile reverted successfully'
		});
	} catch (error: any) {
		console.error('Error reverting tile:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to revert tile',
			message: error.message
		});
	}
});

export default router;

