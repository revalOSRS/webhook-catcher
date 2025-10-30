/**
 * WiseOldMan API Service
 * Handles all interactions with the WiseOldMan API
 */

const WOM_API_BASE = 'https://api.wiseoldman.net/v2'

export interface WOMPlayer {
  id: number
  username: string
  displayName: string
  type: string
  build: string
  country: string | null
  status: string
  patron: boolean
  exp: number
  ehp: number
  ehb: number
  ttm: number
  tt200m: number
  registeredAt: string
  updatedAt: string
  lastChangedAt: string | null
  lastImportedAt: string | null
}

export interface WOMSnapshot {
  createdAt: string
  importedAt: string | null
  data: {
    skills: Record<string, { rank: number; level: number; experience: number }>
    bosses: Record<string, { rank: number; kills: number }>
    activities: Record<string, { rank: number; score: number }>
    computed: Record<string, { rank: number; value: number }>
  }
}

export interface WOMGains {
  startsAt: string
  endsAt: string
  data: {
    skills: Record<string, { gained: number; start: number; end: number }>
    bosses: Record<string, { gained: number; start: number; end: number }>
    activities: Record<string, { gained: number; start: number; end: number }>
    computed: Record<string, { gained: number; start: number; end: number }>
  }
}

export interface WOMAchievement {
  playerId: number
  name: string
  metric: string
  measure: string
  threshold: number
  createdAt: string
  accuracy: number | null
}

export interface WOMRecord {
  id: number
  playerId: number
  period: string
  metric: string
  value: number
  updatedAt: string
}

export interface WOMGroup {
  id: number
  name: string
  clanChat: string | null
  description: string | null
  homeworld: number | null
  verified: boolean
  patron: boolean
  profileImage: string | null
  bannerImage: string | null
  score: number
  createdAt: string
  updatedAt: string
  memberCount: number
}

export interface WOMGroupActivity {
  groupId: number
  playerId: number
  type: string
  role: string | null
  createdAt: string
  player: WOMPlayer
}

/**
 * Search for a player by username
 */
export async function searchPlayer(username: string): Promise<WOMPlayer | null> {
  try {
    const response = await fetch(`${WOM_API_BASE}/players/${encodeURIComponent(username)}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching WOM player:', error)
    throw error
  }
}

/**
 * Get player details by ID
 */
export async function getPlayerById(playerId: number): Promise<WOMPlayer | null> {
  try {
    const response = await fetch(`${WOM_API_BASE}/players/id/${playerId}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching WOM player by ID:', error)
    throw error
  }
}

/**
 * Update player (trigger a data refresh from OSRS hiscores)
 */
export async function updatePlayer(username: string): Promise<WOMPlayer> {
  try {
    const response = await fetch(`${WOM_API_BASE}/players/${encodeURIComponent(username)}`, {
      method: 'POST'
    })
    
    if (!response.ok) {
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating WOM player:', error)
    throw error
  }
}

/**
 * Get player snapshots (historical data)
 */
export async function getPlayerSnapshots(username: string, limit: number = 10): Promise<WOMSnapshot[]> {
  try {
    const response = await fetch(
      `${WOM_API_BASE}/players/${encodeURIComponent(username)}/snapshots?limit=${limit}`
    )
    
    if (!response.ok) {
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
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
): Promise<WOMGains> {
  try {
    const response = await fetch(
      `${WOM_API_BASE}/players/${encodeURIComponent(username)}/gained?period=${period}`
    )
    
    if (!response.ok) {
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching WOM gains:', error)
    throw error
  }
}

/**
 * Get player achievements
 */
export async function getPlayerAchievements(username: string, limit: number = 20): Promise<WOMAchievement[]> {
  try {
    const response = await fetch(
      `${WOM_API_BASE}/players/${encodeURIComponent(username)}/achievements?limit=${limit}`
    )
    
    if (!response.ok) {
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching WOM achievements:', error)
    throw error
  }
}

/**
 * Get player records
 */
export async function getPlayerRecords(username: string, period: string = 'week', metric?: string): Promise<WOMRecord[]> {
  try {
    let url = `${WOM_API_BASE}/players/${encodeURIComponent(username)}/records?period=${period}`
    if (metric) {
      url += `&metric=${metric}`
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching WOM records:', error)
    throw error
  }
}

/**
 * Get player's groups/clans
 */
export async function getPlayerGroups(username: string): Promise<WOMGroup[]> {
  try {
    const response = await fetch(
      `${WOM_API_BASE}/players/${encodeURIComponent(username)}/groups`
    )
    
    if (!response.ok) {
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
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
): Promise<WOMGroupActivity[]> {
  try {
    let url = `${WOM_API_BASE}/groups/${groupId}/activity`
    const params = new URLSearchParams()
    
    if (limit !== undefined) {
      params.append('limit', limit.toString())
    }
    if (offset !== undefined) {
      params.append('offset', offset.toString())
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`WOM API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching WOM group activity:', error)
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

