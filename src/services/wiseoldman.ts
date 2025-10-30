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

// Cache for group statistics
let groupStatisticsCache: {
  data: any
  lastRefresh: Date
} | null = null

/**
 * Check if cache should be refreshed (after 1 AM today)
 */
function shouldRefreshCache(): boolean {
  if (!groupStatisticsCache) {
    return true
  }

  const now = new Date()
  const lastRefresh = groupStatisticsCache.lastRefresh
  
  // Get 1 AM today
  const oneAMToday = new Date(now)
  oneAMToday.setHours(1, 0, 0, 0)
  
  // If current time is before 1 AM, use 1 AM yesterday
  if (now < oneAMToday) {
    oneAMToday.setDate(oneAMToday.getDate() - 1)
  }
  
  // Refresh if last refresh was before 1 AM today
  return lastRefresh < oneAMToday
}

/**
 * Get comprehensive clan statistics for a group (with daily caching)
 */
export async function getGroupStatistics(groupId: number) {
  try {
    // Check if we have valid cached data
    if (groupStatisticsCache && !shouldRefreshCache()) {
      console.log('Returning cached clan statistics')
      return groupStatisticsCache.data
    }

    console.log('Fetching fresh clan statistics...')
    
    // Get group details which includes all members
    const groupDetails = await client.groups.getGroupDetails(groupId)
    const members = groupDetails.memberships || []
    
    console.log(`Found ${members.length} members in group ${groupDetails.name}`)
    
    // Fetch all player details in parallel (in batches to avoid overwhelming the API)
    const BATCH_SIZE = 20
    const MAX_RETRIES = 2
    const playerDetails = []
    const failedMembers = []
    
    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(members.length / BATCH_SIZE)} (${batch.length} members)`)
      
      const batchResults = await Promise.allSettled(
        batch.map(member => client.players.getPlayerDetailsById(member.player.id))
      )
      
      // Process successful results
      const successfulResults = batchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as any).value)
      
      playerDetails.push(...successfulResults)
      
      // Track failed requests for retry
      batchResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          const member = batch[index]
          console.error(`Failed to fetch player ${member.player.username} (ID: ${member.player.id}):`, result.reason)
          failedMembers.push(member)
        }
      })
    }
    
    // Retry failed members
    if (failedMembers.length > 0) {
      console.log(`Retrying ${failedMembers.length} failed member(s)...`)
      
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        if (failedMembers.length === 0) break
        
        console.log(`Retry attempt ${retry + 1}/${MAX_RETRIES} for ${failedMembers.length} member(s)`)
        
        const retryResults = await Promise.allSettled(
          failedMembers.map(member => client.players.getPlayerDetailsById(member.player.id))
        )
        
        // Process successful retries
        const successfulRetries = []
        const stillFailing = []
        
        retryResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successfulRetries.push((result as any).value)
          } else {
            stillFailing.push(failedMembers[index])
            if (retry === MAX_RETRIES - 1) {
              const member = failedMembers[index]
              console.error(`❌ FINAL FAILURE: Could not fetch player ${member.player.username} (ID: ${member.player.id}) after ${MAX_RETRIES} retries`)
            }
          }
        })
        
        playerDetails.push(...successfulRetries)
        failedMembers.length = 0
        failedMembers.push(...stillFailing)
        
        // Wait a bit before next retry
        if (stillFailing.length > 0 && retry < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
    
    console.log(`Successfully fetched ${playerDetails.length}/${members.length} player details`)
    
    if (failedMembers.length > 0) {
      console.warn(`⚠️ WARNING: ${failedMembers.length} member(s) could not be fetched after retries:`)
      failedMembers.forEach(member => {
        console.warn(`  - ${member.player.username} (ID: ${member.player.id})`)
      })
    }
    
    // Calculate statistics
    const totalMembers = playerDetails.length
    
    let totalLevel = 0
    let totalXP = 0
    let maxedCount = 0
    let totalClues = 0
    let totalBossKills = 0
    let totalCox = 0
    let totalToa = 0
    let totalTob = 0
    let totalEHP = 0
    let totalEHB = 0
    
    for (const player of playerDetails) {
      // Calculate total level (sum of all skill levels)
      const skills = player.latestSnapshot?.data?.skills || {}
      let playerTotalLevel = 0
      for (const skill in skills) {
        playerTotalLevel += skills[skill]?.level || 0
      }
      totalLevel += playerTotalLevel
      
      // Check if maxed (2277 total level)
      if (playerTotalLevel >= 2277) {
        maxedCount++
      }
      
      // Total XP
      totalXP += player.exp || 0
      
      // Total clues (sum of all clue types)
      const activities = player.latestSnapshot?.data?.activities || {}
      const clueTypes = ['clue_scrolls_all', 'clue_scrolls_beginner', 'clue_scrolls_easy', 
                         'clue_scrolls_medium', 'clue_scrolls_hard', 'clue_scrolls_elite', 
                         'clue_scrolls_master']
      
      // Use the 'all' clue count if available, otherwise sum individual types
      if (activities['clue_scrolls_all']) {
        totalClues += activities['clue_scrolls_all']?.score || 0
      }
      
      // Total boss kills (sum all bosses)
      const bosses = player.latestSnapshot?.data?.bosses || {}
      for (const boss in bosses) {
        totalBossKills += bosses[boss]?.kills || 0
      }
      
      // Specific raid completions (including all variants)
      totalCox += (bosses['chambers_of_xeric']?.kills || 0) + (bosses['chambers_of_xeric_challenge_mode']?.kills || 0)
      totalToa += (bosses['tombs_of_amascut']?.kills || 0) + (bosses['tombs_of_amascut_expert']?.kills || 0)
      totalTob += (bosses['theatre_of_blood']?.kills || 0) + (bosses['theatre_of_blood_hard_mode']?.kills || 0)
      
      // EHP and EHB
      totalEHP += player.ehp || 0
      totalEHB += player.ehb || 0
    }
    
    const averageLevel = totalMembers > 0 ? Math.round(totalLevel / totalMembers) : 0
    const averageXP = totalMembers > 0 ? Math.round(totalXP / totalMembers) : 0
    const maxedPercentage = totalMembers > 0 ? ((maxedCount / totalMembers) * 100).toFixed(2) : '0.00'
    
    const statistics = {
      groupName: groupDetails.name,
      totalMembers,
      averageLevel,
      averageXP,
      maxedPlayers: {
        count: maxedCount,
        percentage: parseFloat(maxedPercentage)
      },
      totalStats: {
        clues: totalClues,
        bossKills: totalBossKills,
        cox: totalCox,
        toa: totalToa,
        tob: totalTob,
        ehp: Math.round(totalEHP),
        ehb: Math.round(totalEHB)
      },
      lastUpdated: new Date().toISOString()
    }
    
    // Cache the result
    groupStatisticsCache = {
      data: statistics,
      lastRefresh: new Date()
    }
    
    console.log('Clan statistics cached successfully')
    
    return statistics
  } catch (error) {
    console.error('Error fetching group statistics:', error)
    throw error
  }
}

