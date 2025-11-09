const db = require('../index');

/**
 * AccountEvent Model
 * Handles OSRS account event tracking and querying
 */
class AccountEvent {
	/**
	 * Create a new event
	 * @param {Object} data - Event data
	 * @returns {Promise<Object>} Created event
	 */
	static async create(data) {
		const {
			accountId,
			eventType,
			eventName,
			eventData = null,
			pointsAwarded = 0
		} = data;
		
		const query = `
			INSERT INTO osrs_account_events (
				osrs_account_id,
				event_type,
				event_name,
				event_data,
				points_awarded
			) VALUES ($1, $2, $3, $4, $5)
			RETURNING *
		`;
		
		const result = await db.query(query, [
			accountId,
			eventType,
			eventName,
			eventData ? JSON.stringify(eventData) : null,
			pointsAwarded
		]);
		
		return result[0];
	}
	
	/**
	 * Get events for an account
	 * @param {number} accountId - OSRS account ID
	 * @param {Object} options - Query options
	 * @returns {Promise<Array>} Array of events
	 */
	static async getByAccount(accountId, options = {}) {
		const {
			eventType = null,
			limit = 100,
			offset = 0,
			startDate = null,
			endDate = null
		} = options;
		
		let query = `
			SELECT * FROM osrs_account_events
			WHERE osrs_account_id = $1
		`;
		const params = [accountId];
		let paramCount = 2;
		
		if (eventType) {
			query += ` AND event_type = $${paramCount}`;
			params.push(eventType);
			paramCount++;
		}
		
		if (startDate) {
			query += ` AND created_at >= $${paramCount}`;
			params.push(startDate);
			paramCount++;
		}
		
		if (endDate) {
			query += ` AND created_at <= $${paramCount}`;
			params.push(endDate);
			paramCount++;
		}
		
		query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
		params.push(limit, offset);
		
		return await db.query(query, params);
	}
	
	/**
	 * Get recent events across all accounts
	 * @param {Object} options - Query options
	 * @returns {Promise<Array>} Array of events with account info
	 */
	static async getRecent(options = {}) {
		const {
			eventType = null,
			limit = 50
		} = options;
		
		let query = `
			SELECT 
				e.*,
				o.osrs_nickname,
				o.discord_id
			FROM osrs_account_events e
			JOIN osrs_accounts o ON e.osrs_account_id = o.id
		`;
		const params = [];
		let paramCount = 1;
		
		if (eventType) {
			query += ` WHERE e.event_type = $${paramCount}`;
			params.push(eventType);
			paramCount++;
		}
		
		query += ` ORDER BY e.created_at DESC LIMIT $${paramCount}`;
		params.push(limit);
		
		return await db.query(query, params);
	}
	
	/**
	 * Get event statistics for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Object>} Event statistics
	 */
	static async getStatistics(accountId) {
		const query = `
			SELECT 
				event_type,
				COUNT(*) as count,
				SUM(points_awarded) as total_points
			FROM osrs_account_events
			WHERE osrs_account_id = $1
			GROUP BY event_type
			ORDER BY count DESC
		`;
		return await db.query(query, [accountId]);
	}
	
	/**
	 * Get daily stats for an account
	 * @param {number} accountId - OSRS account ID
	 * @param {Object} options - Query options
	 * @returns {Promise<Array>} Array of daily stats
	 */
	static async getDailyStats(accountId, options = {}) {
		const {
			startDate = null,
			endDate = null,
			limit = 30
		} = options;
		
		let query = `
			SELECT * FROM osrs_account_daily_stats
			WHERE osrs_account_id = $1
		`;
		const params = [accountId];
		let paramCount = 2;
		
		if (startDate) {
			query += ` AND stat_date >= $${paramCount}`;
			params.push(startDate);
			paramCount++;
		}
		
		if (endDate) {
			query += ` AND stat_date <= $${paramCount}`;
			params.push(endDate);
			paramCount++;
		}
		
		query += ` ORDER BY stat_date DESC LIMIT $${paramCount}`;
		params.push(limit);
		
		return await db.query(query, params);
	}
	
