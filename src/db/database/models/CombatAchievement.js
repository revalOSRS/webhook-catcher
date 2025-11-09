const db = require('../index');

/**
 * CombatAchievement Model
 * Handles combat achievement tracking and completions
 */
class CombatAchievement {
	/**
	 * Get all combat achievements
	 * @returns {Promise<Array>} All combat achievements
	 */
	static async getAll() {
		const query = 'SELECT * FROM combat_achievements ORDER BY tier, name';
		return await db.query(query);
	}
	
	/**
	 * Get combat achievement by name
	 * @param {string} name - Achievement name
	 * @returns {Promise<Object|null>} Combat achievement or null
	 */
	static async getByName(name) {
		const query = 'SELECT * FROM combat_achievements WHERE LOWER(name) = LOWER($1)';
		const result = await db.query(query, [name]);
		return result[0] || null;
	}
	
	/**
	 * Get combat achievements by tier
	 * @param {string} tier - Tier (easy, medium, hard, elite, master, grandmaster)
	 * @returns {Promise<Array>} Combat achievements
	 */
	static async getByTier(tier) {
		const query = 'SELECT * FROM combat_achievements WHERE LOWER(tier) = LOWER($1) ORDER BY name';
		return await db.query(query, [tier]);
	}
	
	/**
	 * Get combat achievements by monster
	 * @param {string} monster - Monster name
	 * @returns {Promise<Array>} Combat achievements
	 */
	static async getByMonster(monster) {
		const query = 'SELECT * FROM combat_achievements WHERE LOWER(monster) = LOWER($1) ORDER BY tier, name';
		return await db.query(query, [monster]);
	}
	
	/**
	 * Create a new combat achievement
	 * @param {Object} data - Achievement data
	 * @returns {Promise<Object>} Created achievement
	 */
	static async create(data) {
		const { name, tier, type, monster, description } = data;
		
		const query = `
			INSERT INTO combat_achievements (name, tier, type, monster, description)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (name) DO UPDATE SET
				tier = EXCLUDED.tier,
				type = EXCLUDED.type,
				monster = EXCLUDED.monster,
				description = EXCLUDED.description
			RETURNING *
		`;
		
		const result = await db.query(query, [name, tier, type, monster, description]);
		return result[0];
	}
	
	/**
	 * Bulk insert combat achievements
	 * @param {Array<Object>} achievements - Array of achievement data
	 * @returns {Promise<void>}
	 */
	static async bulkCreate(achievements) {
		for (const achievement of achievements) {
			await this.create(achievement);
		}
	}
	
	/**
	 * Get all completions for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Array>} Array of completions with CA details
	 */
	static async getCompletions(accountId) {
		const query = `
			SELECT 
				ac.*,
				ca.name,
				ca.tier,
				ca.type,
				ca.monster,
				ca.description
			FROM osrs_account_combat_achievements ac
			JOIN combat_achievements ca ON ac.combat_achievement_id = ca.id
			WHERE ac.osrs_account_id = $1
			ORDER BY ac.completed_at DESC
		`;
		return await db.query(query, [accountId]);
	}
	
	/**
	 * Check if account has completed a combat achievement
	 * @param {number} accountId - OSRS account ID
	 * @param {number} achievementId - Combat achievement ID
	 * @returns {Promise<boolean>} True if completed
	 */
	static async hasCompleted(accountId, achievementId) {
		const query = `
			SELECT COUNT(*) as count
			FROM osrs_account_combat_achievements
			WHERE osrs_account_id = $1 AND combat_achievement_id = $2
		`;
		const result = await db.query(query, [accountId, achievementId]);
		return result[0].count > 0;
	}
	
	/**
	 * Mark combat achievement as completed
	 * @param {number} accountId - OSRS account ID
	 * @param {number} achievementId - Combat achievement ID
	 * @returns {Promise<Object>} Created completion record
	 */
	static async markCompleted(accountId, achievementId) {
		const query = `
			INSERT INTO osrs_account_combat_achievements (
				osrs_account_id,
				combat_achievement_id
			) VALUES ($1, $2)
			ON CONFLICT (osrs_account_id, combat_achievement_id) DO NOTHING
			RETURNING *
		`;
		const result = await db.query(query, [accountId, achievementId]);
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
				ca_easy_count,
				ca_medium_count,
				ca_hard_count,
				ca_elite_count,
				ca_master_count,
				ca_grandmaster_count,
				ca_total_count
			FROM osrs_accounts
			WHERE id = $1
		`;
		const result = await db.query(query, [accountId]);
		return result[0] || {
			ca_easy_count: 0,
			ca_medium_count: 0,
			ca_hard_count: 0,
			ca_elite_count: 0,
			ca_master_count: 0,
			ca_grandmaster_count: 0,
			ca_total_count: 0
		};
	}
	
	/**
	 * Get leaderboard for combat achievements
	 * @param {string} tier - Optional tier filter
	 * @param {number} limit - Number of results
	 * @returns {Promise<Array>} Leaderboard entries
	 */
	static async getLeaderboard(tier = null, limit = 100) {
		let column = 'ca_total_count';
		
		if (tier) {
			const tierLower = tier.toLowerCase();
			if (['easy', 'medium', 'hard', 'elite', 'master', 'grandmaster'].includes(tierLower)) {
				column = `ca_${tierLower}_count`;
			}
		}
		
		const query = `
			SELECT 
				osrs_nickname,
				ca_easy_count,
				ca_medium_count,
				ca_hard_count,
				ca_elite_count,
				ca_master_count,
				ca_grandmaster_count,
				ca_total_count,
				ROW_NUMBER() OVER (ORDER BY ${column} DESC) as rank
			FROM osrs_accounts
			WHERE ${column} > 0
			ORDER BY ${column} DESC
			LIMIT $1
		`;
		
		return await db.query(query, [limit]);
	}
}

module.exports = CombatAchievement;

