/**
 * Event Registrations Admin Routes
 * 
 * CRUD operations for event registrations using the EventRegistrationsEntity class.
 */

import { Router, Request, Response } from 'express';
import { query } from '../../../../db/connection.js';
import { EventRegistrationsEntity } from '../../../../modules/events/entities/event-registrations.entity.js';
import { EventsEntity } from '../../../../modules/events/entities/events.entity.js';
import { EventRegistrationStatus } from '../../../../modules/events/types/event-registration-status.type.js';

const router = Router({ mergeParams: true });

// Instantiate entities
const registrationsEntity = new EventRegistrationsEntity();
const eventsEntity = new EventsEntity();

/**
 * GET /api/admin/clan-events/events/:eventId/registrations
 * List all registrations for an event
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, limit = '100', offset = '0' } = req.query;

    // Check if event exists
    const event = await eventsEntity.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    let sql = `
      SELECT 
        er.id, er.event_id, er.member_id, er.osrs_account_id,
        er.status, er.metadata, er.created_at, er.updated_at,
        m.discord_id, m.discord_tag,
        oa.osrs_nickname as osrs_account_name, oa.account_type as osrs_account_type
      FROM event_registrations er
      JOIN members m ON er.member_id = m.id
      LEFT JOIN osrs_accounts oa ON er.osrs_account_id = oa.id
      WHERE er.event_id = $1
    `;
    const params: unknown[] = [eventId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND er.status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ` ORDER BY er.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const registrations = await query(sql, params);

    res.json({
      success: true,
      data: registrations,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching registrations:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registrations',
      message
    });
  }
});

/**
 * GET /api/admin/clan-events/events/:eventId/registrations/available
 * Get members who are NOT yet registered for this event
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { search, limit = '50', offset = '0' } = req.query;

    const event = await eventsEntity.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    let sql = `
      SELECT 
        m.id, m.discord_id, m.discord_tag,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oa.id,
              'osrsNickname', oa.osrs_nickname,
              'accountType', oa.account_type
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
    const params: unknown[] = [eventId];
    let paramIndex = 2;

    if (search) {
      sql += ` AND m.discord_tag ILIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    }

    sql += `
      GROUP BY m.id, m.discord_id, m.discord_tag
      ORDER BY m.discord_tag ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const members = await query(sql, params);

    res.json({
      success: true,
      data: members,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching available members:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available members',
      message
    });
  }
});

/**
 * GET /api/admin/clan-events/events/:eventId/registrations/statistics
 * Get registration statistics for an event
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await eventsEntity.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const stats = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM event_registrations
      WHERE event_id = $1
      GROUP BY status
    `, [eventId]);

    const total = await registrationsEntity.countByEventId(eventId);

    const byStatus: Record<string, number> = {};
    for (const row of stats) {
      byStatus[row.status] = parseInt(row.count);
    }

    res.json({
      success: true,
      data: {
        total,
        byStatus,
        pending: byStatus[EventRegistrationStatus.PENDING] || 0,
        registered: byStatus[EventRegistrationStatus.REGISTERED] || 0,
        rejected: byStatus[EventRegistrationStatus.REJECTED] || 0,
        withdrawn: byStatus[EventRegistrationStatus.WITHDRAWN] || 0
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching registration statistics:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registration statistics',
      message
    });
  }
});

/**
 * POST /api/admin/clan-events/events/:eventId/registrations
 * Register a member for an event
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { memberId, osrsAccountId, status = 'pending', metadata = {} } = req.body;

    if (!memberId || !osrsAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['memberId', 'osrsAccountId']
      });
    }

    const event = await eventsEntity.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if member exists
    const memberCheck = await query('SELECT id FROM members WHERE id = $1', [memberId]);
    if (memberCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }

    // Check if OSRS account belongs to member
    const accountCheck = await query(
      'SELECT id FROM osrs_accounts WHERE id = $1 AND discord_id = (SELECT discord_id FROM members WHERE id = $2)',
      [osrsAccountId, memberId]
    );
    if (accountCheck.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'OSRS account not found or does not belong to this member'
      });
    }

    // Check if already registered
    const existing = await registrationsEntity.findByEventAndMember(eventId, memberId);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Member is already registered for this event'
      });
    }

    const registration = await registrationsEntity.create({
      eventId,
      memberId,
      osrsAccountId,
      status: status as EventRegistrationStatus,
      metadata
    });

    res.status(201).json({
      success: true,
      data: registration,
      message: 'Member registered successfully'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error registering member:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to register member',
      message
    });
  }
});

/**
 * POST /api/admin/clan-events/events/:eventId/registrations/batch
 * Register multiple members at once
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { registrations, status = 'registered' } = req.body;

    if (!Array.isArray(registrations) || registrations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'registrations must be a non-empty array'
      });
    }

    const event = await eventsEntity.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const created: unknown[] = [];
    const errors: Array<{ memberId: number; error: string }> = [];

    for (const reg of registrations) {
      if (!reg.memberId || !reg.osrsAccountId) {
        errors.push({ memberId: reg.memberId || 0, error: 'Missing memberId or osrsAccountId' });
        continue;
      }

      try {
        const existing = await registrationsEntity.findByEventAndMember(eventId, reg.memberId);
        if (existing) {
          errors.push({ memberId: reg.memberId, error: 'Already registered' });
          continue;
        }

        const registration = await registrationsEntity.create({
          eventId,
          memberId: reg.memberId,
          osrsAccountId: reg.osrsAccountId,
          status: (reg.status || status) as EventRegistrationStatus,
          metadata: reg.metadata || {}
        });
        created.push(registration);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ memberId: reg.memberId, error: errMsg });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: created.length,
        failed: errors.length,
        registrations: created,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Registered ${created.length} members, ${errors.length} failed`
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error batch registering members:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to batch register members',
      message
    });
  }
});

/**
 * PATCH /api/admin/clan-events/events/:eventId/registrations/:id
 * Update a registration
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;
    const { status, metadata } = req.body;

    const existing = await registrationsEntity.findById(id);
    if (!existing || existing.eventId !== eventId) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (metadata !== undefined) updateData.metadata = metadata;

    const updated = await registrationsEntity.update(id, updateData);

    res.json({
      success: true,
      data: updated,
      message: 'Registration updated successfully'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating registration:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to update registration',
      message
    });
  }
});

/**
 * POST /api/admin/clan-events/events/:eventId/registrations/:id/approve
 * Approve a registration
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;

    const existing = await registrationsEntity.findById(id);
    if (!existing || existing.eventId !== eventId) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    const updated = await registrationsEntity.updateStatus(id, EventRegistrationStatus.REGISTERED);

    res.json({
      success: true,
      data: updated,
      message: 'Registration approved'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error approving registration:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to approve registration',
      message
    });
  }
});

/**
 * POST /api/admin/clan-events/events/:eventId/registrations/:id/reject
 * Reject a registration
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;

    const existing = await registrationsEntity.findById(id);
    if (!existing || existing.eventId !== eventId) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    const updated = await registrationsEntity.updateStatus(id, EventRegistrationStatus.REJECTED);

    res.json({
      success: true,
      data: updated,
      message: 'Registration rejected'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error rejecting registration:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to reject registration',
      message
    });
  }
});

/**
 * DELETE /api/admin/clan-events/events/:eventId/registrations/:id
 * Remove a registration
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;

    const existing = await registrationsEntity.findById(id);
    if (!existing || existing.eventId !== eventId) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    await registrationsEntity.delete(id);

    res.json({
      success: true,
      message: 'Registration removed successfully',
      deleted_id: id
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error removing registration:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to remove registration',
      message
    });
  }
});

export default router;
