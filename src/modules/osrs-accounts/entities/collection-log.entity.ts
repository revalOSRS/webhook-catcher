/**
 * Collection Log Entity
 * Basic CRUD operations for OSRS account collection log progress (current state)
 */

import { query } from '../../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../../base-entity.js'

/**
 * Collection Log Data Interface
 */
export interface CollectionLog extends BaseEntityData {
  id?: number
  osrsAccountId: number
  category: string
  subcategory?: string
  itemName: string
  obtained: boolean
  obtainedAt?: Date
  quantity?: number
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Collection Log Entity Class
 * Basic CRUD operations for collection log progress
 */
export class CollectionLogEntity extends BaseEntity<CollectionLog> {
  protected tableName = 'osrs_account_collection_log'
  protected primaryKey = 'id'
  protected camelCaseFields = ['osrsAccountId', 'itemName', 'obtainedAt', 'createdAt', 'updatedAt']

  /**
   * Create the osrs_account_collection_log table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS osrs_account_collection_log (
        id SERIAL PRIMARY KEY,
        osrs_account_id INTEGER NOT NULL,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        item_name VARCHAR(255) NOT NULL,
        obtained BOOLEAN DEFAULT false,
        obtained_at TIMESTAMP,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE CASCADE,
        UNIQUE(osrs_account_id, category, subcategory, item_name)
      )
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_account ON osrs_account_collection_log(osrs_account_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_category ON osrs_account_collection_log(category)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_subcategory ON osrs_account_collection_log(subcategory)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_obtained ON osrs_account_collection_log(obtained)`)

    console.log('✅ Collection Log table created/verified')
  }

  /**
   * Get collection log progress for an account
   */
  async getByAccountId(accountId: number): Promise<CollectionLog[]> {
    return this.findAll({
      where: { osrsAccountId: accountId },
      orderBy: 'category'
    })
  }

  /**
   * Get collection log items by category for an account
   */
  async getByCategory(accountId: number, category: string, subcategory?: string): Promise<CollectionLog[]> {
    let where: any = {
      osrsAccountId: accountId,
      category: category.toLowerCase()
    }

    if (subcategory) {
      where.subcategory = subcategory.toLowerCase()
    }

    return this.findAll({
      where,
      orderBy: 'itemName'
    })
  }

  /**
   * Mark an item as obtained
   */
  async markObtained(accountId: number, category: string, subcategory: string | undefined, itemName: string, quantity: number = 1): Promise<CollectionLog> {
    const existing = await this.findOne({
      osrsAccountId: accountId,
      category: category.toLowerCase(),
      subcategory: subcategory?.toLowerCase(),
      itemName: itemName.toLowerCase()
    })

    if (existing) {
      return this.updateById(existing.id!, {
        obtained: true,
        obtainedAt: new Date(),
        quantity
      })
    } else {
      return this.create({
        osrsAccountId: accountId,
        category: category.toLowerCase(),
        subcategory: subcategory?.toLowerCase(),
        itemName: itemName.toLowerCase(),
        obtained: true,
        obtainedAt: new Date(),
        quantity
      })
    }
  }

  /**
   * Get collection log statistics for an account
   */
  async getStats(accountId: number): Promise<{
    totalItems: number
    obtainedItems: number
    completionPercentage: number
    categoriesCompleted: Array<{ category: string; obtained: number; total: number; percentage: number }>
  }> {
    const allItems = await this.getByAccountId(accountId)
    const totalItems = allItems.length
    const obtainedItems = allItems.filter(item => item.obtained).length
    const completionPercentage = totalItems > 0 ? (obtainedItems / totalItems) * 100 : 0

    // Group by category
    const categoryStats = new Map<string, { obtained: number; total: number }>()
    for (const item of allItems) {
      const key = item.category
      const stats = categoryStats.get(key) || { obtained: 0, total: 0 }
      stats.total++
      if (item.obtained) stats.obtained++
      categoryStats.set(key, stats)
    }

    const categoriesCompleted = Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      obtained: stats.obtained,
      total: stats.total,
      percentage: stats.total > 0 ? (stats.obtained / stats.total) * 100 : 0
    }))

    return {
      totalItems,
      obtainedItems,
      completionPercentage,
      categoriesCompleted
    }
  }

  /**
   * Bulk update collection log from sync data
   */
  async bulkUpdateFromSync(accountId: number, collectionLogData: any): Promise<void> {
    // This would be called from the sync service to update collection log progress
    // The collectionLogData would come from RuneLite sync events

    // For now, this is a placeholder - the actual implementation would depend
    // on the structure of the sync data
    console.log(`Bulk updating collection log for account ${accountId}`)
  }

  /**
   * Get recently obtained items
   */
  async getRecentlyObtained(accountId: number, limit: number = 10): Promise<CollectionLog[]> {
    return this.findAll({
      where: {
        osrsAccountId: accountId,
        obtained: true
      },
      orderBy: 'obtainedAt',
      order: 'DESC',
      limit
    })
  }
}

