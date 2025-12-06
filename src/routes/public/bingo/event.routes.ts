/**
 * Public Bingo Event Route
 * 
 * GET /api/public/bingo/:eventId
 * 
 * Returns public event data for spectator/landing page view.
 * No authentication required.
 */

import { Router, Response, Request } from 'express';
import { query } from '../../../db/connection.js';
import { sanitizeRequirements, shouldShowTiles } from './helpers.js';
import type {
	PublicTeam,
	PublicTeamMember,
	PublicBoard,
	PublicBoardTile,
	PublicTileProgress,
	PublicEffect,
	PublicLineEffect
} from './types.js';

const router = Router();

/**
 * GET /:eventId
 * Get public bingo event data for spectator/landing page view
 * 
 * Returns event info, all teams with scores, and board state for each team.
 * No authentication required.
 * 
 * Note: Tiles are hidden if more than 3 hours before event start.
 * Only row/column effects are visible during this time.
 */
router.get('/:eventId', async (req: Request, res: Response) => {
	try {
		const { eventId } = req.params;

		// Get event details
		const events = await query(`
			SELECT 
				id, name, description, event_type, status,
				start_date, end_date, config, created_at
			FROM events 
			WHERE id = $1
		`, [eventId]);

		if (events.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		const event = events[0];

		// Only allow viewing bingo events
		if (event.eventType !== 'bingo') {
			return res.status(400).json({
				success: false,
				error: 'This endpoint only supports bingo events'
			});
		}

		// Get all teams for this event with member counts and completed tile counts
		const teams = await query(`
			SELECT 
				et.id,
				et.name,
				et.color,
				et.icon,
				et.score,
				COUNT(DISTINCT etm.id) as member_count,
				COALESCE(
					(SELECT COUNT(*) FROM bingo_board_tiles bbt
					 JOIN bingo_boards bb ON bbt.board_id = bb.id
					 WHERE bb.team_id = et.id AND bbt.is_completed = true),
					0
				) as completed_tiles
			FROM event_teams et
			LEFT JOIN event_team_members etm ON et.id = etm.team_id
			WHERE et.event_id = $1
			GROUP BY et.id, et.name, et.color, et.icon, et.score
			ORDER BY et.score DESC, et.name ASC
		`, [eventId]);

		// Get all team members with their OSRS account names and roles
		const allMembers = await query(`
			SELECT 
				etm.team_id,
				etm.role,
				oa.osrs_nickname
			FROM event_team_members etm
			JOIN event_teams et ON etm.team_id = et.id
			LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
			WHERE et.event_id = $1
			ORDER BY 
				CASE WHEN etm.role = 'captain' THEN 0 ELSE 1 END,
				oa.osrs_nickname
		`, [eventId]);

		// Group members by team
		const membersByTeam: Record<string, PublicTeamMember[]> = {};
		for (const member of allMembers) {
			if (!membersByTeam[member.teamId]) {
				membersByTeam[member.teamId] = [];
			}
			if (member.osrsNickname) {
				membersByTeam[member.teamId].push({
					osrsName: member.osrsNickname,
					role: member.role || 'member'
				});
			}
		}

		// Get all boards and tiles for all teams in one query
		const allBoards = await query(`
			SELECT 
				bb.id as board_id,
				bb.team_id,
				bb.rows,
				bb.columns,
				bbt.id as tile_id,
				bbt.position,
				bbt.is_completed,
				bbt.completed_at,
				bt.task,
				bt.category,
				bt.difficulty,
				bt.icon,
				bt.points,
				bt.requirements,
				btp.progress_value,
				btp.progress_metadata
			FROM bingo_boards bb
			JOIN bingo_board_tiles bbt ON bb.id = bbt.board_id
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			LEFT JOIN bingo_tile_progress btp ON btp.board_tile_id = bbt.id
			WHERE bb.event_id = $1
			ORDER BY bb.team_id, bbt.position
		`, [eventId]);

		// Get all active tile effects for this event
		const allTileEffects = await query(`
			SELECT 
				bbte.board_tile_id,
				bbd.name,
				bbd.description,
				bbd.icon,
				bbd.type,
				bbd.effect_type,
				bbd.effect_value
			FROM bingo_board_tile_effects bbte
			JOIN bingo_buffs_debuffs bbd ON bbte.buff_debuff_id = bbd.id
			JOIN bingo_board_tiles bbt ON bbte.board_tile_id = bbt.id
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			WHERE bb.event_id = $1 AND bbte.is_active = true
			ORDER BY bbte.applied_at DESC
		`, [eventId]);

		// Group effects by tile
		const effectsByTile: Record<string, PublicEffect[]> = {};
		for (const effect of allTileEffects) {
			if (!effectsByTile[effect.boardTileId]) {
				effectsByTile[effect.boardTileId] = [];
			}
			effectsByTile[effect.boardTileId].push({
				name: effect.name,
				description: effect.description,
				icon: effect.icon,
				type: effect.type,
				effectType: effect.effectType,
				effectValue: effect.effectValue ? parseFloat(effect.effectValue) : null
			});
		}

		// Get all active line effects (rows and columns) for this event
		const allLineEffects = await query(`
			SELECT 
				bble.board_id,
				bble.line_type,
				bble.line_identifier,
				bbd.name,
				bbd.description,
				bbd.icon,
				bbd.type,
				bbd.effect_type,
				bbd.effect_value
			FROM bingo_board_line_effects bble
			JOIN bingo_buffs_debuffs bbd ON bble.buff_debuff_id = bbd.id
			JOIN bingo_boards bb ON bble.board_id = bb.id
			WHERE bb.event_id = $1 AND bble.is_active = true
			ORDER BY bble.line_type, bble.line_identifier
		`, [eventId]);

		// Group line effects by board
		const lineEffectsByBoard: Record<string, { row: PublicLineEffect[]; column: PublicLineEffect[] }> = {};
		for (const effect of allLineEffects) {
			if (!lineEffectsByBoard[effect.boardId]) {
				lineEffectsByBoard[effect.boardId] = { row: [], column: [] };
			}
			const lineEffect: PublicLineEffect = {
				lineType: effect.lineType,
				lineIdentifier: effect.lineIdentifier,
				name: effect.name,
				description: effect.description,
				icon: effect.icon,
				type: effect.type,
				effectType: effect.effectType,
				effectValue: effect.effectValue ? parseFloat(effect.effectValue) : null
			};
			if (effect.lineType === 'row') {
				lineEffectsByBoard[effect.boardId].row.push(lineEffect);
			} else {
				lineEffectsByBoard[effect.boardId].column.push(lineEffect);
			}
		}

		// Check if tiles should be visible based on event start time
		const tileVisibility = shouldShowTiles(
			event.startDate ? new Date(event.startDate) : null
		);

		// Group boards and tiles by team
		const boardsByTeam: Record<string, { 
			boardId: string; 
			rows: number; 
			columns: number; 
			tiles: PublicBoardTile[] 
		}> = {};

		for (const row of allBoards) {
			const teamId = row.teamId;
			
			if (!boardsByTeam[teamId]) {
				boardsByTeam[teamId] = {
					boardId: row.boardId,
					rows: row.rows,
					columns: row.columns,
					tiles: []
				};
			}

			// Only build tile data if tiles should be visible
			if (!tileVisibility.show) {
				continue;
			}

			// Extract progress info
			let progress: PublicTileProgress | null = null;
			if (row.progressValue !== null || row.progressMetadata) {
				const metadata = row.progressMetadata || {};
				// Get first requirement's progress metadata for tier/target info
				const firstReqMeta = metadata.requirementProgress?.["0"]?.progressMetadata;
				
				progress = {
					progressValue: parseFloat(row.progressValue) || 0,
					// Extract from nested requirement metadata
					targetValue: firstReqMeta?.targetValue ?? null,
					completedTiers: (firstReqMeta?.completedTiers || []).map((t: any) => t.tier),
					currentTier: firstReqMeta?.currentTier ?? null,
					// Multi-requirement tracking (for matchType: "all")
					completedRequirementIndices: metadata.completedRequirementIndices ?? [],
					totalRequirements: metadata.totalRequirements ?? null,
					requirementProgress: metadata.requirementProgress ?? null
				};
			}

			// Sanitize requirements (removes hiddenRequirement from PUZZLE types)
			const sanitizedRequirements = sanitizeRequirements(row.requirements);
			
			// Build the tile data - pass through all data, just like the app endpoint
			const tileData: PublicBoardTile = {
				id: row.tileId,
				position: row.position,
				isCompleted: row.isCompleted,
				completedAt: row.completedAt,
				task: row.task,
				category: row.category,
				difficulty: row.difficulty,
				icon: row.icon,
				points: row.points,
				progress,
				effects: effectsByTile[row.tileId] || [],
				requirements: sanitizedRequirements
			};

			boardsByTeam[teamId].tiles.push(tileData);
		}

		// Build public teams response
		const publicTeams: PublicTeam[] = teams.map((team: any) => {
			const boardData = boardsByTeam[team.id];
			
			let board: PublicBoard | null = null;
			if (boardData) {
				const boardLineEffects = lineEffectsByBoard[boardData.boardId] || { row: [], column: [] };
				board = {
					id: boardData.boardId,
					rows: boardData.rows,
					columns: boardData.columns,
					tiles: tileVisibility.show ? boardData.tiles : null,
					tilesHidden: !tileVisibility.show,
					tilesHiddenMessage: tileVisibility.message,
					tilesRevealAt: tileVisibility.revealAt?.toISOString(),
					rowEffects: boardLineEffects.row,
					columnEffects: boardLineEffects.column
				};
			}

			return {
				id: team.id,
				name: team.name,
				color: team.color,
				icon: team.icon,
				score: team.score,
				memberCount: parseInt(team.memberCount),
				completedTiles: parseInt(team.completedTiles),
				members: membersByTeam[team.id] || [],
				board
			};
		});

		// Build response - format all dates with Estonian timezone
		const response = {
			event: {
				id: event.id,
				name: event.name,
				description: event.description,
				eventType: event.eventType,
				status: event.status,
				startDate: event.startDate,
				endDate: event.endDate
			},
			teams: publicTeams,
			summary: {
				totalTeams: publicTeams.length,
				totalCompletedTiles: publicTeams.reduce((sum, t) => sum + t.completedTiles, 0)
			},
			visibility: {
				tilesVisible: tileVisibility.show,
				tilesRevealAt: tileVisibility.revealAt?.toISOString(),
				message: tileVisibility.message
			}
		};

		res.json({
			success: true,
			data: response
		});
	} catch (error: any) {
		console.error('Error fetching public bingo event:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch event data',
			message: error.message
		});
	}
});

export default router;

