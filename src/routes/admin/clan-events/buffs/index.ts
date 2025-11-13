import { Router } from 'express';
import libraryRouter from './library.routes.js';
import effectsRouter from './effects.routes.js';

const router = Router();

// Mount sub-routers
router.use('/library', libraryRouter);
router.use('/effects', effectsRouter);

export default router;

