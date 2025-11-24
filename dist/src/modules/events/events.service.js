/**
 * Events Service
 * Business logic for event management and account event tracking
 */
import { EventsEntity } from './events.entity.js';
import { CofferService } from '../coffer/coffer.service.js';
/**
 * Events Service Class
 * Provides business logic for event operations
 */
export class EventsService {
    static eventsEntity = new EventsEntity();
    // Clan Events Management
    /**
     * Create a new clan event with coffer expenditure
     */
    static async createEvent(data) {
        // Create the event
        const event = await this.eventsEntity.create({
            name: data.name,
            description: data.description,
            fundsUsed: data.fundsUsed,
            createdBy: data.createdBy,
        });
        // Create coffer movement for the expenditure
        await CofferService.createMovement({
            type: 'event_expenditure',
            amount: -Math.abs(data.fundsUsed), // Ensure negative for expenditure
            eventId: event.id,
            description: `Event expenditure: ${data.name}`,
            note: data.description,
            createdBy: data.createdBy,
        });
        return event;
    }
    /**
     * Get event by ID
     */
    static async getEventById(id) {
        return this.eventsEntity.findById(id);
    }
    /**
     * Get all events
     */
    static async getAllEvents(limit = 50) {
        return this.eventsEntity.findAll({
            orderBy: 'createdAt',
            order: 'DESC',
            limit
        });
    }
    /**
     * Get events by creator
     */
    static async getEventsByCreator(creatorDiscordId, limit = 50) {
        return this.eventsEntity.findByCreator(creatorDiscordId, limit);
    }
    /**
     * Update event
     */
    static async updateEvent(id, updates) {
        const result = await this.eventsEntity.updateById(id, updates);
        if (!result) {
            throw new Error(`Event with id ${id} not found`);
        }
        return result;
    }
    /**
     * Delete event
     */
    static async deleteEvent(id) {
        return this.eventsEntity.deleteById(id);
    }
    /**
     * Get event with related coffer movements
     */
    static async getEventWithMovements(eventId) {
        return this.eventsEntity.getWithMovements(eventId);
    }
    /**
     * Get total funds used for events
     */
    static async getTotalFundsUsed() {
        return EventsEntity.getTotalFundsUsed();
    }
    /**
     * Get events summary for recent period
     */
    static async getRecentEventsSummary(days = 30) {
        return EventsEntity.getRecentSummary(days);
    }
    // Account Events Management
    /**
     * Get comprehensive event analytics
     */
    static async getEventAnalytics(days = 30) {
        // Get clan events summary
        const summary = await this.getRecentEventsSummary(days);
        return {
            clanEvents: {
                totalEvents: summary.eventCount,
                totalFundsUsed: summary.totalFundsUsed,
                avgFundsPerEvent: summary.avgFundsPerEvent
            }
        };
    }
    /**
     * Create tables for events module
     */
    static async createTables() {
        await EventsEntity.createTable();
    }
}
