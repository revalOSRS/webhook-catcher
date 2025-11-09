/**
 * Member Model
 * Represents a Discord clan member
 * 
 * This model stores Discord user information only.
 * OSRS account information is stored in the OSRSAccount model.
 * 
 * Relationship: 1 Member → Many OSRSAccounts
 */

const { query, queryOne } = require('../index');

/**
 * @typedef {Object} MemberData
 * @property {number} [id] - Auto-generated ID
 * @property {string} discordId - Discord user ID (unique)
 * @property {string} [discordTag] - Discord username
 * @property {number} [memberCode] - Unique 9-digit member identification code
 * @property {number} [tokenBalance] - Current token balance (1 token = 1M GP)
 * @property {boolean} [isActive] - Whether member is currently active
 * @property {boolean} [inDiscord] - Whether member is currently in Discord server
 * @property {string} [notes] - Admin notes about the member
 * @property {Date} [createdAt] - When the member was added
 * @property {Date} [updatedAt] - Last time the record was updated
 * @property {Date} [lastSeen] - Last time the member was seen/active
 */

class Member {
	/**
	 * Create the members table if it doesn't exist
	 * Note: OSRS fields removed. Use OSRSAccount model for OSRS data.
	 * @returns {Promise<void>}
	 */
	static async createTable() {
		// Create table
		const createTableSql = `
			CREATE TABLE IF NOT EXISTS members (
				id SERIAL PRIMARY KEY,
				discord_id VARCHAR(20) NOT NULL UNIQUE,
				discord_tag VARCHAR(37),
				member_code INTEGER UNIQUE NOT NULL,
				token_balance INTEGER DEFAULT 0 NOT NULL,
				is_active BOOLEAN DEFAULT true,
				in_discord BOOLEAN DEFAULT true,
				notes TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`;
		await query(createTableSql);
		
		// Create indexes
		await query(`CREATE INDEX IF NOT EXISTS idx_discord_id ON members(discord_id)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_member_code ON members(member_code)`);
		
		// Create trigger for updated_at
		await query(`
			CREATE OR REPLACE FUNCTION update_updated_at_column()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = CURRENT_TIMESTAMP;
				RETURN NEW;
			END;
			$$ language 'plpgsql';
		`);
		
		await query(`
			DROP TRIGGER IF EXISTS update_members_updated_at ON members;
		`);
		
		await query(`
			CREATE TRIGGER update_members_updated_at
			BEFORE UPDATE ON members
			FOR EACH ROW
			EXECUTE FUNCTION update_updated_at_column();
		`);
		
		console.log('✅ Members table created/verified');
	}

	/**
	 * Create a new member
	 * @param {MemberData} data - Member data
	 * @returns {Promise<number>} The ID of the created member
	 * 
	 * Note: For OSRS account data, use OSRSAccount.create() instead.
	 */
	static async create(data) {
		// Generate a unique member code if not provided
		const memberCode = data.memberCode || await this.generateUniqueMemberCode();
		
		const sql = `
			INSERT INTO members (
				discord_id, discord_tag, member_code, is_active, in_discord, notes
			) VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		`;
		
		const params = [
			data.discordId,
			data.discordTag || null,
			memberCode,
			data.isActive !== undefined ? data.isActive : true,
			data.inDiscord !== undefined ? data.inDiscord : true,
			data.notes || null
		];
		
		const result = await query(sql, params);
		return result[0].id;
	}

	/**
	 * Generate a unique 9-digit member code
	 * Retries up to 10 times if code already exists
	 * @returns {Promise<number>} A unique 9-digit member code
	 * @private
	 */
	static async generateUniqueMemberCode() {
		const maxAttempts = 10;
		
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			// Generate a random 9-digit number (100000000 to 999999999)
			const code = Math.floor(100000000 + Math.random() * 900000000);
			
			// Check if this code already exists
			const existing = await queryOne(
				'SELECT id FROM members WHERE member_code = $1',
				[code]
			);
			
			if (!existing) {
				return code;
			}
		}
		
