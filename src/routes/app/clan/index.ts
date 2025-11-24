/**
 * Clan Routes Index
 * 
 * Combines all clan-related route modules
 */

import { Router } from 'express'
import statisticsRoutes from './statistics/index.js'
import countRoutes from './count.routes.js'
import membersRoutes from './members.routes.js'

const router = Router()

// Mount all clan routes
router.use('/statistics', statisticsRoutes)
router.use('/members/count', countRoutes)
router.use('/members', membersRoutes)

export default router