	/**
	 * Update daily stats
	 * @param {number} accountId - OSRS account ID
	 * @param {Date} date - Date for stats
	 * @param {Object} updates - Stats to update
	 * @returns {Promise<Object>} Updated stats
	 */
	static async updateDailyStats(accountId, date, updates) {
		const {
			npcKills = 0,
			bossKills = 0,
			totalDrops = 0,
			totalXpGained = 0,
			playTimeMinutes = 0,
			eventsRecorded = 0,
			pointsEarned = 0
		} = updates;
		
		const query = `
			INSERT INTO osrs_account_daily_stats (
				osrs_account_id,
				stat_date,
				npc_kills,
				boss_kills,
				total_drops,
				total_xp_gained,
				play_time_minutes,
				events_recorded,
				points_earned
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (osrs_account_id, stat_date)
			DO UPDATE SET
				npc_kills = osrs_account_daily_stats.npc_kills + EXCLUDED.npc_kills,
				boss_kills = osrs_account_daily_stats.boss_kills + EXCLUDED.boss_kills,
				total_drops = osrs_account_daily_stats.total_drops + EXCLUDED.total_drops,
				total_xp_gained = osrs_account_daily_stats.total_xp_gained + EXCLUDED.total_xp_gained,
				play_time_minutes = osrs_account_daily_stats.play_time_minutes + EXCLUDED.play_time_minutes,
				events_recorded = osrs_account_daily_stats.events_recorded + EXCLUDED.events_recorded,
				points_earned = osrs_account_daily_stats.points_earned + EXCLUDED.points_earned,
				updated_at = CURRENT_TIMESTAMP
			RETURNING *
		`;
		
		const result = await db.query(query, [
			accountId,
			date,
			npcKills,
			bossKills,
			totalDrops,
			totalXpGained,
			playTimeMinutes,
			eventsRecorded,
			pointsEarned
		]);
		
		return result[0];
	}
	
	/**
	 * Search events by JSONB data
	 * @param {Object} searchCriteria - JSONB search criteria
	 * @param {Object} options - Query options
	 * @returns {Promise<Array>} Matching events
	 */
	static async searchByData(searchCriteria, options = {}) {
		const { limit = 100 } = options;
		
		const query = `
			SELECT 
				e.*,
				o.osrs_nickname
			FROM osrs_account_events e
			JOIN osrs_accounts o ON e.osrs_account_id = o.id
			WHERE e.event_data @> $1::jsonb
			ORDER BY e.created_at DESC
			LIMIT $2
		`;
		
		return await db.query(query, [JSON.stringify(searchCriteria), limit]);
	}
	
	/**
	 * Delete old events (for cleanup)
	 * @param {Date} beforeDate - Delete events before this date
	 * @returns {Promise<number>} Number of deleted events
	 */
	static async deleteOldEvents(beforeDate) {
		const query = `
			DELETE FROM osrs_account_events
			WHERE created_at < $1
		`;
		const result = await db.query(query, [beforeDate]);
		return result.rowCount || 0;
	}
	
	/**
	 * Get event count by type
	 * @param {string} eventType - Event type
	 * @param {Object} options - Query options
	 * @returns {Promise<number>} Event count
	 */
	static async getCountByType(eventType, options = {}) {
		const { startDate = null, endDate = null } = options;
		
		let query = `SELECT COUNT(*) as count FROM osrs_account_events WHERE event_type = $1`;
		const params = [eventType];
		let paramCount = 2;
		
		if (startDate) {
			query += ` AND created_at >= $${paramCount}`;
			params.push(startDate);
			paramCount++;
		}
		
		if (endDate) {
			query += ` AND created_at <= $${paramCount}`;
			params.push(endDate);
		}
		
		const result = await db.query(query, params);
		return parseInt(result[0].count);
	}
}

module.exports = AccountEvent;

