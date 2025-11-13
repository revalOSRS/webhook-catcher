import { Router } from 'express';
import eventsRouter from './events.routes.js';
import boardsRouter from './boards.routes.js';
import teamsRouter from './teams.routes.js';
import tilesRouter from './tiles/index.js';
import buffsRouter from './buffs/index.js';

const router = Router();

// Mount sub-routers
router.use('/events', eventsRouter);
router.use('/boards', boardsRouter);
router.use('/teams', teamsRouter);
router.use('/tiles', tilesRouter);
router.use('/buffs', buffsRouter);

export default router;

