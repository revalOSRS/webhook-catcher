/**
 * Points Service
 * Business logic for points system management
 */
import { PointRulesEntity, PointBreakdownsEntity } from './points.entity.js';
import { query } from '../../db/connection.js';
/**
 * Points Service Class
 * Provides business logic for points operations
 */
export class PointsService {
    static rulesEntity = new PointRulesEntity();
    static breakdownsEntity = new PointBreakdownsEntity();
    // Rule Management
    /**
     * Get all active point rules
     */
    static async getActiveRules(ruleType) {
        return this.rulesEntity.findByType(ruleType);
    }
    /**
     * Get specific point rule
     */
    static async getRule(ruleType, ruleKey) {
        return this.rulesEntity.findByTypeAndKey(ruleType, ruleKey);
    }
    /**
     * Create or update a point rule
     */
    static async setRule(data) {
        return this.rulesEntity.upsertRule(data);
    }
    /**
     * Get points for a specific achievement
     */
    static async getPointsForAchievement(achievementType, key) {
        const rule = await this.getRule(achievementType, key);
        return rule?.points || 0;
    }
    // Points Management
    /**
     * Get points breakdown for an account
     */
    static async getPointsBreakdown(accountId) {
        return this.breakdownsEntity.findByAccountId(accountId);
    }
    /**
     * Award points to an account
     */
    static async awardPoints(accountId, points, category) {
        // Update total points in osrs_accounts table
        await query(`
      UPDATE osrs_accounts
      SET total_points = total_points + $1,
          points_last_updated = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [points, accountId]);
        // Update category breakdown if provided
        if (category) {
            await this.breakdownsEntity.upsertBreakdown(accountId, category, points);
        }
    }
    /**
     * Update points breakdown for a category
     */
    static async updatePointsBreakdown(accountId, category, points) {
        await this.breakdownsEntity.upsertBreakdown(accountId, category, points);
    }
    /**
     * Get total points for an account
     */
    static async getTotalPoints(accountId) {
        const result = await query(`
      SELECT total_points, points_rank, points_last_updated
      FROM osrs_accounts
      WHERE id = $1
    `, [accountId]);
        const data = result[0] || { total_points: 0, points_rank: null, points_last_updated: null };
        return {
            totalPoints: Number(data.total_points),
            rank: data.points_rank ? Number(data.points_rank) : null,
            lastUpdated: data.points_last_updated
        };
    }
    /**
     * Get account rank
     */
    static async getAccountRank(accountId) {
        const result = await query(`
      SELECT points_rank FROM osrs_accounts WHERE id = $1
    `, [accountId]);
        return result[0]?.points_rank ? Number(result[0].points_rank) : null;
    }
    // Leaderboard Management
    /**
     * Get points leaderboard
     */
    static async getLeaderboard(limit = 100, offset = 0) {
        const result = await query(`
      SELECT
        id,
        osrs_nickname,
        discord_id,
        total_points,
        quest_points,
        ca_total_count,
        diary_total_count,
        clog_items_obtained,
        ehp,
        ehb,
        ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
      FROM osrs_accounts
      WHERE total_points > 0
      ORDER BY total_points DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
        return result.map(row => ({
            id: Number(row.id),
            osrsNickname: row.osrs_nickname,
            discordId: row.discord_id,
            totalPoints: Number(row.total_points),
            questPoints: Number(row.quest_points || 0),
            combatAchievementCount: Number(row.ca_total_count || 0),
            diaryCount: Number(row.diary_total_count || 0),
            collectionLogItems: Number(row.clog_items_obtained || 0),
            ehp: Number(row.ehp || 0),
            ehb: Number(row.ehb || 0),
            rank: Number(row.rank)
        }));
    }
    /**
     * Get leaderboard from materialized view (faster)
     */
    static async getLeaderboardFast(limit = 100, offset = 0) {
        const result = await query(`
      SELECT * FROM leaderboard_points
      ORDER BY rank
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
        return result;
    }
    /**
     * Refresh the points leaderboard materialized view
     */
    static async refreshLeaderboard() {
        await query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_points');
    }
    /**
     * Update points ranks for all accounts
     */
    static async updateAllRanks() {
        await query(`
      UPDATE osrs_accounts o
      SET points_rank = sub.rank
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
        FROM osrs_accounts
        WHERE total_points > 0
      ) sub
      WHERE o.id = sub.id
    `);
    }
    /**
     * Get top point earners in a time period
     */
    static async getTopEarnersInPeriod(startDate, endDate, limit = 10) {
        const result = await query(`
      SELECT
        o.osrs_nickname,
        o.discord_id,
        SUM(e.points_awarded) as points_earned,
        COUNT(e.id) as events_count
      FROM osrs_account_events e
      JOIN osrs_accounts o ON e.osrs_account_id = o.id
      WHERE e.created_at >= $1 AND e.created_at <= $2
      GROUP BY o.id, o.osrs_nickname, o.discord_id
      ORDER BY points_earned DESC
      LIMIT $3
    `, [startDate, endDate, limit]);
        return result.map(row => ({
            osrsNickname: row.osrs_nickname,
            discordId: row.discord_id,
            pointsEarned: Number(row.points_earned),
            eventsCount: Number(row.events_count)
        }));
    }
    /**
     * Calculate and award points for an achievement
     */
    static async awardPointsForAchievement(accountId, achievementType, key) {
        const points = await this.getPointsForAchievement(achievementType, key);
        if (points > 0) {
            await this.awardPoints(accountId, points, achievementType);
        }
        const { totalPoints } = await this.getTotalPoints(accountId);
        return {
            pointsAwarded: points,
            totalPoints
        };
    }
    /**
     * Create tables for points module
     */
    static async createTables() {
        await PointRulesEntity.createTable();
        await PointBreakdownsEntity.createTable();
    }
}
