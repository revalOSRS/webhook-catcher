/**
 * Current Clan Statistics Route
 * 
 * Endpoint for the latest clan statistics snapshot
 */

import { Router } from 'express'
import * as db from '../../../db/connection.js'

const router = Router()

// Get comprehensive clan statistics (from daily snapshots)
router.get('/', async (req, res) => {
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
    console.error('Error fetching clan statistics:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch clan statistics' 
    })
  }
})

export default router




