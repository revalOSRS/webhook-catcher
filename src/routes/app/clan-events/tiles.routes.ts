import { Router, Response } from 'express';
import { query } from '../../../db/connection.js';
import { getMemberFromHeaders, getEventParticipation } from './types.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/app/clan-events/events/:eventId/tiles/:tileId
 * Get detailed info about a specific tile including full progress history
 */
router.get('/:tileId', async (req, res: Response) => {
	try {
		const { eventId, tileId } = req.params as { eventId: string; tileId: string };
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

		// Get tile with full details
		const tiles = await query(`
			SELECT 
				bbt.id,
				bbt.board_id,
				bbt.tile_id,
				bbt.position,
				bbt.is_completed,
				bbt.completed_at,
				bt.task,
				bt.category,
				bt.difficulty,
				bt.icon,
				bt.description,
				bt.points,
				bt.requirements
			FROM bingo_board_tiles bbt
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			WHERE bbt.id = $1 AND bb.team_id = $2 AND bb.event_id = $3
		`, [tileId, participation.teamId, eventId]);

		if (tiles.length === 0) {
			return res.status(404).json({
				success: false,
				error: 'Tile not found'
			});
		}

		const tile = tiles[0];

		// Get progress history
		const progress = await query(`
			SELECT 
				btp.*,
				oa.osrs_nickname as player_name
			FROM bingo_tile_progress btp
			LEFT JOIN osrs_accounts oa ON btp.completed_by_osrs_account_id = oa.id
			WHERE btp.board_tile_id = $1
			ORDER BY btp.updated_at DESC
		`, [tileId]);

		// Get tile effects
		const effects = await query(`
			SELECT 
				bbte.*,
				bbd.name as buff_name,
				bbd.type as buff_type,
				bbd.effect_type,
				bbd.effect_value,
				bbd.icon as buff_icon
			FROM bingo_board_tile_effects bbte
			JOIN bingo_buffs_debuffs bbd ON bbte.buff_debuff_id = bbd.id
			WHERE bbte.board_tile_id = $1 AND bbte.is_active = true
		`, [tileId]);

		res.json({
			success: true,
			data: {
				id: tile.id,
				boardId: tile.boardId,
				tileId: tile.tileId,
				position: tile.position,
				isCompleted: tile.isCompleted,
				completedAt: tile.completedAt,
				task: tile.task,
				category: tile.category,
				difficulty: tile.difficulty,
				icon: tile.icon,
				description: tile.description,
				points: tile.points,
				requirements: tile.requirements,
				progress: progress.map((p: any) => ({
					id: p.id,
					progressValue: p.progressValue,
					progressMetadata: p.progressMetadata,
					completionType: p.completionType,
					completedAt: p.completedAt,
					playerName: p.playerName,
					updatedAt: p.updatedAt
				})),
				effects: effects.map((e: any) => ({
					id: e.id,
					buffName: e.buffName,
					buffType: e.buffType,
					effectType: e.effectType,
					effectValue: e.effectValue,
					buffIcon: e.buffIcon,
					isActive: e.isActive,
					expiresAt: e.expiresAt
				}))
			}
		});
	} catch (error: any) {
		console.error('Error fetching tile details:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch tile details',
			message: error.message
		});
	}
});

export default router;
