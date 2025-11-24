/**
 * Members Entity
 * Basic CRUD operations for members
 */

import { query, queryOne, pool } from '../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../base-entity.js'

/**
 * Member Data Interface
 */
export interface MemberData extends BaseEntityData {
  id?: number
  discordId: string
  discordTag?: string
  memberCode?: number
  tokenBalance?: number
  isActive?: boolean
  inDiscord?: boolean
  notes?: string
  createdAt?: Date
  updatedAt?: Date
  lastSeen?: Date
}

/**
 * Members Entity Class
 * Basic CRUD operations for members
 */
export class MembersEntity extends BaseEntity<MemberData> {
  protected tableName = 'members'
  protected primaryKey = 'id'
  protected camelCaseFields = ['discordId', 'discordTag', 'memberCode', 'tokenBalance', 'isActive', 'inDiscord', 'createdAt', 'updatedAt', 'lastSeen']

  /**
   * Create the members table if it doesn't exist
   */
  static async createTable(): Promise<void> {
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
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_discord_id ON members(discord_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_member_code ON members(member_code)`)

    // Create trigger for updated_at
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP
        RETURN NEW
      END
      $$ language 'plpgsql'
    `)

    await query(`DROP TRIGGER IF EXISTS update_members_updated_at ON members`)
    await query(`
      CREATE TRIGGER update_members_updated_at
      BEFORE UPDATE ON members
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `)

    console.log('✅ Members table created/verified')
  }

  /**
   * Generate a unique 9-digit member code
   */
  static async generateUniqueMemberCode(): Promise<number> {
    const maxAttempts = 10

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = Math.floor(100000000 + Math.random() * 900000000)
      const existing = await queryOne('SELECT id FROM members WHERE member_code = $1', [code])
      if (!existing) return code
    }

    throw new Error('Failed to generate unique member code after 10 attempts')
  }

  /**
   * Format a member code as xxx-xxx-xxx
   */
  static formatMemberCode(code: number): string {
    const codeStr = code.toString().padStart(9, '0')
    return `${codeStr.slice(0, 3)}-${codeStr.slice(3, 6)}-${codeStr.slice(6, 9)}`
  }

  /**
   * Find member by Discord ID
   */
  async findByDiscordId(discordId: string): Promise<MemberData | null> {
    return this.findOne({ discordId })
  }

  /**
   * Find member by member code
   */
  async findByMemberCode(memberCode: number): Promise<MemberData | null> {
    return this.findOne({ memberCode })
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(discordId: string): Promise<boolean> {
    const result = await this.executeQuery(
      'UPDATE members SET last_seen = CURRENT_TIMESTAMP WHERE discord_id = $1',
      [discordId]
    )
    return (result.rowCount || 0) > 0
  }

  /**
   * Get token leaderboard
   */
  async getTokenLeaderboard(limit: number = 10): Promise<MemberData[]> {
    const sql = `
      SELECT * FROM members
      WHERE token_balance > 0
      ORDER BY token_balance DESC, created_at ASC
      LIMIT $1
    `
    const results = await query(sql, [limit])
    return results.map(row => this.formatFromDb(row))
  }
}
