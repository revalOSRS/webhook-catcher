import { Router } from 'express'
import eventsRoutes from './events.routes.js'
import teamsRoutes from './teams.routes.js'
import tilesRoutes from './tiles.routes.js'
import shipsRoutes from './ships.routes.js'
import bombingRoutes from './bombing.routes.js'

const router = Router()

// Mount all battleship bingo routes
router.use('/events', eventsRoutes)
router.use('/teams', teamsRoutes)
router.use('/tiles', tilesRoutes)
router.use('/ships', shipsRoutes)
router.use('/bombing', bombingRoutes)

export default router


