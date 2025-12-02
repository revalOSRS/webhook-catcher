/**
 * Public Bingo Event Routes
 * 
 * Fully public endpoints for viewing bingo event state without authentication.
 * Designed for landing pages and spectator views.
 */

import { Router, Response, Request } from 'express';
import { query } from '../../../db/connection.js';

const router = Router();

/**
 * Public team member data
 */
interface PublicTeamMember {
	osrsName: string;
}

/**
 * Public team data for spectator view
 */
interface PublicTeam {
	id: string;
	name: string;
	color: string | null;
	icon: string | null;
	score: number;
	memberCount: number;
	completedTiles: number;
	members: PublicTeamMember[];
	board: PublicBoard | null;
}

/**
 * Public line effect data (for rows/columns)
 */
interface PublicLineEffect {
	lineType: 'row' | 'column';
	lineIdentifier: string;
	name: string;
	description: string | null;
	icon: string | null;
	type: 'buff' | 'debuff';
	effectType: string;
	effectValue: number | null;
}

/**
 * Public board data
 */
interface PublicBoard {
	id: string;
	rows: number;
	columns: number;
	tiles: PublicBoardTile[];
	rowEffects: PublicLineEffect[];
	columnEffects: PublicLineEffect[];
}

/**
 * Public tile data (simplified for spectators)
 */
interface PublicBoardTile {
	id: string;
	position: string;
	isCompleted: boolean;
	completedAt: string | null;
	task: string;
	category: string;
	difficulty: string;
	icon: string | null;
	points: number;
	progress: PublicTileProgress | null;
	effects: PublicEffect[];
	/** If true, this is a puzzle tile with hidden requirements */
	isPuzzle?: boolean;
	/** Puzzle display info (only present for puzzle tiles) */
	puzzle?: {
		displayName: string;
		displayDescription: string;
		displayHint?: string;
		displayIcon?: string;
		puzzleCategory?: string;
		/** Whether the puzzle has been solved */
		isSolved: boolean;
		/** Whether to reveal the answer (only after completion if configured) */
		revealAnswer?: boolean;
	};
}

/**
 * Public progress data (simplified)
 */
interface PublicTileProgress {
	progressValue: number;
	targetValue: number | null;
	completedTiers: number[];
	currentTier: number | null;
}

/**
 * Public effect data
 */
interface PublicEffect {
	name: string;
	description: string | null;
	icon: string | null;
	type: 'buff' | 'debuff';
	effectType: string;
	effectValue: number | null;
}

/**
 * GET /api/public/bingo/:eventId
 * Get public bingo event data for spectator/landing page view
 * 
 * Returns event info, all teams with scores, and board state for each team.
 * No authentication required.
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

		// Get all team members with their OSRS account names
		const allMembers = await query(`
			SELECT 
				etm.team_id,
				oa.osrs_nickname
			FROM event_team_members etm
			JOIN event_teams et ON etm.team_id = et.id
			LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
			WHERE et.event_id = $1
			ORDER BY oa.osrs_nickname
		`, [eventId]);

		// Group members by team
		const membersByTeam: Record<string, PublicTeamMember[]> = {};
		for (const member of allMembers) {
			if (!membersByTeam[member.teamId]) {
				membersByTeam[member.teamId] = [];
			}
			if (member.osrsNickname) {
				membersByTeam[member.teamId].push({
					osrsName: member.osrsNickname
				});
			}
		}

		// Get all boards and tiles for all teams in one query
		// Include requirements to detect puzzle tiles and sanitize them
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

		// Group boards and tiles by team
		const boardsByTeam: Record<string, { 
			boardId: string; 
			rows: number; 
			columns: number; 
			tiles: any[] 
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

			// Extract progress info
			let progress: PublicTileProgress | null = null;
			if (row.progressValue !== null || row.progressMetadata) {
				const metadata = row.progressMetadata || {};
				progress = {
					progressValue: parseFloat(row.progressValue) || 0,
					targetValue: metadata.targetValue ?? null,
					completedTiers: (metadata.completedTiers || []).map((t: any) => t.tier),
					currentTier: metadata.currentTier ?? null
				};
			}

			// Check if this is a puzzle tile and sanitize accordingly
			const requirements = row.requirements || {};
			const baseRequirements = requirements.requirements || [];
			const puzzleReq = baseRequirements.find((r: any) => r.type === 'PUZZLE');
			
			// Build the base tile data
			const tileData: any = {
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
				effects: effectsByTile[row.tileId] || []
			};

			// If this is a puzzle tile, add puzzle info and sanitize
			if (puzzleReq) {
				const progressMetadata = row.progressMetadata || {};
				const isSolved = progressMetadata.isSolved || row.isCompleted;
				
				tileData.isPuzzle = true;
				tileData.puzzle = {
					displayName: puzzleReq.displayName,
					displayDescription: puzzleReq.displayDescription,
					displayHint: puzzleReq.displayHint,
					displayIcon: puzzleReq.displayIcon,
					puzzleCategory: puzzleReq.puzzleCategory,
					isSolved,
					// Only reveal answer if configured and puzzle is solved
					revealAnswer: puzzleReq.revealOnComplete && isSolved
				};
				
				// Override task with puzzle display name for public view
				tileData.task = puzzleReq.displayName;
				
				// Override icon if puzzle has custom icon
				if (puzzleReq.displayIcon) {
					tileData.icon = puzzleReq.displayIcon;
				}
			}

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
					tiles: boardData.tiles,
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

		// Build response
		const response = {
			event: {
				id: event.id,
				name: event.name,
				description: event.description,
				eventType: event.eventType,
				status: event.status,
				startDate: event.startDate,
				endDate: event.endDate,
				config: event.config
			},
			teams: publicTeams,
			summary: {
				totalTeams: publicTeams.length,
				totalCompletedTiles: publicTeams.reduce((sum, t) => sum + t.completedTiles, 0)
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

