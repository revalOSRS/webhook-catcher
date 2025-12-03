import { Router, Response } from 'express';
import { query } from '../../../db/connection.js';
import { getMemberFromHeaders, getEventParticipation } from './types.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/app/clan-events/events/:eventId/leaderboard
 * Get event leaderboard (all teams ranked by score)
 * Any authenticated user can view (not just participants)
 */
router.get('/', async (req, res: Response) => {
	try {
		const { eventId } = req.params as { eventId: string };
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		// Check event exists
		const events = await query(
			'SELECT id, name, status FROM events WHERE id = $1',
			[eventId]
		);

		if (events.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Event not found'
			});
		}

		// Get leaderboard
		const leaderboard = await query(`
			SELECT 
				et.id,
				et.name,
				et.color,
				et.icon,
				et.score,
				COUNT(etm.id) as member_count,
				COUNT(DISTINCT bbt.id) FILTER (WHERE bbt.is_completed = true) as tiles_completed,
				COUNT(DISTINCT bbt.id) as total_tiles
			FROM event_teams et
			LEFT JOIN event_team_members etm ON et.id = etm.team_id
			LEFT JOIN bingo_boards bb ON bb.team_id = et.id AND bb.event_id = et.event_id
			LEFT JOIN bingo_board_tiles bbt ON bb.id = bbt.board_id
			WHERE et.event_id = $1
			GROUP BY et.id
			ORDER BY et.score DESC, tiles_completed DESC
		`, [eventId]);

		// Check if user is participating
		const participation = await getEventParticipation(member.id, eventId);
		const myTeamId = participation?.teamId || null;

		res.json({
			success: true,
			data: {
				event: events[0],
				myTeamId,
				// Note: query() auto-converts snake_case to camelCase
				leaderboard: leaderboard.map((team: any, index: number) => ({
					rank: index + 1,
					id: team.id,
					name: team.name,
					color: team.color,
					icon: team.icon,
					score: team.score,
					memberCount: parseInt(team.memberCount),
					tilesCompleted: parseInt(team.tilesCompleted),
					totalTiles: parseInt(team.totalTiles),
					isMyTeam: team.id === myTeamId
				}))
			}
		});
	} catch (error: any) {
		console.error('Error fetching event leaderboard:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch event leaderboard',
			message: error.message
		});
	}
});

export default router;
