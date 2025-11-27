/**
 * Event Registrations Routes
 * Admin endpoints for managing event registrations (who signed up for events)
 *
 * Routes:
 * - GET /api/admin/clan-events/events/:eventId/registrations - List all registrations for an event
 * - POST /api/admin/clan-events/events/:eventId/registrations - Register a member for an event
 * - PATCH /api/admin/clan-events/events/:eventId/registrations/:id - Update registration status
 * - DELETE /api/admin/clan-events/events/:eventId/registrations/:id - Remove registration
 * - GET /api/admin/clan-events/events/:eventId/registrations/available - List available members (not yet registered)
 */
import { Router } from 'express';
import { query } from '../../../../db/connection.js';
const router = Router({ mergeParams: true });
/**
 * GET /api/admin/clan-events/events/:eventId/registrations
 * Get all registrations for an event
 * Query params: status, limit, offset
 *
 * Returns: Array of registration objects with member and OSRS account info
 */
router.get('/', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { status, limit = '100', offset = '0' } = req.query;
        // Check if event exists
        const eventCheck = await query('SELECT id FROM events WHERE id = $1', [eventId]);
        if (eventCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        let sql = `
			SELECT 
				er.*,
				m.discord_id,
				m.discord_username,
				m.discord_name,
				m.discord_discriminator,
				m.discord_avatar,
				oa.osrs_nickname as osrs_account_name,
				oa.account_type as osrs_account_type
			FROM event_registrations er
			JOIN members m ON er.member_id = m.id
			LEFT JOIN osrs_accounts oa ON er.osrs_account_id = oa.id
			WHERE er.event_id = $1
		`;
        const params = [eventId];
        let paramIndex = 2;
        if (status) {
            sql += ` AND er.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        sql += ` ORDER BY er.registered_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        const registrations = await query(sql, params);
        res.json({
            success: true,
            data: registrations,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    }
    catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch registrations',
            message: error.message
        });
    }
});
/**
 * GET /api/admin/clan-events/events/:eventId/registrations/available
 * Get list of members available to register (not yet registered for this event)
 * Query params: search (for filtering by name), limit, offset
 *
 * Returns: Array of member objects with OSRS accounts
 */
