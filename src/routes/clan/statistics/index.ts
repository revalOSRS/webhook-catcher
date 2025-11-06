/**
 * Statistics Routes Index
 * 
 * Combines all statistics-related route modules
 */

import { Router } from 'express'
import currentRoutes from './current.routes.js'
import historyRoutes from './history.routes.js'

const router = Router()

// Mount all statistics routes
router.use('/', currentRoutes)
router.use('/history', historyRoutes)

export default router


