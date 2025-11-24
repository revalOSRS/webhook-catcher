# Admin Clan Events API Documentation

Base URL: `/api/admin/clan-events`

All endpoints require admin authentication via `requireDiscordAdmin` middleware.

---

## Events

### GET `/events`
Get all events with optional filtering.

**Query Parameters:**
- `event_type` (optional): Filter by event type
- `status` (optional): Filter by status
- `limit` (optional, default: 50): Number of results per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string | null",
      "event_type": "bingo | battleship_bingo | dungeoncrawler_bingo | risk_bingo | hide_and_seek | puzzle | reval_games",
      "status": "draft | scheduled | active | paused | completed | cancelled",
      "start_date": "ISO8601 string | null",
      "end_date": "ISO8601 string | null",
      "config": {},
      "metadata": {},
      "created_by": "number | null",
      "created_at": "ISO8601 string",
      "updated_at": "ISO8601 string"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

### GET `/events/:id`
Get a single event by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "event_type": "string",
    "status": "string",
    "start_date": "ISO8601 string | null",
    "end_date": "ISO8601 string | null",
    "config": {},
    "metadata": {},
    "created_by": "number | null",
    "created_at": "ISO8601 string",
    "updated_at": "ISO8601 string"
  }
}
```

### POST `/events`
Create a new event.

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string | null",
  "event_type": "bingo | battleship_bingo | dungeoncrawler_bingo | risk_bingo | hide_and_seek | puzzle | reval_games (required)",
  "status": "draft | scheduled | active | paused | completed | cancelled (default: draft)",
  "start_date": "ISO8601 string | null",
  "end_date": "ISO8601 string | null",
  "config": {
    "board": {
      "columns": "number (1-20)",
      "rows": "number (1-20)",
      "name": "string (optional)",
      "description": "string (optional)",
      "show_row_column_buffs": "boolean (optional)",
      "show_tile_buffs": "boolean (optional, default: true)",
      "tiles": [
        {
          "tile_id": "string",
          "position": "string",
          "custom_points": "number (optional)",
          "metadata": {}
        }
      ],
      "row_effects": [
        {
          "row_number": "number",
          "buff_debuff_id": "string"
        }
      ],
      "column_effects": [
        {
          "column_letter": "string",
          "buff_debuff_id": "string"
        }
      ],
      "tile_effects": [
        {
          "tile_position": "string",
          "buff_debuff_id": "string"
        }
      ],
      "metadata": {}
    }
  },
  "metadata": {},
  "created_by": "number | null"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Event object */ },
  "message": "Event created successfully"
}
```

### PATCH `/events/:id`
Update an event.

**Request Body (all fields optional):**
```json
{
  "name": "string",
  "description": "string | null",
  "status": "draft | scheduled | active | paused | completed | cancelled",
  "start_date": "ISO8601 string | null",
  "end_date": "ISO8601 string | null",
  "config": {},
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated event object */ },
  "message": "Event updated successfully"
}
```

### DELETE `/events/:id`
Delete an event (cascades to teams, boards, etc.).

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully",
  "deleted_id": "uuid"
}
```

---

## Teams

### GET `/teams`
Get all teams with optional filtering.

**Query Parameters:**
- `event_id` (optional): Filter by event ID
- `limit` (optional, default: 50): Number of results per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "name": "string",
      "color": "string | null",
      "icon": "string | null",
      "score": "number",
      "metadata": {},
      "created_at": "ISO8601 string",
      "updated_at": "ISO8601 string",
      "event_name": "string",
      "event_status": "string",
      "member_count": "number"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

### GET `/teams/:id`
Get a single team with all members and OSRS account info.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "event_id": "uuid",
    "name": "string",
    "color": "string | null",
    "icon": "string | null",
    "score": "number",
    "metadata": {},
    "created_at": "ISO8601 string",
    "updated_at": "ISO8601 string",
    "event_name": "string",
    "event_status": "string",
    "event_type": "string",
    "members": [
      {
        "id": "uuid",
        "team_id": "uuid",
        "member_id": "number",
        "osrs_account_id": "number | null",
        "role": "string",
        "individual_score": "number",
        "metadata": {},
        "joined_at": "ISO8601 string",
        "discord_id": "string",
        "discord_username": "string | null",
        "discord_name": "string | null",
        "discord_discriminator": "string | null",
        "discord_avatar": "string | null",
        "osrs_account_name": "string | null",
        "osrs_account_type": "string | null"
      }
    ]
  }
}
```

