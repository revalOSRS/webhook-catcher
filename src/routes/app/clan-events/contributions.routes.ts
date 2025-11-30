import { Router, Response } from 'express';
import { query } from '../../../db/connection.js';
import { getMemberFromHeaders, getEventParticipation } from './types.js';

const router = Router({ mergeParams: true });

/**
 * Extract player contribution from progressMetadata
 * Returns the contribution for the specified osrsAccountId or null if not found
 */
const extractPlayerContribution = (
	progressMetadata: any,
	osrsAccountIds: number[]
): any | null => {
	if (!progressMetadata?.playerContributions) return null;

	const contributions = progressMetadata.playerContributions as any[];
	return contributions.find((c: any) => osrsAccountIds.includes(c.osrsAccountId)) || null;
};

/**
 * GET /api/app/clan-events/events/:eventId/my-contributions
 * Get user's individual contributions to tiles
 * 
 * Extracts the user's contribution from the progressMetadata.playerContributions array
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
			[member.discordId]
		);
		const osrsAccountIds = osrsAccounts.map((acc: any) => acc.id);

		if (osrsAccountIds.length === 0) {
			return res.json({
				success: true,
				data: []
			});
		}

		// Get all tile progress for the team's tiles
		const tilesProgress = await query(`
			SELECT 
				bbt.id as board_tile_id,
				bbt.position,
				bbt.is_completed,
				bt.task,
				bt.category,
				bt.icon,
				btp.progress_value,
				btp.progress_metadata,
				btp.completion_type,
				btp.completed_at,
				btp.completed_by_osrs_account_id,
				btp.updated_at
			FROM bingo_tile_progress btp
			JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			WHERE bb.event_id = $1
				AND bb.team_id = $2
			ORDER BY btp.updated_at DESC
		`, [eventId, participation.teamId]);

		// Filter to only tiles where this user has contributed
		const userContributions = tilesProgress
			.map((tile: any) => {
				const myContribution = extractPlayerContribution(tile.progressMetadata, osrsAccountIds);
				if (!myContribution) return null;

				// Check if I was the one who completed it
				const iCompletedIt = osrsAccountIds.includes(tile.completedByOsrsAccountId);

				return {
					boardTileId: tile.boardTileId,
					position: tile.position,
					task: tile.task,
					category: tile.category,
					icon: tile.icon,
					isCompleted: tile.isCompleted,
					// My specific contribution
					myContribution: {
						...myContribution,
						iCompletedTile: iCompletedIt
					},
					// Team totals for context
					teamProgressValue: tile.progressValue,
					requirementType: tile.progressMetadata?.requirementType,
					completedAt: iCompletedIt ? tile.completedAt : null,
					lastUpdatedAt: tile.updatedAt
				};
			})
			.filter((c: any) => c !== null);

		res.json({
			success: true,
			data: userContributions
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
