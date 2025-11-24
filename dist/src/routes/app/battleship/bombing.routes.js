import { Router } from 'express';
import * as battleshipService from '../../../db/services/battleship.service.js';
import { query } from '../../../db/connection.js';
const router = Router();
// Execute a bomb attack
router.post('/', async (req, res) => {
    try {
        const { event_id, bombing_team_id, target_coordinate, bombed_by_discord_id } = req.body;
        if (!event_id || !bombing_team_id || !target_coordinate || !bombed_by_discord_id) {
            return res.status(400).json({
                status: 'error',
                message: 'event_id, bombing_team_id, target_coordinate, and bombed_by_discord_id are required'
            });
        }
        // Check if team has bombs remaining
        const team = await battleshipService.getTeamById(bombing_team_id);
        if (!team) {
            return res.status(404).json({
                status: 'error',
                message: 'Team not found'
            });
        }
        if (team.bombs_remaining <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No bombs remaining for this team'
            });
        }
        // Get the tile at the target coordinate
        const tile = await battleshipService.getTileByCoordinate(event_id, target_coordinate);
        if (!tile) {
            return res.status(404).json({
                status: 'error',
                message: 'Target coordinate not found'
            });
        }
        // Check if tile is already bombed
        if (tile.is_bombed) {
            return res.status(400).json({
                status: 'error',
                message: 'This tile has already been bombed'
            });
        }
        // Check if it's the team's own tile
        if (tile.claimed_by_team_id === bombing_team_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot bomb your own team\'s tile'
            });
        }
        // Check if there's a ship at this coordinate
        const ship = await battleshipService.checkShipAtCoordinate(event_id, target_coordinate);
        let result = 'miss';
        let pointsAwarded = 0;
        let shipId = null;
        if (ship) {
            // Hit!
            result = 'hit';
            pointsAwarded = 100; // Base points for hitting a ship
            shipId = ship.id;
            // Damage the ship
            const damagedShip = await battleshipService.damageShip(ship.id);
            if (damagedShip && damagedShip.is_sunk) {
                result = 'sunk_ship';
                pointsAwarded = 500; // Bonus for sinking a ship
            }
            // Mark tile as bombed
            await battleshipService.markTileBombed(tile.id, bombing_team_id);
        }
        else {
            // Miss - check if tile is claimed
            if (tile.claimed_by_team_id) {
                // Still mark as bombed, but no points
                await battleshipService.markTileBombed(tile.id, bombing_team_id);
            }
        }
        // Record the bomb action
        const bombAction = await battleshipService.executeBombAction({
            event_id,
            bombing_team_id,
            target_coordinate,
            bombed_by_discord_id,
            result,
            ship_id: shipId,
            points_awarded: pointsAwarded,
            metadata: {
                tile_id: tile.id,
                tile_status: tile.status
            }
        });
        // Award points to bombing team
        if (pointsAwarded > 0) {
            await battleshipService.updateTeamScore(bombing_team_id, pointsAwarded);
        }
        // Decrement bombs remaining
        await query('UPDATE teams SET bombs_remaining = bombs_remaining - 1 WHERE id = $1', [bombing_team_id]);
        // Log the action
        await battleshipService.logEventAction({
            event_id,
            action_type: 'bomb_fired',
            actor_discord_id: bombed_by_discord_id,
            team_id: bombing_team_id,
            details: {
                target_coordinate,
                result,
                points_awarded: pointsAwarded,
                ship_id: shipId
            }
        });
        res.status(200).json({
            status: 'success',
            data: {
                bomb_action: bombAction,
                result,
                points_awarded: pointsAwarded,
                message: result === 'hit'
                    ? 'Direct hit!'
                    : result === 'sunk_ship'
                        ? 'Ship sunk!'
                        : 'Miss!'
            }
        });
    }
    catch (error) {
        console.error('Error executing bomb:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to execute bomb attack'
        });
    }
});
// Get bomb history for an event
router.get('/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const bombActions = await query(`SELECT ba.*, t.name as team_name, t.color as team_color
       FROM battleship_bingo_bomb_actions ba
       JOIN teams t ON t.id = ba.bombing_team_id
       WHERE ba.event_id = $1
       ORDER BY ba.bombed_at DESC
       LIMIT 100`, [eventId]);
        res.status(200).json({
            status: 'success',
            data: bombActions,
            count: bombActions.length
        });
    }
    catch (error) {
        console.error('Error fetching bomb history:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch bomb history'
        });
    }
});
// Get bomb history for a team
router.get('/team/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        const bombActions = await query(`SELECT * FROM battleship_bingo_bomb_actions
       WHERE bombing_team_id = $1
       ORDER BY bombed_at DESC
       LIMIT 50`, [teamId]);
        res.status(200).json({
            status: 'success',
            data: bombActions,
            count: bombActions.length
        });
    }
    catch (error) {
        console.error('Error fetching team bomb history:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch team bomb history'
        });
    }
});
export default router;
