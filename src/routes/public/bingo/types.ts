/**
 * Public Bingo Types
 * 
 * Type definitions for public bingo endpoints.
 * These are simplified/sanitized versions for spectator views.
 */

import type { 
	BingoTileRequirements,
	RequirementProgressEntry
} from '../../../modules/events/bingo/types/bingo-requirements.type.js';

// =============================================================================
// TEAM TYPES
// =============================================================================

export interface PublicTeamMember {
	osrsName: string;
	role: string;
}

export interface PublicTeam {
	id: string;
	name: string;
	color: string | null;
	icon: string | null;
	score: number;
	memberCount: number;
	completedTiles: number;
	members: PublicTeamMember[];
	board: PublicBoard | null;
}

// =============================================================================
// BOARD TYPES
// =============================================================================

export interface PublicLineEffect {
	lineType: 'row' | 'column';
	lineIdentifier: string;
	name: string;
	description: string | null;
	icon: string | null;
	type: 'buff' | 'debuff';
	effectType: string;
	effectValue: number | null;
}

export interface PublicBoard {
	id: string;
	rows: number;
	columns: number;
	tiles: PublicBoardTile[] | null;
	tilesHidden: boolean;
	tilesHiddenMessage?: string;
	tilesRevealAt?: string;
	rowEffects: PublicLineEffect[];
	columnEffects: PublicLineEffect[];
}

// =============================================================================
// TILE TYPES
// =============================================================================

export interface PublicBoardTile {
	id: string;
	position: string;
	isCompleted: boolean;
	completedAt: string | null;
	task: string;
	category: string;
	difficulty: string;
	icon: string | null;
	points: number;
	progress: PublicTileProgress | null;
	effects: PublicEffect[];
	/** 
	 * Requirements object (sanitized - hiddenRequirement removed from PUZZLE types).
	 * Uses the same structure as BingoTileRequirements.
	 */
	requirements: BingoTileRequirements;
}

export interface PublicTileProgress {
	progressValue: number;
	targetValue: number | null;
	completedTiers: number[];
	currentTier: number | null;
	completedRequirementIndices: number[];
	totalRequirements: number | null;
	/** Individual progress per requirement, keyed by index */
	requirementProgress: Record<string, RequirementProgressEntry> | null;
}

export interface PublicEffect {
	name: string;
	description: string | null;
	icon: string | null;
	type: 'buff' | 'debuff';
	effectType: string;
	effectValue: number | null;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface TileVisibility {
	show: boolean;
	revealAt?: Date;
	message?: string;
}
