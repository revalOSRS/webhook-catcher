import { Router } from 'express';
import libraryRouter from './library.routes.js';

const router = Router();

// Mount sub-routers
router.use('/library', libraryRouter);

export default router;

