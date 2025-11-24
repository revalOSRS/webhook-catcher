/**
 * Achievement Diary Completions Entity
 * Basic CRUD operations for achievement diary completions
 */

import { query } from '../../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../../base-entity.js'

/**
 * Achievement Diary Completion Data Interface
 */
export interface AchievementDiaryCompletion extends BaseEntityData {
  id?: number
  osrsAccountId: number
  diaryTierId: number
  completedAt?: Date
}

/**
 * Achievement Diary Completions Entity Class
 */
export class AchievementDiaryCompletionsEntity extends BaseEntity<AchievementDiaryCompletion> {
  protected tableName = 'osrs_account_diary_completions'
  protected primaryKey = 'id'
  protected camelCaseFields = ['osrsAccountId', 'diaryTierId', 'completedAt']

  /**
   * Create the osrs_account_diary_completions table
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS osrs_account_diary_completions (
        id SERIAL PRIMARY KEY,
        osrs_account_id INTEGER NOT NULL,
        diary_tier_id INTEGER NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (diary_tier_id) REFERENCES achievement_diary_tiers(id) ON DELETE CASCADE,
        UNIQUE(osrs_account_id, diary_tier_id)
      )
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_diary_completions_account ON osrs_account_diary_completions(osrs_account_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_diary_completions_tier ON osrs_account_diary_completions(diary_tier_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_diary_completions_completed_at ON osrs_account_diary_completions(completed_at)`)

    console.log('✅ Achievement Diary Completions table created/verified')
  }

  /**
   * Get all completions for an account with diary details
   */
  async getCompletionsWithDetails(accountId: number): Promise<Array<AchievementDiaryCompletion & {
    diaryName?: string
    tier?: string
    totalTasks?: number
  }>> {
    const sql = `
      SELECT
        dc.*,
        dt.diary_name,
        dt.tier,
        dt.total_tasks
      FROM ${this.tableName} dc
      JOIN achievement_diary_tiers dt ON dc.diary_tier_id = dt.id
      WHERE dc.osrs_account_id = $1
      ORDER BY dc.completed_at DESC
    `
    const result = await this.executeQuery(sql, [accountId])
    return result.rows.map(row => ({
      ...this.formatFromDb({
        id: row.id,
        osrs_account_id: row.osrs_account_id,
        diary_tier_id: row.diary_tier_id,
        completed_at: row.completed_at
      }),
      diaryName: row.diary_name,
      tier: row.tier,
      totalTasks: Number(row.total_tasks)
    })) as Array<AchievementDiaryCompletion & {
      diaryName?: string
      tier?: string
      totalTasks?: number
    }>
  }

  /**
   * Check if account has completed a specific diary tier
   */
  async hasCompleted(accountId: number, diaryTierId: number): Promise<boolean> {
    const completion = await this.findOne({ osrsAccountId: accountId, diaryTierId })
    return completion !== null
  }

  /**
   * Get global diary completion statistics
   */
  static async getGlobalStats(): Promise<{
    totalCompletions: number
    uniquePlayers: number
    mostPopularAchievements: Array<{ name: string; completionCount: number }>
  }> {
    const totalCompletionsSql = 'SELECT COUNT(*) as count FROM osrs_account_diary_completions'
    const uniquePlayersSql = `
      SELECT COUNT(DISTINCT osrs_account_id) as count
      FROM osrs_account_diary_completions
    `
    const popularAchievementsSql = `
      SELECT dt.diary_name || ' ' || dt.tier as name, COUNT(*) as count
      FROM osrs_account_diary_completions dc
      JOIN achievement_diary_tiers dt ON dc.diary_tier_id = dt.id
      GROUP BY dt.id, dt.diary_name, dt.tier
      ORDER BY count DESC
      LIMIT 5
    `

    const entity = new AchievementDiaryCompletionsEntity()
    const [totalResult, playersResult, popularResult] = await Promise.all([
      entity.executeQuery(totalCompletionsSql),
      entity.executeQuery(uniquePlayersSql),
      entity.executeQuery(popularAchievementsSql)
    ])

    return {
      totalCompletions: Number(totalResult.rows[0].count),
      uniquePlayers: Number(playersResult.rows[0].count),
      mostPopularAchievements: popularResult.rows.map(row => ({
        name: row.name,
        completionCount: Number(row.count)
      }))
    }
  }
}
