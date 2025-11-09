const { query } = require('../index');

class CofferMovement {
    constructor(data) {
        this.id = data.id;
        this.type = data.type; // 'donation', 'withdrawal', 'event_expenditure', 'manual_adjustment'
        this.amount = data.amount;
        this.player_discord_id = data.player_discord_id;
        this.event_id = data.event_id;
        this.donation_id = data.donation_id;
        this.description = data.description;
        this.note = data.note;
        this.balance_before = data.balance_before;
        this.balance_after = data.balance_after;
        this.created_at = data.created_at;
        this.created_by = data.created_by;
    }

    // Create a new coffer movement
    static async create(data) {
        // Get current balance to calculate before/after
        const currentBalance = await this.getCurrentBalance();
        const balanceBefore = currentBalance;
        const balanceAfter = currentBalance + (data.amount || 0);
        
        // Insert into coffer_movements with balance values
        // Note: We provide balance_before/after here, and the trigger will update coffer_balance table
        const result = await query(`
            INSERT INTO coffer_movements (
                type, amount, player_discord_id, event_id, donation_id,
                description, note, balance_before, balance_after, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `, [
            data.type, data.amount || 0, data.player_discord_id || null,
            data.event_id || null, data.donation_id || null, data.description || null,
            data.note || null, balanceBefore, balanceAfter, data.created_by
        ]);
        
        const movement = new CofferMovement(result[0]);
        
        // Post to coffer movements channel if configured
        if (data.client) {
            await this.postToMovementsChannel(movement, data.client, data.playerTag, data.eventName);
        }
        
        return movement;
    }
    
    // Post movement to Discord channel
    static async postToMovementsChannel(movement, client, playerTag = null, eventName = null) {
        const channelId = process.env.COFFER_MOVEMENTS_CHANNEL_ID;
        if (!channelId) return;
        
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) return;
            
            const { EmbedBuilder } = require('discord.js');
            
            // Determine color and emoji based on type
            let color, emoji, title;
            const isPositive = movement.amount > 0;
            
            switch (movement.type) {
                case 'donation':
                    color = 0x00FF00; // Green
                    emoji = '💰';
                    title = 'Donation Received';
                    break;
                case 'withdrawal':
                    color = 0xFF6B6B; // Red
                    emoji = '💸';
                    title = 'Withdrawal';
                    break;
                case 'event_expenditure':
                    color = 0x9B59B6; // Purple
                    emoji = '🎉';
                    title = 'Event Expenditure';
                    break;
                case 'manual_adjustment':
                    color = 0xFFA500; // Orange
                    emoji = '⚖️';
                    title = 'Manual Adjustment';
                    break;
                default:
                    color = 0x95A5A6; // Gray
                    emoji = '📊';
                    title = 'Coffer Movement';
            }
            
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${emoji} ${title}`)
                .setTimestamp();
            
            // Add amount field with +/- indicator
            const amountStr = `${isPositive ? '+' : ''}${formatAmount(movement.amount)}`;
            embed.addFields({ name: '💵 Amount', value: amountStr, inline: true });
            
            // Add balance field
            embed.addFields({ name: '🏦 New Balance', value: formatAmount(movement.balance_after), inline: true });
            
            // Add player if applicable
            if (movement.player_discord_id) {
                const playerDisplay = playerTag || `<@${movement.player_discord_id}>`;
                embed.addFields({ name: '👤 Player', value: playerDisplay, inline: true });
            }
            
            // Add event name if applicable
            if (eventName) {
                embed.addFields({ name: '🎪 Event', value: eventName, inline: true });
            }
            
            // Add description if exists
            if (movement.description) {
                embed.addFields({ name: '📝 Description', value: movement.description, inline: false });
            }
            
            // Add note if exists
            if (movement.note) {
                embed.addFields({ name: '💬 Märkus', value: movement.note, inline: false });
            }
            
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error posting to coffer movements channel:', error);
        }
    }

    // Get current coffer balance
    static async getCurrentBalance() {
        const result = await query('SELECT balance FROM coffer_balance WHERE id = 1');
        return result.length > 0 ? result[0].balance : 0;
    }

    // Get recent movements
    static async getRecent(limit = 10) {
        const result = await query(`
            SELECT cm.*,
                   p.discord_tag as player_username,
                   e.name as event_name
            FROM coffer_movements cm
            LEFT JOIN members p ON cm.player_discord_id = p.discord_id
            LEFT JOIN events e ON cm.event_id = e.id
            ORDER BY cm.created_at DESC
            LIMIT ?
        `, [limit]);
        return result.map(row => new CofferMovement(row));
    }

    // Get movements by type
    static async getByType(type, limit = 50) {
        const result = await query(`
            SELECT cm.*,
                   p.discord_tag as player_username,
                   e.name as event_name
            FROM coffer_movements cm
            LEFT JOIN members p ON cm.player_discord_id = p.discord_id
            LEFT JOIN events e ON cm.event_id = e.id
            WHERE cm.type = ?
            ORDER BY cm.created_at DESC
            LIMIT ?
        `, [type, limit]);
        return result.map(row => new CofferMovement(row));
    }

    // Get movements for a specific date range
    static async getByDateRange(startDate, endDate) {
        const result = await query(`
            SELECT cm.*,
                   p.discord_tag as player_username,
                   e.name as event_name
            FROM coffer_movements cm
            LEFT JOIN members p ON cm.player_discord_id = p.discord_id
            LEFT JOIN events e ON cm.event_id = e.id
            WHERE cm.created_at BETWEEN ? AND ?
            ORDER BY cm.created_at DESC
        `, [startDate, endDate]);
        return result.map(row => new CofferMovement(row));
    }

    // Update balance manually (admin function)
    static async updateBalance(newBalance, updatedBy, client = null, reason = null) {
        const currentBalance = await this.getCurrentBalance();

        if (currentBalance !== newBalance) {
            const difference = newBalance - currentBalance;
            const balanceBefore = currentBalance;
            const balanceAfter = newBalance;
            const description = reason || `Manual balance adjustment from ${formatAmount(currentBalance)} to ${formatAmount(newBalance)}`;

            // Insert into coffer_movements with balance values
            // Note: We provide balance_before/after here, and the trigger will update coffer_balance table
            const result = await query(`
                INSERT INTO coffer_movements (
                    type, amount, description, balance_before, balance_after, created_by
                )
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING *
            `, [
                'manual_adjustment',
                difference,
                description,
                balanceBefore,
                balanceAfter,
                updatedBy
            ]);
            
            // Post to movements channel if client provided
            if (client && result.length > 0) {
                const movement = new CofferMovement(result[0]);
                await this.postToMovementsChannel(movement, client);
            }
        }

        return newBalance;
    }

    // Get movement statistics
    static async getStats() {
        const result = await query(`
            SELECT
                COUNT(*) as total_movements,
                SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END) as total_donations,
                SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
                SUM(CASE WHEN type = 'event_expenditure' THEN amount ELSE 0 END) as total_event_expenses,
                COUNT(DISTINCT player_discord_id) as unique_donors,
                AVG(CASE WHEN type = 'donation' THEN amount END) as avg_donation
            FROM coffer_movements
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `);
        return result[0];
    }
}

// Helper function to format amounts with K/M/B suffixes
function formatAmount(amount) {
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000000) {
        return `${(amount / 1000000000).toFixed(1)}B GP`;
    } else if (absAmount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}M GP`;
    } else if (absAmount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K GP`;
    }
    return `${amount} GP`;
}

module.exports = CofferMovement;
