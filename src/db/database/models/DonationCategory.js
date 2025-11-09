const { query } = require('../index');

class DonationCategory {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
    }

    // Get all active categories for dropdown
    static async getActive() {
        const result = await query(`
            SELECT * FROM donation_categories
            WHERE is_active = true
            ORDER BY name ASC
        `);
        return result.map(row => new DonationCategory(row));
    }

    // Get all categories (including inactive)
    static async findAll() {
        const result = await query(`
            SELECT * FROM donation_categories
            ORDER BY name ASC
        `);
        return result.map(row => new DonationCategory(row));
    }

    // Find category by ID
    static async findById(id) {
        const result = await query('SELECT * FROM donation_categories WHERE id = ?', [id]);
        return result.length > 0 ? new DonationCategory(result[0]) : null;
    }

    // Create a new category
    static async create(data) {
        const result = await query(`
            INSERT INTO donation_categories (name, description, is_active)
            VALUES (?, ?, ?)
            RETURNING *
        `, [data.name, data.description, data.is_active || true]);
        return new DonationCategory(result[0]);
    }

    // Update category
    async update(updates) {
        const result = await query(`
            UPDATE donation_categories
            SET name = ?, description = ?, is_active = ?
            WHERE id = ?
            RETURNING *
        `, [
            updates.name || this.name,
            updates.description || this.description,
            updates.is_active !== undefined ? updates.is_active : this.is_active,
            this.id
        ]);

        if (result.length > 0) {
            Object.assign(this, result[0]);
            return this;
        }
        return null;
    }

    // Toggle active status
    async toggleActive() {
        const result = await query(`
            UPDATE donation_categories
            SET is_active = NOT is_active
            WHERE id = ?
            RETURNING *
        `, [this.id]);

        if (result.length > 0) {
            Object.assign(this, result[0]);
            return this;
        }
        return null;
    }

    // Delete category
    async delete() {
        await query('DELETE FROM donation_categories WHERE id = ?', [this.id]);
        return true;
    }

    // Get usage count (how many donations use this category)
    async getUsageCount() {
        const result = await query(`
            SELECT COUNT(*) as count
            FROM donations
            WHERE category_id = ?
        `, [this.id]);
        return result[0]?.count || 0;
    }
}

module.exports = DonationCategory;
