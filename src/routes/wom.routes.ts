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

// Get single player's detailed snapshot by WOM player ID (PUBLIC)
router.get('/clan/players/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId)
    
    if (isNaN(playerId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid player ID'
      })
    }
    
    // Get the latest clan snapshot
    const latestClanSnapshot = await db.queryOne<any>(`
      SELECT id, snapshot_date, group_name
      FROM clan_statistics_snapshots
      ORDER BY snapshot_date DESC
      LIMIT 1
    `)
    
    if (!latestClanSnapshot) {
      return res.status(404).json({
        status: 'error',
        message: 'No clan snapshots available yet'
      })
    }
    
    // Get player snapshot for this player from latest clan snapshot
    const playerSnapshot = await db.queryOne<any>(`
      SELECT 
        id, player_id, username, display_name, snapshot_date,
        player_type, player_build, country, status, patron,
        total_exp, total_level, combat_level,
        ehp, ehb, ttm, tt200m,
        registered_at, updated_at, last_changed_at
      FROM player_snapshots
      WHERE player_id = $1 AND clan_snapshot_id = $2
    `, [playerId, latestClanSnapshot.id])
    
    if (!playerSnapshot) {
      return res.status(404).json({
        status: 'error',
        message: 'No snapshot found for this player in the latest clan snapshot'
      })
    }
    
    // Fetch all related data in parallel
    const [skills, bosses, activities, computed] = await Promise.all([
      db.query<any>(`
        SELECT skill, experience, level, rank, ehp
        FROM player_skills_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY skill
      `, [playerSnapshot.id]),
      
      db.query<any>(`
        SELECT boss, kills, rank, ehb
        FROM player_bosses_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY boss
      `, [playerSnapshot.id]),
      
      db.query<any>(`
        SELECT activity, score, rank
        FROM player_activities_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY activity
      `, [playerSnapshot.id]),
      
      db.query<any>(`
        SELECT metric, value, rank
        FROM player_computed_snapshots
        WHERE player_snapshot_id = $1
        ORDER BY metric
      `, [playerSnapshot.id])
    ])
    
    // Format the response
    const playerData = {
      clanSnapshot: {
        id: latestClanSnapshot.id,
        snapshotDate: latestClanSnapshot.snapshot_date,
        groupName: latestClanSnapshot.group_name
      },
      player: {
        id: playerSnapshot.id,
        playerId: playerSnapshot.player_id,
        username: playerSnapshot.username,
        displayName: playerSnapshot.display_name,
        snapshotDate: playerSnapshot.snapshot_date,
        type: playerSnapshot.player_type,
        build: playerSnapshot.player_build,
        country: playerSnapshot.country,
        status: playerSnapshot.status,
        patron: playerSnapshot.patron,
        stats: {
          totalExp: parseInt(playerSnapshot.total_exp),
          totalLevel: playerSnapshot.total_level,
          combatLevel: playerSnapshot.combat_level,
          ehp: parseFloat(playerSnapshot.ehp),
          ehb: parseFloat(playerSnapshot.ehb),
          ttm: parseFloat(playerSnapshot.ttm),
          tt200m: parseFloat(playerSnapshot.tt200m)
        },
        skills: skills.map(skill => ({
          skill: skill.skill,
          experience: parseInt(skill.experience),
          level: skill.level,
          rank: skill.rank,
          ehp: parseFloat(skill.ehp)
        })),
        bosses: bosses.map(boss => ({
          boss: boss.boss,
          kills: boss.kills,
          rank: boss.rank,
          ehb: parseFloat(boss.ehb)
        })),
        activities: activities.map(activity => ({
          activity: activity.activity,
          score: activity.score,
          rank: activity.rank
        })),
        computed: computed.map(comp => ({
          metric: comp.metric,
          value: parseFloat(comp.value),
          rank: comp.rank
        })),
        timestamps: {
          registeredAt: playerSnapshot.registered_at,
          updatedAt: playerSnapshot.updated_at,
          lastChangedAt: playerSnapshot.last_changed_at
        }
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: playerData
    })
    
  } catch (error) {
    console.error('Error fetching player snapshot:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch player snapshot data' 
    })
  }
})

