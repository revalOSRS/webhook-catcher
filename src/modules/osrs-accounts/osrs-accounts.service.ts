/**
 * OSRS Accounts Service
 * Business logic for OSRS account management
 */

import type { OsrsAccount } from './osrs-accounts.entity.js'
import type { AchievementDiaryCompletion } from './entities/achievement-diary-completions.entity.js'
import type { CombatAchievementCompletion } from './entities/combat-achievement-completions.entity.js'
import type { CollectionLogDrop } from './entities/collection-log-drops.entity.js'
import type { Killcount } from './entities/killcounts.entity.js'
import type { CollectionLog } from './entities/collection-log.entity.js'

import { OsrsAccountsEntity } from './osrs-accounts.entity.js'
import { AchievementDiaryCompletionsEntity } from './entities/achievement-diary-completions.entity.js'
import { CombatAchievementCompletionsEntity } from './entities/combat-achievement-completions.entity.js'
import { CollectionLogDropsEntity } from './entities/collection-log-drops.entity.js'
import { KillcountsEntity } from './entities/killcounts.entity.js'
import { CollectionLogEntity } from './entities/collection-log.entity.js'

/**
 * OSRS Accounts Service Class
 * Provides business logic for OSRS account operations and related data
 */
export class OsrsAccountsService {
  private static readonly accountsEntity = new OsrsAccountsEntity()
  private static readonly diaryCompletionsEntity = new AchievementDiaryCompletionsEntity()
  private static readonly combatCompletionsEntity = new CombatAchievementCompletionsEntity()
  private static readonly collectionDropsEntity = new CollectionLogDropsEntity()
  private static readonly killcountsEntity = new KillcountsEntity()
  private static readonly collectionLogEntity = new CollectionLogEntity()

  /**
   * Create a new OSRS account
   */
  static async createAccount(data: {
    discordId: string
    osrsNickname: string
    dinkHash?: string
    womPlayerId?: number
    womRank?: string
    ehp?: number
    ehb?: number
    isPrimary?: boolean
  }): Promise<OsrsAccount> {
    return this.accountsEntity.create({
      discordId: data.discordId,
      osrsNickname: data.osrsNickname,
      dinkHash: data.dinkHash,
      womPlayerId: data.womPlayerId,
      womRank: data.womRank,
      ehp: data.ehp || 0,
      ehb: data.ehb || 0,
      isPrimary: data.isPrimary || false,
    })
  }

  /**
   * Get all accounts for a Discord user
   */
  static async getAccountsByDiscordId(discordId: string): Promise<OsrsAccount[]> {
    return this.accountsEntity.findByDiscordId(discordId)
  }

  /**
   * Get account by ID
   */
  static async getAccountById(id: number): Promise<OsrsAccount | null> {
    return this.accountsEntity.findById(id)
  }

  /**
   * Get account by OSRS nickname
   */
  static async getAccountByNickname(osrsNickname: string): Promise<OsrsAccount | null> {
    return this.accountsEntity.findByOsrsNickname(osrsNickname)
  }

  /**
   * Get account by WOM player ID
   */
  static async getAccountByWomPlayerId(womPlayerId: number): Promise<OsrsAccount | null> {
    return this.accountsEntity.findByWomPlayerId(womPlayerId)
  }

  /**
   * Get account by Dink hash
   */
  static async getAccountByDinkHash(dinkHash: string): Promise<OsrsAccount | null> {
    return this.accountsEntity.findByDinkHash(dinkHash)
  }

  /**
   * Update account information
   */
  static async updateAccount(id: number, updates: Partial<{
    dinkHash: string
    womPlayerId: number
    womRank: string
    ehp: number
    ehb: number
    isPrimary: boolean
  }>): Promise<OsrsAccount> {
    const result = await this.accountsEntity.updateById(id, updates)
    if (!result) {
      throw new Error(`OSRS account with id ${id} not found`)
    }
    return result
  }

  /**
   * Set an account as primary for a Discord user
   */
  static async setPrimaryAccount(accountId: number, discordId: string): Promise<void> {
    await this.accountsEntity.setPrimary(accountId, discordId)
  }

  /**
   * Delete an account
   */
  static async deleteAccount(id: number): Promise<boolean> {
    return this.accountsEntity.deleteById(id)
  }

  /**
   * Get the highest efficiency account for a Discord user
   */
  static async getHighestEfficiencyAccount(discordId: string): Promise<OsrsAccount | null> {
    return this.accountsEntity.getHighestEfficiency(discordId)
  }

  /**
   * Get all accounts with efficiency calculations
   */
  static async getAccountsWithEfficiency(discordId: string): Promise<OsrsAccount[]> {
    return this.accountsEntity.getAllWithEfficiency(discordId)
  }

  /**
   * Update sync timestamp for an account
   */
  static async updateSyncTimestamp(accountId: number): Promise<void> {
    const success = await this.accountsEntity.updateSyncTimestamp(accountId)
    if (!success) {
      throw new Error(`Failed to update sync timestamp for account ${accountId}`)
    }
  }

  /**
   * Verify dink hash exists and belongs to an active account
   */
  static async verifyDinkHash(dinkHash: string): Promise<boolean> {
    const account = await this.getAccountByDinkHash(dinkHash)
    return account !== null
  }

  // ============================================================================
  // Achievement Diary Completions
  // ============================================================================