### POST `/teams`
Create a new team.

**Request Body:**
```json
{
  "event_id": "uuid (required)",
  "name": "string (required)",
  "color": "string | null",
  "icon": "string | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Team object */ },
  "message": "Team created successfully"
}
```

### PATCH `/teams/:id`
Update a team.

**Request Body (all fields optional):**
```json
{
  "name": "string",
  "color": "string | null",
  "icon": "string | null",
  "score": "number",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated team object */ },
  "message": "Team updated successfully"
}
```

### DELETE `/teams/:id`
Delete a team (cascades to team members and board).

**Response:**
```json
{
  "success": true,
  "message": "Team deleted successfully",
  "deleted_id": "uuid"
}
```

### POST `/teams/:id/members`
Add a member to a team.

**Request Body:**
```json
{
  "member_id": "number (required)",
  "osrs_account_id": "number | null (optional, must belong to member)",
  "role": "string (default: 'member')",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "team_id": "uuid",
    "member_id": "number",
    "osrs_account_id": "number | null",
    "role": "string",
    "individual_score": "number",
    "metadata": {},
    "joined_at": "ISO8601 string"
  },
  "message": "Member added to team successfully"
}
```

### PATCH `/teams/:teamId/members/:memberId`
Update a team member.

**Request Body (all fields optional):**
```json
{
  "role": "string",
  "individual_score": "number",
  "osrs_account_id": "number | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated team member object */ },
  "message": "Team member updated successfully"
}
```

### DELETE `/teams/:teamId/members/:memberId`
Remove a member from a team.

**Response:**
```json
{
  "success": true,
  "message": "Member removed from team successfully",
  "deleted_id": "uuid"
}
```

### GET `/teams/:id/leaderboard`
Get team leaderboard (members sorted by individual score).

**Response:**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "uuid",
      "name": "string"
    },
    "leaderboard": [
      {
        "id": "uuid",
        "team_id": "uuid",
        "member_id": "number",
        "individual_score": "number",
        "discord_username": "string | null",
        "discord_name": "string | null",
        "discord_avatar": "string | null",
        "tiles_contributed_to": "number",
        "total_progress": "number"
      }
    ]
  }
}
```

---

## Team Boards

### GET `/events/:eventId/teams/:teamId/board`
Get a team's board with all tiles, tile effects, and line effects. If no board exists, it will be created from the event's generic board config.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "event_id": "uuid",
    "team_id": "uuid",
    "name": "string",
    "description": "string | null",
    "columns": "number",
    "rows": "number",
    "show_row_column_buffs": "boolean",
    "metadata": {
      "show_tile_buffs": "boolean"
    },
    "tiles": [
      {
        "id": "uuid",
        "board_id": "uuid",
        "tile_id": "string",
        "position": "string",
        "custom_points": "number | null",
        "is_completed": "boolean",
        "completed_by_team_id": "string | null",
        "completed_at": "ISO8601 string | null",
        "metadata": {},
        "task": "string",
        "category": "string",
        "difficulty": "string",
        "icon": "string | null",
        "description": "string | null",
        "base_points": "number",
        "bonus_tiers": []
      }
    ],
    "tile_effects": [
      {
        "id": "uuid",
        "board_tile_id": "uuid",
        "buff_debuff_id": "string",
        "is_active": "boolean",
        "expires_at": "ISO8601 string | null",
        "buff_name": "string",
        "buff_type": "buff | debuff",
        "effect_type": "string",
        "effect_value": "number",
        "buff_icon": "string | null"
      }
    ],
    "row_effects": [
      {
        "id": "uuid",
        "board_id": "uuid",
        "line_type": "row",
        "line_identifier": "string",
        "buff_debuff_id": "string",
        "is_active": "boolean",
        "expires_at": "ISO8601 string | null",
        "buff_name": "string",
        "buff_type": "buff | debuff",
        "effect_type": "string",
        "effect_value": "number",
        "buff_icon": "string | null"
      }
    ],
    "column_effects": [
      {
        "id": "uuid",
        "board_id": "uuid",
        "line_type": "column",
        "line_identifier": "string",
        "buff_debuff_id": "string",
        "is_active": "boolean",
        "expires_at": "ISO8601 string | null",
        "buff_name": "string",
        "buff_type": "buff | debuff",
        "effect_type": "string",
        "effect_value": "number",
        "buff_icon": "string | null"
      }
    ]
  }
}
```

