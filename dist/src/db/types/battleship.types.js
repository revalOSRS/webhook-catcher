/**
 * Battleship Bingo Game System Types
 *
 * Comprehensive event management system for Battleship Bingo competitions.
 * This is a complex, well-designed system that combines:
 * - Traditional bingo (completing tiles on a board)
 * - Battleship (placing ships, bombing enemy tiles)
 * - OSRS tasks (tiles contain OSRS challenges)
 *
 * Key features:
 * - Team-based competition
 * - Task progression tracking
 * - Buffs/debuffs system
 * - Comprehensive audit logging
 * - Ship placement and bombing mechanics
 *
 * Related tables:
 * - game_events (parent table for all events)
 * - battleship_bingo_events (specific battleship config)
 * - teams (competing teams)
 * - team_members (players in each team)
 * - battleship_bingo_ships (ship placements)
 * - battleship_bingo_tiles (board tiles/tasks)
 * - battleship_bingo_tile_progress (player progress on tiles)
 * - battleship_bingo_active_effects (active buffs/debuffs)
 * - battleship_bingo_bomb_actions (bombing history)
 * - event_log (audit trail)
 *
 * Design: ✅ Excellent - Very well thought out, comprehensive state tracking
 */
export {};
