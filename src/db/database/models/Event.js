const { query } = require('../index');
const CofferMovement = require('./CofferMovement');

class Event {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.funds_used = data.funds_used;
        this.created_at = data.created_at;
        this.created_by = data.created_by;
    }

    // Create a new event expenditure
    static async create(data) {
        const result = await query(`
            INSERT INTO events (name, description, funds_used, created_by)
            VALUES (?, ?, ?, ?)
            RETURNING *
        `, [data.name, data.description, data.funds_used, data.created_by]);

        const event = new Event(result[0]);

        // Create coffer movement for the event expenditure
        await CofferMovement.create({
            type: 'event_expenditure',
            amount: -data.funds_used, // Negative for expenditure
            event_id: event.id,
            description: `Event expenditure: ${data.name}`,
            note: data.description,
            created_by: data.created_by,
            client: data.client,
            eventName: data.name
        });

        return event;
    }

    // Find event by ID
    static async findById(id) {
        const result = await query('SELECT * FROM events WHERE id = ?', [id]);
        return result.length > 0 ? new Event(result[0]) : null;
    }

    // Get all events
    static async findAll(limit = 50) {
        const result = await query(`
            SELECT * FROM events
            ORDER BY created_at DESC
            LIMIT ?
        `, [limit]);
        return result.map(row => new Event(row));
    }

    // Get events by creator
    static async findByCreator(creatorDiscordId) {
        const result = await query(`
            SELECT * FROM events
            WHERE created_by = ?
            ORDER BY created_at DESC
        `, [creatorDiscordId]);
        return result.map(row => new Event(row));
    }

    // Update event
    async update(updates) {
        const result = await query(`
            UPDATE events
            SET name = ?, description = ?, funds_used = ?
            WHERE id = ?
            RETURNING *
        `, [
            updates.name || this.name,
            updates.description || this.description,
            updates.funds_used || this.funds_used,
            this.id
        ]);

        if (result.length > 0) {
            Object.assign(this, result[0]);
            return this;
        }
        return null;
    }

    // Delete event
    async delete() {
        await query('DELETE FROM events WHERE id = ?', [this.id]);
        return true;
    }

    // Get total funds used for events
    static async getTotalFundsUsed() {
        const result = await query(`
            SELECT SUM(funds_used) as total
            FROM events
        `);
        return result[0]?.total || 0;
    }

    // Get events summary for the last N days
    static async getRecentSummary(days = 30) {
        const result = await query(`
            SELECT
                COUNT(*) as event_count,
                SUM(funds_used) as total_funds_used,
                AVG(funds_used) as avg_funds_per_event
            FROM events
            WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        `);
        return result[0];
    }

    // Get event with related coffer movements
    async getWithMovements() {
        const movements = await query(`
            SELECT cm.*
            FROM coffer_movements cm
            WHERE cm.event_id = ?
            ORDER BY cm.created_at DESC
        `, [this.id]);

        return {
            ...this,
            movements: movements
        };
    }
}

module.exports = Event;
