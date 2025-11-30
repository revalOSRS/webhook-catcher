import { Router, Response } from 'express';
import { query } from '../../../db/connection.js';
import { getMemberFromHeaders, getEventParticipation } from './types.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/app/clan-events/events/:eventId/my-contributions
 * Get user's individual contributions to tiles
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

		const participation = await getEventParticipation(member.id, eventId);

		if (!participation) {
			return res.status(403).json({
				success: false,
				error: 'You are not participating in this event'
			});
		}

		// Get user's OSRS accounts
		const osrsAccounts = await query(
			'SELECT id FROM osrs_accounts WHERE discord_id = $1',
			[member.discord_id]
		);
		const osrsAccountIds = osrsAccounts.map((acc: any) => acc.id);

		if (osrsAccountIds.length === 0) {
			return res.json({
				success: true,
				data: []
			});
		}

		// Get tiles user has contributed to
		const contributions = await query(`
			SELECT 
				bbt.id as board_tile_id,
				bbt.position,
				bt.task,
				bt.category,
				bt.icon,
				btp.progress_value,
				btp.progress_metadata,
				btp.completion_type,
				btp.completed_at,
				btp.recorded_at
			FROM bingo_tile_progress btp
			JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			WHERE bb.event_id = $1
				AND bb.team_id = $2
				AND btp.osrs_account_id = ANY($3::int[])
			ORDER BY btp.recorded_at DESC
		`, [eventId, participation.team_id, osrsAccountIds]);

		res.json({
			success: true,
			data: contributions
		});
	} catch (error: any) {
		console.error('Error fetching user contributions:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch user contributions',
			message: error.message
		});
	}
});

export default router;

