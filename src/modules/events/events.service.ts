/**
 * Events Service
 * Business logic for event management and account event tracking
 */

import type { Event } from './events.entity.js'
import { EventsEntity } from './events.entity.js'
import { CofferService } from '../coffer/coffer.service.js'
import { PointsService } from '../points/points.service.js'

/**
 * Events Service Class
 * Provides business logic for event operations
 */
export class EventsService {
  private static readonly eventsEntity = new EventsEntity()

  // Clan Events Management

  /**
   * Create a new clan event with coffer expenditure
   */
  static async createEvent(data: {
    name: string
    description?: string
    fundsUsed: number
    createdBy: string
  }): Promise<Event> {
    // Create the event
    const event = await this.eventsEntity.create({
      name: data.name,
      description: data.description,
      fundsUsed: data.fundsUsed,
      createdBy: data.createdBy,
    })

    // Create coffer movement for the expenditure
    await CofferService.createMovement({
      type: 'event_expenditure',
      amount: -Math.abs(data.fundsUsed), // Ensure negative for expenditure
      eventId: event.id,
      description: `Event expenditure: ${data.name}`,
      note: data.description,
      createdBy: data.createdBy,
    })

    return event
  }

  /**
   * Get event by ID
   */
  static async getEventById(id: number): Promise<Event | null> {
    return this.eventsEntity.findById(id)
  }

  /**
   * Get all events
   */
  static async getAllEvents(limit: number = 50): Promise<Event[]> {
    return this.eventsEntity.findAll({
      orderBy: 'createdAt',
      order: 'DESC',
      limit
    })
  }

  /**
   * Get events by creator
   */
  static async getEventsByCreator(creatorDiscordId: string, limit: number = 50): Promise<Event[]> {
    return this.eventsEntity.findByCreator(creatorDiscordId, limit)
  }

  /**
   * Update event
   */
  static async updateEvent(id: number, updates: Partial<{
    name: string
    description: string
    fundsUsed: number
  }>): Promise<Event> {
    const result = await this.eventsEntity.updateById(id, updates as any)
    if (!result) {
      throw new Error(`Event with id ${id} not found`)
    }
    return result
  }

  /**
   * Delete event
   */
  static async deleteEvent(id: number): Promise<boolean> {
    return this.eventsEntity.deleteById(id)
  }

  /**
   * Get event with related coffer movements
   */
  static async getEventWithMovements(eventId: number): Promise<Event & { movements: any[] }> {
    return this.eventsEntity.getWithMovements(eventId)
  }

  /**
   * Get total funds used for events
   */
  static async getTotalFundsUsed(): Promise<number> {
    return EventsEntity.getTotalFundsUsed()
  }

  /**
   * Get events summary for recent period
   */
  static async getRecentEventsSummary(days: number = 30): Promise<{
    eventCount: number
    totalFundsUsed: number
    avgFundsPerEvent: number
  }> {
    return EventsEntity.getRecentSummary(days)
  }

  // Account Events Management



  /**
   * Get comprehensive event analytics
   */
  static async getEventAnalytics(days: number = 30): Promise<{
    clanEvents: {
      totalEvents: number
      totalFundsUsed: number
      avgFundsPerEvent: number
    }
  }> {
    // Get clan events summary
    const clanEvents = await this.getRecentEventsSummary(days)

    return {
      clanEvents
    }
  }

  /**
   * Create tables for events module
   */
  static async createTables(): Promise<void> {
    await EventsEntity.createTable()
  }
}

// Import query for the analytics method
import { query } from '../../db/connection.js'
