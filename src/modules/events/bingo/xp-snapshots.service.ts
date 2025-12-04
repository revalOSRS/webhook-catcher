/**
 * Bingo XP Snapshots Service
 * 
 * Manages player XP snapshots for bingo events.
 * Captures baseline XP on first login after event start,
 * and tracks current XP on subsequent logins.
 */

import { query, queryOne } from '../../../db/connection.js';

/**
 * Skills XP data from LOGIN event
 */
export interface SkillsXpData {
	[skill: string]: number;
}

/**
 * XP snapshot record
 */
export interface XpSnapshot {
	id: string;
	eventId: string;
	osrsAccountId: number;
	baselineSkills: SkillsXpData;
	baselineTotalXp: number;
	baselineCapturedAt: Date;
	currentSkills: SkillsXpData;
	currentTotalXp: number;
	currentUpdatedAt: Date;
	loginCount: number;
}

/**
 * XP gains calculated from snapshots
 */
export interface XpGains {
	totalXpGained: number;
	skillXpGained: SkillsXpData;
	baselineTotalXp: number;
	currentTotalXp: number;
}

/**
 * Parse skills data that might be stored as a string (double-encoded JSON)
 * or already as an object.
 */
const parseSkillsData = (skills: SkillsXpData | string): SkillsXpData => {
	if (typeof skills === 'string') {
		try {
			return JSON.parse(skills);
		} catch {
			console.error('[XpSnapshots] Failed to parse skills data:', skills);
			return {};
		}
	}
	return skills;
};

export class BingoXpSnapshotsService {
	/**
	 * Get or create XP snapshot for a player in an event.
	 * 
	 * On first call (first login), creates baseline snapshot.
	 * On subsequent calls, updates current XP and increments login count.
	 * 
	 * @param eventId - Event ID
	 * @param osrsAccountId - Player's OSRS account ID
	 * @param skillsXp - Current skills XP from LOGIN event (experience object)
	 * @param totalXp - Total XP from LOGIN event
	 * @returns The XP snapshot record
	 */
	static async captureLoginSnapshot(
		eventId: string,
		osrsAccountId: number,
		skillsXp: SkillsXpData,
		totalXp: number
	): Promise<XpSnapshot> {
		// Check if snapshot already exists
		const existing = await queryOne<XpSnapshot>(`
			SELECT 
				id, event_id, osrs_account_id,
				baseline_skills, baseline_total_xp, baseline_captured_at,
				current_skills, current_total_xp, current_updated_at,
				login_count
			FROM bingo_player_xp_snapshots
			WHERE event_id = $1 AND osrs_account_id = $2
		`, [eventId, osrsAccountId]);

		if (existing) {
			// Update current XP and increment login count
			// Use ::jsonb cast to ensure proper JSONB storage
			const updated = await queryOne<XpSnapshot>(`
				UPDATE bingo_player_xp_snapshots
				SET 
					current_skills = $1::jsonb,
					current_total_xp = $2,
					current_updated_at = NOW(),
					login_count = login_count + 1,
					updated_at = NOW()
				WHERE event_id = $3 AND osrs_account_id = $4
				RETURNING 
					id, event_id, osrs_account_id,
					baseline_skills, baseline_total_xp, baseline_captured_at,
					current_skills, current_total_xp, current_updated_at,
					login_count
			`, [JSON.stringify(skillsXp), totalXp, eventId, osrsAccountId]);

			console.log(`[XpSnapshots] Updated XP snapshot for account ${osrsAccountId} in event ${eventId} (login #${updated?.loginCount})`);
			return this.normalizeSnapshot(updated!);
		}

		// First login - create baseline snapshot
		// Use ::jsonb cast to ensure proper JSONB storage
		const created = await queryOne<XpSnapshot>(`
			INSERT INTO bingo_player_xp_snapshots (
				event_id, osrs_account_id,
				baseline_skills, baseline_total_xp, baseline_captured_at,
				current_skills, current_total_xp, current_updated_at,
				login_count
			)
			VALUES ($1, $2, $3::jsonb, $4, NOW(), $3::jsonb, $4, NOW(), 1)
			RETURNING 
				id, event_id, osrs_account_id,
				baseline_skills, baseline_total_xp, baseline_captured_at,
				current_skills, current_total_xp, current_updated_at,
				login_count
		`, [eventId, osrsAccountId, JSON.stringify(skillsXp), totalXp]);

		console.log(`[XpSnapshots] Created baseline XP snapshot for account ${osrsAccountId} in event ${eventId}`);
		return this.normalizeSnapshot(created!);
	}

	/**
	 * Normalize snapshot to ensure skills data is parsed properly
	 * (handles legacy data that might be stored as strings)
	 */
	private static normalizeSnapshot(snapshot: XpSnapshot): XpSnapshot {
		return {
			...snapshot,
			baselineSkills: parseSkillsData(snapshot.baselineSkills),
			currentSkills: parseSkillsData(snapshot.currentSkills)
		};
	}