### PATCH `/events/:eventId/teams/:teamId/board`
Update board configuration.

**Request Body (all fields optional):**
```json
{
  "name": "string",
  "description": "string | null",
  "columns": "number",
  "rows": "number",
  "show_row_column_buffs": "boolean",
  "metadata": {
    "show_tile_buffs": "boolean"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated board object */ },
  "message": "Board updated successfully"
}
```

### POST `/events/:eventId/teams/:teamId/board/tiles`
Add a tile to the board.

**Request Body:**
```json
{
  "tile_id": "string (required)",
  "position": "string (required)",
  "custom_points": "number | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "board_id": "uuid",
    "tile_id": "string",
    "position": "string",
    "custom_points": "number | null",
    "is_completed": "boolean",
    "completed_by_team_id": "string | null",
    "completed_at": "ISO8601 string | null",
    "metadata": {}
  },
  "message": "Tile added to board successfully"
}
```

### PATCH `/events/:eventId/teams/:teamId/board/tiles/:tileId`
Update a board tile.

**Request Body (all fields optional):**
```json
{
  "position": "string",
  "custom_points": "number | null",
  "is_completed": "boolean",
  "completed_by_team_id": "string | null",
  "completed_at": "ISO8601 string | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated board tile object */ },
  "message": "Board tile updated successfully"
}
```

### DELETE `/events/:eventId/teams/:teamId/board/tiles/:tileId`
Remove a tile from the board.

**Response:**
```json
{
  "success": true,
  "message": "Tile removed from board successfully",
  "deleted_id": "uuid"
}
```

### POST `/events/:eventId/teams/:teamId/board/tile-buffs`
Apply a buff/debuff to a specific tile.

**Request Body:**
```json
{
  "board_tile_id": "uuid (required)",
  "buff_debuff_id": "string (required)",
  "applied_by": "number | null",
  "expires_at": "ISO8601 string | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "board_tile_id": "uuid",
    "buff_debuff_id": "string",
    "applied_by": "number | null",
    "is_active": "boolean",
    "expires_at": "ISO8601 string | null",
    "applied_at": "ISO8601 string",
    "metadata": {}
  },
  "message": "Effect applied to tile successfully"
}
```

### PATCH `/events/:eventId/teams/:teamId/board/tile-buffs/:effectId`
Update a tile effect.

**Request Body (all fields optional):**
```json
{
  "is_active": "boolean",
  "expires_at": "ISO8601 string | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated tile effect object */ },
  "message": "Tile effect updated successfully"
}
```

### DELETE `/events/:eventId/teams/:teamId/board/tile-buffs/:effectId`
Remove a buff/debuff from a tile.

**Response:**
```json
{
  "success": true,
  "message": "Effect removed from tile successfully",
  "deleted_id": "uuid"
}
```

### POST `/events/:eventId/teams/:teamId/board/line-buffs`
Apply a buff/debuff to a row or column.

**Request Body:**
```json
{
  "line_type": "row | column (required)",
  "line_identifier": "string (required, row number or column letter)",
  "buff_debuff_id": "string (required)",
  "applied_by": "number | null",
  "expires_at": "ISO8601 string | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "board_id": "uuid",
    "line_type": "row | column",
    "line_identifier": "string",
    "buff_debuff_id": "string",
    "applied_by": "number | null",
    "is_active": "boolean",
    "expires_at": "ISO8601 string | null",
    "applied_at": "ISO8601 string",
    "metadata": {}
  },
  "message": "Effect applied to line successfully"
}
```

