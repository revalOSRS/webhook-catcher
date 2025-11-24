/**
 * Dink Module
 * RuneLite webhook processing and Discord integration
 */

// Types
export type * from './types/index.js'

// Service types
export type { ActivityEvent } from './dink.service.js'

// Service
export { DinkService } from './dink.service.js'

// Event embed creators
export { createDeathEmbed } from './events/death.js'
export { createGenericEmbed } from './events/generic.js'
export { createGrandExchangeEmbed } from './events/grand-exchange.js'
export { createCollectLogEmbed } from './events/collect-log.js'
export { createLootEmbed } from './events/loot.js'

// Discord utilities
export { sendToDeathChannelDiscord, sendToMeenedChannelDiscord } from './discord-utils.js'
