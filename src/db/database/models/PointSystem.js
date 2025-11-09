const db = require('../index');

/**
 * PointSystem Model
 * Handles point tracking, rules, and leaderboards
 */
class PointSystem {
	/**
	 * Get point rules
	 * @param {string} ruleType - Optional rule type filter
	 * @returns {Promise<Array>} Point rules
	 */
	static async getRules(ruleType = null) {
		let query = 'SELECT * FROM point_rules WHERE is_active = true';
		const params = [];
		
		if (ruleType) {
			query += ' AND rule_type = $1';
			params.push(ruleType);
		}
		
		query += ' ORDER BY rule_type, points DESC';
		
		return await db.query(query, params);
	}
	
	/**
	 * Get specific point rule
	 * @param {string} ruleType - Rule type
	 * @param {string} ruleKey - Rule key
	 * @returns {Promise<Object|null>} Point rule or null
	 */
	static async getRule(ruleType, ruleKey) {
		const query = `
			SELECT * FROM point_rules
			WHERE rule_type = $1 AND rule_key = $2 AND is_active = true
		`;
		const result = await db.query(query, [ruleType, ruleKey]);
		return result[0] || null;
	}
	
	/**
	 * Create or update a point rule
	 * @param {Object} data - Rule data
	 * @returns {Promise<Object>} Created/updated rule
	 */
	static async setRule(data) {
		const { ruleType, ruleKey, points, description, isActive = true } = data;
		
		const query = `
			INSERT INTO point_rules (rule_type, rule_key, points, description, is_active)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (rule_type, rule_key)
			DO UPDATE SET
				points = EXCLUDED.points,
				description = EXCLUDED.description,
				is_active = EXCLUDED.is_active,
				updated_at = CURRENT_TIMESTAMP
			RETURNING *
		`;
		
		const result = await db.query(query, [ruleType, ruleKey, points, description, isActive]);
		return result[0];
	}
	
	/**
	 * Get points breakdown for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Array>} Points breakdown by category
	 */
	static async getBreakdown(accountId) {
		const query = `
			SELECT * FROM osrs_account_points_breakdown
			WHERE osrs_account_id = $1
			ORDER BY points DESC
		`;
		return await db.query(query, [accountId]);
	}
	
	/**
	 * Update points breakdown for a category
	 * @param {number} accountId - OSRS account ID
	 * @param {string} category - Category name
	 * @param {number} points - Points to add
	 * @returns {Promise<void>}
	 */
	static async updateBreakdown(accountId, category, points) {
		const query = `SELECT update_points_breakdown($1, $2, $3)`;
		await db.query(query, [accountId, category, points]);
	}
	
	/**
	 * Get total points for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Object>} Points summary
	 */
	static async getTotalPoints(accountId) {
		const query = `
			SELECT 
				total_points,
				points_rank,
				points_last_updated
			FROM osrs_accounts
			WHERE id = $1
		`;
		const result = await db.query(query, [accountId]);
		return result[0] || { total_points: 0, points_rank: null, points_last_updated: null };
	}
	
	/**
	 * Award points to an account
	 * @param {number} accountId - OSRS account ID
	 * @param {number} points - Points to award
	 * @param {string} category - Category for breakdown
	 * @returns {Promise<void>}
	 */
	static async awardPoints(accountId, points, category = null) {
		// Update total points
		await db.query(`
			UPDATE osrs_accounts
			SET total_points = total_points + $1,
				points_last_updated = CURRENT_TIMESTAMP
			WHERE id = $2
		`, [points, accountId]);
		
		// Update category breakdown if provided
		if (category) {
			await this.updateBreakdown(accountId, category, points);
		}
	}
	
	/**
	 * Get points leaderboard
	 * @param {number} limit - Number of results
	 * @param {number} offset - Offset for pagination
	 * @returns {Promise<Array>} Leaderboard entries
	 */
	static async getLeaderboard(limit = 100, offset = 0) {
		const query = `
			SELECT 
				id,
				osrs_nickname,
				discord_id,
				total_points,
				quest_points,
				ca_total_count,
				diary_total_count,
				clog_items_obtained,
				ehp,
				ehb,
				ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
			FROM osrs_accounts
			WHERE total_points > 0
			ORDER BY total_points DESC
			LIMIT $1 OFFSET $2
		`;
		return await db.query(query, [limit, offset]);
	}
	
	/**
	 * Get leaderboard from materialized view (faster)
	 * @param {number} limit - Number of results
	 * @param {number} offset - Offset for pagination
	 * @returns {Promise<Array>} Leaderboard entries
	 */
	static async getLeaderboardFast(limit = 100, offset = 0) {
		const query = `
			SELECT * FROM leaderboard_points
			ORDER BY rank
			LIMIT $1 OFFSET $2
		`;
		return await db.query(query, [limit, offset]);
	}
	
	/**
	 * Refresh the points leaderboard materialized view
	 * @returns {Promise<void>}
	 */
	static async refreshLeaderboard() {
		await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_points');
	}
	
	/**
	 * Update points ranks for all accounts
	 * @returns {Promise<void>}
	 */
	static async updateAllRanks() {
		const query = `
			UPDATE osrs_accounts o
			SET points_rank = sub.rank
			FROM (
				SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
				FROM osrs_accounts
				WHERE total_points > 0
			) sub
			WHERE o.id = sub.id
		`;
		await db.query(query);
	}
	
	/**
	 * Get account rank
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<number|null>} Rank or null
	 */
	static async getAccountRank(accountId) {
		const query = `
			SELECT points_rank FROM osrs_accounts WHERE id = $1
		`;
		const result = await db.query(query, [accountId]);
		return result[0]?.points_rank || null;
	}
	
	/**
	 * Get points for a specific achievement type
	 * @param {string} achievementType - Type of achievement
	 * @param {string} key - Specific key (tier, difficulty, etc.)
	 * @returns {Promise<number>} Points value
	 */
	static async getPointsForAchievement(achievementType, key) {
		const rule = await this.getRule(achievementType, key);
		return rule ? rule.points : 0;
	}
	
	/**
	 * Get top point earners for a time period
	 * @param {Date} startDate - Start date
	 * @param {Date} endDate - End date
	 * @param {number} limit - Number of results
	 * @returns {Promise<Array>} Top earners
	 */
	static async getTopEarnersInPeriod(startDate, endDate, limit = 10) {
		const query = `
			SELECT 
				o.osrs_nickname,
				o.discord_id,
				SUM(e.points_awarded) as points_earned,
				COUNT(e.id) as events_count
			FROM osrs_account_events e
			JOIN osrs_accounts o ON e.osrs_account_id = o.id
			WHERE e.created_at >= $1 AND e.created_at <= $2
			GROUP BY o.id, o.osrs_nickname, o.discord_id
			ORDER BY points_earned DESC
			LIMIT $3
		`;
		return await db.query(query, [startDate, endDate, limit]);
	}
}

module.exports = PointSystem;

