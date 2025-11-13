# New Event System Schema

This document describes the new flexible event system that replaces the old battleship bingo and events tables.

## Overview

The new system supports multiple types of events (bingo, battleship_bingo, dungeoncrawler_bingo, risk_bingo, hide_and_seek, puzzle, reval_games) with a flexible architecture that allows for:
- Event management with teams
- Reusable tile library
- Configurable bingo boards
- Progress tracking
- Buffs/debuffs system

## Migration Files

### 036_remove_old_event_tables.js
Removes all old tables:
- Battleship bingo tables (from migration 010)
- `event_log` table
- Old events system (from migration 018: `osrs_account_events`, `osrs_account_daily_stats`)
- `game_events` table
- `teams` and `team_members` tables

### 037_add_new_events_system.js
Creates the core event system:

#### `events` table
- Stores all types of events (bingo, battleship_bingo, dungeoncrawler_bingo, risk_bingo, hide_and_seek, puzzle, reval_games)
- Status tracking (draft, scheduled, active, paused, completed, cancelled)
- JSONB config and metadata for flexibility
- Start/end dates

#### `event_teams` table
- Teams associated with events
- Team name, color, icon
- Score tracking
- JSONB metadata

#### `event_team_members` table
- Links members to teams
- Individual score tracking
- Role assignment (captain, member, etc.)
- JSONB metadata

### 038_add_bingo_tiles_library.js
Creates the reusable tile library:

#### `bingo_tiles` table
- Tile definitions with unique IDs (e.g., "boss_hydra_20")
- Task description, category, difficulty
- Icon reference
- Base points
- Requirements array (JSONB)
- Bonus tiers array (JSONB) - for progressive tiles
- Active/inactive flag for enabling/disabling tiles

**Bonus Tiers Example:**
```json
[
  {
    "threshold": "Under 2:30",
    "points": 50,
    "requirementValue": 150
  },
  {
    "threshold": "Under 2:00",
    "points": 100,
    "requirementValue": 120
  }
]
```

### 039_add_bingo_boards_system.js
Creates the board system:

#### `bingo_boards` table
- Associated with an event
- Configurable grid size (columns x rows, max 20x20)
- Name and description
- Toggle for row/column buffs display
- JSONB metadata

#### `bingo_board_tiles` table
- Tiles placed on a specific board
- Position (e.g., "A1", "B7")
- Reference to tile from library
- Optional custom_points (overrides tile base_points)
- Completion tracking (is_completed, completed_at, completed_by_team_id)
- JSONB metadata

### 040_add_bingo_tile_progress_tracking.js
Creates the progress tracking system:

#### `bingo_tile_progress` table
- Tracks individual player contributions to board tiles
- Links to OSRS accounts
- Progress value (numeric) - can be kill count, XP, time, etc.
- JSONB metadata for flexible data storage
- Proof URL for screenshots/evidence
- Notes field
- Recorded timestamp

### 041_add_bingo_buffs_debuffs_system.js
Creates the buffs/debuffs system:

#### `bingo_buffs_debuffs` table
- Library of reusable buffs and debuffs
- Type (buff or debuff)
- Effect type (e.g., "points_multiplier", "points_addition")
- Effect value
- Icon reference
- JSONB metadata

#### `bingo_board_tile_effects` table
- Buffs/debuffs applied to specific tiles
- Links to buff_debuff and board_tile
- Applied by member tracking
- Active/inactive flag
- Optional expiration timestamp

#### `bingo_board_row_effects` table
- Buffs/debuffs applied to entire rows
- Row number
- Applied by member tracking
- Active/inactive flag
- Optional expiration timestamp

#### `bingo_board_column_effects` table
- Buffs/debuffs applied to entire columns
- Column letter (e.g., "A", "B")
- Applied by member tracking
- Active/inactive flag
- Optional expiration timestamp

## Schema Diagram

```
events
  ├── event_teams
  │   └── event_team_members (links to members)
  └── bingo_boards
      └── bingo_board_tiles (references bingo_tiles)
          ├── bingo_tile_progress (links to osrs_accounts)
          └── bingo_board_tile_effects (references bingo_buffs_debuffs)

bingo_tiles (library)

bingo_buffs_debuffs (library)
  ├── bingo_board_tile_effects
  ├── bingo_board_row_effects
  └── bingo_board_column_effects
```

## Key Features

### 1. Flexibility
- JSONB fields allow for event-specific configuration without schema changes
- Reusable tile library can be shared across multiple events
- Buffs/debuffs can be applied at tile, row, or column level

### 2. Team Management
- Multiple teams per event
- Team members linked to clan members
- Individual and team score tracking

### 3. Progress Tracking
- Track individual contributions to tiles
- Flexible progress values (numbers, times, counts, etc.)
- Proof URLs and notes for validation
- Metadata for additional context

### 4. Bonus Tiers
- Tiles can have progressive rewards
- Multiple tiers with different thresholds
- Points increase based on achievement level

### 5. Points System
- Base points per tile
- Custom points override per board
- Buffs/debuffs can modify points
- Row/column multipliers possible

### 6. Board Customization
- Variable grid sizes (up to 20x20)
- Tiles placed at specific positions
- Row/column buffs/debuffs
- Completion tracking per tile

## Usage Examples

### Creating an Event
```sql
INSERT INTO events (name, description, event_type, status, start_date, end_date)
VALUES ('Summer Bingo 2025', 'Clan bingo event', 'bingo', 'scheduled', '2025-06-01', '2025-06-30');
```

### Creating a Board
```sql
INSERT INTO bingo_boards (event_id, name, columns, rows, show_row_column_buffs)
VALUES ('event-uuid', 'Main Board', 7, 7, true);
```

### Placing Tiles
```sql
INSERT INTO bingo_board_tiles (board_id, tile_id, position)
VALUES 
  ('board-uuid', 'boss_hydra_20', 'A1'),
  ('board-uuid', 'gwd_bandos_15', 'A2');
```

### Tracking Progress
```sql
INSERT INTO bingo_tile_progress (board_tile_id, osrs_account_id, progress_value, progress_metadata)
VALUES ('board-tile-uuid', 123, 15, '{"kills": 15, "best_time": 145}');
```

### Applying Buffs
```sql
-- Add buff to specific tile
INSERT INTO bingo_board_tile_effects (board_tile_id, buff_debuff_id)
VALUES ('board-tile-uuid', 'double_points');

-- Add buff to entire row
INSERT INTO bingo_board_row_effects (board_id, row_number, buff_debuff_id)
VALUES ('board-uuid', 1, 'row_multiplier_2x');
```

## Notes

- All tables use UUID for primary keys (except bingo_tiles which uses string IDs)
- Timestamps are automatically updated via triggers
- Cascading deletes ensure data integrity
- Indexes are optimized for common queries
- JSONB fields use GIN indexes for efficient querying

