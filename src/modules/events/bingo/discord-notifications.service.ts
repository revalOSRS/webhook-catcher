/**
 * Discord Notifications Service for Bingo Events
 * Sends Discord webhook notifications for tile progress and completions
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
  playerName: string;
  progressValue: number;
  progressMetadata: Record<string, unknown>;
  isCompleted: boolean;
  completionType: 'auto' | 'manual_admin' | null;
  completedTiers?: number[];
  totalTiers?: number;
  newlyCompletedTiers?: number[];
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
      const teams = await query<{ discord_webhook_url: string | null; name: string }>(
        'SELECT discord_webhook_url, name FROM event_teams WHERE id = $1',
        [data.teamId]
      );

      if (teams.length === 0 || !teams[0].discord_webhook_url) {
        // No webhook configured for this team, skip silently
        return;
      }

      const webhookUrl = teams[0].discord_webhook_url;
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

    // Show last items obtained
    const lastItems = metadata.last_items_obtained;
    if (Array.isArray(lastItems) && lastItems.length > 0) {
      const items = lastItems.slice(0, 3).map((item: { name: string; quantity: number }) => {
        const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
        return `${item.name}${qty}`;
      }).join(', ');
      details.push(`**Items:** ${items}`);
    }

    // Show tier progress details
    const completedTiers = metadata.completed_tiers;
    if (Array.isArray(completedTiers) && completedTiers.length > 0) {
      const tierDetails: string[] = [];
      
      for (const tierNum of completedTiers as number[]) {
        const tierProgress = metadata[`tier_${tierNum}_progress`] as number | undefined;
        const tierMetadata = (metadata[`tier_${tierNum}_metadata`] || {}) as Record<string, unknown>;
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
    if (typeof metadata.gained_xp === 'number') {
      const target = metadata.target_xp as number;
      return `${this.formatNumber(metadata.gained_xp)} / ${this.formatNumber(target)} XP`;
    }

    // Item count requirements
    if (typeof metadata.count === 'number' && typeof metadata.target_value === 'number') {
      return `${metadata.count} / ${metadata.target_value}`;
    }

    // Value drop requirements
    if (typeof metadata.current_value === 'number' && typeof metadata.target_value === 'number') {
      return `${this.formatNumber(metadata.current_value)} / ${this.formatNumber(metadata.target_value)} gp`;
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
}
