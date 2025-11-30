/**
 * Base Entity Class
 * Provides common CRUD operations for database entities
 */

import { query, queryOne, pool } from '../db/connection.js'

export interface BaseEntityData {
  id?: number | string
  created_at?: Date
  updated_at?: Date
  [key: string]: any
}

/**
 * ID type - can be number or string (UUID)
 */
export type EntityId = number | string

/**
 * Base Entity Class
 * All entity classes should extend this to get common CRUD methods
 */
export abstract class BaseEntity<T extends BaseEntityData = BaseEntityData, ID extends EntityId = number> {
  /**
   * Table name - must be implemented by subclasses
   */
  protected abstract tableName: string

  /**
   * Primary key field name (defaults to 'id')
   */
  protected primaryKey: string = 'id'

  /**
   * Fields that should be converted to/from camelCase
   * Override in subclasses if needed
   */
  protected camelCaseFields: string[] = []

  /**
   * Create table - must be implemented by subclasses
   */
  static async createTable(): Promise<void> {
    throw new Error('createTable() must be implemented by subclass')
  }

  /**
   * Execute a query and return the full result object (for rowCount access)
   */
  protected async executeQuery(queryText: string, params: any[] = []) {
    try {
      const result = await pool.query(queryText, params)
      return result
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  }

  /**
   * Find entity by primary key
   */
  async findById(id: ID): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`
    const result = await queryOne(sql, [id])
    return result ? this.formatFromDb(result) : null
  }

  /**
   * Find a single entity by criteria
   */
  async findOne(where: Record<string, any>): Promise<T | null> {
    const results = await this.findAll({ where, limit: 1 })
    return results[0] || null
  }

  /**
   * Find all entities with optional filters
   */
  async findAll(options: {
    where?: Record<string, any>
    orderBy?: string
    order?: 'ASC' | 'DESC'
    limit?: number
    offset?: number
  } = {}): Promise<T[]> {
    const { where = {}, orderBy, order = 'DESC', limit, offset } = options

    let sql = `SELECT * FROM ${this.tableName}`
    const params: any[] = []
    let paramCount = 1

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      const conditions: string[] = []
      for (const [key, value] of Object.entries(where)) {
        const snakeKey = this.toSnakeCase(key)
        conditions.push(`${snakeKey} = $${paramCount++}`)
        params.push(value)
      }
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    // ORDER BY clause
    if (orderBy) {
      const snakeOrderBy = this.toSnakeCase(orderBy)
      sql += ` ORDER BY ${snakeOrderBy} ${order}`
    }

    // LIMIT and OFFSET
    if (limit) {
      sql += ` LIMIT $${paramCount++}`
      params.push(limit)
    }
    if (offset) {
      sql += ` OFFSET $${paramCount++}`
      params.push(offset)
    }

    const results = await query(sql, params)
    return results.map(row => this.formatFromDb(row))
  }

  /**
   * Create a new entity
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const dbData = this.formatForDb(data)
    const fields = Object.keys(dbData)
    const values = Object.values(dbData)
    const placeholders = fields.map((_, i) => `$${i + 1}`)

    const sql = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `

    const result = await queryOne(sql, values)
    if (!result) {
      throw new Error(`Failed to create ${this.tableName} record`)
    }

    return this.formatFromDb(result)
  }

  /**
   * Update entity by primary key
   */
  async updateById(id: ID, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T> {
    const dbData = this.formatForDb(data)
    const fields = Object.keys(dbData)
    const values: any[] = Object.values(dbData)
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ')

    values.push(id)

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.primaryKey} = $${values.length}
      RETURNING *
    `

    const result = await queryOne(sql, values)
    if (!result) {
      throw new Error(`Failed to update ${this.tableName} record with id ${id}`)
    }

    return this.formatFromDb(result)
  }

  /**
   * Update multiple entities matching criteria
   */
  async updateMany(
    where: Record<string, any>,
    data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<number> {
    const dbData = this.formatForDb(data as any)
    const setFields = Object.keys(dbData)
    const setValues = Object.values(dbData)
    const setClause = setFields.map((field, i) => `${field} = $${i + 1}`).join(', ')

    const whereFields = Object.keys(where)
    const whereValues = Object.values(where)
    const whereClause = whereFields.map((field, i) => `${this.toSnakeCase(field)} = $${setValues.length + i + 1}`).join(' AND ')

    const allValues = [...setValues, ...whereValues]

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause}
    `

    const result = await this.executeQuery(sql, allValues)
    return result.rowCount || 0
  }

  /**
   * Delete entity by primary key
   */
  async deleteById(id: ID): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`
    const result = await this.executeQuery(sql, [id])
    return (result.rowCount || 0) > 0
  }

  /**
   * Delete multiple entities matching criteria
   */
  async deleteMany(where: Record<string, any>): Promise<number> {
    const fields = Object.keys(where)
    const values = Object.values(where)
    const whereClause = fields.map((field, i) => `${this.toSnakeCase(field)} = $${i + 1}`).join(' AND ')

    const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`
    const result = await this.executeQuery(sql, values)
    return result.rowCount || 0
  }

  /**
   * Count entities with optional filters
   */
  async count(where: Record<string, any> = {}): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`
    const params: any[] = []

    if (Object.keys(where).length > 0) {
      const conditions: string[] = []
      let paramCount = 1
      for (const [key, value] of Object.entries(where)) {
        const snakeKey = this.toSnakeCase(key)
        conditions.push(`${snakeKey} = $${paramCount++}`)
        params.push(value)
      }
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    const result = await queryOne(sql, params)
    return parseInt(result.count)
  }

  /**
   * Check if entity exists by criteria
   */
  async exists(where: Record<string, any>): Promise<boolean> {
    const count = await this.count(where)
    return count > 0
  }

  /**
   * Format data from database (snake_case to camelCase)
   */
  protected formatFromDb(row: any): T {
    const formatted: any = {}

    for (const [key, value] of Object.entries(row)) {
      // Convert snake_case key to camelCase to check if it's in camelCaseFields
      const camelKey = this.toCamelCase(key)
      if (this.camelCaseFields.includes(camelKey)) {
        formatted[camelKey] = value
      } else {
        formatted[key] = value
      }
    }

    return formatted as T
  }

  /**
   * Format data for database (camelCase to snake_case)
   */
  protected formatForDb(data: Record<string, any>): Record<string, any> {
    const formatted: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      // Check if the key (in camelCase) is in camelCaseFields list
      if (this.camelCaseFields.includes(key)) {
        formatted[this.toSnakeCase(key)] = value
      } else {
        formatted[key] = value
      }
    }

    return formatted
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }

  /**
   * Convert snake_case to camelCase
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }
}
