import { Router } from 'express'
import * as battleshipService from '../../db/services/battleship.service.js'
import { query } from '../../db/connection.js'

const router = Router()

// Place a ship
router.post('/', async (req, res) => {
  try {
    const { event_id, team_id, ship_name, size, coordinates, discord_id } = req.body

    if (!event_id || !team_id || !size || !coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({
        status: 'error',
        message: 'event_id, team_id, size, and coordinates array are required'
      })
    }

    // Validate coordinates match size
    if (coordinates.length !== size) {
      return res.status(400).json({
        status: 'error',
        message: 'Number of coordinates must match ship size'
      })
    }

    // Check if coordinates are valid and not already occupied by another ship
    for (const coord of coordinates) {
      const existingShip = await battleshipService.checkShipAtCoordinate(event_id, coord)
      if (existingShip) {
        return res.status(400).json({
          status: 'error',
          message: `Coordinate ${coord} is already occupied by another ship`
        })
      }
    }

    const ship = await battleshipService.placeShip({
      event_id,
      team_id,
      ship_name,
      size,
      coordinates
    })

    // Mark tiles as ship segments
    for (const coord of coordinates) {
      const tile = await battleshipService.getTileByCoordinate(event_id, coord)
      if (tile) {
        await query(
          `UPDATE battleship_bingo_tiles 
           SET is_ship_segment = TRUE, ship_id = $1 
           WHERE id = $2`,
          [ship.id, tile.id]
        )
      }
    }

    // Log the action
    await battleshipService.logEventAction({
      event_id,
      action_type: 'ship_placed',
      actor_discord_id: discord_id,
      team_id,
      details: {
        ship_id: ship.id,
        ship_name: ship_name || 'Unnamed Ship',
        size,
        coordinates
      }
    })

    res.status(201).json({
      status: 'success',
      data: ship,
      message: 'Ship placed successfully'
    })
  } catch (error) {
    console.error('Error placing ship:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to place ship'
    })
  }
})

// Get ships for a team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params

    const ships = await battleshipService.getTeamShips(teamId)

    res.status(200).json({
      status: 'success',
      data: ships,
      count: ships.length
    })
  } catch (error) {
    console.error('Error fetching team ships:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team ships'
    })
  }
})

export default router

