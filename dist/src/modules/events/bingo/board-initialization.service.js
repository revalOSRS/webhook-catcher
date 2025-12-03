/**
 * Board Initialization Service
 * Handles automatic board creation for teams when bingo events are activated
 */
import { query } from '../../../db/connection.js';
/**
 * Service for initializing bingo boards when events are activated.
 * Creates team-specific copies of the event's board configuration.
 */
export class BoardInitializationService {
    /**
     * Initializes bingo boards for all teams in an event.
     *
     * This is called when an event is activated. It:
     * 1. Fetches the event's bingo board configuration from `events.config.board`
     * 2. Gets all teams registered for this event
     * 3. Creates a copy of the board for each team (with tiles and effects)
     *
     * Teams that already have a board are skipped. Errors for individual teams
     * don't stop processing of other teams.
     */
    initializeBoardsForEvent = async (eventId) => {
        const events = await query('SELECT config FROM events WHERE id = $1', [eventId]);
        if (events.length === 0) {
            throw new Error(`Event ${eventId} not found`);
        }
        const boardConfig = events[0].config?.board || {};
        const teams = await query('SELECT id, name FROM event_teams WHERE event_id = $1', [eventId]);
        if (teams.length === 0) {
            return;
        }
        for (const team of teams) {
            try {
                await this.createBoardForTeam(eventId, team.id, boardConfig);
            }
            catch (error) {
                console.error(`[BoardInit] Failed to create board for team ${team.name}:`, error);
            }
        }
    };
    /**
     * Creates a board for a specific team from the board configuration.
     *
     * The process:
     * 1. Check if board already exists for this team (skip if so)
     * 2. Create the `bingo_boards` record with size and metadata
     * 3. Copy all tiles from the config to `bingo_board_tiles`
     * 4. Copy row effects to `bingo_board_line_effects` (type: 'row')
     * 5. Copy column effects to `bingo_board_line_effects` (type: 'column')
     * 6. Copy tile effects to `bingo_board_tile_effects`
     *
     * All inserts use ON CONFLICT DO NOTHING to handle duplicates gracefully.
     */
    createBoardForTeam = async (eventId, teamId, boardConfig) => {
        // Skip if board already exists
        const existing = await query('SELECT id FROM bingo_boards WHERE event_id = $1 AND team_id = $2', [eventId, teamId]);
        if (existing.length > 0) {
            return;
        }
        // Build board metadata
        const boardMetadata = {
            showTileEffects: boardConfig.metadata?.showTileEffects ?? true,
            showRowEffects: boardConfig.metadata?.showRowEffects ?? true,
            showColumnEffects: boardConfig.metadata?.showColumnEffects ?? true
        };
        // Create board
        const boardResult = await query(`
      INSERT INTO bingo_boards (event_id, team_id, columns, rows, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
            eventId,
            teamId,
            boardConfig.columns || 7,
            boardConfig.rows || 7,
            JSON.stringify(boardMetadata)
        ]);
        if (!boardResult?.length) {
            throw new Error('Failed to create board - no result returned');
        }
        const boardId = boardResult[0].id;
        // Create tiles
        const tileCount = boardConfig.tiles?.length || 0;
        await this.createTiles(boardId, boardConfig.tiles);
        // Create line effects (rows and columns)
        const rowEffectCount = boardConfig.rowEffects?.length || 0;
        const columnEffectCount = boardConfig.columnEffects?.length || 0;
        await this.createRowEffects(boardId, boardConfig.rowEffects);
        await this.createColumnEffects(boardId, boardConfig.columnEffects);
        // Create tile effects
        const tileEffectCount = boardConfig.tileEffects?.length || 0;
        await this.createTileEffects(boardId, boardConfig.tileEffects);
        console.log(`[BoardInit] Created board ${boardId}: ${tileCount} tiles, ${rowEffectCount} row effects, ${columnEffectCount} column effects, ${tileEffectCount} tile effects`);
    };
    /**
     * Creates board tiles from the tile configuration.
     *
     * Each tile reference in the config points to a tile in the `bingo_tiles` library.
     * We validate that the tile exists before inserting. Position conflicts are ignored.
     */
    createTiles = async (boardId, tiles) => {
        if (!tiles?.length) {
            return;
        }
        for (const tile of tiles) {
            if (!tile.tileId || !tile.position) {
                continue;
            }
            // Verify tile exists in library
            const tileExists = await query('SELECT id FROM bingo_tiles WHERE id = $1', [tile.tileId]);
            if (tileExists.length === 0) {
                continue;
            }
            await query(`
        INSERT INTO bingo_board_tiles (board_id, tile_id, position, metadata)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (board_id, position) DO NOTHING
      `, [boardId, tile.tileId, tile.position, JSON.stringify(tile.metadata || {})]);
        }
    };
    /**
     * Creates row effects (buffs/debuffs) for the board.
     *
     * Row effects apply to all tiles in a specific row (identified by row number).
     * Effects are linked via `buffDebuffId` to the buffs/debuffs table.
     *
     * Supports both:
     * - { rowNumber: 1, buffDebuffId: "..." } (legacy/current format)
     * - { lineIdentifier: "1", buffDebuffId: "..." } (new unified format)
     */
    createRowEffects = async (boardId, effects) => {
        if (!effects?.length) {
            return;
        }
        for (const effect of effects) {
            // Support both rowNumber and lineIdentifier
            const lineIdentifier = effect.lineIdentifier ?? effect.rowNumber?.toString();
            if (!lineIdentifier)
                continue;
            // Verify the buff/debuff exists
            const buffExists = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [effect.buffDebuffId]);
            if (buffExists.length === 0) {
                console.warn(`[BoardInit] Row effect buff/debuff not found: ${effect.buffDebuffId}`);
                continue;
            }
            await query(`
        INSERT INTO bingo_board_line_effects (
          board_id, line_type, line_identifier, buff_debuff_id,
          applied_by, is_active, applied_at, expires_at, metadata
        )
        VALUES ($1, 'row', $2, $3, NULL, $4, CURRENT_TIMESTAMP, $5, $6)
        ON CONFLICT (board_id, line_type, line_identifier, buff_debuff_id) DO NOTHING
      `, [
                boardId,
                lineIdentifier,
                effect.buffDebuffId,
                effect.isActive !== false,
                effect.expiresAt || null,
                JSON.stringify(effect.metadata || {})
            ]);
            console.log(`[BoardInit] Created row effect: row ${lineIdentifier} -> ${effect.buffDebuffId}`);
        }
    };
    /**
     * Creates column effects (buffs/debuffs) for the board.
     *
     * Column effects apply to all tiles in a specific column (identified by letter A-Z).
     * Effects are linked via `buffDebuffId` to the buffs/debuffs table.
     *
     * Supports both:
     * - { columnLetter: "A", buffDebuffId: "..." } (legacy/current format)
     * - { lineIdentifier: "A", buffDebuffId: "..." } (new unified format)
     */
    createColumnEffects = async (boardId, effects) => {
        if (!effects?.length) {
            return;
        }
        for (const effect of effects) {
            // Support both columnLetter and lineIdentifier
            const lineIdentifier = effect.lineIdentifier ?? effect.columnLetter;
            if (!lineIdentifier)
                continue;
            // Verify the buff/debuff exists
            const buffExists = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [effect.buffDebuffId]);
            if (buffExists.length === 0) {
                console.warn(`[BoardInit] Column effect buff/debuff not found: ${effect.buffDebuffId}`);
                continue;
            }
            await query(`
        INSERT INTO bingo_board_line_effects (
          board_id, line_type, line_identifier, buff_debuff_id,
          applied_by, is_active, applied_at, expires_at, metadata
        )
        VALUES ($1, 'column', $2, $3, NULL, $4, CURRENT_TIMESTAMP, $5, $6)
        ON CONFLICT (board_id, line_type, line_identifier, buff_debuff_id) DO NOTHING
      `, [
                boardId,
                lineIdentifier,
                effect.buffDebuffId,
                effect.isActive !== false,
                effect.expiresAt || null,
                JSON.stringify(effect.metadata || {})
            ]);
            console.log(`[BoardInit] Created column effect: column ${lineIdentifier} -> ${effect.buffDebuffId}`);
        }
    };
    /**
     * Creates tile-specific effects (buffs/debuffs) for individual tiles.
     *
     * Unlike row/column effects, these apply to a single tile only.
     * First fetches all board tiles to map positions to tile IDs, then
     * creates effects for each configured tile position.
     */
    createTileEffects = async (boardId, effects) => {
        if (!effects?.length) {
            return;
        }
        // Build position → board_tile_id map
        const boardTiles = await query('SELECT id, position FROM bingo_board_tiles WHERE board_id = $1', [boardId]);
        const positionToTileId = new Map(boardTiles.map(t => [t.position, t.id]));
        for (const effect of effects) {
            // Support both 'position' (type definition) and 'tilePosition' (legacy config format)
            const position = effect.position || effect.tilePosition;
            const tileId = positionToTileId.get(position);
            if (!tileId) {
                console.warn(`[BoardInit] Tile effect position not found: ${position}`);
                continue;
            }
            // Verify the buff/debuff exists
            const buffExists = await query('SELECT id FROM bingo_buffs_debuffs WHERE id = $1', [effect.buffDebuffId]);
            if (buffExists.length === 0) {
                console.warn(`[BoardInit] Tile effect buff/debuff not found: ${effect.buffDebuffId}`);
                continue;
            }
            await query(`
        INSERT INTO bingo_board_tile_effects (
          board_tile_id, buff_debuff_id, applied_by, is_active, applied_at, expires_at, metadata
        )
        VALUES ($1, $2, NULL, $3, CURRENT_TIMESTAMP, $4, $5)
        ON CONFLICT (board_tile_id, buff_debuff_id) DO NOTHING
      `, [
                tileId,
                effect.buffDebuffId,
                effect.isActive !== false,
                effect.expiresAt || null,
                JSON.stringify(effect.metadata || {})
            ]);
            console.log(`[BoardInit] Created tile effect: ${position} -> ${effect.buffDebuffId}`);
        }
    };
}
