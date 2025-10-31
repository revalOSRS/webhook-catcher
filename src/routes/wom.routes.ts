import { Router } from 'express'
import * as WOM from '../services/wiseoldman.js'
import * as db from '../db/connection.js'

const router = Router()

// Get WOM player data by OSRS username
router.get('/player/:username', async (req, res) => {
  try {
    const { username } = req.params
    const player = await WOM.searchPlayer(username)

    if (!player) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Player not found on WiseOldMan' 
      })
    }

    res.status(200).json({
      status: 'success',
      data: player
    })
  } catch (error) {
    console.error('Error fetching WOM player:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch WOM player data' 
    })
  }
})

// Update WOM player (trigger hiscores refresh)
router.post('/player/:username/update', async (req, res) => {
  try {
    const { username } = req.params
    const updatedPlayer = await WOM.updatePlayer(username)

    res.status(200).json({
      status: 'success',
      data: updatedPlayer,
      message: 'Player updated successfully'
    })
  } catch (error) {
    console.error('Error updating WOM player:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update WOM player' 
    })
  }
})

// Get player gains
router.get('/player/:username/gains', async (req, res) => {
  try {
    const { username } = req.params
    const period = (req.query.period as 'day' | 'week' | 'month' | 'year') || 'week'

    const gains = await WOM.getPlayerGains(username, period)

    res.status(200).json({
      status: 'success',
      data: gains
    })
  } catch (error) {
    console.error('Error fetching WOM gains:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player gains' 
    })
  }
})

// Get player achievements
router.get('/player/:username/achievements', async (req, res) => {
  try {
    const { username } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20

    const achievements = await WOM.getPlayerAchievements(username, limit)

    res.status(200).json({
      status: 'success',
      data: achievements,
      count: achievements.length
    })
  } catch (error) {
    console.error('Error fetching WOM achievements:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player achievements' 
    })
  }
})

// Get player records
router.get('/player/:username/records', async (req, res) => {
  try {
    const { username} = req.params
    const period = (req.query.period as string) || 'week'
    const metric = req.query.metric as string | undefined

    const records = await WOM.getPlayerRecords(username, period, metric)

    res.status(200).json({
      status: 'success',
      data: records,
      count: records.length
    })
  } catch (error) {
    console.error('Error fetching WOM records:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player records' 
    })
  }
})

// Get player snapshots
router.get('/player/:username/snapshots', async (req, res) => {
  try {
    const { username } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

    const snapshots = await WOM.getPlayerSnapshots(username, limit)

    res.status(200).json({
      status: 'success',
      data: snapshots,
      count: snapshots.length
    })
  } catch (error) {
    console.error('Error fetching WOM snapshots:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player snapshots' 
    })
  }
})

// Get player groups/clans
router.get('/player/:username/groups', async (req, res) => {
  try {
    const { username } = req.params
    const groups = await WOM.getPlayerGroups(username)

    res.status(200).json({
      status: 'success',
      data: groups,
      count: groups.length
    })
  } catch (error) {
    console.error('Error fetching WOM groups:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player groups' 
    })
  }
})

// Get comprehensive WOM data
router.get('/player/:username/comprehensive', async (req, res) => {
  try {
    const { username } = req.params
    const data = await WOM.getComprehensivePlayerData(username)

    res.status(200).json({
      status: 'success',
      data: data
    })
  } catch (error) {
    console.error('Error fetching comprehensive WOM data:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch comprehensive WOM data' 
    })
  }
})

// Get group/clan activity (for Reval clan - group ID 14350)
router.get('/clan/activity', async (req, res) => {
  try {
    const REVAL_GROUP_ID = 14350
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined

    const activity = await WOM.getGroupActivity(REVAL_GROUP_ID, limit, offset)

    res.status(200).json({
      status: 'success',
      data: activity,
      count: activity.length
    })
  } catch (error) {
    console.error('Error fetching WOM group activity:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch group activity' 
    })
  }
})

// Get group/clan members (for Reval clan - group ID 14350)
router.get('/clan/members', async (req, res) => {
  try {
    const REVAL_GROUP_ID = 14350
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined

    const members = await WOM.getGroupMembers(REVAL_GROUP_ID, limit, offset)

    res.status(200).json({
      status: 'success',
      data: members,
      count: members.length
    })
  } catch (error) {
    console.error('Error fetching WOM clan members:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch clan members' 
    })
  }
})

// Get comprehensive clan statistics (for Reval clan - from daily snapshots)
router.get('/clan/statistics', async (req, res) => {
  try {
    // Get the latest snapshot from the database
    const snapshot = await db.queryOne<any>(`
      SELECT 
        snapshot_date,
        group_name,
        total_members,
        average_level,
        average_xp,
        maxed_count,
        maxed_percentage,
        total_clues,
        total_boss_kills,
        total_cox,
        total_toa,
        total_tob,
        total_ehp,
        total_ehb,
        failed_members,
        created_at
      FROM clan_statistics_snapshots
      ORDER BY snapshot_date DESC
      LIMIT 1
    `)
    
    if (!snapshot) {
      return res.status(404).json({
        status: 'error',
        message: 'No snapshot data available yet. Daily snapshots are created by the Discord bot at midnight.'
      })
    }
    
    // Format the response to match the expected structure
    const statistics = {
      groupName: snapshot.group_name,
      totalMembers: snapshot.total_members,
      averageLevel: snapshot.average_level,
      averageXP: snapshot.average_xp,
      maxedPlayers: {
        count: snapshot.maxed_count,
        percentage: parseFloat(snapshot.maxed_percentage)
      },
      totalStats: {
        clues: snapshot.total_clues,
        bossKills: snapshot.total_boss_kills,
        cox: snapshot.total_cox,
        toa: snapshot.total_toa,
        tob: snapshot.total_tob,
        ehp: snapshot.total_ehp,
        ehb: snapshot.total_ehb
      },
      snapshotDate: snapshot.snapshot_date,
      lastUpdated: snapshot.created_at,
      failedMembers: snapshot.failed_members
    }

    res.status(200).json({
      status: 'success',
      data: statistics
    })
  } catch (error) {
    console.error('Error fetching WOM clan statistics:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch clan statistics' 
    })
  }
})

// Get historical clan statistics snapshots
router.get('/clan/statistics/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return res.status(400).json({
        status: 'error',
        message: 'Days parameter must be between 1 and 365'
      })
    }
    
    const snapshots = await db.query<any>(`
      SELECT 
        snapshot_date,
        total_members,
        average_level,
        average_xp,
        maxed_count,
        maxed_percentage,
        total_ehp,
        total_ehb,
        total_clues,
        total_boss_kills,
        total_cox,
        total_toa,
        total_tob,
        created_at
      FROM clan_statistics_snapshots
      ORDER BY snapshot_date DESC
      LIMIT $1
    `, [days])
    
    res.status(200).json({
      status: 'success',
      data: snapshots,
      count: snapshots.length
    })
  } catch (error) {
    console.error('Error fetching statistics history:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch statistics history' 
    })
  }
})

export default router