### PATCH `/events/:eventId/teams/:teamId/board/line-buffs/:effectId`
Update a line effect.

**Request Body (all fields optional):**
```json
{
  "is_active": "boolean",
  "expires_at": "ISO8601 string | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated line effect object */ },
  "message": "Line effect updated successfully"
}
```

### DELETE `/events/:eventId/teams/:teamId/board/line-buffs/:effectId`
Remove a buff/debuff from a row or column.

**Response:**
```json
{
  "success": true,
  "message": "Effect removed from line successfully",
  "deleted_id": "uuid"
}
```

---

## Bingo Tiles Library

### GET `/bingo/tiles`
Get all tiles from the library with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category
- `difficulty` (optional): Filter by difficulty (easy, medium, hard, extreme)
- `is_active` (optional): Filter by active status (true/false)
- `search` (optional): Search in task, description, or id
- `limit` (optional, default: 100): Number of results per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "task": "string",
      "category": "string",
      "difficulty": "easy | medium | hard | extreme",
      "icon": "string | null",
      "description": "string | null",
      "base_points": "number",
      "requirements": {
        "match_type": "all | any",
        "requirements": [
          {
            "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN",
            // ... requirement fields based on type
          }
        ],
        "tiers": [
          {
            "tier": "number",
            "requirement": {
              "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN",
              // ... requirement fields based on type
            }
          }
        ]
      },
      "bonus_tiers": [],
      "metadata": {},
      "is_active": "boolean",
      "created_at": "ISO8601 string",
      "updated_at": "ISO8601 string"
    }
  ],
  "stats": {
    "total": "number",
    "active": "number",
    "easy": "number",
    "medium": "number",
    "hard": "number",
    "extreme": "number"
  },
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

