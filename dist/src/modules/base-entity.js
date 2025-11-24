/**
 * Base Entity Class
 * Provides common CRUD operations for database entities
 */
import { query, queryOne, pool } from '../db/connection.js';
/**
 * Base Entity Class
 * All entity classes should extend this to get common CRUD methods
 */
export class BaseEntity {
    /**
     * Primary key field name (defaults to 'id')
     */
    primaryKey = 'id';
    /**
     * Fields that should be converted to/from camelCase
     * Override in subclasses if needed
     */
    camelCaseFields = [];
    /**
     * Create table - must be implemented by subclasses
     */
    static async createTable() {
        throw new Error('createTable() must be implemented by subclass');
    }
    /**
     * Execute a query and return the full result object (for rowCount access)
     */
    async executeQuery(queryText, params = []) {
        try {
            const result = await pool.query(queryText, params);
            return result;
        }
        catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
    /**
     * Find entity by primary key
     */
    async findById(id) {
        const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
        const result = await queryOne(sql, [id]);
        return result ? this.formatFromDb(result) : null;
    }
    /**
     * Find a single entity by criteria
     */
    async findOne(where) {
        const results = await this.findAll({ where, limit: 1 });
        return results[0] || null;
    }
    /**
     * Find all entities with optional filters
     */
    async findAll(options = {}) {
        const { where = {}, orderBy, order = 'DESC', limit, offset } = options;
        let sql = `SELECT * FROM ${this.tableName}`;
        const params = [];
        let paramCount = 1;
        // Build WHERE clause
        if (Object.keys(where).length > 0) {
            const conditions = [];
            for (const [key, value] of Object.entries(where)) {
                const snakeKey = this.toSnakeCase(key);
                conditions.push(`${snakeKey} = $${paramCount++}`);
                params.push(value);
            }
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        // ORDER BY clause
        if (orderBy) {
            const snakeOrderBy = this.toSnakeCase(orderBy);
            sql += ` ORDER BY ${snakeOrderBy} ${order}`;
        }
        // LIMIT and OFFSET
        if (limit) {
            sql += ` LIMIT $${paramCount++}`;
            params.push(limit);
        }
        if (offset) {
            sql += ` OFFSET $${paramCount++}`;
            params.push(offset);
        }
        const results = await query(sql, params);
        return results.map(row => this.formatFromDb(row));
    }
    /**
     * Create a new entity
     */
    async create(data) {
        const dbData = this.formatForDb(data);
        const fields = Object.keys(dbData);
        const values = Object.values(dbData);
        const placeholders = fields.map((_, i) => `$${i + 1}`);
        const sql = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
        const result = await queryOne(sql, values);
        if (!result) {
            throw new Error(`Failed to create ${this.tableName} record`);
        }
        return this.formatFromDb(result);
    }
    /**
     * Update entity by primary key
     */
    async updateById(id, data) {
        const dbData = this.formatForDb(data);
        const fields = Object.keys(dbData);
        const values = Object.values(dbData);
        const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
        values.push(id);
        const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.primaryKey} = $${values.length}
      RETURNING *
    `;
        const result = await queryOne(sql, values);
        if (!result) {
            throw new Error(`Failed to update ${this.tableName} record with id ${id}`);
        }
        return this.formatFromDb(result);
    }
    /**
     * Update multiple entities matching criteria
     */
    async updateMany(where, data) {
        const dbData = this.formatForDb(data);
        const setFields = Object.keys(dbData);
        const setValues = Object.values(dbData);
        const setClause = setFields.map((field, i) => `${field} = $${i + 1}`).join(', ');
        const whereFields = Object.keys(where);
        const whereValues = Object.values(where);
        const whereClause = whereFields.map((field, i) => `${this.toSnakeCase(field)} = $${setValues.length + i + 1}`).join(' AND ');
        const allValues = [...setValues, ...whereValues];
        const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause}
    `;
        const result = await this.executeQuery(sql, allValues);
        return result.rowCount || 0;
    }
    /**
     * Delete entity by primary key
     */
    async deleteById(id) {
        const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
        const result = await this.executeQuery(sql, [id]);
        return (result.rowCount || 0) > 0;
    }
    /**
     * Delete multiple entities matching criteria
     */
    async deleteMany(where) {
        const fields = Object.keys(where);
        const values = Object.values(where);
        const whereClause = fields.map((field, i) => `${this.toSnakeCase(field)} = $${i + 1}`).join(' AND ');
        const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
        const result = await this.executeQuery(sql, values);
        return result.rowCount || 0;
    }
    /**
     * Count entities with optional filters
     */
    async count(where = {}) {
        let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params = [];
        if (Object.keys(where).length > 0) {
            const conditions = [];
            let paramCount = 1;
            for (const [key, value] of Object.entries(where)) {
                const snakeKey = this.toSnakeCase(key);
                conditions.push(`${snakeKey} = $${paramCount++}`);
                params.push(value);
            }
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        const result = await queryOne(sql, params);
        return parseInt(result.count);
    }
    /**
     * Check if entity exists by criteria
     */
    async exists(where) {
        const count = await this.count(where);
        return count > 0;
    }
    /**
     * Format data from database (snake_case to camelCase)
     */
    formatFromDb(row) {
        const formatted = {};
        for (const [key, value] of Object.entries(row)) {
            if (this.camelCaseFields.includes(key)) {
                formatted[this.toCamelCase(key)] = value;
            }
            else {
                formatted[key] = value;
            }
        }
        return formatted;
    }
    /**
     * Format data for database (camelCase to snake_case)
     */
    formatForDb(data) {
        const formatted = {};
        for (const [key, value] of Object.entries(data)) {
            if (this.camelCaseFields.includes(this.toSnakeCase(key))) {
                formatted[this.toSnakeCase(key)] = value;
            }
            else {
                formatted[key] = value;
            }
        }
        return formatted;
    }
    /**
     * Convert camelCase to snake_case
     */
    toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    /**
     * Convert snake_case to camelCase
     */
    toCamelCase(str) {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
}
