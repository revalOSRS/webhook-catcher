/**
 * Members Routes Index
 * 
 * Combines all member-related route modules
 */

import { Router } from 'express'
import profileRoutes from './profile.routes.js'
import osrsAccountsRoutes from './osrs-accounts.routes.js'
import snapshotsRoutes from './snapshots.routes.js'

const router = Router()

// Mount all member routes
router.use('/', profileRoutes)
router.use('/', osrsAccountsRoutes)
router.use('/', snapshotsRoutes)

export default router

