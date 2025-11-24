/**
 * Member Snapshots Routes
 *
 * Routes for getting historical WOM snapshot data
 */
import { Router } from 'express';
import * as db from '../../../db/connection.js';
import { requireMemberAuth } from '../../../middleware/auth.js';
const router = Router();
/**
 * GET /:memberId/accounts/:accountId/snapshots
 *
 * Returns historical WOM snapshots grouped by day for a specific OSRS account.
 * Useful for showing historical progression of skills and computed metrics.
 *
 * Note: Boss and activity data is now tracked via the RuneLite SYNC system
 * in osrs_account_killcounts. This endpoint only returns WOM skill snapshots.
 *
 * Query parameters:
 * - days: Number of days to look back (default: 30, max: 365)
 * - includeSkills: Include skill snapshots (default: true)
 * - includeComputed: Include computed metrics (default: true)
 */
router.get('/:memberId/accounts/:accountId/snapshots', requireMemberAuth, async (req, res) => {
    try {
        const { accountId } = req.params;
        const authenticatedMember = req.authenticatedMember;
        const discordId = authenticatedMember.discord_id;
        // Parse query parameters
        const days = Math.min(parseInt(req.query.days) || 30, 365);
        const includeSkills = req.query.includeSkills !== 'false';
        const includeComputed = req.query.includeComputed !== 'false';
        // Verify the OSRS account belongs to the authenticated member
        const osrsAccount = await db.queryOne(`
      SELECT 
        id, discord_id, osrs_nickname, wom_player_id, wom_rank,
        ehp, ehb, is_primary, last_synced_at, created_at
      FROM osrs_accounts
      WHERE id = $1 AND discord_id = $2
    `, [parseInt(accountId), discordId]);
        if (!osrsAccount) {
            return res.status(404).json({
                status: 'error',
                message: 'OSRS account not found'
            });
        }
        // Check if the account has a WOM player ID
        if (!osrsAccount.wom_player_id) {
            return res.status(200).json({
                status: 'success',
                data: {
                    osrs_account: {
                        id: osrsAccount.id,
                        osrs_nickname: osrsAccount.osrs_nickname
                    },
                    snapshots: [],
                    message: 'This OSRS account has no WiseOldMan ID linked'
                }
            });
        }
        // Get player snapshots for the last N days, grouped by date
        const snapshots = await db.query(`
      SELECT 
        id,
        player_id,
        username,
        display_name,
        snapshot_date,
        total_exp,
        total_level,
        combat_level,
        ehp,
        ehb,
        ttm,
        tt200m,
        updated_at,
        last_changed_at
      FROM player_snapshots
      WHERE player_id = $1
        AND snapshot_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY snapshot_date DESC
    `, [osrsAccount.wom_player_id]);
        if (snapshots.length === 0) {
            return res.status(200).json({
                status: 'success',
                data: {
                    osrs_account: {
                        id: osrsAccount.id,
                        osrs_nickname: osrsAccount.osrs_nickname,
                        wom_player_id: osrsAccount.wom_player_id
                    },
                    snapshots: [],
                    message: `No snapshots found for the last ${days} days`
                }
            });
        }
        // Get snapshot IDs for querying related tables
        const snapshotIds = snapshots.map(s => s.id);
        // Fetch related data in parallel if requested
        // Note: Bosses and activities are now tracked via RuneLite SYNC system (osrs_account_killcounts)
        // We only fetch skills and computed metrics from WOM snapshots
        const [skillsData, computedData] = await Promise.all([
            includeSkills ? db.query(`
        SELECT 
          player_snapshot_id,
          skill,
          experience,
          level,
          rank,
          ehp
        FROM player_skills_snapshots
        WHERE player_snapshot_id = ANY($1)
        ORDER BY player_snapshot_id, skill
      `, [snapshotIds]) : Promise.resolve([]),
            includeComputed ? db.query(`
        SELECT 
          player_snapshot_id,
          metric,
          value,
          rank
        FROM player_computed_snapshots
        WHERE player_snapshot_id = ANY($1)
        ORDER BY player_snapshot_id, metric
      `, [snapshotIds]) : Promise.resolve([])
        ]);
        // Group related data by snapshot_id for efficient lookup
        const skillsBySnapshot = new Map();
        const computedBySnapshot = new Map();
        if (includeSkills) {
            for (const skill of skillsData) {
                if (!skillsBySnapshot.has(skill.player_snapshot_id)) {
                    skillsBySnapshot.set(skill.player_snapshot_id, []);
                }
                skillsBySnapshot.get(skill.player_snapshot_id).push({
                    skill: skill.skill,
                    experience: skill.experience,
                    level: skill.level,
                    rank: skill.rank,
                    ehp: skill.ehp
                });
            }
        }
        if (includeComputed) {
            for (const computed of computedData) {
                if (!computedBySnapshot.has(computed.player_snapshot_id)) {
                    computedBySnapshot.set(computed.player_snapshot_id, []);
                }
                computedBySnapshot.get(computed.player_snapshot_id).push({
                    metric: computed.metric,
                    value: computed.value,
                    rank: computed.rank
                });
            }
        }
        // Build the response with grouped data
        const groupedSnapshots = snapshots.map(snapshot => {
            const result = {
                snapshot_date: snapshot.snapshot_date,
                player: {
                    username: snapshot.username,
                    display_name: snapshot.display_name,
                    total_exp: snapshot.total_exp,
                    total_level: snapshot.total_level,
                    combat_level: snapshot.combat_level,
                    ehp: snapshot.ehp,
                    ehb: snapshot.ehb,
                    ttm: snapshot.ttm,
                    tt200m: snapshot.tt200m,
                    updated_at: snapshot.updated_at,
                    last_changed_at: snapshot.last_changed_at
                }
            };
            if (includeSkills) {
                result.skills = skillsBySnapshot.get(snapshot.id) || [];
            }
            if (includeComputed) {
                result.computed = computedBySnapshot.get(snapshot.id) || [];
            }
            return result;
        });
        // Calculate summary statistics
        const oldestSnapshot = snapshots[snapshots.length - 1];
        const newestSnapshot = snapshots[0];
        const totalExpGained = newestSnapshot.total_exp - oldestSnapshot.total_exp;
        const totalLevelsGained = newestSnapshot.total_level - oldestSnapshot.total_level;
        const ehpGained = parseFloat(newestSnapshot.ehp) - parseFloat(oldestSnapshot.ehp);
        const ehbGained = parseFloat(newestSnapshot.ehb) - parseFloat(oldestSnapshot.ehb);
        return res.status(200).json({
            status: 'success',
            data: {
                osrs_account: {
                    id: osrsAccount.id,
                    osrs_nickname: osrsAccount.osrs_nickname,
                    wom_player_id: osrsAccount.wom_player_id,
                    wom_rank: osrsAccount.wom_rank
                },
                summary: {
                    period_days: days,
                    snapshots_count: snapshots.length,
                    date_range: {
                        oldest: oldestSnapshot.snapshot_date,
                        newest: newestSnapshot.snapshot_date
                    },
                    gains: {
                        total_exp: totalExpGained,
                        total_levels: totalLevelsGained,
                        ehp: ehpGained.toFixed(2),
                        ehb: ehbGained.toFixed(2)
                    }
                },
                snapshots: groupedSnapshots
            }
        });
    }
    catch (error) {
        console.error('Error fetching member snapshots:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch snapshot data'
        });
    }
});
export default router;
