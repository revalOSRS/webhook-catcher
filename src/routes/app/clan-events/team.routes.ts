import { Router, Response } from 'express';
import { query } from '../../../db/connection.js';
import { getMemberFromHeaders, getEventParticipation } from './types.js';

const router = Router({ mergeParams: true });

/** Params type for routes that receive eventId from parent router */
type EventParams = { eventId: string };

/**
 * GET /api/app/clan-events/events/:eventId/team/progress
 * Get team progress summary
 */
router.get('/progress', async (req, res: Response) => {
	try {
		const { eventId } = req.params as EventParams;
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		const participation = await getEventParticipation(member.id, eventId);

		if (!participation) {
			return res.status(403).json({
				success: false,
				error: 'You are not participating in this event'
			});
		}

		// Get team progress stats
		const stats = await query(`
			SELECT 
				COUNT(DISTINCT bbt.id) as total_tiles,
				COUNT(DISTINCT bbt.id) FILTER (WHERE bbt.is_completed = true) as completed_tiles,
				SUM(et.score) as team_score
			FROM bingo_boards bb
			JOIN bingo_board_tiles bbt ON bb.id = bbt.board_id
			JOIN event_teams et ON bb.team_id = et.id
			WHERE bb.team_id = $1 AND bb.event_id = $2
		`, [participation.teamId, eventId]);

		// Note: query() auto-converts snake_case to camelCase
		const progress = stats[0] || { totalTiles: 0, completedTiles: 0, teamScore: 0 };
		const completionPercentage = progress.totalTiles > 0
			? (parseInt(progress.completedTiles) / parseInt(progress.totalTiles)) * 100
			: 0;

		res.json({
			success: true,
			data: {
				totalTiles: parseInt(progress.totalTiles),
				completedTiles: parseInt(progress.completedTiles),
				completionPercentage: Math.round(completionPercentage * 100) / 100,
				teamScore: parseInt(progress.teamScore) || 0
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
 * GET /api/app/clan-events/events/:eventId/team/leaderboard
 * Get team member leaderboard (members ranked by individual score)
 */
router.get('/leaderboard', async (req, res: Response) => {
	try {
		const { eventId } = req.params as EventParams;
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		const participation = await getEventParticipation(member.id, eventId);

		if (!participation) {
			return res.status(403).json({
				success: false,
				error: 'You are not participating in this event'
			});
		}

		// Get team member leaderboard
		const leaderboard = await query(`
			SELECT 
				etm.id,
				etm.member_id,
				etm.individual_score,
				etm.role,
				m.discord_tag,
				oa.osrs_nickname as osrs_account_name,
				COUNT(DISTINCT btp.board_tile_id) FILTER (WHERE btp.completed_at IS NOT NULL) as tiles_completed,
				COALESCE(SUM(btp.progress_value), 0) as total_progress
			FROM event_team_members etm
			JOIN members m ON etm.member_id = m.id
			LEFT JOIN osrs_accounts oa ON etm.osrs_account_id = oa.id
			LEFT JOIN bingo_tile_progress btp ON btp.completed_by_osrs_account_id = oa.id
			WHERE etm.team_id = $1
			GROUP BY etm.id, m.discord_tag, oa.osrs_nickname
			ORDER BY etm.individual_score DESC, total_progress DESC
		`, [participation.teamId]);

		res.json({
			success: true,
			data: {
				team: {
					id: participation.teamId,
					name: participation.teamName,
					score: participation.score
				},
				myMemberId: member.id,
				// Note: query() auto-converts snake_case to camelCase
				leaderboard: leaderboard.map((m: any, index: number) => ({
					rank: index + 1,
					id: m.id,
					memberId: m.memberId,
					discordTag: m.discordTag,
					osrsAccountName: m.osrsAccountName,
					role: m.role,
					individualScore: m.individualScore,
					tilesCompleted: parseInt(m.tilesCompleted),
					totalProgress: parseFloat(m.totalProgress),
					isMe: m.memberId === member.id
				}))
			}
		});
	} catch (error: any) {
		console.error('Error fetching team leaderboard:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch team leaderboard',
			message: error.message
		});
	}
});

/**
 * GET /api/app/clan-events/events/:eventId/team/activity
 * Get recent team activity (tile completions, progress updates)
 */
router.get('/activity', async (req, res: Response) => {
	try {
		const { eventId } = req.params as EventParams;
		const { limit = '20' } = req.query;
		const member = await getMemberFromHeaders(req);

		if (!member) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required'
			});
		}

		const participation = await getEventParticipation(member.id, eventId);

		if (!participation) {
			return res.status(403).json({
				success: false,
				error: 'You are not participating in this event'
			});
		}

		// Get recent activity
		const activity = await query(`
			SELECT 
				btp.id,
				btp.board_tile_id,
				btp.progress_value,
				btp.progress_metadata,
				btp.completion_type,
				btp.completed_at,
				btp.updated_at,
				bbt.position,
				bt.task,
				bt.category,
				bt.icon,
				oa.osrs_nickname as player_name
			FROM bingo_tile_progress btp
			JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			LEFT JOIN osrs_accounts oa ON btp.completed_by_osrs_account_id = oa.id
			WHERE bb.team_id = $1 AND bb.event_id = $2
			ORDER BY COALESCE(btp.completed_at, btp.updated_at) DESC
			LIMIT $3
		`, [participation.teamId, eventId, parseInt(limit as string)]);

		// Note: query() auto-converts snake_case to camelCase
		res.json({
			success: true,
			data: activity.map((a: any) => ({
				id: a.id,
				boardTileId: a.boardTileId,
				position: a.position,
				task: a.task,
				category: a.category,
				icon: a.icon,
				progressValue: a.progressValue,
				progressMetadata: a.progressMetadata,
				completionType: a.completionType,
				completedAt: a.completedAt,
				updatedAt: a.updatedAt,
				playerName: a.playerName,
				type: a.completedAt ? 'completion' : 'progress'
			}))
		});
	} catch (error: any) {
		console.error('Error fetching team activity:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch team activity',
			message: error.message
		});
	}
});

export default router;
