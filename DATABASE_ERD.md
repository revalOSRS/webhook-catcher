# Event System Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NEW EVENT SYSTEM SCHEMA                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           CORE EVENT SYSTEM                                   │
└──────────────────────────────────────────────────────────────────────────────┘

        ┌─────────────────┐
        │     EVENTS      │
        │─────────────────│
        │ id (PK)         │
        │ name            │
        │ event_type      │◄─── (bingo, battleship_bingo, dungeoncrawler_bingo, risk_bingo, hide_and_seek, puzzle, reval_games)
        │ status          │◄─── (draft, scheduled, active, paused, completed, cancelled)
        │ start_date      │
        │ end_date        │
        │ config (JSONB)  │
        │ metadata (JSONB)│
        └────────┬────────┘
                 │
                 │ 1:N
                 ▼
        ┌─────────────────┐
        │  EVENT_TEAMS    │
        │─────────────────│
        │ id (PK)         │
        │ event_id (FK)   │
        │ name            │
        │ color           │
        │ icon            │
        │ score           │
        │ metadata (JSONB)│
        └────────┬────────┘
                 │
                 │ 1:N
                 ▼
        ┌─────────────────────┐
        │ EVENT_TEAM_MEMBERS  │
        │─────────────────────│
        │ id (PK)             │
        │ team_id (FK)        │
        │ member_id (FK) ──────────► MEMBERS table
        │ role                │
        │ individual_score    │
        │ metadata (JSONB)    │
        └─────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                         BINGO SYSTEM - LIBRARIES                              │
└──────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────┐
        │    BINGO_TILES       │◄─── Reusable Tile Library
        │──────────────────────│
        │ id (PK) VARCHAR      │◄─── e.g., "boss_hydra_20"
        │ task                 │
        │ category             │
        │ difficulty           │◄─── (easy, medium, hard, extreme)
        │ icon                 │
        │ description          │
        │ base_points          │
        │ requirements (JSONB) │
        │ bonus_tiers (JSONB)  │◄─── Progressive rewards
        │ metadata (JSONB)     │
        │ is_active            │
        └──────────────────────┘

        ┌──────────────────────────┐
        │ BINGO_BUFFS_DEBUFFS      │◄─── Buff/Debuff Library
        │──────────────────────────│
        │ id (PK) VARCHAR          │
        │ name                     │
        │ description              │
        │ type                     │◄─── (buff, debuff)
        │ effect_type              │◄─── e.g., "points_multiplier"
        │ effect_value             │
        │ icon                     │
        │ metadata (JSONB)         │
        │ is_active                │
        └──────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                      BINGO SYSTEM - BOARD & TILES                             │
└──────────────────────────────────────────────────────────────────────────────┘

        ┌─────────────────┐
        │     EVENTS      │
        └────────┬────────┘
                 │
                 │ 1:N
                 ▼
        ┌───────────────────────┐
        │   BINGO_BOARDS        │
        │───────────────────────│
        │ id (PK)               │
        │ event_id (FK)         │
        │ name                  │
        │ description           │
        │ columns               │◄─── Grid width (1-20)
        │ rows                  │◄─── Grid height (1-20)
        │ show_row_column_buffs │
        │ metadata (JSONB)      │
        └───────┬───────────────┘
                │
                │ 1:N
                ▼
        ┌───────────────────────────┐
        │  BINGO_BOARD_TILES        │◄─── Tiles placed on board
        │───────────────────────────│
        │ id (PK)                   │
        │ board_id (FK)             │
        │ tile_id (FK) ──────────────────► BINGO_TILES
        │ position                  │◄─── e.g., "A1", "B7"
        │ custom_points             │◄─── Override base_points
        │ is_completed              │
        │ completed_by_team_id (FK) ├─────► EVENT_TEAMS
        │ completed_at              │
        │ metadata (JSONB)          │
        └───────┬───────────────────┘
                │
                │ 1:N
                ▼
        ┌─────────────────────────────┐
        │  BINGO_TILE_PROGRESS        │◄─── Individual contributions
        │─────────────────────────────│
        │ id (PK)                     │
        │ board_tile_id (FK)          │
        │ osrs_account_id (FK) ────────────► OSRS_ACCOUNTS
        │ progress_value              │◄─── Kills, XP, time, etc.
        │ progress_metadata (JSONB)   │
        │ proof_url                   │
        │ notes                       │
        │ recorded_at                 │
        └─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                   BINGO SYSTEM - BUFFS & EFFECTS                              │
└──────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────┐
        │ BINGO_BUFFS_DEBUFFS      │
        └──────────┬───────────────┘
                   │
        ┌──────────┼──────────┬──────────────────┐
        │          │          │                  │
        │          │          │                  │
        ▼          ▼          ▼                  ▼
