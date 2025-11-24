/**
 * Points Entity
 * Basic CRUD operations for point rules and breakdowns
 */

import { query } from '../../db/connection.js'
import { BaseEntity, BaseEntityData } from '../base-entity.js'

/**
 * Point Rule Data Interface
 */
export interface PointRule extends BaseEntityData {
  id?: number
  ruleType: string
  ruleKey: string
  points: number
  description?: string
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Point Breakdown Data Interface
 */
export interface PointBreakdown extends BaseEntityData {
  id?: number
  osrsAccountId: number
  category: string
  points: number
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Points Rules Entity Class
 * Basic CRUD operations for point rules
 */
export class PointRulesEntity extends BaseEntity<PointRule> {
  protected tableName = 'point_rules'
  protected primaryKey = 'id'
  protected camelCaseFields = ['ruleType', 'ruleKey', 'isActive', 'createdAt', 'updatedAt']

  /**
   * Create the point_rules table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS point_rules (
        id SERIAL PRIMARY KEY,
        rule_type VARCHAR(50) NOT NULL,
        rule_key VARCHAR(100) NOT NULL,
        points INTEGER NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rule_type, rule_key)
      )
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_point_rules_type ON point_rules(rule_type)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_point_rules_active ON point_rules(is_active)`)

    console.log('✅ Point rules table created/verified')
  }

  /**
   * Find rules by type
   */
  async findByType(ruleType?: string): Promise<PointRule[]> {
    const where: any = { isActive: true }
    if (ruleType) {
      where.ruleType = ruleType
    }

    return this.findAll({
      where,
      orderBy: 'ruleType',
      order: 'ASC'
    })
  }

  /**
   * Find specific rule by type and key
   */
  async findByTypeAndKey(ruleType: string, ruleKey: string): Promise<PointRule | null> {
    return this.findOne({
      ruleType,
      ruleKey,
      isActive: true
    })
  }

  /**
   * Create or update a rule (upsert)
   */
  async upsertRule(data: Omit<PointRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PointRule> {
    const existing = await this.findByTypeAndKey(data.ruleType, data.ruleKey)

    if (existing) {
      // Update existing
      return this.updateById(existing.id!, data)
    } else {
      // Create new
      return this.create(data)
    }
  }
}

/**
 * Points Breakdown Entity Class
 * Basic CRUD operations for point breakdowns
 */
export class PointBreakdownsEntity extends BaseEntity<PointBreakdown> {
  protected tableName = 'osrs_account_points_breakdown'
  protected primaryKey = 'id'
  protected camelCaseFields = ['osrsAccountId', 'createdAt', 'updatedAt']

  /**
   * Create the osrs_account_points_breakdown table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS osrs_account_points_breakdown (
        id SERIAL PRIMARY KEY,
        osrs_account_id INTEGER NOT NULL,
        category VARCHAR(100) NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE CASCADE,
        UNIQUE(osrs_account_id, category)
      )
    `
    await query(createTableSql)

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_points_breakdown_account ON osrs_account_points_breakdown(osrs_account_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_points_breakdown_category ON osrs_account_points_breakdown(category)`)

    console.log('✅ Points breakdown table created/verified')
  }

  /**
   * Find breakdown by account ID
   */
  async findByAccountId(osrsAccountId: number): Promise<PointBreakdown[]> {
    return this.findAll({
      where: { osrsAccountId },
      orderBy: 'points',
      order: 'DESC'
    })
  }

  /**
   * Find specific breakdown by account and category
   */
  async findByAccountAndCategory(osrsAccountId: number, category: string): Promise<PointBreakdown | null> {
    return this.findOne({ osrsAccountId, category })
  }

  /**
   * Update or create breakdown (upsert)
   */
  async upsertBreakdown(osrsAccountId: number, category: string, points: number): Promise<PointBreakdown> {
    const existing = await this.findByAccountAndCategory(osrsAccountId, category)

    if (existing) {
      // Update existing
      return this.updateById(existing.id!, {
        points: existing.points + points,
        updatedAt: new Date()
      })
    } else {
      // Create new
      return this.create({
        osrsAccountId,
        category,
        points
      })
    }
  }

  /**
   * Get total points for an account across all categories
   */
  async getTotalPointsForAccount(osrsAccountId: number): Promise<number> {
    const breakdowns = await this.findByAccountId(osrsAccountId)
    return breakdowns.reduce((total, breakdown) => total + breakdown.points, 0)
  }
}

