const db = require('../index');

/**
 * CollectionLog Model
 * Handles collection log item tracking
 */
class CollectionLog {
	/**
	 * Get all collection log items
	 * @returns {Promise<Array>} All collection log items
	 */
	static async getAllItems() {
		const query = 'SELECT * FROM collection_log_items ORDER BY category, subcategory, item_name';
		return await db.query(query);
	}
	
	/**
	 * Get collection log item by name
	 * @param {string} itemName - Item name
	 * @param {string} subcategory - Optional subcategory filter
	 * @returns {Promise<Object|null>} Collection log item or null
	 */
	static async getItem(itemName, subcategory = null) {
		let query = 'SELECT * FROM collection_log_items WHERE LOWER(item_name) = LOWER($1)';
		const params = [itemName];
		
		if (subcategory) {
			query += ' AND LOWER(subcategory) = LOWER($2)';
			params.push(subcategory);
		}
		
		query += ' LIMIT 1';
		
		const result = await db.query(query, params);
		return result[0] || null;
	}
	
	/**
	 * Get items by category
	 * @param {string} category - Category name
	 * @param {string} subcategory - Optional subcategory filter
	 * @returns {Promise<Array>} Collection log items
	 */
	static async getItemsByCategory(category, subcategory = null) {
		let query = 'SELECT * FROM collection_log_items WHERE LOWER(category) = LOWER($1)';
		const params = [category];
		
		if (subcategory) {
			query += ' AND LOWER(subcategory) = LOWER($2)';
			params.push(subcategory);
		}
		
		query += ' ORDER BY subcategory, item_name';
		
		return await db.query(query, params);
	}
	
	/**
	 * Create a new collection log item
	 * @param {Object} data - Item data
	 * @returns {Promise<Object>} Created item
	 */
	static async createItem(data) {
		const { itemName, category, subcategory, rarity, wikiUrl } = data;
		
		const query = `
			INSERT INTO collection_log_items (item_name, category, subcategory, rarity, wiki_url)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (item_name, subcategory) DO UPDATE SET
				category = EXCLUDED.category,
				rarity = EXCLUDED.rarity,
				wiki_url = EXCLUDED.wiki_url
			RETURNING *
		`;
		
		const result = await db.query(query, [itemName, category, subcategory, rarity, wikiUrl]);
		return result[0];
	}
	
	/**
	 * Bulk insert collection log items
	 * @param {Array<Object>} items - Array of item data
	 * @returns {Promise<void>}
	 */
	static async bulkCreateItems(items) {
		for (const item of items) {
			await this.createItem(item);
		}
	}
	
	/**
	 * Get obtained items for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Array>} Array of obtained items with details
	 */
	static async getObtainedItems(accountId) {
		const query = `
			SELECT 
				acl.id,
				acl.quantity,
				acl.obtained_at,
				acl.updated_at,
				cli.item_name,
				cli.category,
				cli.subcategory,
				cli.rarity
			FROM osrs_account_collection_log acl
			JOIN collection_log_items cli ON acl.collection_log_item_id = cli.id
			WHERE acl.osrs_account_id = $1
			ORDER BY acl.obtained_at DESC
		`;
		return await db.query(query, [accountId]);
	}
	
	/**
	 * Check if account has obtained an item
	 * @param {number} accountId - OSRS account ID
	 * @param {number} itemId - Collection log item ID
	 * @returns {Promise<boolean>} True if obtained
	 */
	static async hasObtained(accountId, itemId) {
		const query = `
			SELECT COUNT(*) as count
			FROM osrs_account_collection_log
			WHERE osrs_account_id = $1 AND collection_log_item_id = $2
		`;
		const result = await db.query(query, [accountId, itemId]);
		return result[0].count > 0;
	}
	
	/**
	 * Get quantity of a specific item for an account
	 * @param {number} accountId - OSRS account ID
	 * @param {number} itemId - Collection log item ID
	 * @returns {Promise<number>} Quantity (0 if not obtained)
	 */
	static async getQuantity(accountId, itemId) {
		const query = `
			SELECT quantity
			FROM osrs_account_collection_log
			WHERE osrs_account_id = $1 AND collection_log_item_id = $2
		`;
		const result = await db.query(query, [accountId, itemId]);
		return result[0]?.quantity || 0;
	}
	
