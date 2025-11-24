/**
 * OSRS Accounts Entity
 * Basic CRUD operations for OSRS accounts
 */

import { query } from '../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../base-entity.js'

/**
 * OSRS Account Data Interface
 */
export interface OsrsAccount extends BaseEntityData {
  id?: number
  discordId: string
  osrsNickname: string
  dinkHash?: string
  womPlayerId?: number
  womRank?: string
  ehp?: number
  ehb?: number
  isPrimary?: boolean
  lastSyncedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

/**
 * OSRS Accounts Entity Class
 * Basic CRUD operations for OSRS accounts
 */
export class OsrsAccountsEntity extends BaseEntity<OsrsAccount> {
  protected tableName = 'osrs_accounts'
  protected primaryKey = 'id'
  protected camelCaseFields = ['discordId', 'osrsNickname', 'dinkHash', 'womPlayerId', 'womRank', 'isPrimary', 'lastSyncedAt', 'createdAt', 'updatedAt']

  /**
   * Create the osrs_accounts table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS osrs_accounts (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(255) NOT NULL,
        osrs_nickname VARCHAR(12) NOT NULL,
        dink_hash VARCHAR(255),
        wom_player_id INTEGER,
        wom_rank VARCHAR(50),
        ehp DECIMAL(10, 2) DEFAULT 0,
        ehb DECIMAL(10, 2) DEFAULT 0,
        is_primary BOOLEAN DEFAULT false,
        last_synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(osrs_nickname),
        FOREIGN KEY (discord_id) REFERENCES members(discord_id) ON DELETE CASCADE
      )
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_osrs_accounts_discord_id ON osrs_accounts(discord_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_osrs_accounts_wom_player_id ON osrs_accounts(wom_player_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_osrs_accounts_dink_hash ON osrs_accounts(dink_hash)`)

    console.log('✅ OSRS Accounts table created/verified')
  }

  /**
   * Find accounts by Discord ID
   */
  async findByDiscordId(discordId: string): Promise<OsrsAccount[]> {
    return this.findAll({
      where: { discordId },
      orderBy: 'isPrimary',
      order: 'DESC' // Primary accounts first
    })
  }

  /**
   * Find account by OSRS nickname
   */
  async findByOsrsNickname(osrsNickname: string): Promise<OsrsAccount | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE LOWER(osrs_nickname) = LOWER($1)`
    const result = await this.executeQuery(sql, [osrsNickname])
    const row = result.rows[0]
    return row ? this.formatFromDb(row) : null
  }

  /**
   * Find account by WOM player ID
   */
  async findByWomPlayerId(womPlayerId: number): Promise<OsrsAccount | null> {
    return this.findOne({ womPlayerId })
  }

  /**
   * Find account by Dink hash
   */
  async findByDinkHash(dinkHash: string): Promise<OsrsAccount | null> {
    return this.findOne({ dinkHash })
  }

  /**
   * Set an account as primary (and unset others for that Discord user)
   */
  async setPrimary(accountId: number, discordId: string): Promise<void> {
    // Unset all primary flags for this Discord user
    await this.updateMany(
      { discordId },
      { isPrimary: false }
    )

    // Set this account as primary
    await this.updateById(accountId, { isPrimary: true })
  }

  /**
   * Get the account with highest EHP+EHB for a Discord user
   */
  async getHighestEfficiency(discordId: string): Promise<OsrsAccount | null> {
    const sql = `
      SELECT *, (ehp + ehb) as total_efficiency
      FROM ${this.tableName}
      WHERE discord_id = $1
      ORDER BY total_efficiency DESC
      LIMIT 1
    `
    const result = await this.executeQuery(sql, [discordId])
    const row = result.rows[0]
    return row ? this.formatFromDb(row) : null
  }

  /**
   * Get all accounts with their total efficiency
   */
  async getAllWithEfficiency(discordId: string): Promise<OsrsAccount[]> {
    const sql = `
      SELECT *, (ehp + ehb) as total_efficiency
      FROM ${this.tableName}
      WHERE discord_id = $1
      ORDER BY total_efficiency DESC
    `
    const result = await this.executeQuery(sql, [discordId])
    return result.rows.map(row => this.formatFromDb(row))
  }

  /**
   * Update sync timestamp
   */
  async updateSyncTimestamp(accountId: number): Promise<boolean> {
    try {
      await this.updateById(accountId, { lastSyncedAt: new Date() })
      return true
    } catch (error) {
      console.error('Failed to update sync timestamp:', error)
      return false
    }
  }
}
