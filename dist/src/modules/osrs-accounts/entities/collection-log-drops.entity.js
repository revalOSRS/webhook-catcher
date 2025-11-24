/**
 * Collection Log Drops Entity
 * Basic CRUD operations for collection log drops
 */
import { query } from '../../../db/connection.js';
import { BaseEntity } from '../../base-entity.js';
/**
 * Collection Log Drops Entity Class
 */
export class CollectionLogDropsEntity extends BaseEntity {
    tableName = 'osrs_account_collection_log_drops';
    primaryKey = 'id';
    camelCaseFields = ['osrsAccountId', 'collectionLogItemId', 'obtainedAt'];
    /**
     * Create the osrs_account_collection_log_drops table
     */
    static async createTable() {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS osrs_account_collection_log_drops (
        id SERIAL PRIMARY KEY,
        osrs_account_id INTEGER NOT NULL,
        collection_log_item_id INTEGER NOT NULL,
        obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        quantity INTEGER DEFAULT 1,
        FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (collection_log_item_id) REFERENCES collection_log_items(id) ON DELETE CASCADE,
        UNIQUE(osrs_account_id, collection_log_item_id)
      )
    `;
        await query(createTableSql);
        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_drops_account ON osrs_account_collection_log_drops(osrs_account_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_drops_item ON osrs_account_collection_log_drops(collection_log_item_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_collection_log_drops_obtained_at ON osrs_account_collection_log_drops(obtained_at)`);
        console.log('✅ Collection Log Drops table created/verified');
    }
    /**
     * Get all drops for an account with item details
     */
    async getDropsWithDetails(accountId) {
        const sql = `
      SELECT
        cld.*,
        cli.item_name,
        cli.category,
        cli.subcategory,
        cli.rarity
      FROM ${this.tableName} cld
      JOIN collection_log_items cli ON cld.collection_log_item_id = cli.id
      WHERE cld.osrs_account_id = $1
      ORDER BY cld.obtained_at DESC
    `;
        const result = await this.executeQuery(sql, [accountId]);
        return result.rows.map(row => ({
            ...this.formatFromDb({
                id: row.id,
                osrs_account_id: row.osrs_account_id,
                collection_log_item_id: row.collection_log_item_id,
                obtained_at: row.obtained_at,
                quantity: row.quantity
            }),
            itemName: row.item_name,
            category: row.category,
            subcategory: row.subcategory,
            rarity: row.rarity
        }));
    }
    /**
     * Check if account has obtained a specific item
     */
    async hasObtained(accountId, itemId) {
        const drop = await this.findOne({ osrsAccountId: accountId, collectionLogItemId: itemId });
        return drop !== null;
    }
    /**
     * Get global collection log statistics
     */
    static async getGlobalStats() {
        const totalItemsSql = 'SELECT COUNT(*) as count FROM osrs_account_collection_log_drops';
        const entity = new CollectionLogDropsEntity();
        const result = await entity.executeQuery(totalItemsSql);
        return {
            totalItems: Number(result.rows[0].count)
        };
    }
}
