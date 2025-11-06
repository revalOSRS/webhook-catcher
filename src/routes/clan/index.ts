/**
 * Clan Routes Index
 * 
 * Combines all clan-related route modules
 */

import { Router } from 'express'
import statisticsRoutes from './statistics/index.js'
import countRoutes from './count.routes.js'

const router = Router()

// Mount all clan routes
router.use('/statistics', statisticsRoutes)
router.use('/members/count', countRoutes)

export default router

