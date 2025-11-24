/**
 * Donations Service
 * Business logic for donation management
 */

import type { Donation } from './donations.entity.js'
import { DonationsEntity } from './donations.entity.js'

/**
 * Donations Service Class
 * Provides business logic for donation operations
 */
export class DonationsService {
  private static readonly donationsEntity = new DonationsEntity()

  // Donation operations

  /**
   * Create a new donation
   */
  static async createDonation(data: {
    playerDiscordId: string
    amount: number
    screenshotUrl?: string
    messageId?: string
    channelId?: string
    note?: string
    status?: 'pending' | 'approved' | 'denied'
    reviewedBy?: string
    reviewedAt?: Date
  }): Promise<Donation> {
    // Auto-set reviewed_at for approved donations
    const reviewedAt = data.status === 'approved' && !data.reviewedAt
      ? new Date()
      : data.reviewedAt

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
    })
  }

  /**
   * Get donation by ID
   */
  static async getDonationById(id: number): Promise<Donation | null> {
    return this.donationsEntity.findById(id)
  }

  /**
   * Get donations by player Discord ID
   */
  static async getDonationsByPlayer(discordId: string, status?: string): Promise<Donation[]> {
    return this.donationsEntity.findByPlayerDiscordId(discordId, status)
  }

  /**
   * Get pending donations
   */
  static async getPendingDonations(): Promise<Donation[]> {
    return this.donationsEntity.findPending()
  }

  /**
   * Update donation status
   */
  static async updateDonationStatus(
    id: number,
    status: 'pending' | 'approved' | 'denied',
    reviewedBy: string,
    denialReason?: string
  ): Promise<Donation> {
    return this.donationsEntity.updateStatus(id, status, reviewedBy, denialReason)
  }


  /**
   * Delete donation
   */
  static async deleteDonation(id: number): Promise<boolean> {
    return this.donationsEntity.deleteById(id)
  }

  /**
   * Get donation statistics for a player
   */
  static async getDonationStats(discordId: string): Promise<{ totalApproved: number; totalPending: number; totalCount: number }> {
    const donations = await this.getDonationsByPlayer(discordId)

    const totalApproved = donations
      .filter(d => d.status === 'approved')
      .reduce((sum, d) => sum + d.amount, 0)

    const totalPending = donations
      .filter(d => d.status === 'pending')
      .reduce((sum, d) => sum + d.amount, 0)

    return {
      totalApproved,
      totalPending,
      totalCount: donations.length
    }
  }

  /**
   * Create tables for donations module
   */
  static async createTables(): Promise<void> {
    await DonationsEntity.createTable()
  }
}
