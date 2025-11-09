const db = require('../index');

/**
 * AchievementDiary Model
 * Handles achievement diary tracking and completions
 */
class AchievementDiary {
	/**
	 * Get all diary tiers
	 * @returns {Promise<Array>} All diary tiers
	 */
	static async getAllTiers() {
		const query = 'SELECT * FROM achievement_diary_tiers ORDER BY diary_name, tier';
		return await db.query(query);
	}
	
	/**
	 * Get diary tier by name and tier
	 * @param {string} diaryName - Name of the diary
	 * @param {string} tier - Tier (easy, medium, hard, elite)
	 * @returns {Promise<Object|null>} Diary tier or null
	 */
	static async getTier(diaryName, tier) {
		const query = `
			SELECT * FROM achievement_diary_tiers 
			WHERE LOWER(diary_name) = LOWER($1) AND LOWER(tier) = LOWER($2)
		`;
		const result = await db.query(query, [diaryName, tier]);
		return result[0] || null;
	}
	
	/**
	 * Get all completions for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Array>} Array of completions with diary details
	 */
	static async getCompletions(accountId) {
		const query = `
			SELECT 
				dc.*,
				dt.diary_name,
				dt.tier,
				dt.total_tasks
			FROM osrs_account_diary_completions dc
			JOIN achievement_diary_tiers dt ON dc.diary_tier_id = dt.id
			WHERE dc.osrs_account_id = $1
			ORDER BY dc.completed_at DESC
		`;
		return await db.query(query, [accountId]);
	}
	
	/**
	 * Check if account has completed a diary tier
	 * @param {number} accountId - OSRS account ID
	 * @param {number} diaryTierId - Diary tier ID
	 * @returns {Promise<boolean>} True if completed
	 */
	static async hasCompleted(accountId, diaryTierId) {
		const query = `
			SELECT COUNT(*) as count
			FROM osrs_account_diary_completions
			WHERE osrs_account_id = $1 AND diary_tier_id = $2
		`;
		const result = await db.query(query, [accountId, diaryTierId]);
		return result[0].count > 0;
	}
	
	/**
	 * Mark diary tier as completed
	 * @param {number} accountId - OSRS account ID
	 * @param {number} diaryTierId - Diary tier ID
	 * @returns {Promise<Object>} Created completion record
	 */
	static async markCompleted(accountId, diaryTierId) {
		const query = `
			INSERT INTO osrs_account_diary_completions (
				osrs_account_id,
				diary_tier_id
			) VALUES ($1, $2)
			ON CONFLICT (osrs_account_id, diary_tier_id) DO NOTHING
			RETURNING *
		`;
		const result = await db.query(query, [accountId, diaryTierId]);
		return result[0];
	}
	
	/**
	 * Get completion summary for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Object>} Summary object with counts by tier
	 */
	static async getCompletionSummary(accountId) {
		const query = `
			SELECT 
				diary_easy_count,
				diary_medium_count,
				diary_hard_count,
				diary_elite_count,
				diary_total_count
			FROM osrs_accounts
			WHERE id = $1
		`;
		const result = await db.query(query, [accountId]);
		return result[0] || {
			diary_easy_count: 0,
			diary_medium_count: 0,
			diary_hard_count: 0,
			diary_elite_count: 0,
			diary_total_count: 0
		};
	}
	
	/**
	 * Get leaderboard for diary completions
	 * @param {string} tier - Optional tier filter (easy, medium, hard, elite)
	 * @param {number} limit - Number of results
	 * @returns {Promise<Array>} Leaderboard entries
	 */
	static async getLeaderboard(tier = null, limit = 100) {
		let column = 'diary_total_count';
		
		if (tier) {
			const tierLower = tier.toLowerCase();
			if (['easy', 'medium', 'hard', 'elite'].includes(tierLower)) {
				column = `diary_${tierLower}_count`;
			}
		}
		
		const query = `
			SELECT 
				osrs_nickname,
				diary_easy_count,
				diary_medium_count,
				diary_hard_count,
				diary_elite_count,
				diary_total_count,
				ROW_NUMBER() OVER (ORDER BY ${column} DESC) as rank
			FROM osrs_accounts
			WHERE ${column} > 0
			ORDER BY ${column} DESC
			LIMIT $1
		`;
		
		return await db.query(query, [limit]);
	}
}

module.exports = AchievementDiary;

