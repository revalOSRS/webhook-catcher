/**
 * Event Filters Routes
 *
 * Public endpoint for RuneLite plugin to fetch event filtering configuration
 */
import { Router } from 'express';
const router = Router();
/**
 * Default event filters configuration
 */
const DEFAULT_EVENT_FILTERS = {
    loot: {
        minValue: 1000,
        whitelist: [526],
        blacklist: [592]
    },
    enabled: {
        loot: true,
        pet: true,
        quest: true,
        level: true,
        killCount: true,
        clue: true,
        diary: true,
        combatAchievement: true,
        collection: true,
        death: true,
        detailedKill: true,
        areaEntry: true,
        emote: true
    }
};
/**
 * Get appropriate event filters based on current time
 */
const getEventFilters = () => {
    return DEFAULT_EVENT_FILTERS;
};
/**
 * GET /event-filters
 *
 * Returns event filtering configuration for RuneLite plugin
 *
 * Public endpoint (no authentication required)
 * Called once per login session by the plugin
 */
router.get('/', async (req, res) => {
    try {
        const filters = getEventFilters();
        console.log(`[Event Filters] Request received from ${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`);
        res.json(filters);
    }
    catch (error) {
        console.error('Error fetching event filters:', error);
        res.status(500).json(DEFAULT_EVENT_FILTERS);
    }
});
/**
 * GET /event-filters/debug
 *
 * Debug endpoint to see current configuration and peak hours status
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
