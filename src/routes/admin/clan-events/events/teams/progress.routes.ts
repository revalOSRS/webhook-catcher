/**
 * Team Progress Routes
 * Admin endpoints for viewing team progress aggregation
 * 
 * Routes:
 * - GET /api/admin/clan-events/events/:eventId/teams/:teamId/progress - Get team progress summary
 * - GET /api/admin/clan-events/events/:eventId/teams/:teamId/progress/tiles - Get detailed tile progress for team
 * - GET /api/admin/clan-events/events/:eventId/teams/:teamId/progress/members - Get individual member contributions
 */

import { Router, Request, Response } from 'express';
import { query } from '../../../../../db/connection.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/admin/clan-events/events/:eventId/teams/:teamId/progress
 * Get team progress summary
 * 
 * Returns: Summary of team progress including completed tiles, total progress, member contributions
 */
router.get('/', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId } = req.params;

		// Validate team
		const teamCheck = await query(
			'SELECT id, name, score FROM event_teams WHERE id = $1 AND event_id = $2',
			[teamId, eventId]
		);
		if (teamCheck.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Team not found or does not belong to this event'
			});
		}

		// Get board ID
		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.json({
				success: true,
				data: {
					team: teamCheck[0],
					total_tiles: 0,
					completed_tiles: 0,
					completion_percentage: 0,
					total_progress_value: 0,
					member_contributions: []
				}
			});
		}

		const boardId = boards[0].id;

		// Get tile statistics
		const tileStats = await query(`
			SELECT 
				COUNT(*) as total_tiles,
				COUNT(*) FILTER (WHERE is_completed = true) as completed_tiles
			FROM bingo_board_tiles
			WHERE board_id = $1
		`, [boardId]);

		// Get total progress value (sum of all progress)
		const progressStats = await query(`
			SELECT 
				COALESCE(SUM(progress_value), 0) as total_progress_value,
				COUNT(DISTINCT board_tile_id) as tiles_with_progress
			FROM bingo_tile_progress
			WHERE board_tile_id IN (
				SELECT id FROM bingo_board_tiles WHERE board_id = $1
			)
		`, [boardId]);

		// Get member contributions
		const memberContributions = await query(`
			SELECT 
				etm.id as team_member_id,
				m.id as member_id,
				m.discord_username,
				m.discord_name,
				oa.id as osrs_account_id,
				oa.osrs_nickname as osrs_account_name,
				COUNT(DISTINCT btp.board_tile_id) FILTER (WHERE btp.completed_at IS NOT NULL) as tiles_completed,
				COALESCE(SUM(btp.progress_value), 0) as total_progress_contributed
			FROM event_team_members etm
			JOIN members m ON etm.member_id = m.id
			LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
			LEFT JOIN bingo_tile_progress btp ON (
				btp.osrs_account_id = oa.id OR 
				(btp.osrs_account_id IS NULL AND btp.board_tile_id IN (
					SELECT id FROM bingo_board_tiles WHERE board_id = $1
				))
			)
			WHERE etm.team_id = $2
			GROUP BY etm.id, m.id, m.discord_username, m.discord_name, oa.id, oa.osrs_nickname
			ORDER BY tiles_completed DESC, total_progress_contributed DESC
		`, [boardId, teamId]);

		const totalTiles = parseInt(tileStats[0].total_tiles) || 0;
		const completedTiles = parseInt(tileStats[0].completed_tiles) || 0;
		const completionPercentage = totalTiles > 0 ? (completedTiles / totalTiles) * 100 : 0;

		res.json({
			success: true,
			data: {
				team: teamCheck[0],
				total_tiles: totalTiles,
				completed_tiles: completedTiles,
				completion_percentage: Math.round(completionPercentage * 100) / 100,
				total_progress_value: parseFloat(progressStats[0].total_progress_value) || 0,
				tiles_with_progress: parseInt(progressStats[0].tiles_with_progress) || 0,
				member_contributions: memberContributions
			}
		});
	} catch (error: any) {
		console.error('Error fetching team progress:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch team progress',
			message: error.message
		});
	}
});