	/**
	 * Mark item as obtained (or increment quantity if already obtained)
	 * @param {number} accountId - OSRS account ID
	 * @param {number} itemId - Collection log item ID
	 * @param {number} incrementBy - How many to add (default 1)
	 * @returns {Promise<Object>} Created/updated record
	 */
	static async markObtained(accountId, itemId, incrementBy = 1) {
		const query = `
			INSERT INTO osrs_account_collection_log (
				osrs_account_id,
				collection_log_item_id,
				quantity
			) VALUES ($1, $2, $3)
			ON CONFLICT (osrs_account_id, collection_log_item_id) 
			DO UPDATE SET 
				quantity = osrs_account_collection_log.quantity + EXCLUDED.quantity,
				updated_at = CURRENT_TIMESTAMP
			RETURNING *
		`;
		const result = await db.query(query, [accountId, itemId, incrementBy]);
		return result[0];
	}
	
	/**
	 * Record a collection log drop occurrence
	 * @param {number} accountId - OSRS account ID
	 * @param {number} itemId - Collection log item ID
	 * @param {Object} dropData - Drop details
	 * @returns {Promise<Object>} Created drop record
	 */
	static async recordDrop(accountId, itemId, dropData = {}) {
		const { source, killcount, eventData } = dropData;
		
		const query = `
			INSERT INTO osrs_account_collection_log_drops (
				osrs_account_id,
				collection_log_item_id,
				source_activity,
				killcount_at_drop,
				event_data
			) VALUES ($1, $2, $3, $4, $5)
			RETURNING *
		`;
		
		const result = await db.query(query, [
			accountId,
			itemId,
			source || null,
			killcount || null,
			eventData ? JSON.stringify(eventData) : null
		]);
		
		return result[0];
	}
	
	/**
	 * Get all drop occurrences for a specific item
	 * @param {number} accountId - OSRS account ID
	 * @param {number} itemId - Collection log item ID
	 * @returns {Promise<Array>} Array of drop records
	 */
	static async getDropHistory(accountId, itemId) {
		const query = `
			SELECT 
				d.*,
				cli.item_name,
				cli.category,
				cli.subcategory
			FROM osrs_account_collection_log_drops d
			JOIN collection_log_items cli ON d.collection_log_item_id = cli.id
			WHERE d.osrs_account_id = $1 AND d.collection_log_item_id = $2
			ORDER BY d.dropped_at ASC
		`;
		return await db.query(query, [accountId, itemId]);
	}
	
	/**
	 * Get all drops for an account
	 * @param {number} accountId - OSRS account ID
	 * @param {Object} options - Query options
	 * @returns {Promise<Array>} Array of drop records
	 */
	static async getAllDrops(accountId, options = {}) {
		const { limit = 100, source = null } = options;
		
		let query = `
			SELECT 
				d.*,
				cli.item_name,
				cli.category,
				cli.subcategory,
				cli.rarity
			FROM osrs_account_collection_log_drops d
			JOIN collection_log_items cli ON d.collection_log_item_id = cli.id
			WHERE d.osrs_account_id = $1
		`;
		
		const params = [accountId];
		
		if (source) {
			query += ` AND d.source_activity = $2`;
			params.push(source);
			query += ` ORDER BY d.dropped_at DESC LIMIT $3`;
			params.push(limit);
		} else {
			query += ` ORDER BY d.dropped_at DESC LIMIT $2`;
			params.push(limit);
		}
		
		return await db.query(query, params);
	}
	
	/**
	 * Get drop count for a specific item
	 * @param {number} accountId - OSRS account ID
	 * @param {number} itemId - Collection log item ID
	 * @returns {Promise<number>} Number of times dropped
	 */
	static async getDropCount(accountId, itemId) {
		const query = `
			SELECT COUNT(*) as count
			FROM osrs_account_collection_log_drops
			WHERE osrs_account_id = $1 AND collection_log_item_id = $2
		`;
		const result = await db.query(query, [accountId, itemId]);
		return parseInt(result[0].count);
	}
	
