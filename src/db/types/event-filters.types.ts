/**
 * Event Filters Type Definitions
 * 
 * Configuration types for RuneLite plugin event filtering
 */

// ===== Event Filter Configuration =====

export interface EventFilters {
  loot: LootFilters
  enabled: EnabledEvents
}

export interface LootFilters {
  minValue: number
  whitelist: number[]
  blacklist: number[]
}

export interface EnabledEvents {
  loot: boolean
  pet: boolean
  quest: boolean
  level: boolean
  killCount: boolean
  clue: boolean
  diary: boolean
  combatAchievement: boolean
  collection: boolean
  death: boolean
  detailedKill: boolean
  areaEntry: boolean
  emote: boolean
}

/**
 * Get appropriate event filters based on current time
 */
export function getEventFilters(): EventFilters {
  return {
    loot: {
      minValue: 1000, // 1k GP minimum during peak hours
      whitelist: [
        526,
      ],
      blacklist: [
        592,  // Ashes
      ]
    },
    enabled: {
      loot: true,
      pet: true,
      quest: true,
      level: true,
      killCount: true,
      clue: true,
      diary: true,
      combatAchievement: true,
      collection: true,
      death: true,
      detailedKill: true,
      areaEntry: true,
      emote: true
    }
  }
}