  /**
   * Get diary completions for an account
   */
  static async getDiaryCompletions(accountId: number): Promise<Array<AchievementDiaryCompletion & {
    diaryName?: string
    tier?: string
    totalTasks?: number
  }>> {
    return this.diaryCompletionsEntity.getCompletionsWithDetails(accountId)
  }

  /**
   * Complete a diary tier for an account
   */
  static async completeDiaryTier(accountId: number, diaryTierId: number): Promise<AchievementDiaryCompletion> {
    // Check if already completed
    const existing = await this.diaryCompletionsEntity.hasCompleted(accountId, diaryTierId)
    if (existing) {
      throw new Error('Diary tier already completed')
    }

    return this.diaryCompletionsEntity.create({
      osrsAccountId: accountId,
      diaryTierId
    })
  }

  // ============================================================================
  // Combat Achievement Completions
  // ============================================================================

  /**
   * Get combat achievement completions for an account
   */
  static async getCombatAchievementCompletions(accountId: number): Promise<Array<CombatAchievementCompletion & {
    achievementName?: string
    tier?: string
    monster?: string
  }>> {
    return this.combatCompletionsEntity.getCompletionsWithDetails(accountId)
  }

  /**
   * Complete a combat achievement for an account
   */
  static async completeCombatAchievement(accountId: number, achievementId: number): Promise<CombatAchievementCompletion> {
    // Check if already completed
    const existing = await this.combatCompletionsEntity.hasCompleted(accountId, achievementId)
    if (existing) {
      throw new Error('Combat achievement already completed')
    }

    return this.combatCompletionsEntity.create({
      osrsAccountId: accountId,
      combatAchievementId: achievementId
    })
  }

  // ============================================================================
  // Collection Log
  // ============================================================================

  /**
   * Get collection log progress for an account
   */
  static async getCollectionLog(accountId: number): Promise<CollectionLog[]> {
    return this.collectionLogEntity.getByAccountId(accountId)
  }

  /**
   * Get collection log drops for an account
   */
  static async getCollectionLogDrops(accountId: number): Promise<Array<CollectionLogDrop & {
    itemName?: string
    category?: string
    subcategory?: string
    rarity?: string
  }>> {
    return this.collectionDropsEntity.getDropsWithDetails(accountId)
  }

  /**
   * Mark collection log item as obtained
   */
  static async markCollectionLogItemObtained(accountId: number, category: string, subcategory: string | undefined, itemName: string, quantity: number = 1): Promise<CollectionLog> {
    return this.collectionLogEntity.markObtained(accountId, category, subcategory, itemName, quantity)
  }

  /**
   * Record a collection log drop
   */
  static async recordCollectionLogDrop(accountId: number, itemId: number, quantity: number = 1): Promise<CollectionLogDrop> {
    // Check if already obtained
    const existing = await this.collectionDropsEntity.hasObtained(accountId, itemId)
    if (existing) {
      throw new Error('Item already obtained in collection log')
    }

    return this.collectionDropsEntity.create({
      osrsAccountId: accountId,
      collectionLogItemId: itemId,
      quantity
    })
  }

  // ============================================================================
  // Killcounts
  // ============================================================================

  /**
   * Get killcounts for an account
   */
  static async getKillcounts(accountId: number): Promise<Killcount[]> {
    return this.killcountsEntity.getByAccountId(accountId)
  }

  /**
   * Update killcount for a boss
   */
  static async updateKillcount(accountId: number, bossName: string, killCount: number): Promise<Killcount> {
    return this.killcountsEntity.upsertKillcount(accountId, bossName, killCount)
  }

  /**
   * Increment killcount for a boss
   */
  static async incrementKillcount(accountId: number, bossName: string): Promise<Killcount> {
    return this.killcountsEntity.incrementKillcount(accountId, bossName)
  }

  // ============================================================================
  // Account Statistics
  // ============================================================================

  /**
   * Get comprehensive account statistics
   */
  static async getAccountStats(accountId: number): Promise<{
    diaryCompletions: number
    combatAchievements: number
    collectionLogItems: number
    totalKillcounts: number
    collectionLogStats?: {
      totalItems: number
      obtainedItems: number
      completionPercentage: number
    }
  }> {
    // Get all stats in parallel
    const [diary, combat, collectionDrops, killcounts, collectionLog] = await Promise.all([
      this.diaryCompletionsEntity.getCompletionsWithDetails(accountId),
      this.combatCompletionsEntity.getCompletionsWithDetails(accountId),
      this.collectionDropsEntity.getDropsWithDetails(accountId),
      this.killcountsEntity.getByAccountId(accountId),
      this.collectionLogEntity.getStats(accountId)
    ])

    return {
      diaryCompletions: diary.length,
      combatAchievements: combat.length,
      collectionLogItems: collectionDrops.length,
      totalKillcounts: killcounts.reduce((sum, kc) => sum + kc.killCount, 0),
      collectionLogStats: collectionLog
    }
  }


  /**
   * Create tables for OSRS accounts module
   */
  static async createTables(): Promise<void> {
    await OsrsAccountsEntity.createTable()
    await AchievementDiaryCompletionsEntity.createTable()
    await CombatAchievementCompletionsEntity.createTable()
    await CollectionLogDropsEntity.createTable()
    await KillcountsEntity.createTable()
    await CollectionLogEntity.createTable()
  }
}
