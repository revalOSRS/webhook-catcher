import { Router } from 'express'
import { requireAdmin } from '../../../middleware/auth.js'
import * as battleshipService from '../../../db/services/battleship.service.js'

const router = Router()

// Initialize board tiles (admin only)
router.post('/initialize', requireAdmin, async (req, res) => {
  try {
    const { event_id, tiles } = req.body

    if (!event_id || !tiles || !Array.isArray(tiles)) {
      return res.status(400).json({
        status: 'error',
        message: 'event_id and tiles array are required'
      })
    }

    await battleshipService.initializeBoardTiles(event_id, tiles)

    await battleshipService.logEventAction({
      event_id,
      action_type: 'board_initialized',
      details: { tile_count: tiles.length }
    })

    res.status(201).json({
      status: 'success',
      message: 'Board tiles initialized successfully',
      tile_count: tiles.length
    })
  } catch (error) {
    console.error('Error initializing tiles:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize board tiles'
    })
  }
})

// Get all tiles for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params
    const status = req.query.status as string | undefined

    let tiles = await battleshipService.getTilesByEventId(eventId)

    // Filter by status if provided
    if (status) {
      tiles = tiles.filter(tile => tile.status === status)
    }

    res.status(200).json({
      status: 'success',
      data: tiles,
      count: tiles.length
    })
  } catch (error) {
    console.error('Error fetching tiles:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tiles'
    })
  }
})

// Get specific tile by coordinate
router.get('/event/:eventId/coordinate/:coordinate', async (req, res) => {
  try {
    const { eventId, coordinate } = req.params

    const tile = await battleshipService.getTileByCoordinate(eventId, coordinate)

    if (!tile) {
      return res.status(404).json({
        status: 'error',
        message: 'Tile not found'
      })
    }

    // Get progress for this tile
    const progress = await battleshipService.getTileProgress(tile.id)

    res.status(200).json({
      status: 'success',
      data: {
        tile,
        progress
      }
    })
  } catch (error) {
    console.error('Error fetching tile:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tile'
    })
  }
})

// Claim a tile
router.post('/:tileId/claim', async (req, res) => {
  try {
    const { tileId } = req.params
    const { team_id, discord_id } = req.body

    if (!team_id || !discord_id) {
      return res.status(400).json({
        status: 'error',
        message: 'team_id and discord_id are required'
      })
    }

    const tile = await battleshipService.claimTile(tileId, team_id)

    if (!tile) {
      return res.status(400).json({
        status: 'error',
        message: 'Tile cannot be claimed (already claimed or invalid)'
      })
    }

    // Log the action
    const team = await battleshipService.getTeamById(team_id)
    if (team) {
      await battleshipService.logEventAction({
        event_id: tile.event_id,
        action_type: 'tile_claimed',
        actor_discord_id: discord_id,
        team_id,
        details: { tile_id: tileId, coordinate: tile.coordinate, task_id: tile.task_id }
      })
    }

    res.status(200).json({
      status: 'success',
      data: tile,
      message: 'Tile claimed successfully'
    })
  } catch (error) {
    console.error('Error claiming tile:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to claim tile'
    })
  }
})

// Update tile progress
router.post('/:tileId/progress', async (req, res) => {
  try {
    const { tileId } = req.params
    const {
      discord_id,
      progress_amount,
      progress_percentage,
      contribution_type,
      current_best_value,
      proof_url,
      notes
    } = req.body

    if (!discord_id || progress_amount === undefined || progress_percentage === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'discord_id, progress_amount, and progress_percentage are required'
      })
    }

    const progress = await battleshipService.updateTileProgress({
      tile_id: tileId,
      discord_id,
      progress_amount,
      progress_percentage,
      contribution_type,
      current_best_value,
      proof_url,
      notes
    })

    res.status(200).json({
      status: 'success',
      data: progress,
      message: 'Tile progress updated successfully'
    })
  } catch (error) {
    console.error('Error updating tile progress:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to update tile progress'
    })
  }
})

// Complete a tile (admin or team member)
router.post('/:tileId/complete', async (req, res) => {
  try {
    const { tileId } = req.params
    const {
      completed_by_discord_id,
      contributors,
      bonus_tier_achieved,
      completion_value,
      total_points_awarded,
      proof_url
    } = req.body

    if (!completed_by_discord_id || total_points_awarded === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'completed_by_discord_id and total_points_awarded are required'
      })
    }

    const tile = await battleshipService.completeTile({
      tile_id: tileId,
      completed_by_discord_id,
      contributors,
      bonus_tier_achieved,
      completion_value,
      total_points_awarded,
      proof_url
    })

    if (!tile || !tile.claimed_by_team_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Tile cannot be completed'
      })
    }

    // Update team score
    await battleshipService.updateTeamScore(tile.claimed_by_team_id, total_points_awarded)

    // Log the action
    await battleshipService.logEventAction({
      event_id: tile.event_id,
      action_type: 'tile_completed',
      actor_discord_id: completed_by_discord_id,
      team_id: tile.claimed_by_team_id,
      details: {
        tile_id: tileId,
        coordinate: tile.coordinate,
        task_id: tile.task_id,
        points_awarded: total_points_awarded,
        bonus_tier: bonus_tier_achieved
      }
    })

    res.status(200).json({
      status: 'success',
      data: tile,
      message: 'Tile completed successfully'
    })
  } catch (error) {
    console.error('Error completing tile:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete tile'
    })
  }
})

// Get tile progress
router.get('/:tileId/progress', async (req, res) => {
  try {
    const { tileId } = req.params

    const progress = await battleshipService.getTileProgress(tileId)

    res.status(200).json({
      status: 'success',
      data: progress,
      count: progress.length
    })
  } catch (error) {
    console.error('Error fetching tile progress:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tile progress'
    })
  }
})

export default router


