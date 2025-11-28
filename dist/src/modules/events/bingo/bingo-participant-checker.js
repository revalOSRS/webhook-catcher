/**
 * Bingo Participant Checker
 * Checks if a player is participating in an active bingo event
 */
import { query } from '../../../db/connection.js';
/**
 * Check if a player (by OSRS account ID or player name) is in an active bingo event
 */
export async function isPlayerInActiveBingoEvent(osrsAccountId, playerName) {
    try {
        if (!osrsAccountId && !playerName) {
            return false;
        }
        let accountId = osrsAccountId;
        // If we only have player name, look up the account ID
        if (!accountId && playerName) {
            const accounts = await query('SELECT id FROM osrs_accounts WHERE osrs_nickname = $1 LIMIT 1', [playerName]);
            if (accounts.length === 0) {
                return false;
            }
            accountId = accounts[0].id;
        }
        if (!accountId) {
            return false;
        }
        // Check if this OSRS account is part of a team in an active bingo event
        const result = await query(`
      SELECT COUNT(*) as count
      FROM event_team_members etm
      JOIN event_teams et ON etm.team_id = et.id
      JOIN events e ON et.event_id = e.id
      WHERE etm.osrs_account_id = $1
        AND e.event_type = 'bingo'
        AND e.status = 'active'
        AND (e.start_date IS NULL OR e.start_date <= NOW())
        AND (e.end_date IS NULL OR e.end_date > NOW())
    `, [accountId]);
        return parseInt(result[0].count) > 0;
    }
    catch (error) {
        console.error('[BingoParticipantChecker] Error checking if player is in active bingo:', error);
        return false;
    }
}
