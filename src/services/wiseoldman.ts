/**
 * WiseOldMan API Service
 * Handles all interactions with the WiseOldMan API using the official client
 */

import { WOMClient } from '@wise-old-man/utils'

const client = new WOMClient()

// Re-export types from the WOM client for convenience
export type {
  Player as WOMPlayer,
  Snapshot as WOMSnapshot,
  Achievement as WOMAchievement,
  Record as WOMRecord,
  Group as WOMGroup,
  Membership as WOMGroupMembership
} from '@wise-old-man/utils'

/**
 * Search for a player by username
 */
export async function searchPlayer(username: string) {
  try {
    const player = await client.players.getPlayerDetails(username)
    return player
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null
    }
    console.error('Error fetching WOM player:', error)
    throw error
  }
}

/**
 * Get player details by ID
 */
export async function getPlayerById(playerId: number) {
  try {
    const player = await client.players.getPlayerDetailsById(playerId)
    return player
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null
    }
    console.error('Error fetching WOM player by ID:', error)
    throw error
  }
}

/**
 * Update player (trigger a data refresh from OSRS hiscores)
 */
export async function updatePlayer(username: string) {
  try {
    const updatedPlayer = await client.players.updatePlayer(username)
    return updatedPlayer
  } catch (error) {
    console.error('Error updating WOM player:', error)
    throw error
  }
}

/**
 * Get player snapshots (historical data)
 */
export async function getPlayerSnapshots(username: string, limit: number = 10) {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - 1) // Get snapshots from the last year
    
    const snapshots = await client.players.getPlayerSnapshots(username, { startDate, endDate })
    return snapshots.slice(0, limit)
  } catch (error) {
    console.error('Error fetching WOM snapshots:', error)
    throw error
  }
}

/**
 * Get player gains for a specific period
 */
export async function getPlayerGains(
  username: string,
  period: 'day' | 'week' | 'month' | 'year' = 'week'
) {
  try {
    const gains = await client.players.getPlayerGains(username, { period })
    return gains
  } catch (error) {
    console.error('Error fetching WOM gains:', error)
    throw error
  }
}

/**
 * Get player achievements
 */
export async function getPlayerAchievements(username: string, limit: number = 20) {
  try {
    const achievements = await client.players.getPlayerAchievements(username)
    // Return limited results
    return achievements.slice(0, limit)
  } catch (error) {
    console.error('Error fetching WOM achievements:', error)
    throw error
  }
}

/**
 * Get player records
 */
export async function getPlayerRecords(username: string, period: string = 'week', metric?: string) {
  try {
    const records = await client.players.getPlayerRecords(username)
    // Filter by period and metric if needed
    return records
  } catch (error) {
    console.error('Error fetching WOM records:', error)
    throw error
  }
}

/**
 * Get player's groups/clans
 */
export async function getPlayerGroups(username: string) {
  try {
    const groups = await client.players.getPlayerGroups(username)
    return groups
  } catch (error) {
    console.error('Error fetching WOM groups:', error)
    throw error
  }
}

/**
 * Get group activity by group ID
 */
export async function getGroupActivity(
  groupId: number,
  limit?: number,
  offset?: number
) {
  try {
    const activity = await client.groups.getGroupActivity(groupId)
    
    // Apply pagination manually if needed
    let result = activity
    if (offset) {
      result = result.slice(offset)
    }
    if (limit) {
      result = result.slice(0, limit)
    }
    
    return result
  } catch (error) {
    console.error('Error fetching WOM group activity:', error)
    throw error
  }
}

/**
 * Get group members by group ID
 */
export async function getGroupMembers(
  groupId: number,
  limit?: number,
  offset?: number
) {
  try {
    const groupDetails = await client.groups.getGroupDetails(groupId)
    let members = groupDetails.memberships || []
    
    // Apply pagination manually if needed
    if (offset) {
      members = members.slice(offset)
    }
    if (limit) {
      members = members.slice(0, limit)
    }
    
    return members
  } catch (error) {
    console.error('Error fetching WOM group members:', error)
    throw error
  }
}

/**
 * Get comprehensive player data (combines multiple endpoints)
 */
export async function getComprehensivePlayerData(username: string) {
  try {
    const [player, gains, achievements, records, groups] = await Promise.allSettled([
      searchPlayer(username),
      getPlayerGains(username, 'week'),
      getPlayerAchievements(username, 10),
      getPlayerRecords(username, 'week'),
      getPlayerGroups(username)
    ])

    return {
      player: player.status === 'fulfilled' ? player.value : null,
      gains: gains.status === 'fulfilled' ? gains.value : null,
      achievements: achievements.status === 'fulfilled' ? achievements.value : [],
      records: records.status === 'fulfilled' ? records.value : [],
      groups: groups.status === 'fulfilled' ? groups.value : []
    }
  } catch (error) {
    console.error('Error fetching comprehensive WOM data:', error)
    throw error
  }
}