	/**
	 * Get XP snapshot for a player in an event
	 */
	static async getSnapshot(
		eventId: string,
		osrsAccountId: number
	): Promise<XpSnapshot | null> {
		const snapshot = await queryOne<XpSnapshot>(`
			SELECT 
				id, event_id, osrs_account_id,
				baseline_skills, baseline_total_xp, baseline_captured_at,
				current_skills, current_total_xp, current_updated_at,
				login_count
			FROM bingo_player_xp_snapshots
			WHERE event_id = $1 AND osrs_account_id = $2
		`, [eventId, osrsAccountId]);
		
		return snapshot ? this.normalizeSnapshot(snapshot) : null;
	}

	/**
	 * Get XP gains for a player since event start
	 */
	static async getXpGains(
		eventId: string,
		osrsAccountId: number
	): Promise<XpGains | null> {
		const snapshot = await this.getSnapshot(eventId, osrsAccountId);
		if (!snapshot) return null;

		const skillXpGained: SkillsXpData = {};
		let totalXpGained = 0;

		// Calculate XP gained per skill
		for (const [skill, currentXp] of Object.entries(snapshot.currentSkills)) {
			const baselineXp = snapshot.baselineSkills[skill] || 0;
			const gained = currentXp - baselineXp;
			if (gained > 0) {
				skillXpGained[skill] = gained;
				totalXpGained += gained;
			}
		}

		return {
			totalXpGained,
			skillXpGained,
			baselineTotalXp: snapshot.baselineTotalXp,
			currentTotalXp: snapshot.currentTotalXp
		};
	}

	/**
	 * Get XP gained in a specific skill
	 */
	static async getSkillXpGained(
		eventId: string,
		osrsAccountId: number,
		skill: string
	): Promise<number> {
		const snapshot = await this.getSnapshot(eventId, osrsAccountId);
		if (!snapshot) return 0;

		// Normalize skill name (convert to lowercase for matching)
		const normalizedSkill = skill.toLowerCase();
		
		// Find the skill in current and baseline (case-insensitive)
		let currentXp = 0;
		let baselineXp = 0;

		for (const [skillName, xp] of Object.entries(snapshot.currentSkills)) {
			if (skillName.toLowerCase() === normalizedSkill) {
				currentXp = xp;
				break;
			}
		}

		for (const [skillName, xp] of Object.entries(snapshot.baselineSkills)) {
			if (skillName.toLowerCase() === normalizedSkill) {
				baselineXp = xp;
				break;
			}
		}

		return Math.max(0, currentXp - baselineXp);
	}

	/**
	 * Get baseline XP for a specific skill
	 */
	static async getBaselineSkillXp(
		eventId: string,
		osrsAccountId: number,
		skill: string
	): Promise<number | null> {
		const snapshot = await this.getSnapshot(eventId, osrsAccountId);
		if (!snapshot) return null;

		const normalizedSkill = skill.toLowerCase();
		
		for (const [skillName, xp] of Object.entries(snapshot.baselineSkills)) {
			if (skillName.toLowerCase() === normalizedSkill) {
				return xp;
			}
		}

		return null;
	}

	/**
	 * Get current XP for a specific skill
	 */
	static async getCurrentSkillXp(
		eventId: string,
		osrsAccountId: number,
		skill: string
	): Promise<number | null> {
		const snapshot = await this.getSnapshot(eventId, osrsAccountId);
		if (!snapshot) return null;

		const normalizedSkill = skill.toLowerCase();
		
		for (const [skillName, xp] of Object.entries(snapshot.currentSkills)) {
			if (skillName.toLowerCase() === normalizedSkill) {
				return xp;
			}
		}

		return null;
	}

	/**
	 * Get all snapshots for an event
	 */
	static async getEventSnapshots(eventId: string): Promise<XpSnapshot[]> {
		const snapshots = await query<XpSnapshot>(`
			SELECT 
				id, event_id, osrs_account_id,
				baseline_skills, baseline_total_xp, baseline_captured_at,
				current_skills, current_total_xp, current_updated_at,
				login_count
			FROM bingo_player_xp_snapshots
			WHERE event_id = $1
			ORDER BY baseline_captured_at ASC
		`, [eventId]);
		
		return snapshots.map(s => this.normalizeSnapshot(s));
	}

	/**
	 * Delete all snapshots for an event
	 */
	static async deleteEventSnapshots(eventId: string): Promise<number> {
		const result = await query(`
			DELETE FROM bingo_player_xp_snapshots
			WHERE event_id = $1
			RETURNING id
		`, [eventId]);
		return result.length;
	}
}

