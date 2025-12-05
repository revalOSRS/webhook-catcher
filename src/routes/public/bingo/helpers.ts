/**
 * Public Bingo Helpers
 * 
 * Utility functions for public bingo endpoints.
 */

import type { TileVisibility } from './types.js';

/**
 * Sanitize requirements for public view.
 * Passes through all requirement data as-is, only removing hiddenRequirement from PUZZLE types.
 * This matches the behavior of the authenticated app endpoint.
 */
export const sanitizeRequirements = (requirements: any): any => {
	if (!requirements) return requirements;
	
	const sanitized = { ...requirements };
	
	// Sanitize base requirements array
	if (sanitized.requirements && Array.isArray(sanitized.requirements)) {
		sanitized.requirements = sanitized.requirements.map((req: any) => {
			if (req.type === 'PUZZLE') {
				// Remove hiddenRequirement, keep only public display fields
				const { hiddenRequirement, ...publicFields } = req;
				return publicFields;
			}
			return req;
		});
	}
	
	// Sanitize tier requirements
	if (sanitized.tiers && Array.isArray(sanitized.tiers)) {
		sanitized.tiers = sanitized.tiers.map((tier: any) => {
			if (tier.requirement?.type === 'PUZZLE') {
				const { hiddenRequirement, ...publicFields } = tier.requirement;
				return { ...tier, requirement: publicFields };
			}
			return tier;
		});
	}
	
	return sanitized;
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

