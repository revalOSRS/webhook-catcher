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
 * Public board data
 */
interface PublicBoard {
	id: string;
	rows: number;
	columns: number;
	tiles: PublicBoardTile[];
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

			boardsByTeam[teamId].tiles.push({
				id: row.tileId,
				position: row.position,
				isCompleted: row.isCompleted,
				completedAt: row.completedAt,
				task: row.task,
				category: row.category,
				difficulty: row.difficulty,
				icon: row.icon,
				points: row.points,
				progress
			});
		}

		// Build public teams response
		const publicTeams: PublicTeam[] = teams.map((team: any) => {
			const boardData = boardsByTeam[team.id];
			
			let board: PublicBoard | null = null;
			if (boardData) {
				board = {
					id: boardData.boardId,
					rows: boardData.rows,
					columns: boardData.columns,
					tiles: boardData.tiles
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

