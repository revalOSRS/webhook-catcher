/**
 * Clan Member Count Routes
 *
 * Routes for getting clan member count statistics
 */
import { Router } from 'express';
import * as db from '../../../db/connection.js';
const router = Router();
// Get count of active members in the clan
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`SELECT COUNT(*) as count
       FROM members
       WHERE is_active = true AND in_discord = true`);
        const count = parseInt(result[0]?.count || '0');
        res.status(200).json({
            status: 'success',
            data: {
                active_members: count
            }
        });
    }
    catch (error) {
        console.error('Error fetching active member count:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch active member count'
        });
    }
});
export default router;
