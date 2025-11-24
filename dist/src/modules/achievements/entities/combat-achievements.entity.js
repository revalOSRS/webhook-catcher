/**
 * Combat Achievements Entity
 * Basic CRUD operations for combat achievements
 */
import { query } from '../../../db/connection.js';
import { BaseEntity } from '../../base-entity.js';
/**
 * Combat Achievements Entity Class
 */
export class CombatAchievementsEntity extends BaseEntity {
    tableName = 'combat_achievements';
    primaryKey = 'id';
    camelCaseFields = ['createdAt'];
    /**
     * Create the combat_achievements table
     */
    static async createTable() {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS combat_achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        tier VARCHAR(20) NOT NULL,
        type VARCHAR(50),
        monster VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
        await query(createTableSql);
        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_combat_achievements_tier ON combat_achievements(tier)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_combat_achievements_monster ON combat_achievements(monster)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_combat_achievements_type ON combat_achievements(type)`);
        console.log('✅ Combat Achievements table created/verified');
    }
    /**
     * Find achievement by name
     */
    async findByName(name) {
        const sql = `SELECT * FROM ${this.tableName} WHERE LOWER(name) = LOWER($1)`;
        const result = await this.executeQuery(sql, [name]);
        const row = result.rows[0];
        return row ? this.formatFromDb(row) : null;
    }
    /**
     * Get achievements by tier
     */
    async findByTier(tier) {
        return this.findAll({
            where: { tier: tier.toLowerCase() },
            orderBy: 'name'
        });
    }
    /**
     * Get achievements by monster
     */
    async findByMonster(monster) {
        const sql = `SELECT * FROM ${this.tableName} WHERE LOWER(monster) = LOWER($1) ORDER BY tier, name`;
        const result = await this.executeQuery(sql, [monster]);
        return result.rows.map(row => this.formatFromDb(row));
    }
}