┌─────────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐
│   TILE      │ │   ROW    │ │  COLUMN    │ │ DIAGONAL │
│  EFFECTS    │ │ EFFECTS  │ │  EFFECTS   │ │ (future) │
└─────────────┘ └──────────┘ └────────────┘ └──────────┘

        ┌─────────────────────────────┐
        │ BINGO_BOARD_TILE_EFFECTS    │◄─── Applied to specific tiles
        │─────────────────────────────│
        │ id (PK)                     │
        │ board_tile_id (FK) ──────────────► BINGO_BOARD_TILES
        │ buff_debuff_id (FK) ─────────────► BINGO_BUFFS_DEBUFFS
        │ applied_by (FK) ─────────────────► MEMBERS
        │ is_active                   │
        │ applied_at                  │
        │ expires_at                  │
        │ metadata (JSONB)            │
        └─────────────────────────────┘

        ┌─────────────────────────────┐
        │ BINGO_BOARD_ROW_EFFECTS     │◄─── Applied to entire rows
        │─────────────────────────────│
        │ id (PK)                     │
        │ board_id (FK) ───────────────────► BINGO_BOARDS
        │ row_number                  │◄─── Which row (1, 2, 3, etc.)
        │ buff_debuff_id (FK) ─────────────► BINGO_BUFFS_DEBUFFS
        │ applied_by (FK) ─────────────────► MEMBERS
        │ is_active                   │
        │ applied_at                  │
        │ expires_at                  │
        │ metadata (JSONB)            │
        └─────────────────────────────┘

        ┌─────────────────────────────┐
        │ BINGO_BOARD_COLUMN_EFFECTS  │◄─── Applied to entire columns
        │─────────────────────────────│
        │ id (PK)                     │
        │ board_id (FK) ───────────────────► BINGO_BOARDS
        │ column_letter               │◄─── Which column (A, B, C, etc.)
        │ buff_debuff_id (FK) ─────────────► BINGO_BUFFS_DEBUFFS
        │ applied_by (FK) ─────────────────► MEMBERS
        │ is_active                   │
        │ applied_at                  │
        │ expires_at                  │
        │ metadata (JSONB)            │
        └─────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                            KEY RELATIONSHIPS                                  │
└──────────────────────────────────────────────────────────────────────────────┘

1. EVENT → TEAMS → TEAM_MEMBERS
   - One event has many teams
   - Each team has many members

2. EVENT → BOARDS → BOARD_TILES → TILE_PROGRESS
   - One event has many boards
   - Each board has many placed tiles
   - Each placed tile tracks progress for multiple players

3. BINGO_TILES (Library) → BOARD_TILES (Instance)
   - Reusable tile definitions
   - Instantiated on specific boards

4. BINGO_BUFFS_DEBUFFS (Library) → TILE/ROW/COLUMN EFFECTS (Instance)
   - Reusable buff/debuff definitions
   - Applied to specific game elements

5. BOARD_TILES ← TILE_EFFECTS
   - Buffs/debuffs can be applied directly to tiles

6. BOARDS ← ROW_EFFECTS / COLUMN_EFFECTS
   - Buffs/debuffs can affect entire rows or columns


┌──────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW EXAMPLE                                  │
└──────────────────────────────────────────────────────────────────────────────┘

1. Create Event
   INSERT INTO events (name, event_type, status)
   
2. Create Teams
   INSERT INTO event_teams (event_id, name, color)
   
3. Add Team Members
   INSERT INTO event_team_members (team_id, member_id)
   
4. Create Board
   INSERT INTO bingo_boards (event_id, name, columns, rows)
   
5. Place Tiles
   INSERT INTO bingo_board_tiles (board_id, tile_id, position)
   
6. Apply Buffs
   INSERT INTO bingo_board_row_effects (board_id, row_number, buff_debuff_id)
   
7. Track Progress
   INSERT INTO bingo_tile_progress (board_tile_id, osrs_account_id, progress_value)
   
8. Complete Tile
   UPDATE bingo_board_tiles SET is_completed = true, completed_by_team_id = ?


┌──────────────────────────────────────────────────────────────────────────────┐
│                          JSONB FIELD EXAMPLES                                 │
└──────────────────────────────────────────────────────────────────────────────┘

BINGO_TILES.bonus_tiers:
[
  {"threshold": "Under 2:00", "points": 50, "requirementValue": 120},
  {"threshold": "Under 1:30", "points": 100, "requirementValue": 90}
]

BINGO_TILE_PROGRESS.progress_metadata:
{
  "kills": 15,
  "best_time": 145,
  "average_time": 180,
  "deaths": 2
}

EVENTS.config:
{
  "max_teams": 4,
  "tiles_to_win": 25,
  "allow_diagonal_win": true
}

```

## Legend

- PK = Primary Key
- FK = Foreign Key
- 1:N = One-to-Many Relationship
- JSONB = PostgreSQL JSON data type (flexible schema)
- VARCHAR = Variable character field
- UUID = Universally Unique Identifier

