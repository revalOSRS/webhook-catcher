import { Router } from 'express';
import eventsRouter from './events/index.js';
import boardsRouter from './boards.routes.js';
import teamsRouter from './events/teams/index.js';
import tilesRouter from './bingo/tiles.routes.js';
import buffsRouter from './buffs/index.js';
import boardRouter from './events/teams/board.routes.js';
const router = Router();
// Mount sub-routers
router.use('/events', eventsRouter);
router.use('/boards', boardsRouter); // Deprecated, kept for backwards compatibility
router.use('/teams', teamsRouter);
// Mount board routes at /events/:eventId/teams/:teamId/board
router.use('/events/:eventId/teams/:teamId/board', boardRouter);
router.use('/bingo/tiles', tilesRouter);
router.use('/buffs', buffsRouter);
export default router;
