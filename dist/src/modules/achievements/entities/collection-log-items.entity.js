/**
 * Collection Log Items Entity
 * Basic CRUD operations for collection log items
 */
import { query } from '../../../db/connection.js';
import { BaseEntity } from '../../base-entity.js';
/**
 * Collection Log Items Entity Class
 */
export class CollectionLogItemsEntity extends BaseEntity {
    tableName = 'collection_log_items';
    primaryKey = 'id';
    camelCaseFields = ['itemName', 'wikiUrl'];
    /**
     * Create the collection_log_items table
     */
    static async createTable() {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS collection_log_items (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        rarity VARCHAR(20),
        wiki_url VARCHAR(500)
      )
    `;
        await query(createTableSql);
        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_items_category ON collection_log_items(category)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_items_subcategory ON collection_log_items(subcategory)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_items_rarity ON collection_log_items(rarity)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_items_name ON collection_log_items(item_name)`);
        console.log('✅ Collection Log Items table created/verified');
    }
    /**
     * Find item by name
     */
    async findByName(itemName, subcategory) {
        let sql = `SELECT * FROM ${this.tableName} WHERE LOWER(item_name) = LOWER($1)`;
        const params = [itemName];
        if (subcategory) {
            sql += ` AND LOWER(subcategory) = LOWER($2)`;
            params.push(subcategory);
        }
        sql += ' LIMIT 1';
        const result = await this.executeQuery(sql, params);
        const row = result.rows[0];
        return row ? this.formatFromDb(row) : null;
    }
    /**
     * Get items by category
     */
    async findByCategory(category, subcategory) {
        let where = { category: category.toLowerCase() };
        if (subcategory) {
            where.subcategory = subcategory.toLowerCase();
        }
        return this.findAll({
            where,
            orderBy: 'itemName'
        });
    }
    /**
     * Get items by subcategory
     */
    async findBySubcategory(subcategory) {
        return this.findAll({
            where: { subcategory: subcategory.toLowerCase() },
            orderBy: 'itemName'
        });
    }
}
