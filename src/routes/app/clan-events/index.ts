import { Router } from 'express';
import eventsRouter from './events.routes.js';
import leaderboardRouter from './leaderboard.routes.js';
import teamRouter from './team.routes.js';
import contributionsRouter from './contributions.routes.js';
import tilesRouter from './tiles.routes.js';

const router = Router();

/**
 * Clan Events User API Routes
 * 
 * Base path: /api/app/clan-events
 * 
 * Structure:
 *   /events                           - List active events
 *   /events/my-events                 - User's events (all statuses)
 *   /events/:eventId                  - Event details with board
 *   /events/:eventId/leaderboard      - Event team rankings
 *   /events/:eventId/team/progress    - Team progress summary
 *   /events/:eventId/team/leaderboard - Team member rankings
 *   /events/:eventId/team/activity    - Recent team activity
 *   /events/:eventId/my-contributions - User's tile contributions
 *   /events/:eventId/tiles/:tileId    - Tile detail view
 */

// Mount event routes at /events
router.use('/events', eventsRouter);

// Mount sub-routes under /events/:eventId
router.use('/events/:eventId/leaderboard', leaderboardRouter);
router.use('/events/:eventId/team', teamRouter);
router.use('/events/:eventId/my-contributions', contributionsRouter);
router.use('/events/:eventId/tiles', tilesRouter);

export default router;

