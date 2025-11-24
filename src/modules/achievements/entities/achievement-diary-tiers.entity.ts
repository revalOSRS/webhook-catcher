/**
 * Achievement Diary Tiers Entity
 * Basic CRUD operations for achievement diary tiers
 */

import { query } from '../../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../../base-entity.js'

/**
 * Achievement Diary Tier Data Interface
 */
export interface AchievementDiaryTier extends BaseEntityData {
  id?: number
  diaryName: string
  tier: string
  totalTasks: number
  createdAt?: Date
}

/**
 * Achievement Diary Tiers Entity Class
 */
export class AchievementDiaryTiersEntity extends BaseEntity<AchievementDiaryTier> {
  protected tableName = 'achievement_diary_tiers'
  protected primaryKey = 'id'
  protected camelCaseFields = ['diaryName', 'totalTasks', 'createdAt']

  /**
   * Create the achievement_diary_tiers table
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS achievement_diary_tiers (
        id SERIAL PRIMARY KEY,
        diary_name VARCHAR(100) NOT NULL,
        tier VARCHAR(20) NOT NULL,
        total_tasks INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_achievement_diary_tiers_name ON achievement_diary_tiers(diary_name)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_achievement_diary_tiers_tier ON achievement_diary_tiers(tier)`)

    console.log('✅ Achievement Diary Tiers table created/verified')
  }

  /**
   * Find tier by name and tier
   */
  async findByNameAndTier(diaryName: string, tier: string): Promise<AchievementDiaryTier | null> {
    return this.findOne({
      diaryName: diaryName.toLowerCase(),
      tier: tier.toLowerCase()
    })
  }

  /**
   * Get all tiers for a specific diary
   */
  async findByDiaryName(diaryName: string): Promise<AchievementDiaryTier[]> {
    return this.findAll({
      where: { diaryName: diaryName.toLowerCase() },
      orderBy: 'tier'
    })
  }
}
