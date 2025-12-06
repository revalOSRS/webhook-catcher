import { Router, Response } from 'express';
import { query } from '../../../db/connection.js';
import { getMemberFromHeaders, getEventParticipation } from './types.js';

const router = Router({ mergeParams: true });

/**
 * Extract player contribution from TileProgressMetadata
 * Returns the contribution for the specified osrsAccountId or null if not found
 * 
 * TileProgressMetadata structure:
 * {
 *   totalRequirements: number,
 *   completedRequirementIndices: number[],
 *   requirementProgress: {
 *     "0": { isCompleted, progressValue, progressMetadata: RequirementProgressData }
 *   }
 * }
 * 
 * Handles different requirement types:
 * - Regular requirements: requirementProgress[i].progressMetadata.playerContributions
 * - PUZZLE requirements: requirementProgress[i].progressMetadata.hiddenProgressMetadata.playerContributions
 */
const extractPlayerContribution = (
	tileMetadata: any,
	osrsAccountIds: number[]
): any | null => {
	if (!tileMetadata?.requirementProgress) return null;

	const allItems: any[] = [];
	let totalCount = 0;
	let osrsNickname = '';
	let foundOsrsAccountId = 0;

	// Iterate through all requirements in the tile
	for (const reqIndex of Object.keys(tileMetadata.requirementProgress)) {
		const reqEntry = tileMetadata.requirementProgress[reqIndex];
		const reqMeta = reqEntry?.progressMetadata;
		if (!reqMeta) continue;

		// Check direct playerContributions (for regular requirements)
		if (reqMeta.playerContributions) {
			for (const contrib of reqMeta.playerContributions) {
				if (osrsAccountIds.includes(contrib.osrsAccountId)) {
					osrsNickname = contrib.osrsNickname;
					foundOsrsAccountId = contrib.osrsAccountId;
					if (contrib.items) {
						allItems.push(...contrib.items);
						totalCount += contrib.totalCount || 0;
					} else if (contrib.pets) {
						// For PET requirements
						return contrib;
					} else if (contrib.attempts) {
						// For SPEEDRUN requirements
						return contrib;
					} else if (contrib.xpContribution !== undefined) {
						// For EXPERIENCE requirements
						return contrib;
					} else if (contrib.gambleContribution !== undefined) {
						// For BA_GAMBLES requirements
						return contrib;
					} else if (contrib.messages) {
						// For CHAT requirements
						return contrib;
					} else if (contrib.qualifyingDrops) {
						// For VALUE_DROP requirements
						return contrib;
					}
				}
			}
		}

		// Check hiddenProgressMetadata (for PUZZLE requirements)
		const hiddenMeta = reqMeta.hiddenProgressMetadata;
		if (hiddenMeta?.playerContributions) {
			for (const contrib of hiddenMeta.playerContributions) {
				if (osrsAccountIds.includes(contrib.osrsAccountId)) {
					osrsNickname = contrib.osrsNickname;
					foundOsrsAccountId = contrib.osrsAccountId;
					if (contrib.items) {
						allItems.push(...contrib.items);
						totalCount += contrib.totalCount || 0;
					}
				}
			}
		}
	}

	if (allItems.length > 0) {
		return {
			items: allItems,
			totalCount,
			osrsNickname,
			osrsAccountId: foundOsrsAccountId
		};
	}

	return null;
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
					requirementType: tile.progressMetadata?.requirementProgress?.["0"]?.progressMetadata?.requirementType,
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

/**
 * Extract ALL player contributions from TileProgressMetadata
 * Returns array of all contributions, handling different requirement types
 */
const extractAllContributions = (tileMetadata: any): any[] => {
	if (!tileMetadata?.requirementProgress) return [];

	const playerMap = new Map<number, any>();

	// Iterate through all requirements
	for (const reqIndex of Object.keys(tileMetadata.requirementProgress)) {
		const reqEntry = tileMetadata.requirementProgress[reqIndex];
		const reqMeta = reqEntry?.progressMetadata;
		if (!reqMeta) continue;

		// Check direct playerContributions (for regular requirements)
		if (reqMeta.playerContributions) {
			for (const contrib of reqMeta.playerContributions) {
				const existing = playerMap.get(contrib.osrsAccountId);
				if (existing) {
					// Merge items and counts for ITEM_DROP
					if (contrib.items) {
						existing.items = existing.items || [];
						existing.items.push(...contrib.items);
						existing.totalCount = (existing.totalCount || 0) + (contrib.totalCount || 0);
					}
				} else {
					playerMap.set(contrib.osrsAccountId, { ...contrib });
				}
			}
		}

		// Check hiddenProgressMetadata (for PUZZLE requirements)
		const hiddenMeta = reqMeta.hiddenProgressMetadata;
		if (hiddenMeta?.playerContributions) {
			for (const contrib of hiddenMeta.playerContributions) {
				const existing = playerMap.get(contrib.osrsAccountId);
				if (existing) {
					// Merge items and counts
					if (contrib.items) {
						existing.items = existing.items || [];
						existing.items.push(...contrib.items);
						existing.totalCount = (existing.totalCount || 0) + (contrib.totalCount || 0);
					}
				} else {
					playerMap.set(contrib.osrsAccountId, {
						...contrib,
						items: contrib.items ? [...contrib.items] : [],
						totalCount: contrib.totalCount || 0
					});
				}
			}
		}
	}

	return Array.from(playerMap.values());
};

/**
 * GET /api/app/clan-events/events/:eventId/team-contributions
 * Get all team members' contributions to tiles
 * 
 * Returns contributions from ALL team members for each tile with progress
 */
router.get('/team', async (req, res: Response) => {
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

		// Get all tile progress for the team's tiles
		const tilesProgress = await query(`
			SELECT 
				bbt.id as board_tile_id,
				bbt.position,
				bbt.is_completed,
				bt.task,
				bt.category,
				bt.icon,
				bt.points,
				btp.progress_value,
				btp.progress_metadata,
				btp.completion_type,
				btp.completed_at,
				btp.completed_by_osrs_account_id,
				btp.updated_at,
				oa.osrs_nickname as completed_by_name
			FROM bingo_tile_progress btp
			JOIN bingo_board_tiles bbt ON btp.board_tile_id = bbt.id
			JOIN bingo_boards bb ON bbt.board_id = bb.id
			JOIN bingo_tiles bt ON bbt.tile_id = bt.id
			LEFT JOIN osrs_accounts oa ON btp.completed_by_osrs_account_id = oa.id
			WHERE bb.event_id = $1
				AND bb.team_id = $2
			ORDER BY btp.updated_at DESC
		`, [eventId, participation.teamId]);

		// Build response with all contributions for each tile
		const teamContributions = tilesProgress.map((tile: any) => {
			const allContributions = extractAllContributions(tile.progressMetadata);

			return {
				boardTileId: tile.boardTileId,
				position: tile.position,
				task: tile.task,
				category: tile.category,
				icon: tile.icon,
				points: tile.points,
				isCompleted: tile.isCompleted,
				completedAt: tile.completedAt,
				completedBy: tile.completedByName,
				completedByOsrsAccountId: tile.completedByOsrsAccountId,
				teamProgressValue: tile.progressValue,
				requirementType: tile.progressMetadata?.requirementType,
				lastUpdatedAt: tile.updatedAt,
				// All player contributions
				contributions: allContributions.map((c: any) => ({
					osrsAccountId: c.osrsAccountId,
					osrsNickname: c.osrsNickname,
					items: c.items || [],
					totalCount: c.totalCount || 0,
					// For non-item contributions (speedruns, etc.)
					bestTimeSeconds: c.bestTimeSeconds,
					attempts: c.attempts,
					gambleCount: c.gambleCount
				}))
			};
		});

		res.json({
			success: true,
			data: teamContributions
		});
	} catch (error: any) {
		console.error('Error fetching team contributions:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch team contributions',
			message: error.message
		});
	}
});

export default router;
