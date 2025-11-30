import { Request } from 'express';
import { query } from '../../../db/connection.js';

/**
 * Member info from authentication headers
 */
export interface AuthenticatedMember {
	id: number;
	discordId: string;
	memberCode: number;
	discordTag: string;
}

/**
 * Request with authenticated member attached
 */
export interface AuthenticatedRequest extends Request {
	member?: AuthenticatedMember;
}

/**
 * Event participation info (internal - maps from DB)
 */
export interface EventParticipation {
	teamId: string;
	teamName: string;
	color: string | null;
	icon: string | null;
	score: number;
	eventId: string;
}

/**
 * Response types - all camelCase for API responses
 */
export interface EventListItem {
	id: string;
	name: string;
	eventType: string;
	status: string;
	startDate: string | null;
	endDate: string | null;
	teamCount?: number;
	isParticipating?: boolean;
	teamId?: string;
	teamName?: string;
	teamScore?: number;
}

export interface TeamMember {
	id: string;
	memberId: number;
	discordTag: string;
	role: string;
	osrsAccountId: number | null;
	osrsAccountName: string | null;
}

export interface TileProgressEntry {
	id: string;
	osrsAccountId: number | null;
	progressValue: number;
	progressMetadata: Record<string, unknown>;
	completionType: 'auto' | 'manual_admin' | null;
	completedAt: string | null;
	completedByOsrsAccountId: number | null;
	completedByMemberId: number | null;
	recordedAt: string;
}

export interface TileEffect {
	id: string;
	buffName: string;
	buffType: 'buff' | 'debuff';
	effectType: string;
	effectValue: number;
	buffIcon: string | null;
	isActive: boolean;
	expiresAt: string | null;
}

export interface BoardTileWithProgress {
	id: string;
	boardId: string;
	tileId: string;
	position: string;
	isCompleted: boolean;
	completedAt: string | null;
	task: string;
	category: string;
	difficulty: string;
	icon: string | null;
	description: string | null;
	basePoints: number;
	requirements: unknown;
	progressEntries: TileProgressEntry[];
	teamTotalXpGained?: number | null;
	tileEffects?: TileEffect[];
}

export interface LineEffect {
	id: string;
	lineType: 'row' | 'column';
	lineIdentifier: string;
	buffName: string;
	buffType: 'buff' | 'debuff';
	effectType: string;
	effectValue: number;
	buffIcon: string | null;
	isActive: boolean;
	expiresAt: string | null;
}

export interface BoardTileEffect {
	id: string;
	boardTileId: string;
	buffName: string;
	buffType: 'buff' | 'debuff';
	effectType: string;
	effectValue: number;
	buffIcon: string | null;
	isActive: boolean;
	expiresAt: string | null;
}

export interface EventDetail {
	id: string;
	name: string;
	description: string | null;
	eventType: string;
	status: string;
	startDate: string | null;
	endDate: string | null;
	config: unknown;
	team: {
		id: string;
		name: string;
		color: string | null;
		icon: string | null;
		score: number;
		members: TeamMember[];
	};
	board?: {
		id: string;
		columns: number;
		rows: number;
		metadata: unknown;
		tiles: BoardTileWithProgress[];
		tileEffects: BoardTileEffect[];
		rowEffects: LineEffect[];
		columnEffects: LineEffect[];
	};
}

/**
 * Helper to get member from authentication headers
 */
export const getMemberFromHeaders = async (req: Request): Promise<AuthenticatedMember | null> => {
	const memberCode = req.headers['x-member-code'] as string;
	const discordId = req.headers['x-discord-id'] as string;

	if (!memberCode || !discordId) {
		return null;
	}

	const code = parseInt(memberCode);
	if (isNaN(code)) {
		return null;
	}

	const members = await query(
		'SELECT id, discord_id, member_code, discord_tag FROM members WHERE discord_id = $1 AND member_code = $2 AND is_active = true',
		[discordId, code]
	);

	if (members.length === 0) return null;

	const m = members[0];
	return {
		id: m.id,
		discordId: m.discord_id,
		memberCode: m.member_code,
		discordTag: m.discord_tag
	};
};

/**
 * Helper to check if member is participating in an event
 */
export const getEventParticipation = async (memberId: number, eventId: string): Promise<EventParticipation | null> => {
	const participation = await query(`
		SELECT 
			et.id as team_id,
			et.name as team_name,
			et.color,
			et.icon,
			et.score,
			e.id as event_id
		FROM event_team_members etm
		JOIN event_teams et ON etm.team_id = et.id
		JOIN events e ON et.event_id = e.id
		WHERE etm.member_id = $1 AND e.id = $2
		LIMIT 1
	`, [memberId, eventId]);

	if (participation.length === 0) return null;

	const p = participation[0];
	return {
		teamId: p.team_id,
		teamName: p.team_name,
		color: p.color,
		icon: p.icon,
		score: p.score,
		eventId: p.event_id
	};
};
