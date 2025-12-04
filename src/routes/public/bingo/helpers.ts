/**
 * Public Bingo Helpers
 * 
 * Utility functions for public bingo endpoints.
 */

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
 * All times are in UTC.
 */
export const shouldShowTiles = (startDate: Date | null): TileVisibility => {
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
};

