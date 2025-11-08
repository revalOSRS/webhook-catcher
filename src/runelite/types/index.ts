/**
 * RuneLite Plugin Event Types
 * 
 * Central export for all RuneLite webhook event types
 */

export * from './sync.types.js'

// Base event type discriminator
export type RuneLiteEventType = 'SYNC' 
  | 'ACHIEVEMENT' 
  | 'LOOT' 
  | 'DEATH' 
  | 'LEVELUP'
  | 'PET'
  | 'SPEEDRUN'
  | 'AREA_ENTRY'
  | 'EMOTE'
  | 'CLUE'

// Union type for all RuneLite events (extensible)
import { SyncEventPayload } from './sync.types.js'

export type RuneLiteEvent = SyncEventPayload // | OtherEventPayload | ...

