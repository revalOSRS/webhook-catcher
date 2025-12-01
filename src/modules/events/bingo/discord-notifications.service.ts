/**
 * Discord Notifications Service for Bingo Events
 * Sends Discord webhook notifications for:
 * - Tile progress and completions
 * - Tier completions
 * - Effect unlocks/grants
 * - Effect activations
 */

import axios from 'axios';
import { query } from '../../../db/connection.js';

/**
 * Data required to send a tile progress/completion notification
 */
export interface TileProgressNotification {
  teamId: string;
  teamName: string;
  eventName: string;
  tileId: string;
  tileTask: string;
  tilePosition: string;
  playerName?: string;
  progressValue: number;
  progressMetadata: Record<string, unknown>;
  isCompleted: boolean;
  completionType: 'auto' | 'manual_admin' | null;
  completedTiers?: number[];
  totalTiers?: number;
  newlyCompletedTiers?: number[];
  pointsAwarded?: number;
}

/**
 * Data for effect unlock notifications
 */
export interface EffectUnlockNotification {
  teamId: string;
  eventId: string;
  effectName: string;
  effectDescription?: string;
  effectIcon?: string;
  effectType: string; // 'buff' or 'debuff'
  effectCategory: string; // 'points', 'board_manipulation', 'defense', 'offense'
  source: string; // 'row_completion', 'column_completion', 'tile_completion', 'admin'
  sourceIdentifier?: string; // e.g., 'row_3', 'column_B'
  trigger: string; // 'immediate', 'manual', 'reactive'
  /** For immediate effects, what happened */
  immediateResult?: {
    pointsAwarded?: number;
    message?: string;
  };
}

/**
 * Data for effect activation notifications
 */
export interface EffectActivationNotification {
  sourceTeamId: string;
  targetTeamId?: string;
  eventId: string;
  effectName: string;
  effectDescription?: string;
  effectIcon?: string;
  effectType: string;
  action: 'activated' | 'blocked' | 'reflected';
  result: {
    message?: string;
    pointsChanged?: number;
    tilesAffected?: string[];
    blockedBy?: string;
    reflectedTo?: string;
  };
}

/**
 * Discord embed structure
 */
interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  timestamp: string;
  footer: { text: string };
}

/**
 * Discord Notifications Service
 * Handles sending webhook notifications for bingo tile progress and completions
 */
