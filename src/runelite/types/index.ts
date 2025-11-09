/**
 * RuneLite Plugin Event Types
 * 
 * Central export for all RuneLite webhook event types
 */

export * from './sync-event.type.js'
export * from './event.enum.js'

// Union type for all RuneLite events (extensible)
import { SyncEventPayload } from './sync-event.type.js'

export type RuneLiteEvent = SyncEventPayload // | OtherEventPayload | ...

