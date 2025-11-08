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
  slayer: boolean
  combatAchievement: boolean
  collection: boolean
  death: boolean
  detailedKill: boolean
  areaEntry: boolean
  emote: boolean
}

// ===== Default Configuration =====

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  loot: {
    minValue: 1000000, // 1M GP minimum
    whitelist: [], // No items whitelisted by default
    blacklist: [526, 995] // Bones, Coins
  },
  enabled: {
    loot: true,
    pet: true,
    quest: true,
    level: true,
    killCount: true,
    clue: true,
    diary: true,
    slayer: true,
    combatAchievement: true,
    collection: true,
    death: false, // Disabled by default (high volume)
    detailedKill: false, // Disabled by default (very high volume)
    areaEntry: false, // Disabled by default (high volume)
    emote: false // Disabled by default (spam risk)
  }
}

// ===== Production Configuration =====

export const PRODUCTION_EVENT_FILTERS: EventFilters = {
  loot: {
    minValue: 1000000, // 1M GP minimum
    whitelist: [
      20784, // Dragon claws
      21021, // Twisted bow
      22486, // Scythe of vitur
      22804, // Dragon knife
      21015, // Kodai wand
      11862, // Armadyl crossbow
      21034, // Ancestral robe top
      21079, // Ancestral robe bottom
      21295, // Infernal cape
      13576, // Dragon warhammer
      11770, // Armadyl helmet
      11771, // Armadyl chestplate
      11772, // Armadyl chainskirt
      22542, // Ghrazi rapier
      22322, // Avernic defender hilt
    ],
    blacklist: [
      526,  // Bones
      995,  // Coins
      592,  // Ashes
      1623, // Uncut sapphire
      1621, // Uncut emerald
      561,  // Nature rune
      385,  // Shark
      3144, // Karambwan
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
    slayer: true,
    combatAchievement: true,
    collection: true,
    death: false, // Disabled in production (high volume)
    detailedKill: false, // Disabled in production (very high volume)
    areaEntry: false, // Disabled in production (high volume)
    emote: false // Disabled in production (spam risk)
  }
}

// ===== Peak Hours Configuration =====

export const PEAK_HOURS_EVENT_FILTERS: EventFilters = {
  loot: {
    minValue: 5000000, // 5M GP minimum during peak hours
    whitelist: [
      20784, // Dragon claws
      21021, // Twisted bow
      22486, // Scythe of vitur
      21015, // Kodai wand
    ],
    blacklist: [
      526,  // Bones
      995,  // Coins
      592,  // Ashes
      1623, // Uncut sapphire
      1621, // Uncut emerald
      561,  // Nature rune
      385,  // Shark
      3144, // Karambwan
    ]
  },
  enabled: {
    loot: true,
    pet: true,
    quest: true,
    level: false, // Disabled during peak
    killCount: true,
    clue: false, // Disabled during peak
    diary: true,
    slayer: false, // Disabled during peak
    combatAchievement: true,
    collection: true,
    death: false,
    detailedKill: false,
    areaEntry: false,
    emote: false
  }
}

// ===== Helper Functions =====

/**
 * Check if current time is during peak hours (18:00-22:00 UTC)
 */
export function isPeakHours(): boolean {
  const hour = new Date().getUTCHours()
  return hour >= 18 && hour <= 22
}

/**
 * Get appropriate event filters based on current time
 */
export function getEventFilters(): EventFilters {
  return isPeakHours() ? PEAK_HOURS_EVENT_FILTERS : PRODUCTION_EVENT_FILTERS
}