	/**
	 * Set exact quantity for an item
	 * @param {number} accountId - OSRS account ID
	 * @param {number} itemId - Collection log item ID
	 * @param {number} quantity - Exact quantity to set
	 * @returns {Promise<Object>} Updated record
	 */
	static async setQuantity(accountId, itemId, quantity) {
		const query = `
			INSERT INTO osrs_account_collection_log (
				osrs_account_id,
				collection_log_item_id,
				quantity
			) VALUES ($1, $2, $3)
			ON CONFLICT (osrs_account_id, collection_log_item_id) 
			DO UPDATE SET 
				quantity = EXCLUDED.quantity,
				updated_at = CURRENT_TIMESTAMP
			RETURNING *
		`;
		const result = await db.query(query, [accountId, itemId, quantity]);
		return result[0];
	}
	
	/**
	 * Get killcount for an activity
	 * @param {number} accountId - OSRS account ID
	 * @param {string} activityName - Boss/activity name
	 * @returns {Promise<Object|null>} Killcount record or null
	 */
	static async getKillcount(accountId, activityName) {
		const query = `
			SELECT * FROM osrs_account_killcounts
			WHERE osrs_account_id = $1 AND LOWER(activity_name) = LOWER($2)
		`;
		const result = await db.query(query, [accountId, activityName]);
		return result[0] || null;
	}
	
	/**
	 * Update killcount for an activity
	 * @param {number} accountId - OSRS account ID
	 * @param {string} activityName - Boss/activity name
	 * @param {number} killcount - New killcount
	 * @returns {Promise<Object>} Updated killcount record
	 */
	static async updateKillcount(accountId, activityName, killcount) {
		const query = `
			INSERT INTO osrs_account_killcounts (
				osrs_account_id,
				activity_name,
				killcount
			) VALUES ($1, $2, $3)
			ON CONFLICT (osrs_account_id, activity_name)
			DO UPDATE SET
				killcount = EXCLUDED.killcount,
				last_updated = CURRENT_TIMESTAMP
			RETURNING *
		`;
		const result = await db.query(query, [accountId, activityName, killcount]);
		return result[0];
	}
	
	/**
	 * Get all killcounts for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Array>} Array of killcount records
	 */
	static async getAllKillcounts(accountId) {
		const query = `
			SELECT * FROM osrs_account_killcounts
			WHERE osrs_account_id = $1
			ORDER BY killcount DESC
		`;
		return await db.query(query, [accountId]);
	}
	
	/**
	 * Get collection log summary for an account
	 * @param {number} accountId - OSRS account ID
	 * @returns {Promise<Object>} Summary object
	 */
	static async getSummary(accountId) {
		const query = `
			SELECT 
				clog_items_obtained,
				clog_total_items,
				clog_completion_percentage
			FROM osrs_accounts
			WHERE id = $1
		`;
		const result = await db.query(query, [accountId]);
		return result[0] || {
			clog_items_obtained: 0,
			clog_total_items: 0,
			clog_completion_percentage: 0
		};
	}
	
	/**
	 * Get collection log leaderboard
	 * @param {number} limit - Number of results
	 * @returns {Promise<Array>} Leaderboard entries
	 */
	static async getLeaderboard(limit = 100) {
		const query = `
			SELECT 
				osrs_nickname,
				clog_items_obtained,
				clog_total_items,
				clog_completion_percentage,
				ROW_NUMBER() OVER (ORDER BY clog_items_obtained DESC) as rank
			FROM osrs_accounts
			WHERE clog_items_obtained > 0
			ORDER BY clog_items_obtained DESC
			LIMIT $1
		`;
		return await db.query(query, [limit]);
	}
	
	/**
	 * Get killcount leaderboard for an activity
	 * @param {string} activityName - Boss/activity name
	 * @param {number} limit - Number of results
	 * @returns {Promise<Array>} Leaderboard entries
	 */
	static async getKillcountLeaderboard(activityName, limit = 100) {
		const query = `
			SELECT 
				o.osrs_nickname,
				k.killcount,
				k.last_updated,
				ROW_NUMBER() OVER (ORDER BY k.killcount DESC) as rank
			FROM osrs_account_killcounts k
			JOIN osrs_accounts o ON k.osrs_account_id = o.id
			WHERE LOWER(k.activity_name) = LOWER($1)
			ORDER BY k.killcount DESC
			LIMIT $2
		`;
		return await db.query(query, [activityName, limit]);
	}
}

module.exports = CollectionLog;

