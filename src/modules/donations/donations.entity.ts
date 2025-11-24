/**
 * Donations Entity
 * Basic CRUD operations for donations and donation categories
 */

import { query } from '../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../base-entity.js'

/**
 * Donation Data Interface
 */
export interface Donation extends BaseEntityData {
  id?: number
  playerDiscordId: string
  amount: number
  screenshotUrl?: string
  status?: 'pending' | 'approved' | 'denied'
  submittedAt?: Date
  reviewedAt?: Date
  reviewedBy?: string
  denialReason?: string
  messageId?: string
  channelId?: string
  note?: string
}


/**
 * Donations Entity Class
 * Basic CRUD operations for donations
 */
export class DonationsEntity extends BaseEntity<Donation> {
  protected tableName = 'donations'
  protected primaryKey = 'id'
  protected camelCaseFields = ['playerDiscordId', 'screenshotUrl', 'submittedAt', 'reviewedAt', 'reviewedBy', 'denialReason', 'messageId', 'channelId']

  /**
   * Create the donations table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        player_discord_id VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        screenshot_url TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by VARCHAR(20),
        denial_reason TEXT,
        message_id VARCHAR(20),
        channel_id VARCHAR(20),
        note TEXT
      )
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_donations_player_discord_id ON donations(player_discord_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_donations_submitted_at ON donations(submitted_at)`)

    console.log('✅ Donations table created/verified')
  }

  /**
   * Find donations by player Discord ID
   */
  async findByPlayerDiscordId(discordId: string, status?: string): Promise<Donation[]> {
    const where: any = { playerDiscordId: discordId }
    if (status) {
      where.status = status
    }

    return this.findAll({
      where,
      orderBy: 'submittedAt',
      order: 'DESC'
    })
  }

  /**
   * Find pending donations
   */
  async findPending(): Promise<Donation[]> {
    return this.findAll({
      where: { status: 'pending' },
      orderBy: 'submittedAt',
      order: 'ASC'
    })
  }

  /**
   * Update donation status
   */
  async updateStatus(id: number, status: 'pending' | 'approved' | 'denied', reviewedBy: string, denialReason?: string): Promise<Donation> {
    const updateData: Partial<Donation> = {
      status,
      reviewedBy,
      reviewedAt: new Date()
    }

    if (denialReason) {
      updateData.denialReason = denialReason
    }

    const result = await this.updateById(id, updateData)
    if (!result) {
      throw new Error(`Donation with id ${id} not found`)
    }
    return result
  }

}

