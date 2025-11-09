const { query } = require('../index');

class Donation {
    constructor(data) {
        this.id = data.id;
        this.player_discord_id = data.player_discord_id;
        this.amount = data.amount;
        this.category_id = data.category_id || 1;
        this.screenshot_url = data.screenshot_url;
        this.status = data.status || 'pending';
        this.submitted_at = data.submitted_at;
        this.reviewed_at = data.reviewed_at;
        this.reviewed_by = data.reviewed_by;
        this.denial_reason = data.denial_reason;
        this.message_id = data.message_id;
        this.channel_id = data.channel_id;
        this.note = data.note;
    }

    // Create a new donation submission
    static async create(data) {
        // If status is approved and no reviewed_at provided, use current timestamp
        const reviewedAt = data.status === 'approved' && !data.reviewed_at 
            ? new Date().toISOString() 
            : data.reviewed_at;
            
        const result = await query(`
            INSERT INTO donations (
                player_discord_id, amount, category_id, screenshot_url,
                message_id, channel_id, note, status, reviewed_by, reviewed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `, [
            data.player_discord_id, 
            data.amount, 
            data.category_id || 1,
            data.screenshot_url || null, 
            data.message_id || null, 
            data.channel_id || null, 
            data.note || null,
            data.status || 'pending',
            data.reviewed_by || null,
            reviewedAt || null
        ]);
        return new Donation(result[0]);
    }

    // Find donation by ID
    static async findById(id) {
        const result = await query('SELECT * FROM donations WHERE id = ?', [id]);
        return result.length > 0 ? new Donation(result[0]) : null;
    }

    // Find donations by player Discord ID
    static async findByPlayer(discordId, status = null) {
        let sqlQuery = 'SELECT * FROM donations WHERE player_discord_id = ?';
        const params = [discordId];

        if (status) {
            sqlQuery += ' AND status = ?';
            params.push(status);
        }

        sqlQuery += ' ORDER BY submitted_at DESC';

        const result = await query(sqlQuery, params);
        return result.map(row => new Donation(row));
    }

    // Find pending donations
    static async findPending() {
        const result = await query(`
            SELECT d.*, dc.name as category_name
            FROM donations d
            LEFT JOIN donation_categories dc ON d.category_id = dc.id
            WHERE d.status = 'pending'
            ORDER BY d.submitted_at ASC
        `);
        return result.map(row => ({
            ...new Donation(row),
            category_name: row.category_name
        }));
    }

    // Update donation status
    async updateStatus(status, reviewedBy, denialReason = null) {
        const result = await query(`
            UPDATE donations
            SET status = ?, reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = ?, denial_reason = ?
            WHERE id = ?
            RETURNING *
        `, [status, reviewedBy, denialReason, this.id]);

        if (result.length > 0) {
            Object.assign(this, result[0]);
            return this;
        }
        return null;
    }

    // Get donation with category info
    async getWithCategory() {
        const result = await query(`
            SELECT d.*, dc.name as category_name, dc.description as category_description
            FROM donations d
            LEFT JOIN donation_categories dc ON d.category_id = dc.id
            WHERE d.id = ?
        `, [this.id]);
        return result.length > 0 ? result[0] : null;
    }

    // Delete donation
    async delete() {
        await query('DELETE FROM donations WHERE id = ?', [this.id]);
        return true;
    }
}

module.exports = Donation;
