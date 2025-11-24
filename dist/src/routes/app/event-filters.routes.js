/**
 * Event Filters Routes
 *
 * Public endpoint for RuneLite plugin to fetch event filtering configuration
 */
import { Router } from 'express';
import { getEventFilters, DEFAULT_EVENT_FILTERS } from '../../db/types/event-filters.types.js';
const router = Router();
/**
 * GET /event-filters
 *
 * Returns event filtering configuration for RuneLite plugin
 *
 * Public endpoint (no authentication required)
 * Called once per login session by the plugin
 *
 * Response Format:
 * {
 *   loot: {
 *     minValue: number,
 *     whitelist: number[],
 *     blacklist: number[]
 *   },
 *   enabled: {
 *     loot: boolean,
 *     pet: boolean,
 *     ... (14 event types)
 *   }
 * }
 */
router.get('/', async (req, res) => {
    try {
        // Get time-based configuration (peak hours vs normal)
        const filters = getEventFilters();
        // Log request for monitoring (optional)
        console.log(`[Event Filters] Request received from ${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`);
        res.json(filters);
    }
    catch (error) {
        console.error('Error fetching event filters:', error);
        // Return safe defaults on error (graceful degradation)
        res.status(500).json(DEFAULT_EVENT_FILTERS);
    }
});
/**
 * GET /event-filters/debug
 *
 * Debug endpoint to see current configuration and peak hours status
 * Remove or protect this in production!
 */
router.get('/debug', async (req, res) => {
    try {
        const hour = new Date().getUTCHours();
        const isPeak = hour >= 18 && hour <= 22;
        const filters = getEventFilters();
        res.json({
            currentTime: new Date().toISOString(),
            currentHourUTC: hour,
            isPeakHours: isPeak,
            activeConfiguration: isPeak ? 'PEAK_HOURS' : 'PRODUCTION',
            filters
        });
    }
    catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