/**
 * GET /api/admin/clan-events/events/:eventId/teams/:teamId/progress/tiles
 * Get detailed tile progress for team
 * Query params: completed_only (boolean), limit, offset
 * 
 * Returns: Array of tiles with their progress details
 */
router.get('/tiles', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId } = req.params;
		const { completed_only, limit = '50', offset = '0' } = req.query;

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

		// Get board ID
		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.json({
				success: true,
				data: [],
				pagination: {
					limit: parseInt(limit as string),
					offset: parseInt(offset as string)
				}
			});
		}

		const boardId = boards[0].id;

		let sql = `
			SELECT 
				bbt.*,
				bt.task, bt.category, bt.difficulty, bt.icon, bt.description,
				bt.base_points, bt.bonus_tiers, bt.requirements,
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
							'recorded_at', btp.recorded_at
						)
					) FILTER (WHERE btp.id IS NOT NULL),
					'[]'::json
				) as progress_entries
			FROM bingo_board_tiles bbt
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			LEFT JOIN bingo_tile_progress btp ON btp.board_tile_id = bbt.id
			WHERE bbt.board_id = $1
		`;

		const params: any[] = [boardId];
		let paramIndex = 2;

		if (completed_only === 'true') {
			sql += ` AND bbt.is_completed = true`;
		}

		sql += `
			GROUP BY bbt.id, bt.task, bt.category, bt.difficulty, bt.icon, bt.description,
				bt.base_points, bt.bonus_tiers, bt.requirements
			ORDER BY bbt.is_completed DESC, bbt.position ASC
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		params.push(parseInt(limit as string), parseInt(offset as string));

		const tiles = await query(sql, params);

		res.json({
			success: true,
			data: tiles,
			pagination: {
				limit: parseInt(limit as string),
				offset: parseInt(offset as string)
			}
		});
	} catch (error: any) {
		console.error('Error fetching tile progress:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch tile progress',
			message: error.message
		});
	}
});

/**
 * GET /api/admin/clan-events/events/:eventId/teams/:teamId/progress/members
 * Get individual member contributions to team progress
 * 
 * Returns: Array of members with their contribution details
 */
router.get('/members', async (req: Request, res: Response) => {
	try {
		const { eventId, teamId } = req.params;

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

		// Get board ID
		const boards = await query(
			'SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2',
			[eventId, teamId]
		);
		if (boards.length === 0) {
			return res.json({
				success: true,
				data: []
			});
		}

		const boardId = boards[0].id;

		// Get member contributions with detailed breakdown
		const memberContributions = await query(`
			SELECT 
				etm.id as team_member_id,
				etm.role,
				etm.individual_score,
				m.id as member_id,
				m.discord_username,
				m.discord_name,
				m.discord_avatar,
				oa.id as osrs_account_id,
				oa.osrs_nickname as osrs_account_name,
				oa.account_type as osrs_account_type,
				COUNT(DISTINCT btp.board_tile_id) FILTER (WHERE btp.completed_at IS NOT NULL) as tiles_completed,
				COALESCE(SUM(btp.progress_value), 0) as total_progress_contributed,
				COUNT(DISTINCT btp.board_tile_id) as tiles_contributed_to
			FROM event_team_members etm
			JOIN members m ON etm.member_id = m.id
			LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
			LEFT JOIN bingo_tile_progress btp ON (
				btp.osrs_account_id = oa.id AND
				btp.board_tile_id IN (
					SELECT id FROM bingo_board_tiles WHERE board_id = $1
				)
			)
			WHERE etm.team_id = $2
			GROUP BY etm.id, etm.role, etm.individual_score, m.id, m.discord_username, 
				m.discord_name, m.discord_avatar, oa.id, oa.osrs_nickname, oa.account_type
			ORDER BY tiles_completed DESC, total_progress_contributed DESC
		`, [boardId, teamId]);

		res.json({
			success: true,
			data: memberContributions
		});
	} catch (error: any) {
		console.error('Error fetching member contributions:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch member contributions',
			message: error.message
		});
	}
});

export default router;

