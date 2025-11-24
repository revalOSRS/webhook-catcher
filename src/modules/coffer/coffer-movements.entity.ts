/**
 * Coffer Movements Entity
 * Basic CRUD operations for coffer movements tracking
 */

import { query } from '../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../base-entity.js'

/**
 * Coffer Movement Data Interface
 */
export interface CofferMovement extends BaseEntityData {
  id?: number
  type: 'donation' | 'withdrawal' | 'manual_adjustment'
  amount: number
  playerDiscordId?: string
  donationId?: number
  description?: string
  note?: string
  balanceBefore: number
  balanceAfter: number
  createdAt?: Date
  createdBy: string
}

/**
 * Coffer Movements Entity Class
 * Basic CRUD operations for coffer movements
 */
export class CofferMovementsEntity extends BaseEntity<CofferMovement> {
  protected tableName = 'coffer_movements'
  protected primaryKey = 'id'
  protected camelCaseFields = ['playerDiscordId', 'donationId', 'balanceBefore', 'balanceAfter', 'createdAt', 'createdBy']

  /**
   * Create the coffer_movements table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const movementsTableSql = `
      CREATE TABLE IF NOT EXISTS coffer_movements (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        player_discord_id VARCHAR(20),
        donation_id INTEGER,
        description TEXT,
        note TEXT,
        balance_before DECIMAL(15, 2) NOT NULL,
        balance_after DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(20) NOT NULL
      )
    `
    await query(movementsTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_coffer_movements_type ON coffer_movements(type)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_coffer_movements_player_discord_id ON coffer_movements(player_discord_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_coffer_movements_created_at ON coffer_movements(created_at)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_coffer_movements_donation_id ON coffer_movements(donation_id)`)

    console.log('✅ Coffer Movements table created/verified')
  }

  /**
   * Get recent movements with joined data
   */
  async getRecentWithJoins(limit: number = 10): Promise<Array<CofferMovement & {
    playerUsername?: string
  }>> {
    const sql = `
      SELECT cm.*,
             m.discord_tag as player_username
      FROM ${this.tableName} cm
      LEFT JOIN members m ON cm.player_discord_id = m.discord_id
      ORDER BY cm.created_at DESC
      LIMIT $1
    `
    const result = await this.executeQuery(sql, [limit])
    return result.rows.map(row => ({
      ...this.formatFromDb(row),
      playerUsername: row.player_username
    })) as Array<CofferMovement & { playerUsername?: string }>
  }

  /**
   * Get movements by type with joined data
   */
  async getByTypeWithJoins(type: string, limit: number = 50): Promise<Array<CofferMovement & {
    playerUsername?: string
  }>> {
    const sql = `
      SELECT cm.*,
             m.discord_tag as player_username
      FROM ${this.tableName} cm
      LEFT JOIN members m ON cm.player_discord_id = m.discord_id
      WHERE cm.type = $1
      ORDER BY cm.created_at DESC
      LIMIT $2
    `
    const result = await this.executeQuery(sql, [type, limit])
    return result.rows.map(row => ({
      ...this.formatFromDb(row),
      playerUsername: row.player_username
    })) as Array<CofferMovement & { playerUsername?: string }>
  }

  /**
   * Get movements by date range with joined data
   */
  async getByDateRangeWithJoins(startDate: Date, endDate: Date): Promise<Array<CofferMovement & {
    playerUsername?: string
  }>> {
    const sql = `
      SELECT cm.*,
             m.discord_tag as player_username
      FROM ${this.tableName} cm
      LEFT JOIN members m ON cm.player_discord_id = m.discord_id
      WHERE cm.created_at BETWEEN $1 AND $2
      ORDER BY cm.created_at DESC
    `
    const result = await this.executeQuery(sql, [startDate, endDate])
    return result.rows.map(row => ({
      ...this.formatFromDb(row),
      playerUsername: row.player_username
    })) as Array<CofferMovement & { playerUsername?: string }>
  }

  /**
   * Get coffer statistics for the last 30 days
   */
  async getStats(): Promise<{
    totalMovements: number
    totalDonations: number
    totalWithdrawals: number
    uniqueDonors: number
    avgDonation: number
  }> {
    const sql = `
      SELECT
        COUNT(*) as total_movements,
        SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END) as total_donations,
        SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
        COUNT(DISTINCT player_discord_id) as unique_donors,
        AVG(CASE WHEN type = 'donation' THEN amount END) as avg_donation
      FROM ${this.tableName}
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `
    const result = await this.executeQuery(sql)
    const stats = result.rows[0]

    return {
      totalMovements: Number(stats.total_movements),
      totalDonations: Number(stats.total_donations || 0),
      totalWithdrawals: Number(stats.total_withdrawals || 0),
      uniqueDonors: Number(stats.unique_donors),
      avgDonation: Number(stats.avg_donation || 0)
    }
  }

  /**
   * Get movements by player Discord ID
   */
  async getByPlayerDiscordId(playerDiscordId: string, limit: number = 20): Promise<CofferMovement[]> {
    return this.findAll({
      where: { playerDiscordId },
      orderBy: 'createdAt',
      order: 'DESC',
      limit
    })
  }


  /**
   * Get top donors with aggregated donation totals
   */
  async getTopDonors(limit: number = 10): Promise<Array<{
    playerDiscordId: string
    playerUsername?: string
    totalDonated: number
  }>> {
    const sql = `
      SELECT
        player_discord_id,
        SUM(amount) as total_donated,
        MAX(m.discord_tag) as player_username
      FROM ${this.tableName} cm
      LEFT JOIN members m ON cm.player_discord_id = m.discord_id
      WHERE type = 'donation'
      GROUP BY player_discord_id
      ORDER BY total_donated DESC
      LIMIT $1
    `
    const result = await this.executeQuery(sql, [limit])

    return result.rows.map(row => ({
      playerDiscordId: row.player_discord_id,
      playerUsername: row.player_username,
      totalDonated: Number(row.total_donated)
    }))
  }
}
