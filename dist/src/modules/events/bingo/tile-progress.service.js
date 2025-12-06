/**
 * Tile Progress Service
 *
 * Main service for tracking bingo tile progress from game events.
 *
 * Flow:
 * 1. Dink webhook sends game events (drops, kills, etc.)
 * 2. Event is adapted to a unified format
 * 3. Player's active team memberships are looked up
 * 4. Matching board tiles are found and progress is calculated
 * 5. Database is updated and Discord notifications are sent
 */
import { query } from '../../../db/connection.js';
import { adaptDinkEvent } from './adapters/dink.adapter.js';
import { matchesRequirement } from './matchers/requirement-matcher.js';
import { calculateItemDropProgress } from './calculators/item-drop.calculator.js';
import { calculatePetProgress } from './calculators/pet.calculator.js';
import { calculateValueDropProgress } from './calculators/value-drop.calculator.js';
import { calculateSpeedrunProgress } from './calculators/speedrun.calculator.js';
import { calculateBaGamblesProgress } from './calculators/ba-gambles.calculator.js';
import { calculateExperienceProgress } from './calculators/experience.calculator.js';
import { calculateChatProgress } from './calculators/chat.calculator.js';
import { calculatePuzzleProgress } from './calculators/puzzle.calculator.js';
import { DiscordNotificationsService } from './discord-notifications.service.js';
import { EffectsService } from './effects.service.js';
import { getRequirementProgress, createEmptyTileProgress, getCompletedTiers } from './types/bingo-requirements.type.js';
import { BingoTileMatchType, BingoTileRequirementType } from './types/bingo-requirements.type.js';
import { BingoTileCompletionType } from './types/bingo-tile-completion-type.type.js';
/**
 * Service for tracking bingo tile progress from game events.
 *
 * This service is the core of the bingo progress tracking system. It:
 * - Receives game events from the Dink webhook
 * - Finds all tiles that could be affected by the event
 * - Calculates new progress values based on requirement type
 * - Updates the database with new progress
 * - Sends Discord notifications for completions
 *
 * Progress is tracked at the team level, not individual player level,
 * meaning all team members contribute to the same tile progress.
 */
