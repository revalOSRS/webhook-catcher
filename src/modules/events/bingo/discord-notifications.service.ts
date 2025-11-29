/**
 * Discord Notifications Service for Bingo Events
 * Sends Discord webhook notifications for tile progress and completions
 */

import axios from 'axios'
import { query } from '../../../db/connection.js'

interface TileProgressNotification {
  teamId: string
  teamName: string
  eventName: string
  tileId: string
  tileTask: string
  tilePosition: string
  playerName: string
  progressValue: number
  progressMetadata: Record<string, any>
  isCompleted: boolean
  completionType: 'auto' | 'manual_admin' | null
  completedTiers?: number[]
  totalTiers?: number
}

/**
 * Send Discord notification for tile progress or completion
 */
export async function sendTileProgressNotification(data: TileProgressNotification): Promise<void> {
  try {
    // Get team's Discord webhook URL
    const teams = await query(
      'SELECT discord_webhook_url, name FROM event_teams WHERE id = $1',
      [data.teamId]
    )

    if (teams.length === 0 || !teams[0].discord_webhook_url) {
      // No webhook configured for this team, skip notification
      return
    }

    const webhookUrl = teams[0].discord_webhook_url
    const teamName = teams[0].name || data.teamName

    // Build Discord embed
    const embed = buildProgressEmbed(data, teamName)

    // Send to Discord
    await axios.post(webhookUrl, {
      embeds: [embed]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log(`[DiscordNotifications] Sent ${data.isCompleted ? 'completion' : 'progress'} notification for tile ${data.tilePosition} (${data.tileTask})`)
  } catch (error: any) {
    // Don't throw - we don't want to break tile progress tracking if Discord fails
    console.error(`[DiscordNotifications] Error sending notification:`, error.message)
  }
}

/**
 * Build Discord embed for tile progress/completion
 */
function buildProgressEmbed(data: TileProgressNotification, teamName: string): any {
  const isCompletion = data.isCompleted
  const color = isCompletion ? 0x00ff00 : 0x0099ff // Green for completion, blue for progress
  const title = isCompletion 
    ? `🎉 Tile Completed: ${data.tileTask}` 
    : `📊 Progress Update: ${data.tileTask}`

  // Build description
  let description = `**Team:** ${teamName}\n`
  description += `**Event:** ${data.eventName}\n`
  description += `**Position:** ${data.tilePosition}\n`
  description += `**Player:** ${data.playerName}\n\n`

  // Add progress information
  if (isCompletion) {
    description += `✅ **Tile Completed!**\n`
    if (data.completionType === 'manual_admin') {
      description += `*Completed manually by admin*\n\n`
    } else {
      description += `*Completed automatically*\n\n`
    }

    // Show tier information if applicable
    if (data.completedTiers && data.completedTiers.length > 0) {
      if (data.totalTiers && data.totalTiers > 1) {
        description += `**Completed Tiers:** ${data.completedTiers.join(', ')}/${data.totalTiers}\n`
      } else {
        description += `**Tier:** ${data.completedTiers[0]}\n`
      }
    }
  } else {
    description += `**Progress:** ${formatProgressValue(data.progressValue, data.progressMetadata)}\n`
    
    // Show tier progress if applicable
    if (data.completedTiers && data.completedTiers.length > 0 && data.totalTiers) {
      description += `**Tiers Completed:** ${data.completedTiers.length}/${data.totalTiers}\n`
    }
  }

  // Add metadata details
  const metadataDetails = extractMetadataDetails(data.progressMetadata)
  if (metadataDetails) {
    description += `\n${metadataDetails}`
  }

  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    footer: {
      text: `Bingo Event Progress`
    }
  }
}

/**
 * Format progress value based on metadata
 */
function formatProgressValue(value: number, metadata: Record<string, any>): string {
  // For XP requirements
  if (metadata.gained_xp !== undefined) {
    return `${formatNumber(metadata.gained_xp)} XP / ${formatNumber(metadata.target_xp)} XP`
  }

  // For item drop requirements
  if (metadata.count !== undefined && metadata.target_value !== undefined) {
    return `${metadata.count} / ${metadata.target_value}`
  }

  // For value drop requirements
  if (metadata.current_value !== undefined && metadata.target_value !== undefined) {
    return `${formatNumber(metadata.current_value)} gp / ${formatNumber(metadata.target_value)} gp`
  }

  // Default
  return `${formatNumber(value)}`
}

/**
 * Extract useful metadata details for display
 */
function extractMetadataDetails(metadata: Record<string, any>): string | null {
  const details: string[] = []

  // Show last items obtained
  if (metadata.last_items_obtained && Array.isArray(metadata.last_items_obtained) && metadata.last_items_obtained.length > 0) {
    const items = metadata.last_items_obtained.slice(0, 3).map((item: any) => {
      const qty = item.quantity > 1 ? ` x${item.quantity}` : ''
      return `${item.name}${qty}`
    }).join(', ')
    details.push(`**Items:** ${items}`)
  }

  // Show tier progress details
  if (metadata.completed_tiers && metadata.completed_tiers.length > 0) {
    const tierDetails: string[] = []
    for (const tierNum of metadata.completed_tiers) {
      const tierProgress = metadata[`tier_${tierNum}_progress`]
      const tierMetadata = metadata[`tier_${tierNum}_metadata`] || {}
      if (tierProgress !== undefined) {
        tierDetails.push(`Tier ${tierNum}: ${formatProgressValue(tierProgress, tierMetadata)}`)
      }
    }
    if (tierDetails.length > 0) {
      details.push(`**Tier Progress:**\n${tierDetails.join('\n')}`)
    }
  }

  return details.length > 0 ? details.join('\n') : null
}

/**
 * Format number with k/m/b suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000000) {
    const billions = num / 1000000000
    return billions % 1 === 0 ? `${billions}b` : `${billions.toFixed(1)}b`
  } else if (num >= 1000000) {
    const millions = num / 1000000
    return millions % 1 === 0 ? `${millions}m` : `${millions.toFixed(1)}m`
  } else if (num >= 1000) {
    const thousands = num / 1000
    return thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`
  }
  return num.toLocaleString()
}

