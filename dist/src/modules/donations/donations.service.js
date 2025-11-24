/**
 * Donations Service
 * Business logic for donation management
 */
import { DonationsEntity } from './donations.entity.js';
/**
 * Donations Service Class
 * Provides business logic for donation operations
 */
export class DonationsService {
    static donationsEntity = new DonationsEntity();
    // Donation operations
    /**
     * Create a new donation
     */
    static async createDonation(data) {
        // Auto-set reviewed_at for approved donations
        const reviewedAt = data.status === 'approved' && !data.reviewedAt
            ? new Date()
            : data.reviewedAt;
        return this.donationsEntity.create({
            playerDiscordId: data.playerDiscordId,
            amount: data.amount,
            screenshotUrl: data.screenshotUrl,
            status: data.status || 'pending',
            submittedAt: new Date(),
            reviewedAt,
            reviewedBy: data.reviewedBy,
            messageId: data.messageId,
            channelId: data.channelId,
            note: data.note,
        });
    }
    /**
     * Get donation by ID
     */
    static async getDonationById(id) {
        return this.donationsEntity.findById(id);
    }
    /**
     * Get donations by player Discord ID
     */
    static async getDonationsByPlayer(discordId, status) {
        return this.donationsEntity.findByPlayerDiscordId(discordId, status);
    }
    /**
     * Get pending donations
     */
    static async getPendingDonations() {
        return this.donationsEntity.findPending();
    }
    /**
     * Update donation status
     */
    static async updateDonationStatus(id, status, reviewedBy, denialReason) {
        return this.donationsEntity.updateStatus(id, status, reviewedBy, denialReason);
    }
    /**
     * Delete donation
     */
    static async deleteDonation(id) {
        return this.donationsEntity.deleteById(id);
    }
    /**
     * Get donation statistics for a player
     */
    static async getDonationStats(discordId) {
        const donations = await this.getDonationsByPlayer(discordId);
        const totalApproved = donations
            .filter(d => d.status === 'approved')
            .reduce((sum, d) => sum + d.amount, 0);
        const totalPending = donations
            .filter(d => d.status === 'pending')
            .reduce((sum, d) => sum + d.amount, 0);
        return {
            totalApproved,
            totalPending,
            totalCount: donations.length
        };
    }
    /**
     * Create tables for donations module
     */
    static async createTables() {
        await DonationsEntity.createTable();
    }
}
