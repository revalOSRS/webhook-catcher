# Clan Events Management API Documentation

This document provides comprehensive documentation for all clan event management endpoints.

## Base URL

All clan event endpoints are prefixed with `/api/admin/clan-events`

## Authentication

**All endpoints require Discord admin authentication.**

To access these endpoints, you must:
1. Have your Discord ID in the admin whitelist (configured in `src/middleware/auth.ts`)
2. Be a member of the clan in the database
3. Provide both your Discord ID and member code in the request headers

**Required Headers:**
```
X-Discord-Id: your_discord_id_here
X-Member-Code: your_member_code_here
```

**Error Responses:**
- `401 Unauthorized` - Missing required headers
- `403 Forbidden` - Not in admin whitelist or invalid member code
- `404 Not Found` - Discord member not found in clan

**Example Error Response (Not in Whitelist):**
```json
{
  "status": "error",
  "message": "Forbidden: Admin privileges required",
  "hint": "Your Discord ID is not authorized for admin access"
}
```

**Example Error Response (Invalid Member Code):**
```json
{
  "status": "error",
  "message": "Authentication failed. Invalid member code."
}
```

## Table of Contents

1. [Events Management](#events-management)
2. [Boards Management](#boards-management)
3. [Teams Management](#teams-management)
4. [Tiles Library Management](#tiles-library-management)
5. [Buffs/Debuffs Library Management](#buffsdebuffs-library-management)
6. [Effects Management](#effects-management)

---

## Events Management

Base path: `/api/admin/clan-events/events`

### Get All Events

**GET** `/api/admin/clan-events/events`

Get all events with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (draft, scheduled, active, paused, completed, cancelled)
- `event_type` (optional): Filter by type (bingo, battleship_bingo, dungeoncrawler_bingo, risk_bingo, hide_and_seek, puzzle, reval_games)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Summer Bingo 2025",
      "description": "Clan bingo event",
      "event_type": "bingo",
      "status": "active",
      "start_date": "2025-06-01T00:00:00Z",
      "end_date": "2025-06-30T23:59:59Z",
      "config": {},
      "metadata": {},
      "created_by": 1,
      "created_at": "2025-05-01T00:00:00Z",
      "updated_at": "2025-05-01T00:00:00Z",
      "team_count": 4,
      "participant_count": 32
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

### Get Single Event

**GET** `/api/clan-events/events/:id`

Get detailed information about a specific event.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Summer Bingo 2025",
    "event_type": "bingo",
    "status": "active",
    "teams": [
      {
        "id": "uuid",
        "name": "Red Team",
        "color": "#FF0000",
        "icon": "fire",
        "score": 1500,
        "member_count": 8
      }
    ]
  }
}
```

### Create Event

**POST** `/api/clan-events/events`

Create a new event.

**Request Body:**
```json
{
  "name": "Summer Bingo 2025",
  "description": "Clan bingo event",
  "event_type": "bingo",
  "status": "draft",
  "start_date": "2025-06-01T00:00:00Z",
  "end_date": "2025-06-30T23:59:59Z",
  "config": {
    "max_teams": 4,
    "tiles_to_win": 25
  },
  "metadata": {},
  "created_by": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* created event */ },
  "message": "Event created successfully"
}
```

### Update Event

**PATCH** `/api/clan-events/events/:id`

Update an existing event.

**Request Body (partial):**
```json
{
  "status": "active",
  "config": {
    "max_teams": 6
  }
}
```

### Delete Event

**DELETE** `/api/clan-events/events/:id`

Delete an event and all associated data.

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully",
  "deleted_id": "uuid"
}
```

### Get Event Stats

**GET** `/api/clan-events/events/:id/stats`

Get comprehensive statistics for an event.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Summer Bingo 2025",
    "status": "active",
    "total_teams": 4,
    "total_participants": 32,
    "total_boards": 1,
    "total_tiles_placed": 49,
    "completed_tiles": 15,
    "total_score": 6000
  }
}
```

---

## Boards Management

Base path: `/api/clan-events/boards`

### Get All Boards

**GET** `/api/clan-events/boards`

**Query Parameters:**
- `event_id` (optional): Filter by event
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "name": "Main Board",
      "description": "7x7 bingo board",
      "columns": 7,
      "rows": 7,
      "show_row_column_buffs": true,
      "metadata": {},
      "event_name": "Summer Bingo 2025",
      "event_status": "active",
      "total_tiles": 49,
      "completed_tiles": 15
    }
  ]
}
```

### Get Single Board

**GET** `/api/clan-events/boards/:id`

Get a board with all its tiles and effects.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Main Board",
    "columns": 7,
    "rows": 7,
    "tiles": [
      {
        "id": "uuid",
        "position": "A1",
        "tile_id": "boss_hydra_20",
        "task": "Kill Alchemical Hydra 20 times",
        "category": "pvm",
        "difficulty": "hard",
        "icon": "Alchemical_Hydra_(serpentine)",
        "base_points": 100,
        "custom_points": null,
        "is_completed": false,
        "completed_by_team_id": null
      }
    ],
    "row_effects": [],
    "column_effects": []
  }
}
```

### Create Board

**POST** `/api/clan-events/boards`

**Request Body:**
```json
{
  "event_id": "uuid",
  "name": "Main Board",
  "description": "7x7 bingo board",
  "columns": 7,
  "rows": 7,
  "show_row_column_buffs": true,
  "metadata": {}
}
```

### Update Board

**PATCH** `/api/clan-events/boards/:id`

**Request Body (partial):**
```json
{
  "name": "Updated Board Name",
  "show_row_column_buffs": false
}
```

### Delete Board

**DELETE** `/api/clan-events/boards/:id`

### Add Tile to Board

**POST** `/api/clan-events/boards/:id/tiles`

**Request Body:**
```json
{
  "tile_id": "boss_hydra_20",
  "position": "A1",
  "custom_points": 150,
  "metadata": {}
}
```

### Remove Tile from Board

**DELETE** `/api/clan-events/boards/:boardId/tiles/:tileId`

### Update Board Tile

**PATCH** `/api/clan-events/boards/:boardId/tiles/:tileId`

**Request Body (partial):**
```json
{
  "position": "A2",
  "is_completed": true,
  "completed_by_team_id": "uuid",
  "completed_at": "2025-06-15T12:00:00Z"
}
```

---

## Teams Management

Base path: `/api/clan-events/teams`

### Get All Teams

**GET** `/api/clan-events/teams`

**Query Parameters:**
- `event_id` (optional): Filter by event
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

### Get Single Team

**GET** `/api/clan-events/teams/:id`

Get a team with all its members.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "event_id": "uuid",
    "name": "Red Team",
    "color": "#FF0000",
    "icon": "fire",
    "score": 1500,
    "members": [
      {
        "id": "uuid",
        "team_id": "uuid",
        "member_id": 1,
        "discord_username": "player1",
        "role": "captain",
        "individual_score": 500,
        "joined_at": "2025-06-01T00:00:00Z"
      }
    ]
  }
}
```

