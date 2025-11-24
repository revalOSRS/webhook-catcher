/**
 * Combat Achievement Completions Entity
 * Basic CRUD operations for combat achievement completions
 */

import { query } from '../../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../../base-entity.js'

/**
 * Combat Achievement Completion Data Interface
 */
export interface CombatAchievementCompletion extends BaseEntityData {
  id?: number
  osrsAccountId: number
  combatAchievementId: number
  completedAt?: Date
}

/**
 * Combat Achievement Completions Entity Class
 */
export class CombatAchievementCompletionsEntity extends BaseEntity<CombatAchievementCompletion> {
  protected tableName = 'osrs_account_combat_achievements'
  protected primaryKey = 'id'
  protected camelCaseFields = ['osrsAccountId', 'combatAchievementId', 'completedAt']

  /**
   * Create the osrs_account_combat_achievements table
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS osrs_account_combat_achievements (
        id SERIAL PRIMARY KEY,
        osrs_account_id INTEGER NOT NULL,
        combat_achievement_id INTEGER NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (combat_achievement_id) REFERENCES combat_achievements(id) ON DELETE CASCADE,
        UNIQUE(osrs_account_id, combat_achievement_id)
      )
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_combat_achievement_completions_account ON osrs_account_combat_achievements(osrs_account_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_combat_achievement_completions_achievement ON osrs_account_combat_achievements(combat_achievement_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_combat_achievement_completions_completed_at ON osrs_account_combat_achievements(completed_at)`)

    console.log('✅ Combat Achievement Completions table created/verified')
  }

  /**
   * Get all completions for an account with achievement details
   */
  async getCompletionsWithDetails(accountId: number): Promise<Array<CombatAchievementCompletion & {
    achievementName?: string
    tier?: string
    monster?: string
  }>> {
    const sql = `
      SELECT
        cac.*,
        ca.name as achievement_name,
        ca.tier,
        ca.monster
      FROM ${this.tableName} cac
      JOIN combat_achievements ca ON cac.combat_achievement_id = ca.id
      WHERE cac.osrs_account_id = $1
      ORDER BY cac.completed_at DESC
    `
    const result = await this.executeQuery(sql, [accountId])
    return result.rows.map(row => ({
      ...this.formatFromDb({
        id: row.id,
        osrs_account_id: row.osrs_account_id,
        combat_achievement_id: row.combat_achievement_id,
        completed_at: row.completed_at
      }),
      achievementName: row.achievement_name,
      tier: row.tier,
      monster: row.monster
    })) as Array<CombatAchievementCompletion & {
      achievementName?: string
      tier?: string
      monster?: string
    }>
  }

  /**
   * Check if account has completed a specific combat achievement
   */
  async hasCompleted(accountId: number, achievementId: number): Promise<boolean> {
    const completion = await this.findOne({ osrsAccountId: accountId, combatAchievementId: achievementId })
    return completion !== null
  }

  /**
   * Get global combat achievement completion statistics
   */
  static async getGlobalStats(): Promise<{
    totalCompletions: number
    mostPopularAchievements: Array<{ name: string; completionCount: number }>
  }> {
    const totalCompletionsSql = 'SELECT COUNT(*) as count FROM osrs_account_combat_achievements'
    const popularAchievementsSql = `
      SELECT ca.name, COUNT(*) as count
      FROM osrs_account_combat_achievements cac
      JOIN combat_achievements ca ON cac.combat_achievement_id = ca.id
      GROUP BY ca.id, ca.name
      ORDER BY count DESC
      LIMIT 5
    `

    const entity = new CombatAchievementCompletionsEntity()
    const [totalResult, popularResult] = await Promise.all([
      entity.executeQuery(totalCompletionsSql),
      entity.executeQuery(popularAchievementsSql)
    ])

    return {
      totalCompletions: Number(totalResult.rows[0].count),
      mostPopularAchievements: popularResult.rows.map(row => ({
        name: row.name,
        completionCount: Number(row.count)
      }))
    }
  }
}