export class TileProgressService {
    /**
     * Main entry point for processing Dink webhook events.
     *
     * Converts the Dink event to a unified format and processes it.
     * Returns early if the event type is not supported for bingo tracking.
     *
     * @param dinkEvent - Raw event from Dink webhook
     */
    processDinkEvent = async (dinkEvent) => {
        const unifiedEvent = await adaptDinkEvent(dinkEvent);
        if (!unifiedEvent)
            return;
        await this.processUnifiedEvent(unifiedEvent);
    };
    /**
     * Process a unified game event and update progress for all matching tiles.
     *
     * For each tile owned by teams the player is on:
     * 1. Check if the event matches the tile's requirements
     * 2. Skip if tile is already fully completed
     * 3. Calculate and persist new progress
     *
     * @param event - Unified event with normalized data structure
     */
    processUnifiedEvent = async (event) => {
        const boardTiles = await this.getActiveBoardTilesForPlayer(event);
        if (boardTiles.length === 0)
            return;
        for (const tile of boardTiles) {
            if (!matchesRequirement(event, tile.requirements))
                continue;
            const existingProgress = await this.getExistingProgress(tile.id);
            if (this.shouldSkipTile(tile, existingProgress))
                continue;
            await this.updateTileProgress(event, tile, existingProgress);
        }
    };
    /**
     * Determine if a tile should be skipped (already completed).
     *
     * Logic:
     * - If no existing progress, use tile's is_completed flag
     * - If tile has tiered requirements, only skip if ALL tiers are done
     * - For non-tiered tiles, skip if the tile is completed
     *
     * @param tile - The board tile being checked
     * @param existingProgress - Current progress record, if any
     * @returns true if tile should be skipped
     */
    shouldSkipTile = (tile, existingProgress) => {
        if (!existingProgress)
            return tile.isCompleted;
        // If tile is completed, check if there are incomplete tiers we should still track
        if (existingProgress.completedAt) {
            const hasTiers = tile.requirements.tiers && tile.requirements.tiers.length > 0;
            if (hasTiers) {
                const completedTierCount = getCompletedTiers(existingProgress.progressMetadata).length;
                return completedTierCount >= tile.requirements.tiers.length;
            }
            return true;
        }
        return false;
    };
    /**
     * Find all active board tiles for a player based on their team memberships.
     *
     * Query flow:
     * 1. Look up OSRS account ID from player name if not provided
     * 2. Find all teams the player is on in active events
     * 3. Get all incomplete tiles (plus completed tiles with incomplete tiers)
     *
     * @param event - Unified game event containing player info
     * @returns Array of board tiles the player can contribute to
     */
    getActiveBoardTilesForPlayer = async (event) => {
        let osrsAccountId = event.osrsAccountId;
        if (!osrsAccountId && event.playerName) {
            const accounts = await query('SELECT id FROM osrs_accounts WHERE osrs_nickname = $1 LIMIT 1', [event.playerName]);
            osrsAccountId = accounts[0]?.id;
        }
        if (!osrsAccountId)
            return [];
        // Get team memberships for active events (all times in UTC)
        // start_date is REQUIRED and must have passed for tile progress to be tracked
        const memberships = await query(`
      SELECT DISTINCT et.id as team_id, e.id as event_id, e.start_date as event_start_date
      FROM event_team_members etm
      JOIN event_teams et ON etm.team_id = et.id
      JOIN events e ON et.event_id = e.id
      WHERE etm.osrs_account_id = $1
        AND e.status = 'active'
        AND e.start_date IS NOT NULL
        AND e.start_date <= NOW()
        AND (e.end_date IS NULL OR e.end_date > NOW())
    `, [osrsAccountId]);
        if (memberships.length === 0)
            return [];
        const teamIds = memberships.map(m => m.teamId);
        // Get board tiles for these teams
        // Include completed tiles with tiers so we can track incomplete tier progress
        const tiles = await query(`
      SELECT
        bbt.id, bbt.position, bbt.is_completed,
        bbt.board_id, bbt.tile_id,
        bb.team_id, bt.requirements, bt.task as tile_task,
        e.name as event_name, et.name as team_name
      FROM bingo_board_tiles bbt
      JOIN bingo_boards bb ON bbt.board_id = bb.id
      JOIN bingo_tiles bt ON bbt.tile_id = bt.id
      JOIN events e ON bb.event_id = e.id
      JOIN event_teams et ON bb.team_id = et.id
      WHERE bb.team_id = ANY($1::uuid[])
        AND (bbt.is_completed = false
          OR (bt.requirements->'tiers' IS NOT NULL
            AND jsonb_array_length(bt.requirements->'tiers') > 0))
    `, [teamIds]);
        return tiles.map((tile) => {
            const membership = memberships.find(m => m.teamId === tile.teamId);
            return {
                id: tile.id,
                boardId: tile.boardId,
                tileId: tile.tileId,
                position: tile.position,
                isCompleted: tile.isCompleted,
                teamId: tile.teamId,
                eventId: membership?.eventId || '',
                eventStartDate: membership?.eventStartDate || new Date(),
                requirements: tile.requirements,
                tileTask: tile.tileTask,
                eventName: tile.eventName,
                teamName: tile.teamName
            };
        });
    };
    /**
     * Update tile progress for an event.
     *
     * This is the main progress update flow:
     * 1. Calculate new progress based on requirement type
     * 2. Determine if a single player completed it (for attribution)
     * 3. Persist to database (insert or update)
     * 4. Mark tile as completed if all requirements met
     * 5. Award cumulative points to team (base + tier points)
     * 6. Send Discord notification for new completions
     *
     * @param event - The game event being processed
     * @param tile - The tile to update
     * @param existingProgress - Current progress, if any
     */
    updateTileProgress = async (event, tile, existingProgress) => {
        const memberId = event.osrsAccountId
            ? await this.getMemberIdFromOsrsAccount(event.osrsAccountId, tile.teamId)
            : undefined;
        const updatedProgress = await this.calculateProgress(event, tile.requirements, existingProgress, tile.eventStartDate, memberId, event.osrsAccountId, event.playerName, tile.eventId);
        const completedByOsrsAccountId = this.getCompletedByAccountId(updatedProgress, existingProgress);
        // Upsert progress
        if (existingProgress) {
            await this.updateProgress(tile.id, updatedProgress, completedByOsrsAccountId);
        }
        else {
            await this.insertProgress(tile.id, updatedProgress, completedByOsrsAccountId);
        }
        // Check for tile completion
        const wasCompleted = tile.isCompleted;
        const isTileCompleted = this.determineTileCompletion(tile.requirements, updatedProgress);
        if (isTileCompleted && !wasCompleted) {
            await this.markTileCompleted(tile.id, completedByOsrsAccountId);
        }
        // Award points for newly completed tiers and get the amount
        const pointsAwarded = await this.awardTierPoints(tile, existingProgress, updatedProgress, wasCompleted, isTileCompleted);
        await this.sendNotificationIfNeeded(event, tile, existingProgress, updatedProgress, isTileCompleted, wasCompleted, pointsAwarded);
    };
    /**
     * Award cumulative points to team for newly completed tiers.
     *
     * Points calculation:
     * - If tile is first-time completed: base points + all completed tier points
     * - If tile was already complete: only award NEW tier points
     *
     * When completing a higher tier, lower tiers are auto-completed,
     * so all their points are awarded together.
     *
     * Example: base=10, tier1=2, tier2=2
     * - Completing tier 1: 10 + 2 = 12 points
     * - Later completing tier 2: 2 more points
     * - Directly completing tier 2 (auto-completes tier 1): 10 + 2 + 2 = 14 points
     *
     * @returns The number of points awarded
     */
    awardTierPoints = async (tile, existingProgress, updatedProgress, wasCompleted, isTileCompleted) => {
        const previousTiers = getCompletedTiers(existingProgress?.progressMetadata);
        const currentTiers = updatedProgress.progressMetadata.completedTiers || updatedProgress.completedTiers || [];
        const previousTierNumbers = previousTiers.map(t => t.tier);
        const currentTierNumbers = currentTiers.map(t => t.tier);
        // Find newly completed tiers (including auto-completed lower tiers)
        const newlyCompletedTiers = currentTierNumbers.filter(t => !previousTierNumbers.includes(t));
        if (newlyCompletedTiers.length === 0 && !(isTileCompleted && !wasCompleted)) {
            return 0; // No new completions, no points to award
        }
        let pointsToAward = 0;
        // If this is the first completion of the tile, add base points
        if (isTileCompleted && !wasCompleted) {
            const tileBasePoints = await this.getTileBasePoints(tile.tileId);
            pointsToAward += tileBasePoints;
        }
        // Add points for newly completed tiers
        if (tile.requirements.tiers && newlyCompletedTiers.length > 0) {
            for (const tierNum of newlyCompletedTiers) {
                const tier = tile.requirements.tiers.find(t => t.tier === tierNum);
                if (tier?.points) {
                    pointsToAward += tier.points;
                }
            }
        }
        // Award points to team
        if (pointsToAward > 0) {
            await this.awardPointsToTeam(tile.teamId, pointsToAward);
        }
        return pointsToAward;
    };
    /**
     * Get the base points for a tile from the bingo_tiles table
     */
    getTileBasePoints = async (tileId) => {
        const result = await query('SELECT points FROM bingo_tiles WHERE id = $1', [tileId]);
        return result[0]?.points || 0;
    };
    /**
     * Award points to a team by incrementing their score
     */
    awardPointsToTeam = async (teamId, points) => {
        await query('UPDATE event_teams SET score = score + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [points, teamId]);
    };
    /**
     * Determine which OSRS account completed the tile (for attribution).
     *
     * We track this so we can show "completed by Player X" in the UI.
     * Only set if a single player completed the requirement (not a team effort).
     *
     * @param updatedProgress - New progress after this event
     * @param existingProgress - Previous progress state
     * @returns OSRS account ID of the completer, or null
     */
    getCompletedByAccountId = (updatedProgress, existingProgress) => {
        if (existingProgress?.completedByOsrsAccountId) {
            return existingProgress.completedByOsrsAccountId;
        }
        // Check if only one player has contributed
        // For PUZZLE types, get contributions from the hidden metadata
        let contributions;
        if (updatedProgress.progressMetadata.requirementType === BingoTileRequirementType.PUZZLE) {
            const puzzleMeta = updatedProgress.progressMetadata;
            contributions = puzzleMeta.hiddenProgressMetadata?.playerContributions;
        }
        else {
            contributions = updatedProgress.progressMetadata.playerContributions;
        }
        if (contributions?.length === 1 && updatedProgress.isCompleted) {
            return contributions[0].osrsAccountId;
        }
        return null;
    };
    /**
     * Determine if a tile is completed based on requirements and progress.
     *
     * Completion logic:
     * - matchType "all": ALL requirements must be completed
     * - matchType "any": ANY single requirement being complete is sufficient
     * - Tiers: At least one tier must be complete
     * - Both base requirements AND tiers: EITHER can complete the tile
     *
     * @param requirements - Tile requirement configuration
     * @param progress - Current progress result
     * @returns true if tile completion criteria is met
     */
    determineTileCompletion = (requirements, progress) => {
        // Check if any tier is complete
        const completedTiers = progress.completedTiers || progress.progressMetadata.completedTiers;
        const tiersComplete = (completedTiers?.length || 0) > 0;
        // Check base requirements completion
        let baseComplete = false;
        const completedRequirementIndices = progress.tileProgressMetadata?.completedRequirementIndices || [];
        if (requirements.requirements && requirements.requirements.length > 0) {
            if (requirements.matchType === BingoTileMatchType.ALL) {
                // ALL mode: check if all requirement indices are in the completed list
                baseComplete = completedRequirementIndices.length >= requirements.requirements.length;
            }
            else {
                // ANY mode: just check if isCompleted flag is set (single requirement completed)
                baseComplete = progress.isCompleted;
            }
        }
        else {
            // No base requirements - use isCompleted flag
            baseComplete = progress.isCompleted;
        }
        // Tile is complete if:
        // - Base requirements are complete (if they exist), OR
        // - At least one tier is complete (for tiered tiles)
        if (requirements.tiers && requirements.tiers.length > 0) {
            // If tile has both base requirements and tiers, either can complete it
            if (requirements.requirements && requirements.requirements.length > 0) {
                return baseComplete || tiersComplete;
            }
            // Tier-only tiles: need at least one tier complete
            return tiersComplete;
        }
        // For regular requirements without tiers
        return baseComplete;
    };
    /**
     * Calculate progress for requirements (tiered or regular).
     *
     * Routes to appropriate calculator based on requirement structure:
     * - Tiered requirements: Special handling for tier progression
     * - Regular requirements: Direct calculation for each matching requirement
     *
     * When BOTH tiers and base requirements exist, this method:
     * 1. First checks if event matches any tier and processes tiered progress
     * 2. If no tier matches, checks if event matches base requirements
     *
     * This allows tiles with both base requirements AND tiers to track
     * progress for either type of requirement.
     *
     * @param event - The game event
     * @param requirements - Tile's requirement configuration
     * @param existing - Current progress state
     * @param eventStartDate - Event start (for experience tracking)
     * @param memberId - Team member ID for contribution tracking
     * @param osrsAccountId - OSRS account for attribution
     * @param playerName - Player name for display
     * @param eventId - Event ID for XP snapshot lookup
     * @returns Calculated progress result
     */
    calculateProgress = async (event, requirements, existing, eventStartDate, memberId, osrsAccountId, playerName, eventId) => {
        // Get existing tile-level metadata (for multi-requirement tracking)
        const existingTileMetadata = existing?.progressMetadata || createEmptyTileProgress();
        // Check if event matches any tier
        const matchesTier = requirements.tiers && requirements.tiers.length > 0 &&
            requirements.tiers.some(tier => {
                const tierReq = {
                    matchType: BingoTileMatchType.ALL,
                    requirements: [],
                    tiers: [tier]
                };
                return matchesRequirement(event, tierReq);
            });
        // Check if event matches any base requirement and find its index
        let matchingReqIndex = -1;
        const matchingBaseReq = requirements.requirements?.find((req, index) => {
            const singleReq = {
                matchType: BingoTileMatchType.ALL,
                requirements: [req],
                tiers: []
            };
            if (matchesRequirement(event, singleReq)) {
                matchingReqIndex = index;
                return true;
            }
            return false;
        });
        // PRIORITY: If there are base requirements, check them FIRST.
        // Base requirements completing the tile should take precedence over tier tracking.
        // This ensures tiles with both base and tiers work correctly:
        // e.g., Base: get 1 item (tile done), Tiers: get 2/4 items (bonus points)
        if (matchingBaseReq && matchingReqIndex >= 0) {
            // Get existing tile progress or create empty
            const existingTile = existingTileMetadata;
            // For multi-requirement tiles, get the specific progress for THIS requirement
            // Otherwise the calculator would use the wrong requirement's existing progress
            const existingReqProgress = getRequirementProgress(existingTile, matchingReqIndex);
            const existingForThisReq = existingReqProgress?.progressMetadata
                ? {
                    progressValue: existingReqProgress.progressValue,
                    progressMetadata: existingReqProgress.progressMetadata
                }
                : null;
            const result = await this.calculateRequirementProgress(event, matchingBaseReq, existingForThisReq, // Pass specific requirement's progress, not the whole tile
            eventStartDate, undefined, memberId, osrsAccountId, playerName, eventId);
            // Track which requirements are completed for matchType "all" logic
            // Read from the TILE's existing progress, not the individual requirement
            const completedRequirementIndices = [...new Set([...(existingTile.completedRequirementIndices || [])])];
            // If this requirement is now complete, add its index to the list
            if (result.isCompleted && !completedRequirementIndices.includes(matchingReqIndex)) {
                completedRequirementIndices.push(matchingReqIndex);
            }
            // Preserve existing requirement progress and add/update the current one
            const requirementProgress = { ...existingTile.requirementProgress }; // Clone to preserve others
            requirementProgress[matchingReqIndex] = {
                isCompleted: result.isCompleted,
                progressValue: result.progressValue,
                progressMetadata: result.progressMetadata
            };
            // Build tile-level metadata
            result.tileProgressMetadata = {
                totalRequirements: requirements.requirements?.length || 1,
                completedRequirementIndices,
                requirementProgress
            };
            // For matchType "all", only mark as complete when ALL requirements are done
            if (requirements.matchType === BingoTileMatchType.ALL && requirements.requirements) {
                result.isCompleted = completedRequirementIndices.length >= requirements.requirements.length;
            }
            // If the tile ALSO has tiers and this event matches a tier, process tiered progress too
            // This allows both base completion AND tier bonuses to be tracked
            if (matchesTier && requirements.tiers && requirements.tiers.length > 0) {
                const existingReqForTiers = this.toExistingProgress(existing, 0);
                const tieredResult = await this.calculateTieredProgress(event, requirements, existingReqForTiers, existingTileMetadata, eventStartDate, memberId, osrsAccountId, playerName, eventId);
                // Merge tier info into the result
                result.completedTiers = tieredResult.completedTiers;
                const mergedReqMetadata = {
                    ...result.progressMetadata,
                    completedTiers: tieredResult.completedTiers || tieredResult.progressMetadata.completedTiers,
                    currentTier: tieredResult.progressMetadata.currentTier
                };
                result.progressMetadata = mergedReqMetadata;
                // Also update the tileProgressMetadata with the merged tier info
                if (result.tileProgressMetadata) {
                    result.tileProgressMetadata.requirementProgress[matchingReqIndex] = {
                        ...result.tileProgressMetadata.requirementProgress[matchingReqIndex],
                        progressMetadata: mergedReqMetadata
                    };
                }
            }
            return result;
        }
        // If no base requirement matches but tiers do, process tiered progress
        if (matchesTier && requirements.tiers && requirements.tiers.length > 0) {
            const existingReqForTiers = this.toExistingProgress(existing, 0);
            return this.calculateTieredProgress(event, requirements, existingReqForTiers, existingTileMetadata, eventStartDate, memberId, osrsAccountId, playerName, eventId);
        }
        // No matching requirement found - return existing or empty progress
        return this.buildEmptyProgress(existing, requirements);
    };
    /**
     * Convert BingoTileProgress to ExistingProgress format for calculators.
     * Extracts the first requirement's progress metadata for calculators.
     */
    toExistingProgress = (progress, reqIndex = 0) => {
        if (!progress)
            return null;
        const reqEntry = getRequirementProgress(progress.progressMetadata, reqIndex);
        if (!reqEntry?.progressMetadata)
            return null;
        return {
            progressValue: reqEntry.progressValue,
            progressMetadata: reqEntry.progressMetadata
        };
    };
    /**
     * Build an empty/unchanged progress result preserving existing state
     */
    buildEmptyProgress = (existing, requirements) => {
        if (existing) {
            const firstReqProgress = getRequirementProgress(existing.progressMetadata, 0);
            return {
                progressValue: existing.progressValue,
                progressMetadata: firstReqProgress?.progressMetadata || this.createEmptyRequirementMetadata(BingoTileRequirementType.ITEM_DROP),
                isCompleted: existing.completedAt !== undefined,
                tileProgressMetadata: existing.progressMetadata
            };
        }
        // Determine requirement type from the first available requirement
        const firstReq = requirements.requirements?.[0] || requirements.tiers?.[0]?.requirement;
        const reqType = firstReq?.type || BingoTileRequirementType.ITEM_DROP;
        const totalReqs = requirements.requirements?.length || 1;
        // Create requirement-level metadata
        const requirementData = this.createEmptyRequirementMetadata(reqType);
        // Build tile-level metadata with requirement wrapped
        const tileProgressMetadata = {
            totalRequirements: totalReqs,
            completedRequirementIndices: [],
            requirementProgress: {
                "0": {
                    isCompleted: false,
                    progressValue: 0,
                    progressMetadata: requirementData
                }
            }
        };
        return {
            progressValue: 0,
            progressMetadata: requirementData,
            isCompleted: false,
            tileProgressMetadata
        };
    };
    /**
     * Create empty requirement-level metadata for a given requirement type.
     * This is what calculators would produce for a fresh requirement.
     */
    createEmptyRequirementMetadata = (type) => {
        const base = {
            targetValue: 0,
            lastUpdateAt: new Date().toISOString(),
            playerContributions: []
        };
        switch (type) {
            case BingoTileRequirementType.SPEEDRUN:
                return { ...base, requirementType: type, currentBestTimeSeconds: Infinity, goalSeconds: 0 };
            case BingoTileRequirementType.ITEM_DROP:
                return { ...base, requirementType: type, currentTotalCount: 0 };
            case BingoTileRequirementType.VALUE_DROP:
                return { ...base, requirementType: type, currentBestValue: 0 };
            case BingoTileRequirementType.PET:
                return { ...base, requirementType: type, currentTotalCount: 0 };
            case BingoTileRequirementType.EXPERIENCE:
                return { ...base, requirementType: type, skill: '', currentTotalXp: 0, targetXp: 0 };
            case BingoTileRequirementType.BA_GAMBLES:
                return { ...base, requirementType: type, currentTotalGambles: 0 };
            case BingoTileRequirementType.CHAT:
                return { ...base, requirementType: type, targetCount: 0, currentTotalCount: 0 };
            case BingoTileRequirementType.PUZZLE: {
                const hiddenMetadata = this.createEmptyRequirementMetadata(BingoTileRequirementType.ITEM_DROP);
                return {
                    ...base,
                    requirementType: type,
                    hiddenRequirementType: BingoTileRequirementType.ITEM_DROP,
                    hiddenProgressMetadata: hiddenMetadata,
                    isSolved: false
                };
            }
            default:
                return { ...base, requirementType: BingoTileRequirementType.ITEM_DROP, currentTotalCount: 0 };
        }
    };
    /**
     * Wrap requirement-level metadata with tile-level wrapper fields.
     * This creates the full TileProgressMetadata stored in the database.
     */
    wrapWithTileFields = (requirementData, totalRequirements, completedRequirementIndices = [], requirementProgress = {}) => {
        return {
            ...requirementData,
            totalRequirements,
            completedRequirementIndices,
            requirementProgress
        };
    };
    /**
     * Calculate progress for tiered requirements.
     *
     * Tiered requirements have multiple levels (e.g., Bronze/Silver/Gold).
     * Completing a higher tier automatically completes all lower tiers.
     *
     * Special handling for speedruns vs other types:
     * - Speedruns: Check ALL tiers against current time (lower is better)
     * - Others: Check one tier per event (progress accumulates)
     *
     * @returns Progress result with tier-specific data
     */
    calculateTieredProgress = async (event, requirements, existing, tileMetadata, eventStartDate, memberId, osrsAccountId, playerName, eventId) => {
        // Get completed tiers from the tile-level metadata
        const existingCompletedTiers = getCompletedTiers(tileMetadata);
        const completedTierNumbers = existingCompletedTiers.map(t => t.tier);
        const isSpeedrun = requirements.tiers[0]?.requirement?.type === BingoTileRequirementType.SPEEDRUN;
        if (isSpeedrun) {
            return this.calculateSpeedrunTieredProgress(event, requirements, existing, completedTierNumbers, osrsAccountId, playerName);
        }
        return this.calculateRegularTieredProgress(event, requirements, existing, eventStartDate, completedTierNumbers, memberId, osrsAccountId, playerName, eventId);
    };
    /**
     * Calculate speedrun-specific tiered progress.
     *
     * Speedrun tiers work differently: a single fast time can complete multiple tiers.
     * For example, a 1:30 time might complete Tier 1 (< 2:00), Tier 2 (< 1:45), and Tier 3 (< 1:30).
     *
     * Logic:
     * 1. Verify the event location matches the required boss/raid
     * 2. Sort tiers by goal time (easiest first)
     * 3. For each tier, check if current time qualifies
     * 4. Auto-complete all lower tiers when a higher tier is completed
     *
     * @returns Progress with best time and tier completions
     */
    calculateSpeedrunTieredProgress = async (event, requirements, existing, completedTierNumbers, osrsAccountId, playerName) => {
        const speedrunData = event.data;
        const currentTime = speedrunData.timeSeconds;
        const eventLocation = speedrunData.location?.toLowerCase();
        // Verify location matches
        const firstTierLocation = (requirements.tiers[0]?.requirement).location?.toLowerCase();
        if (eventLocation !== firstTierLocation) {
            if (existing) {
                const reqMeta = existing.progressMetadata;
                return {
                    progressValue: existing.progressValue,
                    progressMetadata: reqMeta || this.createEmptyRequirementMetadata(BingoTileRequirementType.SPEEDRUN),
                    isCompleted: (reqMeta?.completedTiers?.length || 0) > 0
                };
            }
            return this.buildEmptyProgress(null, requirements);
        }
        // Sort tiers by goal time (ascending - easier goals first)
        const sortedTiers = [...requirements.tiers].sort((a, b) => {
            const aGoal = a.requirement.goalSeconds;
            const bGoal = b.requirement.goalSeconds;
            return bGoal - aGoal; // Easier (higher time) first
        });
        // Track best time (lower is better for speedruns)
        const existingBestTime = existing?.progressValue || Infinity;
        const bestTime = Math.min(existingBestTime, currentTime);
        const newCompletedTiers = [...(existing?.progressMetadata?.completedTiers || [])];
        const updatedCompletedNumbers = [...completedTierNumbers];
        for (const tier of sortedTiers) {
            const tierReq = tier.requirement;
            const tierQualifies = bestTime <= tierReq.goalSeconds;
            if (tierQualifies && !updatedCompletedNumbers.includes(tier.tier)) {
                newCompletedTiers.push({
                    tier: tier.tier,
                    completedAt: new Date().toISOString(),
                    completedByOsrsAccountId: osrsAccountId || 0
                });
                updatedCompletedNumbers.push(tier.tier);
                // Auto-complete all lower tiers
                for (const lowerTier of requirements.tiers.filter(t => t.tier < tier.tier)) {
                    if (!updatedCompletedNumbers.includes(lowerTier.tier)) {
                        newCompletedTiers.push({
                            tier: lowerTier.tier,
                            completedAt: new Date().toISOString(),
                            completedByOsrsAccountId: osrsAccountId || 0
                        });
                        updatedCompletedNumbers.push(lowerTier.tier);
                    }
                }
            }
        }
        // Update player contributions
        const existingContributions = existing?.progressMetadata?.playerContributions || [];
        const playerContributions = this.updateSpeedrunContributions(existingContributions, currentTime, osrsAccountId, playerName);
        const targetGoal = sortedTiers[sortedTiers.length - 1]?.requirement?.goalSeconds || 0;
        const progressMetadata = {
            requirementType: BingoTileRequirementType.SPEEDRUN,
            currentBestTimeSeconds: bestTime,
            goalSeconds: targetGoal,
            targetValue: targetGoal,
            lastUpdateAt: new Date().toISOString(),
            completedTiers: newCompletedTiers.length > 0 ? newCompletedTiers : undefined,
            currentTier: updatedCompletedNumbers.length > 0 ? Math.max(...updatedCompletedNumbers) : undefined,
            playerContributions
        };
        // Build tile-level wrapper
        const tileProgressMetadata = {
            totalRequirements: 1,
            completedRequirementIndices: newCompletedTiers.length > 0 ? [0] : [],
            requirementProgress: {
                "0": {
                    isCompleted: newCompletedTiers.length > 0,
                    progressValue: bestTime,
                    progressMetadata
                }
            }
        };
        return {
            progressValue: bestTime,
            progressMetadata,
            isCompleted: newCompletedTiers.length > 0,
            completedTiers: newCompletedTiers,
            tileProgressMetadata
        };
    };
    /**
     * Update speedrun player contributions with a new attempt
     */
    updateSpeedrunContributions = (existing, timeSeconds, osrsAccountId, playerName) => {
        if (!osrsAccountId || !playerName)
            return existing;
        const contributions = [...existing];
        const existingContrib = contributions.find(c => c.osrsAccountId === osrsAccountId);
        const newAttempt = {
            timeSeconds,
            timestamp: new Date().toISOString(),
            osrsAccountId,
            osrsNickname: playerName
        };
        if (existingContrib) {
            existingContrib.bestTimeSeconds = Math.min(existingContrib.bestTimeSeconds || Infinity, timeSeconds);
            existingContrib.attempts = existingContrib.attempts || [];
            existingContrib.attempts.push(newAttempt);
        }
        else {
            contributions.push({
                osrsAccountId,
                osrsNickname: playerName,
                bestTimeSeconds: timeSeconds,
                attempts: [newAttempt]
            });
        }
        return contributions;
    };
    /**
     * Calculate regular (non-speedrun) tiered progress.
     *
     * When a tier is completed:
     * 1. The tile is marked as completed
     * 2. ALL lower tiers are automatically completed
     * 3. Points are cumulative (base + all completed tier points)
     *
     * For example with tiers 1, 2, 3:
     * - Completing tier 2 auto-completes tier 1
     * - Completing tier 3 auto-completes tiers 1 and 2
     *
     * @returns Progress with accumulated values and tier completions
     */
    calculateRegularTieredProgress = async (event, requirements, existing, eventStartDate, completedTierNumbers, memberId, osrsAccountId, playerName, eventId) => {
        const newCompletedTiers = [...(existing?.progressMetadata?.completedTiers || [])];
        const updatedCompletedNumbers = [...completedTierNumbers];
        // Find ANY matching tier to calculate progress
        // We use the HIGHEST tier's requirement for progress calculation since it has the highest target
        let tierResult = null;
        let matchedTier = null;
        // Sort tiers by tier number descending to find highest first
        const sortedTiers = [...requirements.tiers].sort((a, b) => b.tier - a.tier);
        for (const tier of sortedTiers) {
            const tierReq = {
                matchType: BingoTileMatchType.ALL,
                requirements: [],
                tiers: [tier]
            };
            if (!matchesRequirement(event, tierReq))
                continue;
            // Calculate progress using highest matching tier's requirement
            tierResult = await this.calculateRequirementProgress(event, tier.requirement, existing, eventStartDate, tier, memberId, osrsAccountId, playerName, eventId);
            matchedTier = tier;
            break;
        }
        // If no matching tier found, return existing progress
        if (!tierResult || !matchedTier) {
            if (existing) {
                const reqMeta = existing.progressMetadata;
                return {
                    progressValue: existing.progressValue,
                    progressMetadata: reqMeta || this.createEmptyRequirementMetadata(BingoTileRequirementType.ITEM_DROP),
                    isCompleted: (reqMeta?.completedTiers?.length || 0) > 0
                };
            }
            return this.buildEmptyProgress(null, requirements);
        }
        // Check ALL tiers to see which ones are complete with current progress
        // Sort by tier number ascending to check from lowest to highest
        const tiersAscending = [...requirements.tiers].sort((a, b) => a.tier - b.tier);
        // First, check if the MATCHED tier is complete (the one that triggered this calculation)
        const matchedTierComplete = this.isTierComplete(matchedTier.requirement, tierResult.progressValue, tierResult.progressMetadata);
        if (matchedTierComplete && !updatedCompletedNumbers.includes(matchedTier.tier)) {
            // Mark the matched tier as complete
            newCompletedTiers.push({
                tier: matchedTier.tier,
                completedAt: new Date().toISOString(),
                completedByOsrsAccountId: osrsAccountId || 0
            });
            updatedCompletedNumbers.push(matchedTier.tier);
            console.log(`[TileProgress] Tier ${matchedTier.tier} completed with progress ${tierResult.progressValue}`);
            // AUTO-COMPLETE ALL LOWER TIERS
            // When a higher tier is completed, all lower tiers should also be marked complete
            // This is a cascading completion system (e.g., tier 2 complete = tier 1 also complete)
            for (const lowerTier of requirements.tiers.filter(t => t.tier < matchedTier.tier)) {
                if (!updatedCompletedNumbers.includes(lowerTier.tier)) {
                    newCompletedTiers.push({
                        tier: lowerTier.tier,
                        completedAt: new Date().toISOString(),
                        completedByOsrsAccountId: osrsAccountId || 0
                    });
                    updatedCompletedNumbers.push(lowerTier.tier);
                    console.log(`[TileProgress] Tier ${lowerTier.tier} auto-completed (cascading from tier ${matchedTier.tier})`);
                }
            }
        }
        else {
            // Also check other tiers that might be complete with current progress
            // (for cases where progress accumulates across multiple requirements)
            for (const tier of tiersAscending) {
                if (updatedCompletedNumbers.includes(tier.tier))
                    continue;
                const isTierComplete = this.isTierComplete(tier.requirement, tierResult.progressValue, tierResult.progressMetadata);
                if (isTierComplete) {
                    newCompletedTiers.push({
                        tier: tier.tier,
                        completedAt: new Date().toISOString(),
                        completedByOsrsAccountId: osrsAccountId || 0
                    });
                    updatedCompletedNumbers.push(tier.tier);
                    console.log(`[TileProgress] Tier ${tier.tier} completed with progress ${tierResult.progressValue}`);
                }
            }
        }
        // Sort completed tiers by tier number
        newCompletedTiers.sort((a, b) => a.tier - b.tier);
        // Update metadata with tier info
        const updatedMetadata = {
            ...tierResult.progressMetadata,
            completedTiers: newCompletedTiers.length > 0 ? newCompletedTiers : undefined,
            currentTier: updatedCompletedNumbers.length > 0 ? Math.max(...updatedCompletedNumbers) : undefined
        };
        // Build tile-level wrapper
        const tileProgressMetadata = {
            totalRequirements: 1,
            completedRequirementIndices: newCompletedTiers.length > 0 ? [0] : [],
            requirementProgress: {
                "0": {
                    isCompleted: newCompletedTiers.length > 0,
                    progressValue: tierResult.progressValue,
                    progressMetadata: updatedMetadata
                }
            }
        };
        return {
            progressValue: tierResult.progressValue,
            progressMetadata: updatedMetadata,
            isCompleted: newCompletedTiers.length > 0,
            completedTiers: newCompletedTiers,
            tileProgressMetadata
        };
    };
    /**
     * Check if a specific tier is complete based on current progress.
     *
     * Compares progressValue against the tier's requirement target:
     * - ITEM_DROP with totalAmount: progressValue >= totalAmount
     * - ITEM_DROP per-item: each item has met its individual target
     * - EXPERIENCE: progressValue >= target experience
     * - BA_GAMBLES: progressValue >= target gambles
     * - VALUE_DROP: progressValue >= target value
     * - PET: progressValue >= target pet count
     *
     * @param requirement - The tier's requirement definition
     * @param progressValue - Current accumulated progress value
     * @param metadata - Current progress metadata (for per-item tracking)
     * @returns true if the tier's requirement is satisfied
     */
    isTierComplete = (requirement, progressValue, metadata) => {
        switch (requirement.type) {
            case BingoTileRequirementType.ITEM_DROP: {
                const itemReq = requirement;
                // Total amount mode: compare progressValue against totalAmount
                if (itemReq.totalAmount !== undefined) {
                    return progressValue >= itemReq.totalAmount;
                }
                // Per-item mode: need to check each item has met its target
                // This requires looking at the metadata's playerContributions
                const itemMetadata = metadata;
                if (!itemMetadata.playerContributions)
                    return false;
                // Aggregate items across all players
                const itemTotals = {};
                for (const player of itemMetadata.playerContributions) {
                    for (const item of player.items) {
                        itemTotals[item.itemId] = (itemTotals[item.itemId] ?? 0) + item.quantity;
                    }
                }
                // Check each required item meets its target
                for (const reqItem of itemReq.items) {
                    const requiredAmount = reqItem.itemAmount ?? 1;
                    const currentAmount = itemTotals[reqItem.itemId] ?? 0;
                    if (currentAmount < requiredAmount) {
                        return false;
                    }
                }
                return true;
            }
            case BingoTileRequirementType.EXPERIENCE: {
                const expReq = requirement;
                return progressValue >= expReq.experience;
            }
            case BingoTileRequirementType.BA_GAMBLES: {
                const baReq = requirement;
                return progressValue >= baReq.amount;
            }
            case BingoTileRequirementType.VALUE_DROP: {
                const valueReq = requirement;
                return progressValue >= valueReq.value;
            }
            case BingoTileRequirementType.PET: {
                const petReq = requirement;
                return progressValue >= (petReq.amount ?? 1);
            }
            case BingoTileRequirementType.CHAT: {
                const chatReq = requirement;
                return progressValue >= (chatReq.count ?? 1);
            }
            // Speedruns are handled separately in calculateSpeedrunTieredProgress
            case BingoTileRequirementType.SPEEDRUN:
                return false;
            default:
                return false;
        }
    };
    /**
     * Calculate progress for a specific requirement type.
     *
     * Routes to the appropriate calculator based on requirement type:
     * - ITEM_DROP: Count specific items obtained
     * - PET: Track pet drops
     * - VALUE_DROP: Track high-value drops
     * - SPEEDRUN: Track completion times
     * - BA_GAMBLES: Track Barbarian Assault gambles
     * - EXPERIENCE: Track XP gained (relative to event start)
     *
     * @returns Progress value, metadata, and completion status
     */
    calculateRequirementProgress = async (event, requirement, existing, eventStartDate, tier, memberId, osrsAccountId, playerName, eventId) => {
        const req = requirement;
        switch (req.type) {
            case BingoTileRequirementType.ITEM_DROP:
                return calculateItemDropProgress(event, req, existing, memberId, osrsAccountId, playerName);
            case BingoTileRequirementType.PET:
                return calculatePetProgress(event, req, existing, memberId, osrsAccountId, playerName);
            case BingoTileRequirementType.VALUE_DROP:
                return calculateValueDropProgress(event, req, existing, memberId, osrsAccountId, playerName);
            case BingoTileRequirementType.SPEEDRUN:
                return calculateSpeedrunProgress(event, tier || req, existing, memberId, osrsAccountId, playerName);
            case BingoTileRequirementType.BA_GAMBLES:
                return calculateBaGamblesProgress(event, req, existing, memberId, osrsAccountId, playerName);
            case BingoTileRequirementType.EXPERIENCE:
                return await calculateExperienceProgress(event, req, existing, eventStartDate, memberId, osrsAccountId, playerName, eventId);
            case BingoTileRequirementType.CHAT:
                return calculateChatProgress(event, req, existing, memberId, osrsAccountId, playerName);
            case BingoTileRequirementType.PUZZLE:
                return await calculatePuzzleProgress(event, req, existing, eventStartDate, memberId, osrsAccountId, playerName, eventId);
            default:
                return this.buildEmptyProgress(null, { matchType: BingoTileMatchType.ALL, requirements: [req], tiers: [] });
        }
    };
    /**
     * Get member_id from osrs_account_id for a specific team.
     *
     * The member_id is used for tracking individual contributions to team progress.
     */
    getMemberIdFromOsrsAccount = async (osrsAccountId, teamId) => {
        const result = await query('SELECT member_id FROM event_team_members WHERE osrs_account_id = $1 AND team_id = $2 LIMIT 1', [osrsAccountId, teamId]);
        return result[0]?.member_id;
    };
    /**
     * Get existing progress for a tile from the database.
     *
     * @param boardTileId - The board tile to look up
     * @returns Current progress or null if none exists
     */
    getExistingProgress = async (boardTileId) => {
        // Note: query() auto-converts snake_case to camelCase
        const result = await query(`
      SELECT id, board_tile_id, progress_value, progress_metadata, completion_type,
        completed_at, completed_by_osrs_account_id, created_at, updated_at
      FROM bingo_tile_progress WHERE board_tile_id = $1 LIMIT 1
    `, [boardTileId]);
        if (result.length === 0)
            return null;
        const row = result[0];
        return {
            id: row.id,
            boardTileId: row.boardTileId,
            progressValue: parseFloat(row.progressValue) || 0,
            progressMetadata: row.progressMetadata, // Already camelCase from query()
            completionType: row.completionType ?? undefined,
            completedByOsrsAccountId: row.completedByOsrsAccountId ?? undefined,
            completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    };
    /**
     * Insert new progress record into the database.
     */
    insertProgress = async (boardTileId, progress, completedByOsrsAccountId) => {
        // Save tile-level metadata (the wrapper), not requirement-level metadata
        const metadataToSave = progress.tileProgressMetadata || {
            totalRequirements: 1,
            completedRequirementIndices: progress.isCompleted ? [0] : [],
            requirementProgress: {
                "0": {
                    isCompleted: progress.isCompleted,
                    progressValue: progress.progressValue,
                    progressMetadata: progress.progressMetadata
                }
            }
        };
        await query(`
      INSERT INTO bingo_tile_progress (board_tile_id, progress_value, progress_metadata, completed_by_osrs_account_id)
      VALUES ($1, $2, $3, $4)
    `, [
            boardTileId,
            progress.progressValue,
            JSON.stringify(metadataToSave),
            completedByOsrsAccountId
        ]);
    };
    /**
     * Update existing progress record in the database.
     */
    updateProgress = async (boardTileId, progress, completedByOsrsAccountId) => {
        // Save tile-level metadata (the wrapper), not requirement-level metadata
        const metadataToSave = progress.tileProgressMetadata || {
            totalRequirements: 1,
            completedRequirementIndices: progress.isCompleted ? [0] : [],
            requirementProgress: {
                "0": {
                    isCompleted: progress.isCompleted,
                    progressValue: progress.progressValue,
                    progressMetadata: progress.progressMetadata
                }
            }
        };
        await query(`
      UPDATE bingo_tile_progress
      SET progress_value = $1, progress_metadata = $2, completed_by_osrs_account_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE board_tile_id = $4
    `, [
            progress.progressValue,
            JSON.stringify(metadataToSave),
            completedByOsrsAccountId,
            boardTileId
        ]);
    };
    /**
     * Mark a tile as completed in both progress and board_tiles tables.
     * Also checks for row/column completions and grants any configured effects.
     */
    markTileCompleted = async (boardTileId, completedByOsrsAccountId) => {
        await query(`
      UPDATE bingo_tile_progress
      SET completion_type = $1, completed_at = CURRENT_TIMESTAMP, completed_by_osrs_account_id = $2
      WHERE board_tile_id = $3
    `, [BingoTileCompletionType.AUTO, completedByOsrsAccountId, boardTileId]);
        await query(`
      UPDATE bingo_board_tiles
      SET is_completed = true, completed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_completed = false
    `, [boardTileId]);
        // Check for line completions and grant effects
        try {
            // Get the tile's position and board ID
            const tileInfo = await query('SELECT board_id, position FROM bingo_board_tiles WHERE id = $1', [boardTileId]);
            if (tileInfo.length > 0) {
                const { boardId, position } = tileInfo[0];
                await EffectsService.checkLineCompletions(boardId, position);
            }
        }
        catch (error) {
            // Log but don't fail the tile completion
            console.error('Error checking line completions:', error);
        }
    };
    /**
     * Send Discord notification if there's a new tier or tile completion.
     *
     * Only sends notifications for:
     * - New tile completions (tile was just marked complete)
     * - New tier completions
     *
     * Does NOT send notifications for:
     * - Progress updates without completions
     * - Already-completed tiles
     *
     * @param pointsAwarded - Number of points awarded for this completion
     */
    sendNotificationIfNeeded = async (event, tile, existingProgress, updatedProgress, isTileCompleted, wasCompleted, pointsAwarded = 0) => {
        const previousTiers = getCompletedTiers(existingProgress?.progressMetadata);
        const currentTiers = updatedProgress.progressMetadata.completedTiers || updatedProgress.completedTiers || [];
        const previousTierNumbers = previousTiers.map(t => t.tier);
        const currentTierNumbers = currentTiers.map(t => t.tier);
        const newlyCompletedTiers = currentTierNumbers.filter(t => !previousTierNumbers.includes(t));
        const hasNewTierCompletion = newlyCompletedTiers.length > 0;
        const isNewTileCompletion = isTileCompleted && !wasCompleted;
        if (!isNewTileCompletion && !hasNewTierCompletion)
            return;
        try {
            let playerName = event.playerName;
            if (event.osrsAccountId) {
                const accounts = await query('SELECT osrs_nickname FROM osrs_accounts WHERE id = $1 LIMIT 1', [event.osrsAccountId]);
                playerName = accounts[0]?.osrsNickname || playerName;
            }
            await DiscordNotificationsService.sendTileProgressNotification({
                teamId: tile.teamId,
                teamName: tile.teamName || 'Unknown Team',
                eventName: tile.eventName || 'Unknown Event',
                tileId: tile.tileId,
                tileTask: tile.tileTask || 'Unknown Task',
                tilePosition: tile.position || '?',
                playerName,
                progressValue: updatedProgress.progressValue,
                progressMetadata: updatedProgress.progressMetadata,
                isCompleted: isNewTileCompletion,
                completionType: isNewTileCompletion ? 'auto' : null,
                completedTiers: currentTierNumbers,
                totalTiers: tile.requirements.tiers?.length,
                newlyCompletedTiers: newlyCompletedTiers.length > 0 ? newlyCompletedTiers : undefined,
                pointsAwarded: pointsAwarded > 0 ? pointsAwarded : undefined
            });
        }
        catch (error) {
            console.error('[TileProgressService] Error sending Discord notification:', error);
        }
    };
}
// Export a singleton instance for convenience
export const tileProgressService = new TileProgressService();