router.get('/available', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { search, limit = '50', offset = '0' } = req.query;
        // Check if event exists
        const eventCheck = await query('SELECT id FROM events WHERE id = $1', [eventId]);
        if (eventCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        // Get members who are NOT registered for this event
        let sql = `
			SELECT 
				m.id,
				m.discord_id,
				m.discord_username,
				m.discord_name,
				m.discord_discriminator,
				m.discord_avatar,
				COALESCE(
					json_agg(
						json_build_object(
							'id', oa.id,
							'osrs_nickname', oa.osrs_nickname,
							'account_type', oa.account_type
						)
					) FILTER (WHERE oa.id IS NOT NULL),
					'[]'::json
				) as osrs_accounts
			FROM members m
			LEFT JOIN osrs_accounts oa ON oa.discord_id = m.discord_id
			WHERE m.id NOT IN (
				SELECT member_id FROM event_registrations WHERE event_id = $1
			)
		`;
        const params = [eventId];
        let paramIndex = 2;
        if (search) {
            sql += ` AND (
				m.discord_username ILIKE $${paramIndex} OR
				m.discord_name ILIKE $${paramIndex}
			)`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        sql += `
			GROUP BY m.id, m.discord_id, m.discord_username, m.discord_name, 
				m.discord_discriminator, m.discord_avatar
			ORDER BY m.discord_username ASC, m.discord_name ASC
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
        params.push(parseInt(limit), parseInt(offset));
        const members = await query(sql, params);
        res.json({
            success: true,
            data: members,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    }
    catch (error) {
        console.error('Error fetching available members:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available members',
            message: error.message
        });
    }
});
/**
 * POST /api/admin/clan-events/events/:eventId/registrations
 * Register a member for an event
 * Body: { member_id, osrs_account_id (optional), status (optional, default: 'pending'), metadata (optional) }
 *
 * Returns: Created registration object
 */
router.post('/', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { member_id, osrs_account_id, status = 'pending', metadata = {} } = req.body;
        // Validation
        if (!member_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: member_id'
            });
        }
        // Check if event exists
        const eventCheck = await query('SELECT id FROM events WHERE id = $1', [eventId]);
        if (eventCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        // Check if member exists
        const memberCheck = await query('SELECT id FROM members WHERE id = $1', [member_id]);
        if (memberCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Member not found'
            });
        }
        // If osrs_account_id is provided, validate it belongs to the member
        if (osrs_account_id) {
            const accountCheck = await query('SELECT id FROM osrs_accounts WHERE id = $1 AND discord_id = (SELECT discord_id FROM members WHERE id = $2)', [osrs_account_id, member_id]);
            if (accountCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'OSRS account not found or does not belong to this member'
                });
            }
        }
        // Check if already registered
        const existing = await query('SELECT id FROM event_registrations WHERE event_id = $1 AND member_id = $2', [eventId, member_id]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Member is already registered for this event'
            });
        }
        const result = await query(`
			INSERT INTO event_registrations (
				event_id, member_id, osrs_account_id, status, metadata
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING *
		`, [eventId, member_id, osrs_account_id || null, status, JSON.stringify(metadata)]);
        res.status(201).json({
            success: true,
            data: result[0],
            message: 'Member registered successfully'
        });
    }
    catch (error) {
        console.error('Error registering member:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register member',
            message: error.message
        });
    }
});
/**
 * PATCH /api/admin/clan-events/events/:eventId/registrations/:id
 * Update a registration
 * Body: { status?, osrs_account_id?, metadata? }
 *
 * Returns: Updated registration object
 */
router.patch('/:id', async (req, res) => {
    try {
        const { eventId, id } = req.params;
        const updates = req.body;
        // Check if registration exists
        const existing = await query('SELECT id, member_id FROM event_registrations WHERE id = $1 AND event_id = $2', [id, eventId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }
        // If updating osrs_account_id, validate it belongs to the member
        if (updates.osrs_account_id !== undefined) {
            const accountCheck = await query('SELECT id FROM osrs_accounts WHERE id = $1 AND discord_id = (SELECT discord_id FROM members WHERE id = $2)', [updates.osrs_account_id, existing[0].member_id]);
            if (updates.osrs_account_id !== null && accountCheck.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'OSRS account not found or does not belong to this member'
                });
            }
        }
        // Build dynamic update query
        const allowedFields = ['status', 'osrs_account_id', 'metadata'];
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramIndex}`);
                if (key === 'metadata') {
                    values.push(JSON.stringify(value));
                }
                else {
                    values.push(value);
                }
                paramIndex++;
            }
        }
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update',
                allowed_fields: allowedFields
            });
        }
        values.push(id, eventId);
        const sql = `
			UPDATE event_registrations 
			SET ${updateFields.join(', ')}
			WHERE id = $${paramIndex} AND event_id = $${paramIndex + 1}
			RETURNING *
		`;
        const result = await query(sql, values);
        res.json({
            success: true,
            data: result[0],
            message: 'Registration updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating registration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update registration',
            message: error.message
        });
    }
});
/**
 * DELETE /api/admin/clan-events/events/:eventId/registrations/:id
 * Remove a registration
 *
 * Returns: Deleted registration ID
 */
router.delete('/:id', async (req, res) => {
    try {
        const { eventId, id } = req.params;
        const result = await query('DELETE FROM event_registrations WHERE id = $1 AND event_id = $2 RETURNING id', [id, eventId]);
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }
        res.json({
            success: true,
            message: 'Registration removed successfully',
            deleted_id: result[0].id
        });
    }
    catch (error) {
        console.error('Error removing registration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove registration',
            message: error.message
        });
    }
});
export default router;