### Create Team

**POST** `/api/clan-events/teams`

**Request Body:**
```json
{
  "event_id": "uuid",
  "name": "Red Team",
  "color": "#FF0000",
  "icon": "fire",
  "metadata": {}
}
```

### Update Team

**PATCH** `/api/clan-events/teams/:id`

**Request Body (partial):**
```json
{
  "name": "Crimson Team",
  "score": 2000
}
```

### Delete Team

**DELETE** `/api/clan-events/teams/:id`

### Add Member to Team

**POST** `/api/clan-events/teams/:id/members`

**Request Body:**
```json
{
  "member_id": 1,
  "role": "member",
  "metadata": {}
}
```

### Update Team Member

**PATCH** `/api/clan-events/teams/:teamId/members/:memberId`

**Request Body (partial):**
```json
{
  "role": "captain",
  "individual_score": 750
}
```

### Remove Member from Team

**DELETE** `/api/clan-events/teams/:teamId/members/:memberId`

### Get Team Leaderboard

**GET** `/api/clan-events/teams/:id/leaderboard`

Get team members sorted by individual score.

---

## Tiles Library Management

Base path: `/api/clan-events/tiles/library`

### Get All Tiles

**GET** `/api/clan-events/tiles/library`

**Query Parameters:**
- `category` (optional): Filter by category
- `difficulty` (optional): Filter by difficulty (easy, medium, hard, extreme)
- `is_active` (optional): Filter by active status (true/false)
- `search` (optional): Search in task, description, or ID
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "boss_hydra_20",
      "task": "Kill Alchemical Hydra 20 times",
      "category": "pvm",
      "difficulty": "hard",
      "icon": "Alchemical_Hydra_(serpentine)",
      "description": null,
      "base_points": 100,
      "requirements": [],
      "bonus_tiers": [],
      "metadata": {},
      "is_active": true
    }
  ],
  "stats": {
    "total": 150,
    "active": 145,
    "easy": 40,
    "medium": 60,
    "hard": 35,
    "extreme": 15
  }
}
```

### Get Single Tile

**GET** `/api/clan-events/tiles/library/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "boss_hydra_20",
    "task": "Kill Alchemical Hydra 20 times",
    "usage_stats": {
      "used_on_boards": 3,
      "times_completed": 7,
      "total_placements": 3
    }
  }
}
```

### Create Tile

**POST** `/api/clan-events/tiles/library`

**Request Body:**
```json
{
  "id": "boss_hydra_20",
  "task": "Kill Alchemical Hydra 20 times",
  "category": "pvm",
  "difficulty": "hard",
  "icon": "Alchemical_Hydra_(serpentine)",
  "description": "Complete 20 Alchemical Hydra kills",
  "base_points": 100,
  "requirements": [],
  "bonus_tiers": [
    {
      "threshold": "30 kills",
      "points": 50,
      "requirementValue": 30
    }
  ],
  "metadata": {},
  "is_active": true
}
```

### Bulk Create Tiles

**POST** `/api/clan-events/tiles/library/bulk`

**Request Body:**
```json
{
  "tiles": [
    {
      "id": "tile1",
      "task": "Task 1",
      "category": "pvm",
      "difficulty": "easy"
    },
    {
      "id": "tile2",
      "task": "Task 2",
      "category": "skills",
      "difficulty": "medium"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 2,
    "failed": 0,
    "tiles": [/* created tiles */],
    "errors": []
  },
  "message": "Created 2 tiles, 0 failed"
}
```

### Update Tile

**PATCH** `/api/clan-events/tiles/library/:id`

### Delete Tile

**DELETE** `/api/clan-events/tiles/library/:id`

Note: Cannot delete if tile is in use on any board.

### Get Categories List

**GET** `/api/clan-events/tiles/library/categories/list`

Get all unique categories with counts.

---

## Buffs/Debuffs Library Management

Base path: `/api/clan-events/buffs/library`

### Get All Buffs/Debuffs

**GET** `/api/clan-events/buffs/library`

**Query Parameters:**
- `type` (optional): Filter by type (buff, debuff)
- `is_active` (optional): Filter by active status
- `search` (optional): Search in name, description, or ID
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "double_points",
      "name": "Double Points",
      "description": "Doubles the points for this tile",
      "type": "buff",
      "effect_type": "points_multiplier",
      "effect_value": 2.0,
      "icon": "star",
      "metadata": {},
      "is_active": true
    }
  ],
  "stats": {
    "total": 20,
    "active": 18,
    "buffs": 12,
    "debuffs": 8
  }
}
```

### Get Single Buff/Debuff

**GET** `/api/clan-events/buffs/library/:id`

**Response includes usage stats**

### Create Buff/Debuff

**POST** `/api/clan-events/buffs/library`

**Request Body:**
```json
{
  "id": "double_points",
  "name": "Double Points",
  "description": "Doubles the points for this tile",
  "type": "buff",
  "effect_type": "points_multiplier",
  "effect_value": 2.0,
  "icon": "star",
  "metadata": {},
  "is_active": true
}
```

### Update Buff/Debuff

**PATCH** `/api/clan-events/buffs/library/:id`

### Delete Buff/Debuff

**DELETE** `/api/clan-events/buffs/library/:id`

Note: Cannot delete if buff/debuff is applied anywhere.

---

## Effects Management

Base path: `/api/clan-events/buffs/effects`

### Apply Buff/Debuff to Tile

**POST** `/api/clan-events/buffs/effects/tile`

**Request Body:**
```json
{
  "board_tile_id": "uuid",
  "buff_debuff_id": "double_points",
  "applied_by": 1,
  "expires_at": "2025-06-15T00:00:00Z",
  "metadata": {}
}
```

### Apply Buff/Debuff to Row

**POST** `/api/clan-events/buffs/effects/row`

**Request Body:**
```json
{
  "board_id": "uuid",
  "row_number": 1,
  "buff_debuff_id": "double_points",
  "applied_by": 1,
  "expires_at": null,
  "metadata": {}
}
```

### Apply Buff/Debuff to Column

**POST** `/api/clan-events/buffs/effects/column`

**Request Body:**
```json
{
  "board_id": "uuid",
  "column_letter": "A",
  "buff_debuff_id": "double_points",
  "applied_by": 1,
  "expires_at": null,
  "metadata": {}
}
```

### Remove Effect from Tile

**DELETE** `/api/clan-events/buffs/effects/tile/:id`

### Remove Effect from Row

**DELETE** `/api/clan-events/buffs/effects/row/:id`

### Remove Effect from Column

**DELETE** `/api/clan-events/buffs/effects/column/:id`

### Update Tile Effect

**PATCH** `/api/clan-events/buffs/effects/tile/:id`

**Request Body (partial):**
```json
{
  "is_active": false,
  "expires_at": "2025-06-20T00:00:00Z"
}
```

### Get All Board Effects

**GET** `/api/clan-events/buffs/effects/board/:boardId`

Get all effects for a specific board (tiles, rows, columns).

**Response:**
```json
{
  "success": true,
  "data": {
    "tile_effects": [],
    "row_effects": [],
    "column_effects": [],
    "totals": {
      "tiles": 0,
      "rows": 0,
      "columns": 0
    }
  }
}
```

---

## Common Response Patterns

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

### Validation Error
```json
{
  "success": false,
  "error": "Missing required fields",
  "required": ["field1", "field2"]
}
```

---

## Event Types

- `bingo` - Regular bingo events
- `battleship_bingo` - Battleship-style bingo with bombing mechanics
- `dungeoncrawler_bingo` - Dungeon crawler bingo
- `risk_bingo` - Risk-based bingo events
- `hide_and_seek` - Hide and seek events
- `puzzle` - Puzzle challenges
- `reval_games` - Reval-specific game modes

## Event Statuses

- `draft` - Event is being created
- `scheduled` - Event is scheduled for the future
- `active` - Event is currently running
- `paused` - Event is temporarily paused
- `completed` - Event has finished
- `cancelled` - Event was cancelled

## Tile Difficulties

- `easy` - Easy tiles
- `medium` - Medium difficulty tiles
- `hard` - Hard tiles
- `extreme` - Extremely difficult tiles

---

## Notes

1. All UUIDs are PostgreSQL UUID type
2. All timestamps are ISO 8601 format
3. JSONB fields (config, metadata, etc.) accept any valid JSON
4. Cascading deletes are implemented - deleting an event deletes all associated data
5. Unique constraints prevent duplicate team names per event, duplicate positions per board, etc.
6. Foreign key constraints ensure data integrity

