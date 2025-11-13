# Database Schema Changes Summary

## Overview
Removed old battleship bingo and events tables, replacing them with a flexible event system that supports multiple event types, particularly bingo events.

## Tables Removed (Migration 036)
- ❌ `event_log`
- ❌ `battleship_bingo_bomb_actions`
- ❌ `battleship_bingo_active_effects`
- ❌ `battleship_bingo_tile_progress`
- ❌ `battleship_bingo_tiles`
- ❌ `battleship_bingo_ships`
- ❌ `team_members`
- ❌ `teams`
- ❌ `battleship_bingo_events`
- ❌ `game_events`
- ❌ `osrs_account_daily_stats`
- ❌ `osrs_account_events`

## Tables Added

### Core Event System (Migration 037)
✅ **events** - Main event management
- Supports multiple event types (bingo, battleship_bingo, dungeoncrawler_bingo, risk_bingo, hide_and_seek, puzzle, reval_games)
- Status tracking (draft, scheduled, active, paused, completed, cancelled)
- Flexible JSONB config and metadata

✅ **event_teams** - Teams for events
- Team name, color, icon
- Score tracking
- JSONB metadata

✅ **event_team_members** - Team membership
- Links members to teams
- Individual score tracking
- Role assignment
- JSONB metadata

### Bingo Tiles Library (Migration 038)
✅ **bingo_tiles** - Reusable tile definitions
- Unique tile IDs (e.g., "boss_hydra_20")
- Task, category, difficulty, icon
- Base points
- Requirements (JSONB)
- Bonus tiers (JSONB) for progressive tiles
- Active/inactive flag

### Bingo Board System (Migration 039)
✅ **bingo_boards** - Board configuration
- Linked to events
- Configurable grid size (up to 20x20)
- Name and description
- Row/column buffs toggle
- JSONB metadata

✅ **bingo_board_tiles** - Tiles placed on boards
- Position (e.g., "A1", "B7")
- References tile from library
- Optional custom points override
- Completion tracking (is_completed, completed_at, completed_by_team_id)
- JSONB metadata

### Progress Tracking (Migration 040)
✅ **bingo_tile_progress** - Individual contributions
- Tracks player progress on board tiles
- Links to OSRS accounts
- Progress value (numeric - kills, XP, time, etc.)
- Proof URL and notes
- JSONB metadata

### Buffs/Debuffs System (Migration 041)
✅ **bingo_buffs_debuffs** - Buff/debuff library
- Type (buff or debuff)
- Effect type and value
- Icon reference
- JSONB metadata

✅ **bingo_board_tile_effects** - Tile-level effects
- Buffs/debuffs applied to specific tiles
- Applied by tracking
- Active/expiration management

✅ **bingo_board_row_effects** - Row-level effects
- Buffs/debuffs for entire rows
- Row number
- Active/expiration management

✅ **bingo_board_column_effects** - Column-level effects
- Buffs/debuffs for entire columns
- Column letter (A, B, C, etc.)
- Active/expiration management

## Key Improvements

### Flexibility
- JSONB fields allow event-specific configuration without schema changes
- Reusable tile library can be shared across multiple events
- Support for multiple event types, not just bingo

### Scalability
- Proper indexing for performance
- UUID primary keys for better distribution
- Optimized foreign key relationships

### Features
- Progressive tile rewards with bonus tiers
- Individual progress tracking with proof
- Flexible buffs/debuffs at multiple levels (tile, row, column)
- Team-based competition with score tracking

### Data Integrity
- Cascading deletes ensure consistency
- Check constraints prevent invalid data
- Unique constraints prevent duplicates
- Triggers automatically update timestamps

## Statistics

**Tables Removed:** 12  
**Tables Added:** 11  
**Net Change:** -1 table  

**Enums Added:**
- `event_status` (draft, scheduled, active, paused, completed, cancelled)
- `event_type_enum` (bingo, battleship_bingo, dungeoncrawler_bingo, risk_bingo, hide_and_seek, puzzle, reval_games)
- `buff_debuff_type` (buff, debuff)

**Enums Removed:**
- `event_type` (old enum from migration 018)

## Migration Timeline

1. **036** - Remove old tables (destructive)
2. **037** - Add core event system
3. **038** - Add bingo tiles library
4. **039** - Add bingo boards system
5. **040** - Add progress tracking
6. **041** - Add buffs/debuffs system

## Next Steps

After running migrations:

1. **Populate Libraries**
   - Insert tiles into `bingo_tiles`
   - Insert buffs/debuffs into `bingo_buffs_debuffs`

2. **Create Events**
   - Create events in `events` table
   - Set up teams in `event_teams`
   - Add members to teams

3. **Build Boards**
   - Create boards in `bingo_boards`
   - Place tiles on boards in `bingo_board_tiles`
   - Apply buffs/debuffs as needed

4. **Track Progress**
   - Record player progress in `bingo_tile_progress`
   - Mark tiles as completed
   - Calculate scores

## Documentation

- **Detailed Schema:** `NEW_EVENT_SYSTEM_SCHEMA.md`
- **Migration Guide:** `MIGRATION_GUIDE.md`
- **Source Code:** `src/db/database/migrations/036-041_*.js`