### GET `/bingo/tiles/:id`
Get a single tile by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "task": "string",
    "category": "string",
    "difficulty": "string",
    "icon": "string | null",
    "description": "string | null",
    "base_points": "number",
    "requirements": {
      "match_type": "all | any",
      "requirements": [
        {
          "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN",
          // ... requirement fields based on type
        }
      ],
      "tiers": [
        {
          "tier": "number",
          "requirement": {
            "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN",
            // ... requirement fields based on type
          }
        }
      ]
    },
    "bonus_tiers": [],
    "metadata": {},
    "is_active": "boolean",
    "created_at": "ISO8601 string",
    "updated_at": "ISO8601 string",
    "usage_stats": {
      "used_on_boards": "number",
      "times_completed": "number",
      "total_placements": "number"
    }
  }
}
```

### POST `/bingo/tiles`
Create a new tile in the library.

**Request Body:**
```json
{
  "id": "string (required)",
  "task": "string (required)",
  "category": "string (required)",
  "difficulty": "easy | medium | hard | extreme (required)",
  "icon": "string | null",
  "description": "string | null",
  "base_points": "number (default: 0)",
  "requirements": {
    "match_type": "all | any (required)",
    "requirements": [
      {
        "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN (required)",
        // For ITEM_DROP:
        "item_name": "string",
        "item_id": "number",
        "item_amount": "number",
        // For PET:
        "pet_name": "string",
        "amount": "number",
        // For VALUE_DROP:
        "value": "number",
        // For SPEEDRUN:
        "location": "string",
        "goal_seconds": "number"
      }
    ],
    "tiers": [
      {
        "tier": "number (required, 1, 2, 3, etc.)",
        "requirement": {
          "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN (required)",
          // ... same structure as above
        }
      }
    ]
  },
  "bonus_tiers": [],
  "metadata": {},
  "is_active": "boolean (default: true)"
}
```

**Requirement Types:**

1. **ITEM_DROP**: Track when a specific item is dropped/obtained
   ```json
   {
     "type": "ITEM_DROP",
     "item_name": "Dragon Warhammer",
     "item_id": 13576,
     "item_amount": 1
   }
   ```

2. **PET**: Track when a pet is obtained
   ```json
   {
     "type": "PET",
     "pet_name": "Zulrah",
     "amount": 1
   }
   ```

3. **VALUE_DROP**: Track total value of drops
   ```json
   {
     "type": "VALUE_DROP",
     "value": 1000000
   }
   ```

4. **SPEEDRUN**: Track speedrun completion time
   ```json
   {
     "type": "SPEEDRUN",
     "location": "Zulrah",
     "goal_seconds": 60
   }
   ```

**Examples:**

**Simple requirement (ALL):**
```json
{
  "match_type": "all",
  "requirements": [
    {
      "type": "ITEM_DROP",
      "item_name": "Dragon Warhammer",
      "item_id": 13576,
      "item_amount": 1
    }
  ]
}
```

**Multiple requirements (ANY):**
```json
{
  "match_type": "any",
  "requirements": [
    {
      "type": "ITEM_DROP",
      "item_name": "Dragon Warhammer",
      "item_id": 13576,
      "item_amount": 1
    },
    {
      "type": "PET",
      "pet_name": "Zulrah",
      "amount": 1
    }
  ]
}
```

**Tiered requirements:**
```json
{
  "match_type": "all",
  "requirements": [],
  "tiers": [
    {
      "tier": 1,
      "requirement": {
        "type": "VALUE_DROP",
        "value": 1000000
      }
    },
    {
      "tier": 2,
      "requirement": {
        "type": "VALUE_DROP",
        "value": 5000000
      }
    },
    {
      "tier": 3,
      "requirement": {
        "type": "VALUE_DROP",
        "value": 10000000
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Tile object */ },
  "message": "Tile created successfully"
}
```

### POST `/bingo/tiles/bulk`
Create multiple tiles at once.

**Request Body:**
```json
{
  "tiles": [
    {
      "id": "string (required)",
      "task": "string (required)",
      "category": "string (required)",
      "difficulty": "easy | medium | hard | extreme (required)",
      "icon": "string | null",
      "description": "string | null",
      "base_points": "number",
      "requirements": {
        "match_type": "all | any (required)",
        "requirements": [
          {
            "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN (required)",
            // For ITEM_DROP:
            "item_name": "string",
            "item_id": "number",
            "item_amount": "number",
            // For PET:
            "pet_name": "string",
            "amount": "number",
            // For VALUE_DROP:
            "value": "number",
            // For SPEEDRUN:
            "location": "string",
            "goal_seconds": "number"
          }
        ],
        "tiers": [
          {
            "tier": "number (required, 1, 2, 3, etc.)",
            "requirement": {
              "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN (required)",
              // ... same structure as above
            }
          }
        ]
      },
      "bonus_tiers": [],
      "metadata": {},
      "is_active": "boolean"
    }
  ]
}
```

**Note:** Each tile's requirements follow the same structure as described in POST `/bingo/tiles`. Invalid requirements will be reported in the errors array.

**Response:**
```json
{
  "success": true,
  "data": {
    "created": "number",
    "failed": "number",
    "tiles": [ /* Created tile objects */ ],
    "errors": [
      {
        "index": "number",
        "tile_id": "string",
        "error": "string",
        "validation_errors": []
      }
    ]
  },
  "message": "Created X tiles, Y failed"
}
```

### PATCH `/bingo/tiles/:id`
Update a tile in the library.

**Request Body (all fields optional):**
```json
{
  "task": "string",
  "category": "string",
  "difficulty": "easy | medium | hard | extreme",
  "icon": "string | null",
  "description": "string | null",
  "base_points": "number",
  "requirements": {
    "match_type": "all | any (required if requirements provided)",
    "requirements": [
      {
        "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN (required)",
        // For ITEM_DROP:
        "item_name": "string",
        "item_id": "number",
        "item_amount": "number",
        // For PET:
        "pet_name": "string",
        "amount": "number",
        // For VALUE_DROP:
        "value": "number",
        // For SPEEDRUN:
        "location": "string",
        "goal_seconds": "number"
      }
    ],
    "tiers": [
      {
        "tier": "number (required, 1, 2, 3, etc.)",
        "requirement": {
          "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN (required)",
          // ... same structure as above
        }
      }
    ]
  },
  "bonus_tiers": [],
  "metadata": {},
  "is_active": "boolean"
}
```

**Note:** If updating requirements, the full requirement structure must be provided. Requirements are validated before being saved.

**Response:**
```json
{
  "success": true,
  "data": { /* Updated tile object */ },
  "message": "Tile updated successfully"
}
```

### DELETE `/bingo/tiles/:id`
Delete a tile from the library. Will fail if the tile is used on any boards.

**Response:**
```json
{
  "success": true,
  "message": "Tile deleted successfully",
  "deleted_id": "string"
}
```

### GET `/bingo/tiles/categories/list`
Get list of all unique categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "string",
      "tile_count": "number",
      "active_count": "number"
    }
  ]
}
```

---

## Buffs/Debuffs Library

### GET `/buffs/library`
Get all buffs/debuffs from the library.

**Query Parameters:**
- `type` (optional): Filter by type (buff, debuff)
- `is_active` (optional): Filter by active status (true/false)
- `search` (optional): Search in name, description, or id
- `limit` (optional, default: 100): Number of results per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string | null",
      "type": "buff | debuff",
      "effect_type": "string",
      "effect_value": "number",
      "icon": "string | null",
      "metadata": {},
      "is_active": "boolean",
      "created_at": "ISO8601 string",
      "updated_at": "ISO8601 string"
    }
  ],
  "stats": {
    "total": "number",
    "active": "number",
    "buffs": "number",
    "debuffs": "number"
  },
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