export class DiscordNotificationsService {
  /**
   * Send Discord notification for tile progress or completion.
   * 
   * Notifications are sent when:
   * 1. A tile is fully completed (all requirements met)
   * 2. A tier is completed (for tiered tiles)
   * 
   * @param data - The notification data
   */
  static sendTileProgressNotification = async (data: TileProgressNotification): Promise<void> => {
    try {
      // Get team's Discord webhook URL
      const teams = await query<{ discordWebhookUrl: string | null; name: string }>(
        'SELECT discord_webhook_url, name FROM event_teams WHERE id = $1',
        [data.teamId]
      );

      if (teams.length === 0 || !teams[0].discordWebhookUrl) {
        // No webhook configured for this team, skip silently
        return;
      }

      const webhookUrl = teams[0].discordWebhookUrl;
      const teamName = teams[0].name || data.teamName;

      // Build and send Discord embed
      const embed = this.buildProgressEmbed(data, teamName);
      
      await axios.post(webhookUrl, { embeds: [embed] }, {
        headers: { 'Content-Type': 'application/json' }
      });

      // Log what was sent
      const notificationType = data.isCompleted 
        ? 'tile completion' 
        : data.newlyCompletedTiers?.length 
          ? `tier ${data.newlyCompletedTiers.join(', ')} completion`
          : 'progress';
      console.log(`[DiscordNotifications] Sent ${notificationType} for ${data.tilePosition} (${data.tileTask})`);
    } catch (error) {
      // Don't throw - we don't want to break tile progress tracking if Discord fails
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DiscordNotifications] Failed to send notification:`, message);
    }
  };

  /**
   * Build Discord embed for tile progress/completion
   */
  private static buildProgressEmbed = (data: TileProgressNotification, teamName: string): DiscordEmbed => {
    const isTierCompletion = data.newlyCompletedTiers && data.newlyCompletedTiers.length > 0;
    const isTileCompletion = data.isCompleted;
    
    let color: number;
    let title: string;
    
    if (isTileCompletion) {
      color = 0x00ff00; // Green
      title = `🎉 Tile Completed: ${data.tileTask}`;
    } else if (isTierCompletion) {
      color = 0xffa500; // Orange
      const tierText = data.newlyCompletedTiers!.length === 1 
        ? `Tier ${data.newlyCompletedTiers![0]}`
        : `Tiers ${data.newlyCompletedTiers!.join(', ')}`;
      title = `⭐ ${tierText} Completed: ${data.tileTask}`;
    } else {
      // Fallback (shouldn't normally happen)
      color = 0x0099ff; // Blue
      title = `📊 Progress Update: ${data.tileTask}`;
    }

    // Build description
    let description = '';
    description += `**Team:** ${teamName}\n`;
    description += `**Event:** ${data.eventName}\n`;
    description += `**Position:** ${data.tilePosition}\n`;
    description += `**Player:** ${data.playerName}\n\n`;

    if (isTileCompletion) {
      description += this.buildTileCompletionDescription(data);
    } else if (isTierCompletion) {
      description += this.buildTierCompletionDescription(data);
    }

    // Add metadata details (items obtained, tier progress)
    const metadataDetails = this.extractMetadataDetails(data.progressMetadata, data.newlyCompletedTiers);
    if (metadataDetails) {
      description += `\n${metadataDetails}`;
    }

    return {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: { text: 'Bingo Event Progress' }
    };
  };

  /**
   * Build description section for tile completion
   */
  private static buildTileCompletionDescription = (data: TileProgressNotification): string => {
    let desc = '✅ **Tile Completed!**\n';
    desc += data.completionType === 'manual_admin'
      ? '*Completed manually by admin*\n\n'
      : '*Completed automatically*\n\n';

    // Show tier information if this was a tiered tile
    if (data.completedTiers && data.completedTiers.length > 0) {
      if (data.totalTiers && data.totalTiers > 1) {
        desc += `**All Tiers Completed:** ${data.completedTiers.sort((a, b) => a - b).join(', ')}\n`;
      }
    }

    // Show points awarded
    if (data.pointsAwarded && data.pointsAwarded > 0) {
      desc += `\n💰 **+${data.pointsAwarded} points** awarded to team!\n`;
    }

    return desc;
  };

  /**
   * Build description section for tier completion (not full tile)
   */
  private static buildTierCompletionDescription = (data: TileProgressNotification): string => {
    const tierText = data.newlyCompletedTiers!.length === 1
      ? `Tier ${data.newlyCompletedTiers![0]}`
      : `Tiers ${data.newlyCompletedTiers!.join(', ')}`;
    
    let desc = `⭐ **${tierText} Completed!**\n\n`;
    
    if (data.totalTiers && data.totalTiers > 1) {
      const completedCount = data.completedTiers?.length || 0;
      desc += `**Progress:** ${completedCount}/${data.totalTiers} tiers completed\n`;
    }

    // Show points awarded
    if (data.pointsAwarded && data.pointsAwarded > 0) {
      desc += `\n💰 **+${data.pointsAwarded} points** awarded to team!\n`;
    }

    return desc;
  };

  /**
   * Extract useful metadata details for display in the embed
   */
  private static extractMetadataDetails = (
    metadata: Record<string, unknown>, 
    newlyCompletedTiers?: number[]
  ): string | null => {
    const details: string[] = [];

    // Show last items obtained (DB now returns camelCase)
    const lastItems = metadata.lastItemsObtained;
    if (Array.isArray(lastItems) && lastItems.length > 0) {
      const items = lastItems.slice(0, 3).map((item: { name: string; quantity: number }) => {
        const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
        return `${item.name}${qty}`;
      }).join(', ');
      details.push(`**Items:** ${items}`);
    }

    // Show tier progress details
    const completedTiers = metadata.completedTiers;
    if (Array.isArray(completedTiers) && completedTiers.length > 0) {
      const tierDetails: string[] = [];
      
      for (const tierNum of completedTiers as number[]) {
        const tierProgress = metadata[`tier${tierNum}Progress`] as number | undefined;
        const tierMetadata = (metadata[`tier${tierNum}Metadata`] || {}) as Record<string, unknown>;
        const isNewlyCompleted = newlyCompletedTiers?.includes(tierNum);
        const prefix = isNewlyCompleted ? '⭐ ' : '';
        
        if (tierProgress !== undefined) {
          tierDetails.push(`${prefix}Tier ${tierNum}: ${this.formatProgressValue(tierProgress, tierMetadata)}`);
        }
      }
      
      if (tierDetails.length > 0) {
        details.push(`**Tier Progress:**\n${tierDetails.join('\n')}`);
      }
    }

    return details.length > 0 ? details.join('\n') : null;
  };

  /**
   * Format progress value based on metadata context
   */
  private static formatProgressValue = (value: number, metadata: Record<string, unknown>): string => {
    // XP requirements
    if (typeof metadata.gainedXp === 'number') {
      const target = metadata.targetXp as number;
      return `${this.formatNumber(metadata.gainedXp)} / ${this.formatNumber(target)} XP`;
    }

    // Item count requirements
    if (typeof metadata.count === 'number' && typeof metadata.targetValue === 'number') {
      return `${metadata.count} / ${metadata.targetValue}`;
    }

    // Value drop requirements
    if (typeof metadata.currentValue === 'number' && typeof metadata.targetValue === 'number') {
      return `${this.formatNumber(metadata.currentValue)} / ${this.formatNumber(metadata.targetValue)} gp`;
    }

    return this.formatNumber(value);
  };

  /**
   * Format number with k/m/b suffixes for readability
   */
  private static formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) {
      const val = num / 1_000_000_000;
      return val % 1 === 0 ? `${val}b` : `${val.toFixed(1)}b`;
    }
    if (num >= 1_000_000) {
      const val = num / 1_000_000;
      return val % 1 === 0 ? `${val}m` : `${val.toFixed(1)}m`;
    }
    if (num >= 1_000) {
      const val = num / 1_000;
      return val % 1 === 0 ? `${val}k` : `${val.toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  // ============================================================================
  // EFFECT NOTIFICATIONS
  // ============================================================================

  /**
   * Send Discord notification when a team unlocks/earns an effect.
   * 
   * Called when:
   * - A row/column is completed and grants an effect
   * - A tile grants an effect
   * - Admin grants an effect
   * 
   * For immediate effects (like point bonuses), the notification
   * includes what happened immediately.
   */
  static sendEffectUnlockNotification = async (data: EffectUnlockNotification): Promise<void> => {
    try {
      const webhookUrl = await this.getTeamWebhookUrl(data.teamId);
      if (!webhookUrl) return;

      const teamInfo = await this.getTeamInfo(data.teamId, data.eventId);
      
      // Build embed
      const embed = this.buildEffectUnlockEmbed(data, teamInfo);
      
      await axios.post(webhookUrl, { embeds: [embed] }, {
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`[DiscordNotifications] Sent effect unlock: ${data.effectName} for team ${teamInfo.teamName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DiscordNotifications] Failed to send effect unlock notification:`, message);
    }
  };

  /**
   * Send Discord notification when an effect is activated/used.
   * 
   * Called when:
   * - A team manually uses an effect
   * - An effect is blocked by a shield
   * - An effect is reflected by Uno Reverse
   */
  static sendEffectActivationNotification = async (data: EffectActivationNotification): Promise<void> => {
    try {
      // Get webhook URLs for both source and target teams
      const sourceWebhook = await this.getTeamWebhookUrl(data.sourceTeamId);
      const targetWebhook = data.targetTeamId ? await this.getTeamWebhookUrl(data.targetTeamId) : null;

      const sourceTeamInfo = await this.getTeamInfo(data.sourceTeamId, data.eventId);
      const targetTeamInfo = data.targetTeamId 
        ? await this.getTeamInfo(data.targetTeamId, data.eventId)
        : null;

      // Build embed
      const embed = this.buildEffectActivationEmbed(data, sourceTeamInfo, targetTeamInfo);
      
      // Send to source team
      if (sourceWebhook) {
        await axios.post(sourceWebhook, { embeds: [embed] }, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Send to target team if different from source and they have a webhook
      if (targetWebhook && data.targetTeamId !== data.sourceTeamId) {
        await axios.post(targetWebhook, { embeds: [embed] }, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`[DiscordNotifications] Sent effect activation: ${data.effectName} (${data.action})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DiscordNotifications] Failed to send effect activation notification:`, message);
    }
  };

  /**
   * Get team's Discord webhook URL
   */
  private static getTeamWebhookUrl = async (teamId: string): Promise<string | null> => {
    const result = await query<{ discordWebhookUrl: string | null }>(
      'SELECT discord_webhook_url FROM event_teams WHERE id = $1',
      [teamId]
    );
    return result[0]?.discordWebhookUrl || null;
  };

  /**
   * Get team and event info
   */
  private static getTeamInfo = async (teamId: string, eventId: string): Promise<{ teamName: string; eventName: string }> => {
    const result = await query<{ teamName: string; eventName: string }>(`
      SELECT et.name as team_name, e.name as event_name
      FROM event_teams et
      JOIN events e ON et.event_id = e.id
      WHERE et.id = $1 AND e.id = $2
    `, [teamId, eventId]);
    
    return {
      teamName: result[0]?.teamName || 'Unknown Team',
      eventName: result[0]?.eventName || 'Unknown Event'
    };
  };

  /**
   * Build Discord embed for effect unlock
   */
  private static buildEffectUnlockEmbed = (
    data: EffectUnlockNotification,
    teamInfo: { teamName: string; eventName: string }
  ): DiscordEmbed => {
    const icon = data.effectIcon || '✨';
    const isImmediate = data.trigger === 'immediate';
    
    // Color based on category
    let color: number;
    switch (data.effectCategory) {
      case 'points':
        color = 0xffd700; // Gold
        break;
      case 'defense':
        color = 0x00ff00; // Green
        break;
      case 'offense':
        color = 0xff4444; // Red
        break;
      case 'board_manipulation':
        color = 0x9932cc; // Purple
        break;
      default:
        color = 0x0099ff; // Blue
    }

    // Title
    let title: string;
    if (isImmediate && data.immediateResult) {
      title = `${icon} Effect Triggered: ${data.effectName}`;
    } else {
      title = `${icon} Effect Unlocked: ${data.effectName}`;
    }

    // Description
    let description = '';
    description += `**Team:** ${teamInfo.teamName}\n`;
    description += `**Event:** ${teamInfo.eventName}\n\n`;
    
    if (data.effectDescription) {
      description += `*${data.effectDescription}*\n\n`;
    }

    // Source info
    const sourceText = this.formatEffectSource(data.source, data.sourceIdentifier);
    description += `**Source:** ${sourceText}\n`;
    
    // Category and type
    description += `**Type:** ${data.effectType === 'buff' ? '⬆️ Buff' : '⬇️ Debuff'}\n`;
    description += `**Category:** ${this.formatCategory(data.effectCategory)}\n`;

    // Trigger info
    if (data.trigger === 'manual') {
      description += `\n🎮 *Use this effect manually when ready!*`;
    } else if (data.trigger === 'reactive') {
      description += `\n🛡️ *This effect will trigger automatically when needed!*`;
    } else if (isImmediate && data.immediateResult) {
      description += `\n✅ **Immediately Applied:**\n`;
      if (data.immediateResult.pointsAwarded) {
        description += `  • +${data.immediateResult.pointsAwarded} points added!\n`;
      }
      if (data.immediateResult.message) {
        description += `  • ${data.immediateResult.message}\n`;
      }
    }

    return {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: { text: 'Bingo Effects' }
    };
  };

  /**
   * Build Discord embed for effect activation
   */
  private static buildEffectActivationEmbed = (
    data: EffectActivationNotification,
    sourceTeamInfo: { teamName: string; eventName: string },
    targetTeamInfo: { teamName: string; eventName: string } | null
  ): DiscordEmbed => {
    const icon = data.effectIcon || '⚡';
    
    // Color based on action
    let color: number;
    let title: string;
    
    switch (data.action) {
      case 'activated':
        color = 0x0099ff; // Blue
        title = `${icon} Effect Used: ${data.effectName}`;
        break;
      case 'blocked':
        color = 0x888888; // Gray
        title = `🛡️ Effect Blocked: ${data.effectName}`;
        break;
      case 'reflected':
        color = 0xff00ff; // Magenta
        title = `🔄 Effect Reflected: ${data.effectName}`;
        break;
      default:
        color = 0x0099ff;
        title = `${icon} ${data.effectName}`;
    }

    // Description
    let description = '';
    description += `**From:** ${sourceTeamInfo.teamName}\n`;
    if (targetTeamInfo) {
      description += `**Target:** ${targetTeamInfo.teamName}\n`;
    }
    description += `**Event:** ${sourceTeamInfo.eventName}\n\n`;

    if (data.effectDescription) {
      description += `*${data.effectDescription}*\n\n`;
    }

    // Result details
    description += `**Result:** `;
    
    switch (data.action) {
      case 'activated':
        description += '✅ Successfully activated!\n';
        break;
      case 'blocked':
        description += `❌ Blocked by ${data.result.blockedBy || 'Shield'}!\n`;
        break;
      case 'reflected':
        description += `🔄 Reflected back!\n`;
        break;
    }

    // Specific result details
    if (data.result.message) {
      description += `\n${data.result.message}`;
    }
    
    if (data.result.pointsChanged) {
      const prefix = data.result.pointsChanged > 0 ? '+' : '';
      description += `\n💰 ${prefix}${data.result.pointsChanged} points`;
    }

    if (data.result.tilesAffected && data.result.tilesAffected.length > 0) {
      description += `\n📍 Tiles affected: ${data.result.tilesAffected.join(', ')}`;
    }

    return {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: { text: 'Bingo Effects' }
    };
  };

  /**
   * Format effect source for display
   */
  private static formatEffectSource = (source: string, identifier?: string): string => {
    switch (source) {
      case 'row_completion':
        return `Row ${identifier?.replace('row_', '')} completed`;
      case 'column_completion':
        return `Column ${identifier?.replace('column_', '')} completed`;
      case 'tile_completion':
        return identifier ? `Tile ${identifier} completed` : 'Tile completed';
      case 'admin':
        return identifier || 'Admin grant';
      case 'reflected':
        return 'Reflected from enemy';
      default:
        return source;
    }
  };

  /**
   * Format effect category for display
   */
  private static formatCategory = (category: string): string => {
    switch (category) {
      case 'points':
        return '💰 Points';
      case 'defense':
        return '🛡️ Defense';
      case 'offense':
        return '⚔️ Offense';
      case 'board_manipulation':
        return '🎯 Board Manipulation';
      case 'passive':
        return '🔮 Passive';
      default:
        return category;
    }
  };
}
