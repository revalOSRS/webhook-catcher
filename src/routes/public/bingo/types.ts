/**
 * Public Bingo Types
 * 
 * Type definitions for public bingo endpoints.
 * These are simplified/sanitized versions for spectator views.
 */

/**
 * Public team member data
 */
export interface PublicTeamMember {
	osrsName: string;
	role: string;
}

/**
 * Public team data for spectator view
 */
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

/**
 * Public line effect data (for rows/columns)
 */
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

/**
 * Public board data
 */
export interface PublicBoard {
	id: string;
	rows: number;
	columns: number;
	/** Tiles are only visible within 3 hours of event start */
	tiles: PublicBoardTile[] | null;
	/** Whether tiles are currently hidden (more than 3 hours before start) */
	tilesHidden: boolean;
	/** Message explaining why tiles are hidden */
	tilesHiddenMessage?: string;
	/** When tiles will be revealed (ISO timestamp) */
	tilesRevealAt?: string;
	rowEffects: PublicLineEffect[];
	columnEffects: PublicLineEffect[];
}

/**
 * Public tile data
 * 
 * Requirements are passed through as-is from the database,
 * with only `hiddenRequirement` removed from PUZZLE types.
 * This matches the authenticated app endpoint behavior.
 */
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
	 * Full requirements object (sanitized - hiddenRequirement removed from PUZZLE types)
	 * Contains: matchType, requirements[], tiers[] etc.
	 */
	requirements: any;
}

/**
 * Public progress data
 */
export interface PublicTileProgress {
	progressValue: number;
	targetValue: number | null;
	completedTiers: number[];
	currentTier: number | null;
	/** For multi-requirement tiles (matchType: "all") - indices of completed requirements */
	completedRequirementIndices: number[];
	/** For multi-requirement tiles - total number of requirements */
	totalRequirements: number | null;
	/** For multi-requirement tiles - individual progress per requirement (keyed by index) */
	requirementProgress: Record<string, {
		isCompleted: boolean;
		progressValue: number;
		progressMetadata: any;
	}> | null;
}

/**
 * Public effect data
 */
export interface PublicEffect {
	name: string;
	description: string | null;
	icon: string | null;
	type: 'buff' | 'debuff';
	effectType: string;
	effectValue: number | null;
}

/**
 * Tile visibility status
 */
export interface TileVisibility {
	show: boolean;
	revealAt?: Date;
	message?: string;
}