// Get detailed player snapshots from latest clan snapshot (PUBLIC - for landing page)
router.get('/clan/players', async (req, res) => {
  try {
    // Get the latest clan snapshot
    const latestClanSnapshot = await db.queryOne<any>(`
      SELECT id, snapshot_date, group_name
      FROM clan_statistics_snapshots
      ORDER BY snapshot_date DESC
      LIMIT 1
    `)
    
    if (!latestClanSnapshot) {
      return res.status(404).json({
        status: 'error',
        message: 'No clan snapshots available yet'
      })
    }
    
    // Get all player snapshots for this clan snapshot
    const playerSnapshots = await db.query<any>(`
      SELECT 
        id, player_id, username, display_name, snapshot_date,
        player_type, player_build, country, status, patron,
        total_exp, total_level, combat_level,
        ehp, ehb, ttm, tt200m,
        registered_at, updated_at, last_changed_at
      FROM player_snapshots
      WHERE clan_snapshot_id = $1
      ORDER BY ehp DESC
    `, [latestClanSnapshot.id])
    
    // Get all related data for these players
    const playerIds = playerSnapshots.map(p => p.id)
    
    if (playerIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          clanSnapshot: {
            id: latestClanSnapshot.id,
            snapshotDate: latestClanSnapshot.snapshot_date,
            groupName: latestClanSnapshot.group_name
          },
          players: []
        }
      })
    }
    
    // Fetch all skills, bosses, activities, and computed metrics in parallel
    const [skills, bosses, activities, computed] = await Promise.all([
      db.query<any>(`
        SELECT player_snapshot_id, skill, experience, level, rank, ehp
        FROM player_skills_snapshots
        WHERE player_snapshot_id = ANY($1::int[])
        ORDER BY player_snapshot_id, skill
      `, [playerIds]),
      
      db.query<any>(`
        SELECT player_snapshot_id, boss, kills, rank, ehb
        FROM player_bosses_snapshots
        WHERE player_snapshot_id = ANY($1::int[])
        ORDER BY player_snapshot_id, boss
      `, [playerIds]),
      
      db.query<any>(`
        SELECT player_snapshot_id, activity, score, rank
        FROM player_activities_snapshots
        WHERE player_snapshot_id = ANY($1::int[])
        ORDER BY player_snapshot_id, activity
      `, [playerIds]),
      
      db.query<any>(`
        SELECT player_snapshot_id, metric, value, rank
        FROM player_computed_snapshots
        WHERE player_snapshot_id = ANY($1::int[])
        ORDER BY player_snapshot_id, metric
      `, [playerIds])
    ])
    
    // Group related data by player_snapshot_id
    const skillsByPlayer = new Map<number, any[]>()
    const bossesByPlayer = new Map<number, any[]>()
    const activitiesByPlayer = new Map<number, any[]>()
    const computedByPlayer = new Map<number, any[]>()
    
    skills.forEach(skill => {
      if (!skillsByPlayer.has(skill.player_snapshot_id)) {
        skillsByPlayer.set(skill.player_snapshot_id, [])
      }
      skillsByPlayer.get(skill.player_snapshot_id)!.push({
        skill: skill.skill,
        experience: parseInt(skill.experience),
        level: skill.level,
        rank: skill.rank,
        ehp: parseFloat(skill.ehp)
      })
    })
    
    bosses.forEach(boss => {
      if (!bossesByPlayer.has(boss.player_snapshot_id)) {
        bossesByPlayer.set(boss.player_snapshot_id, [])
      }
      bossesByPlayer.get(boss.player_snapshot_id)!.push({
        boss: boss.boss,
        kills: boss.kills,
        rank: boss.rank,
        ehb: parseFloat(boss.ehb)
      })
    })
    
    activities.forEach(activity => {
      if (!activitiesByPlayer.has(activity.player_snapshot_id)) {
        activitiesByPlayer.set(activity.player_snapshot_id, [])
      }
      activitiesByPlayer.get(activity.player_snapshot_id)!.push({
        activity: activity.activity,
        score: activity.score,
        rank: activity.rank
      })
    })
    
    computed.forEach(comp => {
      if (!computedByPlayer.has(comp.player_snapshot_id)) {
        computedByPlayer.set(comp.player_snapshot_id, [])
      }
      computedByPlayer.get(comp.player_snapshot_id)!.push({
        metric: comp.metric,
        value: parseFloat(comp.value),
        rank: comp.rank
      })
    })
    
    // Combine all data for each player
    const players = playerSnapshots.map(player => ({
      id: player.id,
      playerId: player.player_id,
      username: player.username,
      displayName: player.display_name,
      type: player.player_type,
      build: player.player_build,
      country: player.country,
      status: player.status,
      patron: player.patron,
      stats: {
        totalExp: parseInt(player.total_exp),
        totalLevel: player.total_level,
        combatLevel: player.combat_level,
        ehp: parseFloat(player.ehp),
        ehb: parseFloat(player.ehb),
        ttm: parseFloat(player.ttm),
        tt200m: parseFloat(player.tt200m)
      },
      skills: skillsByPlayer.get(player.id) || [],
      bosses: bossesByPlayer.get(player.id) || [],
      activities: activitiesByPlayer.get(player.id) || [],
      computed: computedByPlayer.get(player.id) || [],
      timestamps: {
        registeredAt: player.registered_at,
        updatedAt: player.updated_at,
        lastChangedAt: player.last_changed_at
      }
    }))
    
    res.status(200).json({
      status: 'success',
      data: {
        clanSnapshot: {
          id: latestClanSnapshot.id,
          snapshotDate: latestClanSnapshot.snapshot_date,
          groupName: latestClanSnapshot.group_name
        },
        players,
        count: players.length
      }
    })
    
  } catch (error) {
    console.error('Error fetching clan players:', error)
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch clan players data' 
    })
  }
})

export default router


