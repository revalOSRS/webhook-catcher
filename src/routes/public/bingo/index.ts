/**
 * Public Bingo Routes
 * 
 * Mounts all public bingo-related endpoints.
 * No authentication required for any of these routes.
 */

import { Router } from 'express';
import eventRoutes from './event.routes.js';

const router = Router();

// GET /api/public/bingo/:eventId - Get public event data
router.use('/', eventRoutes);

export default router;

