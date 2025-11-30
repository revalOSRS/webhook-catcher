import { Request } from 'express';
import { query } from '../../../db/connection.js';

/**
 * Member info from authentication headers
 */
export interface AuthenticatedMember {
	id: number;
	discord_id: string;
	member_code: number;
	discord_tag: string;
}

/**
 * Request with authenticated member attached
 */
export interface AuthenticatedRequest extends Request {
	member?: AuthenticatedMember;
}

/**
 * Event participation info
 */
export interface EventParticipation {
	team_id: string;
	team_name: string;
	color: string | null;
	icon: string | null;
	score: number;
	event_id: string;
}

/**
 * Response types
 */
export interface EventListItem {
	id: string;
	name: string;
	event_type: string;
	status: string;
	start_date: string | null;
	end_date: string | null;
	team_count?: number;
	is_participating?: boolean;
	team_id?: string;
	team_name?: string;
	team_score?: number;
}

export interface TeamMember {
	id: string;
	member_id: number;
	discord_tag: string;
	role: string;
	osrs_account_id: number | null;
	osrs_account_name: string | null;
}

export interface TileProgressEntry {
	id: string;
	osrs_account_id: number | null;
	progress_value: number;
	progress_metadata: Record<string, unknown>;
	completion_type: 'auto' | 'manual_admin' | null;
	completed_at: string | null;
	completed_by_osrs_account_id: number | null;
	completed_by_member_id: number | null;
	recorded_at: string;
}

export interface TileEffect {
	id: string;
	buff_name: string;
	buff_type: 'buff' | 'debuff';
	effect_type: string;
	effect_value: number;
	buff_icon: string | null;
	is_active: boolean;
	expires_at: string | null;
}

export interface BoardTileWithProgress {
	id: string;
	board_id: string;
	tile_id: string;
	position: string;
	is_completed: boolean;
	completed_at: string | null;
	task: string;
	category: string;
	difficulty: string;
	icon: string | null;
	description: string | null;
	base_points: number;
	requirements: unknown;
	progress_entries: TileProgressEntry[];
	team_total_xp_gained?: number | null;
	tile_effects?: TileEffect[];
}

export interface LineEffect {
	id: string;
	line_type: 'row' | 'column';
	line_identifier: string;
	buff_name: string;
	buff_type: 'buff' | 'debuff';
	effect_type: string;
	effect_value: number;
	buff_icon: string | null;
	is_active: boolean;
	expires_at: string | null;
}

export interface BoardTileEffect {
	id: string;
	board_tile_id: string;
	buff_name: string;
	buff_type: 'buff' | 'debuff';
	effect_type: string;
	effect_value: number;
	buff_icon: string | null;
	is_active: boolean;
	expires_at: string | null;
}

export interface EventDetail {
	id: string;
	name: string;
	description: string | null;
	event_type: string;
	status: string;
	start_date: string | null;
	end_date: string | null;
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
		name: string;
		description: string | null;
		columns: number;
		rows: number;
		metadata: unknown;
		tiles: BoardTileWithProgress[];
		tile_effects: BoardTileEffect[];
		row_effects: LineEffect[];
		column_effects: LineEffect[];
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

	const members = await query<AuthenticatedMember>(
		'SELECT id, discord_id, member_code, discord_tag FROM members WHERE discord_id = $1 AND member_code = $2 AND is_active = true',
		[discordId, code]
	);

	return members.length > 0 ? members[0] : null;
};

/**
 * Helper to check if member is participating in an event
 */
export const getEventParticipation = async (memberId: number, eventId: string): Promise<EventParticipation | null> => {
	const participation = await query<EventParticipation>(`
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

	return participation.length > 0 ? participation[0] : null;
};

