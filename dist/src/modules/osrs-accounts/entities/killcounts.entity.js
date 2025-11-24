/**
 * Killcounts Entity
 * Basic CRUD operations for OSRS account killcounts (boss kills, activities, etc.)
 */
import { query } from '../../../db/connection.js';
import { BaseEntity } from '../../base-entity.js';
/**
 * Killcounts Entity Class
 * Basic CRUD operations for killcounts
 */
export class KillcountsEntity extends BaseEntity {
    tableName = 'osrs_account_killcounts';
    primaryKey = 'id';
    camelCaseFields = ['osrsAccountId', 'bossName', 'killCount', 'lastKilledAt', 'createdAt', 'updatedAt'];
    /**
     * Create the osrs_account_killcounts table if it doesn't exist
     */
    static async createTable() {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS osrs_account_killcounts (
        id SERIAL PRIMARY KEY,
        osrs_account_id INTEGER NOT NULL,
        boss_name VARCHAR(255) NOT NULL,
        kill_count INTEGER NOT NULL DEFAULT 0,
        last_killed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (osrs_account_id) REFERENCES osrs_accounts(id) ON DELETE CASCADE,
        UNIQUE(osrs_account_id, boss_name)
      )
    `;
        await query(createTableSql);
        // Create indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_killcounts_account ON osrs_account_killcounts(osrs_account_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_killcounts_boss ON osrs_account_killcounts(boss_name)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_killcounts_kill_count ON osrs_account_killcounts(kill_count)`);
        console.log('✅ Killcounts table created/verified');
    }
    /**
     * Get killcounts for an account
     */
    async getByAccountId(accountId) {
        return this.findAll({
            where: { osrsAccountId: accountId },
            orderBy: 'killCount',
            order: 'DESC'
        });
    }
    /**
     * Get killcount for specific boss and account
     */
    async getByBossAndAccount(accountId, bossName) {
        return this.findOne({
            osrsAccountId: accountId,
            bossName: bossName.toLowerCase()
        });
    }
    /**
     * Update or insert killcount (upsert)
     */
    async upsertKillcount(accountId, bossName, killCount) {
        const existing = await this.getByBossAndAccount(accountId, bossName);
        if (existing) {
            // Update existing
            return this.updateById(existing.id, {
                killCount,
                lastKilledAt: new Date()
            });
        }
        else {
            // Create new
            return this.create({
                osrsAccountId: accountId,
                bossName: bossName.toLowerCase(),
                killCount,
                lastKilledAt: new Date()
            });
        }
    }
    /**
     * Increment killcount for a boss
     */
    async incrementKillcount(accountId, bossName) {
        const existing = await this.getByBossAndAccount(accountId, bossName);
        if (existing) {
            return this.updateById(existing.id, {
                killCount: existing.killCount + 1,
                lastKilledAt: new Date()
            });
        }
        else {
            return this.create({
                osrsAccountId: accountId,
                bossName: bossName.toLowerCase(),
                killCount: 1,
                lastKilledAt: new Date()
            });
        }
    }
    /**
     * Get top killcounts for a boss across all accounts
     */
    async getTopKillcounts(bossName, limit = 10) {
        const sql = `
      SELECT * FROM ${this.tableName}
      WHERE LOWER(boss_name) = LOWER($1)
      ORDER BY kill_count DESC, last_killed_at DESC
      LIMIT $2
    `;
        const result = await this.executeQuery(sql, [bossName, limit]);
        return result.rows.map(row => this.formatFromDb(row));
    }
    /**
     * Get boss statistics across all accounts
     */
    async getBossStats() {
        const sql = `
      SELECT
        boss_name,
        SUM(kill_count) as total_kills,
        COUNT(DISTINCT osrs_account_id) as unique_players,
        ROUND(AVG(kill_count), 2) as average_kills
      FROM ${this.tableName}
      GROUP BY boss_name
      ORDER BY total_kills DESC
    `;
        const result = await this.executeQuery(sql);
        return result.rows.map(row => ({
            bossName: row.boss_name,
            totalKills: Number(row.total_kills),
            uniquePlayers: Number(row.unique_players),
            averageKills: Number(row.average_kills)
        }));
    }
}
