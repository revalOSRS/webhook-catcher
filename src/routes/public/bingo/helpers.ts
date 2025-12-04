/**
 * Public Bingo Helpers
 * 
 * Utility functions for public bingo endpoints.
 */

import { estonianToUtc } from '../../../utils/estonian-time.js';
import type { PublicRequirementInfo, TileVisibility } from './types.js';

/**
 * Sanitize a requirement for public view
 * Hides actual tracking details for PUZZLE types
 */
export const sanitizeRequirement = (req: any, progressMetadata?: any): PublicRequirementInfo => {
	if (req.type === 'PUZZLE') {
		const isSolved = progressMetadata?.isSolved || false;
		return {
			type: 'PUZZLE',
			puzzle: {
				displayName: req.displayName,
				displayDescription: req.displayDescription,
				displayHint: req.displayHint,
				displayIcon: req.displayIcon,
				puzzleCategory: req.puzzleCategory,
				isSolved,
				revealAnswer: req.revealOnComplete && isSolved
			}
		};
	}
	
	// For non-puzzle types, provide a basic description without revealing specific targets
	let description = '';
	switch (req.type) {
		case 'ITEM_DROP':
			description = req.items?.length > 1 
				? `Obtain ${req.items.length} different items`
				: 'Obtain an item';
			break;
		case 'PET':
			description = `Obtain a pet: ${req.petName || 'Any'}`;
			break;
		case 'VALUE_DROP':
			description = `Get a valuable drop (${(req.value || 0).toLocaleString()}+ gp)`;
			break;
		case 'SPEEDRUN':
			description = `Complete ${req.location || 'content'} speedrun`;
			break;
		case 'EXPERIENCE':
			description = `Gain ${(req.experience || 0).toLocaleString()} ${req.skill || ''} XP`;
			break;
		case 'BA_GAMBLES':
			description = `Complete ${req.amount || 0} BA gambles`;
			break;
		case 'CHAT':
			description = 'Receive a specific game message';
			break;
		default:
			description = 'Complete the task';
	}
	
	return {
		type: req.type,
		description
	};
};

/**
 * Check if tiles should be visible based on event start time
 * Tiles are hidden until 3 hours before the event starts
 * Tiles are also hidden if no start date is set (event not scheduled)
 * 
 * Note: Event times are stored as Estonian time in the database (but in UTC column).
 * We convert to actual UTC for comparison with the current time.
 */
export const shouldShowTiles = (startDate: Date | null): TileVisibility => {
	if (!startDate) {
		// No start date set - hide tiles until event is scheduled
		return { 
			show: false,
			message: 'Tiles will be revealed 3 hours before the event starts'
		};
	}
	
	// Convert stored Estonian time to actual UTC for comparison
	const startDateUtc = estonianToUtc(startDate);
	const now = new Date(); // Current UTC time
	const threeHoursBefore = new Date(startDateUtc.getTime() - (3 * 60 * 60 * 1000));
	
	if (now >= threeHoursBefore) {
		// Within 3 hours of start or after - show tiles
		return { show: true };
	}
	
	// More than 3 hours before start - hide tiles
	return {
		show: false,
		revealAt: threeHoursBefore,
		message: 'Tiles will be revealed 3 hours before the event starts'
	};
};