### GET `/buffs/library/:id`
Get a single buff/debuff by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string | null",
    "type": "buff | debuff",
    "effect_type": "string",
    "effect_value": "number",
    "icon": "string | null",
    "metadata": {},
    "is_active": "boolean",
    "created_at": "ISO8601 string",
    "updated_at": "ISO8601 string",
    "usage_stats": {
      "applied_to_tiles": "number",
      "applied_to_rows": "number",
      "applied_to_columns": "number"
    }
  }
}
```

### POST `/buffs/library`
Create a new buff/debuff in the library.

**Request Body:**
```json
{
  "id": "string (required)",
  "name": "string (required)",
  "description": "string | null",
  "type": "buff | debuff (required)",
  "effect_type": "string (required)",
  "effect_value": "number (required)",
  "icon": "string | null",
  "metadata": {},
  "is_active": "boolean (default: true)"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Buff/debuff object */ },
  "message": "Buff/debuff created successfully"
}
```

### PATCH `/buffs/library/:id`
Update a buff/debuff in the library.

**Request Body (all fields optional):**
```json
{
  "name": "string",
  "description": "string | null",
  "type": "buff | debuff",
  "effect_type": "string",
  "effect_value": "number",
  "icon": "string | null",
  "metadata": {},
  "is_active": "boolean"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated buff/debuff object */ },
  "message": "Buff/debuff updated successfully"
}
```

### DELETE `/buffs/library/:id`
Delete a buff/debuff from the library. Will fail if the buff/debuff is applied to any board elements.

**Response:**
```json
{
  "success": true,
  "message": "Buff/debuff deleted successfully",
  "deleted_id": "string"
}
```

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Error message",
  "required": ["field1", "field2"],
  "valid_types": ["type1", "type2"]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Resource not found"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "error": "Conflict message",
  "message": "Detailed explanation"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to perform operation",
  "message": "Error details"
}
```

---

## Notes

1. All timestamps are in ISO8601 format.
2. All UUIDs are standard UUID v4 format.
3. All `metadata` fields accept arbitrary JSON objects.
4. When creating/updating resources, only include fields you want to set. Omitted fields will remain unchanged (for updates) or use defaults (for creates).
5. The `show_tile_buffs` setting in board metadata controls whether tile buffs are visible to app users. If `false`, only active buffs are shown.
6. Position format for tiles: Typically "A1", "B2", etc. (column letter + row number).
7. Line identifiers: Rows use numbers (1, 2, 3...), columns use letters (A, B, C...).

