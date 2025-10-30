import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import * as battleshipService from '../../db/services/battleship.service.js'

const router = Router()

// Create a team (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { event_id, name, color } = req.body

    if (!event_id || !name || !color) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: event_id, name, color'
      })
    }

    const team = await battleshipService.createTeam({
      event_id,
      name,
      color
    })

    await battleshipService.logEventAction({
      event_id,
      action_type: 'team_created',
      team_id: team.id,
      details: { team_name: name, color }
    })

    res.status(201).json({
      status: 'success',
      data: team,
      message: 'Team created successfully'
    })
  } catch (error) {
    console.error('Error creating team:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to create team'
    })
  }
})

// Get teams for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params

    const teams = await battleshipService.getTeamsByEventId(eventId)

    res.status(200).json({
      status: 'success',
      data: teams,
      count: teams.length
    })
  } catch (error) {
    console.error('Error fetching teams:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch teams'
    })
  }
})

// Get team by ID with members
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params

    const team = await battleshipService.getTeamById(teamId)

    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found'
      })
    }

    const members = await battleshipService.getTeamMembers(teamId)
    const ships = await battleshipService.getTeamShips(teamId)

    res.status(200).json({
      status: 'success',
      data: {
        team,
        members,
        ships
      }
    })
  } catch (error) {
    console.error('Error fetching team:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team'
    })
  }
})

// Add member to team (admin only)
router.post('/:teamId/members', requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params
    const { discord_id, member_code, role } = req.body

    if (!discord_id) {
      return res.status(400).json({
        status: 'error',
        message: 'discord_id is required'
      })
    }

    const member = await battleshipService.addTeamMember({
      team_id: teamId,
      discord_id,
      member_code,
      role
    })

    // Get team to log event
    const team = await battleshipService.getTeamById(teamId)
    if (team) {
      await battleshipService.logEventAction({
        event_id: team.event_id,
        action_type: 'member_added',
        team_id: teamId,
        actor_discord_id: discord_id,
        details: { discord_id, role: role || 'member' }
      })
    }

    res.status(201).json({
      status: 'success',
      data: member,
      message: 'Member added to team successfully'
    })
  } catch (error) {
    console.error('Error adding team member:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to add team member'
    })
  }
})

// Get team members
router.get('/:teamId/members', async (req, res) => {
  try {
    const { teamId } = req.params

    const members = await battleshipService.getTeamMembers(teamId)

    res.status(200).json({
      status: 'success',
      data: members,
      count: members.length
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team members'
    })
  }
})

// Get team leaderboard for event
router.get('/event/:eventId/leaderboard', async (req, res) => {
  try {
    const { eventId } = req.params

    const leaderboard = await battleshipService.getTeamLeaderboard(eventId)

    res.status(200).json({
      status: 'success',
      data: leaderboard
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch leaderboard'
    })
  }
})

// Get player leaderboard for event
router.get('/event/:eventId/players/leaderboard', async (req, res) => {
  try {
    const { eventId } = req.params

    const leaderboard = await battleshipService.getPlayerLeaderboard(eventId)

    res.status(200).json({
      status: 'success',
      data: leaderboard
    })
  } catch (error) {
    console.error('Error fetching player leaderboard:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch player leaderboard'
    })
  }
})

export default router


