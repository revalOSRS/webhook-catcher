/**
 * Public Bingo Helpers
 * 
 * Utility functions for public bingo endpoints.
 */

import type { TileVisibility } from './types.js';
import type { BingoTileRequirements } from '../../../modules/events/bingo/types/bingo-requirements.type.js';

/**
 * Sanitize requirements for public view.
 * Removes hiddenRequirement from PUZZLE types only.
 * 
 * Returns a modified copy - the return type is intentionally loose
 * because we're removing fields that are required in the original type.
 */
export function sanitizeRequirements(requirements: BingoTileRequirements): BingoTileRequirements {
	if (!requirements) return requirements;
	
	// Deep clone to avoid mutating original
	const sanitized = JSON.parse(JSON.stringify(requirements)) as BingoTileRequirements;
	
	// Sanitize base requirements array
	if (sanitized.requirements && Array.isArray(sanitized.requirements)) {
		for (const req of sanitized.requirements) {
			if (req.type === 'PUZZLE' && 'hiddenRequirement' in req) {
				delete (req as unknown as Record<string, unknown>).hiddenRequirement;
			}
		}
	}
	
	// Sanitize tier requirements
	if (sanitized.tiers && Array.isArray(sanitized.tiers)) {
		for (const tier of sanitized.tiers) {
			if (tier.requirement?.type === 'PUZZLE' && 'hiddenRequirement' in tier.requirement) {
				delete (tier.requirement as unknown as Record<string, unknown>).hiddenRequirement;
			}
		}
	}
	
	return sanitized;
}

/**
 * Check if tiles should be visible based on event start time.
 * Tiles are hidden until 3 hours before the event starts.
 * All times are in UTC.
 */
export function shouldShowTiles(startDate: Date | null): TileVisibility {
	if (!startDate) {
		return { 
			show: false,
			message: 'Tiles will be revealed 3 hours before the event starts'
		};
	}
	
	const now = new Date();
	const threeHoursBefore = new Date(startDate.getTime() - (3 * 60 * 60 * 1000));
	
	if (now >= threeHoursBefore) {
		return { show: true };
	}
	
	return {
		show: false,
		revealAt: threeHoursBefore,
		message: 'Tiles will be revealed 3 hours before the event starts'
	};
}
