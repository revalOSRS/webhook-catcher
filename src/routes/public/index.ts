/**
 * Public Routes
 * 
 * All public endpoints that don't require authentication.
 * Designed for landing pages, spectator views, and public APIs.
 */

import { Router } from 'express';
import bingoRoutes from './bingo/index.js';

const router = Router();

// Mount bingo public routes at /api/public/bingo
router.use('/bingo', bingoRoutes);

export default router;

