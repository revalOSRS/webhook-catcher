/**
 * Event Types Index
 * 
 * Re-exports all event-related types from this module.
 */

export { EventType } from './event-type.type.js';
export { EventStatus } from './event-status.type.js';
export { EventRegistrationStatus } from './event-registration-status.type.js';

import type { EventConfig } from '../entities/events.entity.js';
import type { EventStatus } from './event-status.type.js';
import type { EventType } from './event-type.type.js';

/**
 * Input for creating a new event
 */
export interface CreateEventInput {
  name: string;
  description?: string;
  eventType: EventType;
  status?: EventStatus;
  startDate: Date;
  endDate: Date;
  config?: EventConfig;
}

/**
 * Input for updating an existing event
 */
export interface UpdateEventInput {
  name?: string;
  description?: string;
  status?: EventStatus;
  startDate?: Date;
  endDate?: Date;
  config?: EventConfig;
}

