/**
 * Coffer Service
 * Business logic for coffer balance management
 */
import { CofferMovementsEntity } from './coffer-movements.entity.js';
import { CofferBalanceEntity } from './coffer-balance.entity.js';
/**
 * Coffer Service Class
 * Provides business logic for coffer operations
 */
export class CofferService {
    static movementsEntity = new CofferMovementsEntity();
    /**
     * Create a new coffer movement
     */
    static async createMovement(data) {
        // Get current balance for before/after calculation
        const currentBalance = await CofferBalanceEntity.getCurrentBalance();
        const balanceBefore = currentBalance;
        const balanceAfter = currentBalance + data.amount;
        const movement = await this.movementsEntity.create({
            type: data.type,
            amount: data.amount,
            playerDiscordId: data.playerDiscordId,
            eventId: data.eventId,
            donationId: data.donationId,
            description: data.description,
            note: data.note,
            balanceBefore,
            balanceAfter,
            createdBy: data.createdBy,
        });
        // Update the coffer balance
        await CofferBalanceEntity.updateBalance(balanceAfter, data.createdBy);
        return movement;
    }
    /**
     * Get current coffer balance
     */
    static async getCurrentBalance() {
        return CofferBalanceEntity.getCurrentBalance();
    }
    /**
     * Get recent movements with joined data
     */
    static async getRecentMovements(limit = 10) {
        return this.movementsEntity.getRecentWithJoins(limit);
    }
    /**
     * Get movements by type with joined data
     */
    static async getMovementsByType(type, limit = 50) {
        return this.movementsEntity.getByTypeWithJoins(type, limit);
    }
    /**
     * Get movements by date range with joined data
     */
    static async getMovementsByDateRange(startDate, endDate) {
        return this.movementsEntity.getByDateRangeWithJoins(startDate, endDate);
    }
    /**
     * Get coffer statistics
     */
    static async getCofferStats() {
        const stats = await this.movementsEntity.getStats();
        return {
            ...stats,
            totalEventExpenses: 0 // TODO: Calculate from events if needed
        };
    }
    /**
     * Update balance manually (admin function)
     */
    static async updateBalanceManually(newBalance, updatedBy) {
        const currentBalance = await CofferBalanceEntity.getCurrentBalance();
        if (currentBalance !== newBalance) {
            const difference = newBalance - currentBalance;
            const balanceBefore = currentBalance;
            const balanceAfter = newBalance;
            // Create a movement record for the manual adjustment
            await this.movementsEntity.create({
                type: 'manual_adjustment',
                amount: difference,
                description: `Manual balance adjustment from ${currentBalance} to ${newBalance}`,
                balanceBefore,
                balanceAfter,
                createdBy: updatedBy
            });
            // Update the balance
            await CofferBalanceEntity.updateBalance(newBalance, updatedBy);
        }
        return newBalance;
    }
    /**
     * Get movements for a specific player
     */
    static async getMovementsByPlayer(discordId, limit = 20) {
        return this.movementsEntity.getByPlayerDiscordId(discordId, limit);
    }
    /**
     * Format amount with GP suffixes (K/M/B)
     */
    static formatAmount(amount) {
        const absAmount = Math.abs(amount);
        if (absAmount >= 1000000000) {
            return `${(amount / 1000000000).toFixed(1)}B GP`;
        }
        else if (absAmount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M GP`;
        }
        else if (absAmount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K GP`;
        }
        return `${amount} GP`;
    }
    /**
     * Calculate donation total for a player
     */
    static async getPlayerDonationTotal(discordId) {
        const movements = await this.movementsEntity.findAll({
            where: {
                playerDiscordId: discordId,
                type: 'donation'
            }
        });
        return movements.reduce((total, movement) => total + movement.amount, 0);
    }
    /**
     * Get top donors
     */
    static async getTopDonors(limit = 10) {
        return this.movementsEntity.getTopDonors(limit);
    }
    /**
     * Create tables for coffer module
     */
    static async createTables() {
        await CofferBalanceEntity.createTable();
        await CofferMovementsEntity.createTable();
    }
}
