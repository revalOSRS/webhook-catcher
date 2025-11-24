/**
 * Coffer Balance Entity
 * Basic CRUD operations for coffer balance tracking
 */

import { query } from '../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../base-entity.js'

/**
 * Coffer Balance Data Interface
 */
export interface CofferBalance extends BaseEntityData {
  id: number // Always 1 (singleton table)
  balance: number
  lastUpdated?: Date
  updatedBy?: string
}

/**
 * Coffer Balance Entity Class
 * Manages the singleton coffer balance table
 */
export class CofferBalanceEntity extends BaseEntity<CofferBalance> {
  protected tableName = 'coffer_balance'
  protected primaryKey = 'id'
  protected camelCaseFields = ['lastUpdated', 'updatedBy']

  /**
   * Create the coffer_balance table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS coffer_balance (
        id INTEGER PRIMARY KEY DEFAULT 1,
        balance DECIMAL(15, 2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(20)
      )
    `
    await query(createTableSql)

    // Insert default balance if not exists
    await query(`
      INSERT INTO coffer_balance (id, balance, updated_by)
      VALUES (1, 0, 'system')
      ON CONFLICT (id) DO NOTHING
    `)

    console.log('✅ Coffer Balance table created/verified')
  }

  /**
   * Get current coffer balance
   */
  static async getCurrentBalance(): Promise<number> {
    const result = await query('SELECT balance FROM coffer_balance WHERE id = 1')
    return result.length > 0 ? Number(result[0].balance) : 0
  }

  /**
   * Update balance manually (admin function)
   */
  static async updateBalance(newBalance: number, updatedBy: string = 'system'): Promise<number> {
    const currentBalance = await this.getCurrentBalance()

    if (currentBalance !== newBalance) {
      // Update balance
      await query('UPDATE coffer_balance SET balance = $1, last_updated = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = 1', [newBalance, updatedBy])
    }

    return newBalance
  }

  /**
   * Get the balance record
   */
  static async getBalanceRecord(): Promise<CofferBalance | null> {
    const result = await query('SELECT * FROM coffer_balance WHERE id = 1')
    if (result.length === 0) {
      return null
    }

    const entity = new CofferBalanceEntity()
    return entity.formatFromDb(result[0])
  }

  /**
   * Add to balance (atomic operation)
   */
  static async addToBalance(amount: number, updatedBy: string = 'system'): Promise<number> {
    const currentBalance = await this.getCurrentBalance()
    const newBalance = currentBalance + amount

    await query(`
      UPDATE coffer_balance
      SET balance = $1, last_updated = CURRENT_TIMESTAMP, updated_by = $2
      WHERE id = 1
    `, [newBalance, updatedBy])

    return newBalance
  }

  /**
   * Subtract from balance (atomic operation)
   */
  static async subtractFromBalance(amount: number, updatedBy: string = 'system'): Promise<number> {
    const currentBalance = await this.getCurrentBalance()
    const newBalance = currentBalance - amount

    await query(`
      UPDATE coffer_balance
      SET balance = $1, last_updated = CURRENT_TIMESTAMP, updated_by = $2
      WHERE id = 1
    `, [newBalance, updatedBy])

    return newBalance
  }
}
