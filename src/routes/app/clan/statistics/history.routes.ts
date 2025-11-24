/**
 * Historical Clan Statistics Route
 * 
 * Endpoint for historical clan statistics snapshots
 */

import { Router } from 'express'
import * as db from '../../../db/connection.js'

const router = Router()

// Get historical clan statistics snapshots
router.get('/', async (req, res) => {
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