		throw new Error('Failed to generate unique member code after 10 attempts');
	}

	/**
	 * Format a member code as xxx-xxx-xxx
	 * @param {number} code - The 9-digit member code
	 * @returns {string} Formatted code (e.g., "123-456-789")
	 */
	static formatMemberCode(code) {
		const codeStr = code.toString().padStart(9, '0');
		return `${codeStr.slice(0, 3)}-${codeStr.slice(3, 6)}-${codeStr.slice(6, 9)}`;
	}

	/**
	 * Find a member by ID
	 * @param {number} id - Member ID
	 * @returns {Promise<MemberData|null>}
	 */
	static async findById(id) {
		const sql = 'SELECT * FROM members WHERE id = $1';
		const member = await queryOne(sql, [id]);
		return member ? this._formatMember(member) : null;
	}

	/**
	 * Find a member by Discord ID
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<MemberData|null>}
	 */
	static async findByDiscordId(discordId) {
		const sql = 'SELECT * FROM members WHERE discord_id = $1';
		const member = await queryOne(sql, [discordId]);
		return member ? this._formatMember(member) : null;
	}

	/**
	 * Find a member by Discord Tag
	 * @param {string} discordTag - Discord username
	 * @returns {Promise<MemberData|null>}
	 */
	static async findByDiscordTag(discordTag) {
		const sql = 'SELECT * FROM members WHERE discord_tag = $1';
		const member = await queryOne(sql, [discordTag]);
		return member ? this._formatMember(member) : null;
	}

	/**
	 * Find a member by member code
	 * @param {number} memberCode - Unique 9-digit member code
	 * @returns {Promise<MemberData|null>}
	 */
	static async findByMemberCode(memberCode) {
		const sql = 'SELECT * FROM members WHERE member_code = $1';
		const member = await queryOne(sql, [memberCode]);
		return member ? this._formatMember(member) : null;
	}

	/**
	 * Get all members
	 * @param {Object} [options={}] - Query options
	 * @param {boolean} [options.activeOnly=false] - Only return active members
	 * @param {string} [options.orderBy='created_at'] - Order by field
	 * @param {string} [options.order='DESC'] - Sort order (ASC/DESC)
	 * @param {number} [options.limit] - Limit results
	 * @returns {Promise<MemberData[]>}
	 */
	static async findAll(options = {}) {
		const { activeOnly = false, orderBy = 'created_at', order = 'DESC', limit } = options;
		
		let sql = 'SELECT * FROM members';
		const params = [];
		let paramCount = 1;
		
		if (activeOnly) {
			sql += ` WHERE is_active = $${paramCount++}`;
			params.push(true);
		}
		
		sql += ` ORDER BY ${orderBy} ${order}`;
		
		if (limit) {
			sql += ` LIMIT $${paramCount++}`;
			params.push(limit);
		}
		
		const members = await query(sql, params);
		return members.map(m => this._formatMember(m));
	}

	/**
	 * Update a member by ID
	 * @param {number} id - Member ID
	 * @param {Partial<MemberData>} data - Data to update
	 * @returns {Promise<boolean>} True if updated, false if not found
	 */
	static async updateById(id, data) {
		const fields = [];
		const params = [];
		let paramCount = 1;
		
		if (data.discordTag !== undefined) {
			fields.push(`discord_tag = $${paramCount++}`);
			params.push(data.discordTag);
		}
		if (data.isActive !== undefined) {
			fields.push(`is_active = $${paramCount++}`);
			params.push(data.isActive);
		}
		if (data.inDiscord !== undefined) {
			fields.push(`in_discord = $${paramCount++}`);
			params.push(data.inDiscord);
		}
		if (data.notes !== undefined) {
			fields.push(`notes = $${paramCount++}`);
			params.push(data.notes);
		}
		
		if (fields.length === 0) {
			return false;
		}
		
		params.push(id);
		const sql = `UPDATE members SET ${fields.join(', ')} WHERE id = $${paramCount}`;
		const result = await query(sql, params);
		
		return result.rowCount > 0;
	}

	/**
	 * Update a member by Discord ID
	 * @param {string} discordId - Discord user ID
	 * @param {Partial<MemberData>} data - Data to update
	 * @returns {Promise<boolean>} True if updated, false if not found
	 */
	static async updateByDiscordId(discordId, data) {
		const fields = [];
		const params = [];
		let paramCount = 1;
		
		if (data.discordTag !== undefined) {
			fields.push(`discord_tag = $${paramCount++}`);
			params.push(data.discordTag);
		}
		if (data.isActive !== undefined) {
			fields.push(`is_active = $${paramCount++}`);
			params.push(data.isActive);
		}
		if (data.inDiscord !== undefined) {
			fields.push(`in_discord = $${paramCount++}`);
			params.push(data.inDiscord);
		}
		if (data.notes !== undefined) {
			fields.push(`notes = $${paramCount++}`);
			params.push(data.notes);
		}
		
		if (fields.length === 0) {
			return false;
		}
		
		params.push(discordId);
		const sql = `UPDATE members SET ${fields.join(', ')} WHERE discord_id = $${paramCount}`;
		const result = await query(sql, params);
		
		return result.rowCount > 0;
	}

	/**
	 * Update last seen timestamp
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<boolean>}
	 */
	static async updateLastSeen(discordId) {
		const sql = 'UPDATE members SET last_seen = CURRENT_TIMESTAMP WHERE discord_id = $1';
		const result = await query(sql, [discordId]);
		return result.rowCount > 0;
	}

	/**
	 * Delete a member by ID
	 * @param {number} id - Member ID
	 * @returns {Promise<boolean>} True if deleted, false if not found
	 */
	static async deleteById(id) {
		const sql = 'DELETE FROM members WHERE id = $1';
		const result = await query(sql, [id]);
		return result.rowCount > 0;
	}

	/**
	 * Delete a member by Discord ID
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<boolean>} True if deleted, false if not found
	 */
	static async deleteByDiscordId(discordId) {
		const sql = 'DELETE FROM members WHERE discord_id = $1';
		const result = await query(sql, [discordId]);
		return result.rowCount > 0;
	}

	/**
	 * Count total members
	 * @param {boolean} [activeOnly=false] - Only count active members
	 * @returns {Promise<number>}
	 */
	static async count(activeOnly = false) {
		let sql = 'SELECT COUNT(*) as count FROM members';
		const params = [];
		
		if (activeOnly) {
			sql += ' WHERE is_active = $1';
			params.push(true);
		}
		
		const result = await queryOne(sql, params);
		return parseInt(result.count);
	}

	/**
	 * Add tokens to a member's balance
	 * @param {string} discordId - Discord user ID
	 * @param {number} amount - Amount of tokens to add
	 * @param {Object} details - Movement details
	 * @param {string} details.type - Type of movement (earned, adjustment, etc.)
	 * @param {string} details.description - Description of the movement
	 * @param {string} details.createdBy - Discord ID of who created this movement
	 * @param {number} [details.eventId] - Event ID if earned from an event
	 * @param {string} [details.note] - Additional notes
	 * @returns {Promise<Object>} Updated balance and movement record
	 */
	static async addTokens(discordId, amount, details) {
		const TokenMovement = require('./TokenMovement');
		
		// Get member
		const member = await this.findByDiscordId(discordId);
		if (!member) {
			throw new Error('Member not found');
		}
		
		// Calculate new balance
		const balanceBefore = member.tokenBalance || 0;
		const balanceAfter = balanceBefore + amount;
		
		// Create movement record (trigger will update member balance)
		const movement = await TokenMovement.create({
			memberId: member.id,
			discordId: member.discordId,
			type: details.type,
			amount: amount,
			balanceBefore: balanceBefore,
			balanceAfter: balanceAfter,
			eventId: details.eventId || null,
			description: details.description,
			note: details.note || null,
			createdBy: details.createdBy
		});
		
		return {
			balanceBefore,
			balanceAfter,
			movement
		};
	}

	/**
	 * Subtract tokens from a member's balance
	 * @param {string} discordId - Discord user ID
	 * @param {number} amount - Amount of tokens to subtract (positive number)
	 * @param {Object} details - Movement details
	 * @param {string} details.type - Type of movement (payout, adjustment, etc.)
	 * @param {string} details.description - Description of the movement
	 * @param {string} details.createdBy - Discord ID of who created this movement
	 * @param {string} [details.note] - Additional notes
	 * @returns {Promise<Object>} Updated balance and movement record
	 */
	static async subtractTokens(discordId, amount, details) {
		const TokenMovement = require('./TokenMovement');
		
		// Get member
		const member = await this.findByDiscordId(discordId);
		if (!member) {
			throw new Error('Member not found');
		}
		
		// Check if member has enough tokens
		const balanceBefore = member.tokenBalance || 0;
		if (balanceBefore < amount) {
			throw new Error(`Insufficient tokens. Has ${balanceBefore}, needs ${amount}`);
		}
		
		// Calculate new balance
		const balanceAfter = balanceBefore - amount;
		
		// Create movement record with negative amount
		const movement = await TokenMovement.create({
			memberId: member.id,
			discordId: member.discordId,
			type: details.type,
			amount: -amount, // Negative for subtraction
			balanceBefore: balanceBefore,
			balanceAfter: balanceAfter,
			description: details.description,
			note: details.note || null,
			createdBy: details.createdBy
		});
		
		return {
			balanceBefore,
			balanceAfter,
			movement
		};
	}

	/**
	 * Get a member's token balance
	 * @param {string} discordId - Discord user ID
	 * @returns {Promise<number>} Current token balance
	 */
	static async getTokenBalance(discordId) {
		const member = await this.findByDiscordId(discordId);
		return member ? (member.tokenBalance || 0) : 0;
	}

	/**
	 * Get leaderboard of members by token balance
	 * @param {number} [limit=10] - Number of results
	 * @returns {Promise<MemberData[]>}
	 */
	static async getTokenLeaderboard(limit = 10) {
		const sql = `
			SELECT * FROM members 
			WHERE token_balance > 0 
			ORDER BY token_balance DESC, created_at ASC 
			LIMIT $1
		`;
		const members = await query(sql, [limit]);
		return members.map(m => this._formatMember(m));
	}

	/**
	 * Format database row to member object
	 * @private
	 * @param {Object} row - Database row
	 * @returns {MemberData}
	 */
	static _formatMember(row) {
		return {
			id: row.id,
			discordId: row.discord_id,
			discordTag: row.discord_tag,
			memberCode: row.member_code,
			tokenBalance: row.token_balance || 0,
			isActive: Boolean(row.is_active),
			inDiscord: Boolean(row.in_discord),
			notes: row.notes,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			lastSeen: row.last_seen
		};
	}
}

module.exports = Member;

