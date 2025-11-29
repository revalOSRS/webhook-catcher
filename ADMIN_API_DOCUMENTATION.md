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

## Event Registrations

Manage member registrations for events. Members must be registered before they can be added to teams.

### GET `/events/:eventId/registrations`
Get all registrations for an event.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `confirmed`, `cancelled`)
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "member_id": "number",
      "osrs_account_id": "number | null",
      "status": "string",
      "metadata": {},
      "registered_at": "ISO8601 string",
      "discord_id": "string",
      "discord_username": "string | null",
      "discord_name": "string | null",
      "discord_discriminator": "string | null",
      "discord_avatar": "string | null",
      "osrs_account_name": "string | null",
      "osrs_account_type": "string | null"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

### GET `/events/:eventId/registrations/available`
Get list of members available to register (not yet registered for this event).

**Query Parameters:**
- `search` (optional): Filter by username/name
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "number",
      "discord_id": "string",
      "discord_username": "string | null",
      "discord_name": "string | null",
      "discord_discriminator": "string | null",
      "discord_avatar": "string | null",
      "osrs_accounts": [
        {
          "id": "number",
          "osrs_nickname": "string",
          "account_type": "string"
        }
      ]
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

### POST `/events/:eventId/registrations`
Register a member for an event.

**Request Body:**
```json
{
  "member_id": "number (required)",
  "osrs_account_id": "number | null (optional, must belong to member)",
  "status": "string (optional, default: 'pending')",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "event_id": "uuid",
    "member_id": "number",
    "osrs_account_id": "number | null",
    "status": "string",
    "metadata": {},
    "registered_at": "ISO8601 string",
    "registered_by": "number | null"
  },
  "message": "Member registered successfully"
}
```

### PATCH `/events/:eventId/registrations/:id`
Update a registration.

**Request Body (all fields optional):**
```json
{
  "status": "string",
  "osrs_account_id": "number | null",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated registration object */ },
  "message": "Registration updated successfully"
}
```

### DELETE `/events/:eventId/registrations/:id`
Remove a registration.

**Response:**
```json
{
  "success": true,
  "message": "Registration removed successfully",
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
        "bonus_tiers": [],
        "requirements": { /* tile requirements object */ },
        "progress_entries": [
          {
            "id": "uuid",
            "osrs_account_id": "number | null",
            "progress_value": "number",
            "progress_metadata": {
              "count": "number",
              "current_value": "number",
              "target_value": "number",
              "last_update_at": "ISO8601 string",
              "last_items_obtained": [ /* array of items */ ],
              // For tiered requirements:
              "completed_tiers": [1, 2, 3], // Array of completed tier numbers
              "total_tiers": "number", // Total number of tiers
              "completed_tiers_count": "number", // Number of completed tiers
              "tier_1_progress": "number", // Progress value for tier 1
              "tier_1_metadata": {}, // Metadata for tier 1
              "tier_1_completed_at": "ISO8601 string | null", // When tier 1 was completed
              "tier_2_progress": "number", // Progress value for tier 2
              "tier_2_metadata": {},
              "tier_2_completed_at": "ISO8601 string | null",
              // ... additional tiers as needed
              "current_tier": "number", // Currently active tier being tracked
              "current_tier_progress": "number" // Progress for current tier
            },
            "completion_type": "auto | manual_admin | null",
            "completed_at": "ISO8601 string | null",
            "completed_by_osrs_account_id": "number | null",
            "completed_by_member_id": "number | null",
            "recorded_at": "ISO8601 string"
          }
        ]
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

### POST `/events/:eventId/teams/:teamId/board/tiles/:tileId/complete`
Manually mark a tile as completed (admin action). Use this for tiles that need manual verification (e.g., from Discord screenshots).

**Request Body:**
```json
{
  "completion_type": "manual_admin (default: 'manual_admin')",
  "completed_by_osrs_account_id": "number | null (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_completed": true,
    "completed_at": "ISO8601 string",
    /* ... other tile fields ... */
  },
  "message": "Tile marked as completed successfully"
}
```

**Note:** Creates or updates a progress entry with `completion_type: 'manual_admin'`. Progress data is preserved.

### POST `/events/:eventId/teams/:teamId/board/tiles/:tileId/revert`
Revert a completed tile back to incomplete (admin action). Use this if a tile was completed incorrectly.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_completed": false,
    "completed_at": null,
    /* ... other tile fields ... */
  },
  "message": "Tile reverted successfully"
}
```

**Note:** Progress data is preserved, only completion flags are removed.

---

## Team Progress

### GET `/events/:eventId/teams/:teamId/progress`
Get team progress summary including completed tiles, total progress, and member contributions.

**Response:**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "uuid",
      "name": "string",
      "score": "number"
    },
    "total_tiles": "number",
    "completed_tiles": "number",
    "completion_percentage": "number",
    "total_progress_value": "number",
    "tiles_with_progress": "number",
    "member_contributions": [
      {
        "team_member_id": "uuid",
        "member_id": "number",
        "discord_tag": "string | null",
        "discord_avatar": "string | null",
        "osrs_account_id": "number | null",
        "osrs_account_name": "string | null",
        "osrs_account_type": "string | null",
        "tiles_completed": "number",
        "total_progress_contributed": "number",
        "tiles_contributed_to": "number"
      }
    ]
  }
}
```

### GET `/events/:eventId/teams/:teamId/progress/tiles`
Get detailed tile progress for team with all progress entries. Includes tier tracking information for tiered requirements.

**Query Parameters:**
- `completed_only` (optional, boolean): Filter to only completed tiles
- `limit` (optional, default: 50): Number of results per page
- `offset` (optional, default: 0): Pagination offset

**Note:** For tiles with tiered requirements (`requirements.tiers`), the `progress_metadata` will include tier-specific tracking:
- `completed_tiers`: Array of tier numbers that have been completed (e.g., `[1]` if only tier 1 is done, `[1, 2, 3]` if all tiers are done)
- `tier_N_progress`: Progress value for each tier N
- `tier_N_metadata`: Full metadata for each tier N
- `tier_N_completed_at`: Timestamp when tier N was completed
- The tile is marked `is_completed: true` when ANY tier is completed, but all tiers continue to be tracked

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "board_id": "uuid",
      "tile_id": "string",
      "position": "string",
      "custom_points": "number | null",
      "is_completed": "boolean",
      "completed_at": "ISO8601 string | null",
      "metadata": {},
      "task": "string",
      "category": "string",
      "difficulty": "string",
      "icon": "string | null",
      "description": "string | null",
      "base_points": "number",
      "bonus_tiers": [],
      "requirements": { /* tile requirements object */ },
      "progress_entries": [
        {
          "id": "uuid",
          "osrs_account_id": "number | null",
          "progress_value": "number",
          "progress_metadata": {
            "count": "number",
            "current_value": "number",
            "target_value": "number",
            "last_update_at": "ISO8601 string",
            "last_items_obtained": [ /* array of items */ ],
            // For tiered requirements (when tile.requirements.tiers exists):
            "completed_tiers": [1, 2, 3], // Array of completed tier numbers (e.g., [1] if only tier 1 is done)
            "total_tiers": "number", // Total number of tiers defined in requirements
            "completed_tiers_count": "number", // Number of completed tiers
            "tier_1_progress": "number", // Progress value for tier 1 (e.g., 1 if Bones obtained)
            "tier_1_metadata": {
              "count": "number",
              "current_value": "number",
              "target_value": "number",
              "last_items_obtained": []
            }, // Full metadata for tier 1
            "tier_1_completed_at": "ISO8601 string | null", // When tier 1 was completed
            "tier_2_progress": "number", // Progress value for tier 2 (e.g., 0 if Wolf Bones not obtained)
            "tier_2_metadata": {},
            "tier_2_completed_at": "ISO8601 string | null",
            "tier_3_progress": "number",
            "tier_3_metadata": {},
            "tier_3_completed_at": "ISO8601 string | null",
            // ... additional tiers as needed (tier_4_progress, tier_5_progress, etc.)
            "current_tier": "number", // Currently active tier being tracked in this update
            "current_tier_progress": "number" // Progress for current tier
          },
          "completion_type": "auto | manual_admin | null",
          "completed_at": "ISO8601 string | null",
          "completed_by_osrs_account_id": "number | null",
          "recorded_at": "ISO8601 string"
        }
      ]
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

### GET `/events/:eventId/teams/:teamId/progress/members`
Get individual member contributions to team progress.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "team_member_id": "uuid",
      "role": "string",
      "individual_score": "number",
      "member_id": "number",
      "discord_tag": "string | null",
      "discord_avatar": "string | null",
      "osrs_account_id": "number | null",
      "osrs_account_name": "string | null",
      "osrs_account_type": "string | null",
      "tiles_completed": "number",
      "total_progress_contributed": "number",
      "tiles_contributed_to": "number"
    }
  ]
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
            "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION",
            // ... requirement fields based on type
          }
        ],
        "tiers": [
          {
            "tier": "number",
            "requirement": {
              "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION",
              // ... requirement fields based on type
            }
          }
        ]
      },
      "bonus_tiers": [
      // ONLY for value-based thresholds (e.g., "get 10 items", "get 100k xp")
      // For tiered requirements, use points directly in requirements.tiers[].points
      {
        "threshold": "10_items",
        "requirementValue": 10,
        "points": 5
      }
    ],
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
          "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION",
          // ... requirement fields based on type
        }
      ],
      "tiers": [
        {
          "tier": "number",
          "requirement": {
            "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION",
            // ... requirement fields based on type
          }
        }
      ]
    },
    "bonus_tiers": [
      // ONLY for value-based thresholds (e.g., "get 10 items", "get 100k xp")
      // For tiered requirements, use points directly in requirements.tiers[].points
      {
        "threshold": "10_items",
        "requirementValue": 10,
        "points": 5
      }
    ],
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
        "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION (required)",
        // For ITEM_DROP (single item format):
        "item_name": "string (required for single item)",
        "item_id": "number (required for single item)",
        "item_amount": "number (required for single item)",
        // OR for ITEM_DROP (multiple items format):
        "items": "array of { item_name: string, item_id: number } (required for multiple items)",
        "total_amount": "number (required for multiple items)",
        // For PET:
        "pet_name": "string",
        "amount": "number",
        // For VALUE_DROP:
        "value": "number",
        // For SPEEDRUN:
        "location": "string",
        "goal_seconds": "number",
        // For EXPERIENCE:
        "skill": "string",
        "experience": "number",
        // For BA_GAMBLES:
        "amount": "number"
      }
    ],
    "tiers": [
      {
        "tier": "number (required, 1, 2, 3, etc.)",
        "requirement": {
          "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION (required)",
          // ... same structure as above
        },
        "points": "number (required) - Points awarded when this tier is completed"
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
   
   **Single item format:**
   ```json
   {
     "type": "ITEM_DROP",
     "item_name": "Dragon Warhammer",
     "item_id": 13576,
     "item_amount": 1
   }
   ```
   
   **Multiple items format (get X amount of any combination):**
   ```json
   {
     "type": "ITEM_DROP",
     "items": [
       { "item_name": "Dragon Warhammer", "item_id": 13576 },
       { "item_name": "Dragon Claws", "item_id": 13652 },
       { "item_name": "Dragon Crossbow", "item_id": 21902 },
       { "item_name": "Dragon Hunter Lance", "item_id": 22978 },
       { "item_name": "Dragon Harpoon", "item_id": 21028 }
     ],
     "total_amount": 2
   }
   ```
   This example requires getting 2 items total, which can be any combination of the 5 listed items (e.g., 2 Dragon Warhammers, or 1 Dragon Warhammer + 1 Dragon Claws, etc.).

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

5. **EXPERIENCE**: Track experience gained in a specific skill
   ```json
   {
     "type": "EXPERIENCE",
     "skill": "Attack",
     "experience": 1000000
   }
   ```
   - `skill`: Skill name (e.g., "Attack", "Strength", "Magic", "Ranged", etc.)
   - `experience`: Amount of experience required (positive number)

6. **BA_GAMBLES**: Track Barbarian Assault gambles completed
   ```json
   {
     "type": "BA_GAMBLES",
     "amount": 10
   }
   ```
   - `amount`: Number of gambles required (positive number)

7. **UNIQUE_COLLECTION**: Track unique items with two collection modes:
   
   **MULTI_SOURCE mode** (default): Get unique items from different sources (e.g., unique drops from different bosses)
   
   **Example 1: Simple (1 item per boss, different boss per tier)**
   ```json
   {
     "type": "UNIQUE_COLLECTION",
     "collection_mode": "MULTI_SOURCE",
     "sources": [
       {
         "source_name": "Boss A",
         "items": [
           { "item_name": "Unique A1", "item_id": 12345 }
         ]
       },
       {
         "source_name": "Boss B",
         "items": [
           { "item_name": "Unique B1", "item_id": 23456 }
         ]
       },
       {
         "source_name": "Boss C",
         "items": [
           { "item_name": "Unique C1", "item_id": 34567 }
         ]
       },
       {
         "source_name": "Boss D",
         "items": [
           { "item_name": "Unique D1", "item_id": 45678 }
         ]
       }
     ],
     "base_requirement": 1,
     "tier_increment": 1
   }
   ```
   - **Tier 1**: Get 1 item from any boss (A, B, C, or D)
   - **Tier 2**: Get 1 item from a different boss (not the one used in Tier 1)
   - **Tier 3**: Get 1 item from another different boss (not used in Tier 1 or 2)
   - **Tier 4**: Get 1 item from the last remaining boss
   
   **Note**: With `base_requirement: 1` and `allow_same_source_across_tiers: false` (default), each tier requires 1 item from a different source. The `tier_increment` is ignored in this mode.
   
   **Example 2: Progressive items per boss (4 bosses, 4 items each, different boss per tier)**
   ```json
   {
     "type": "UNIQUE_COLLECTION",
     "collection_mode": "MULTI_SOURCE",
     "sources": [
       {
         "source_name": "Boss A",
         "items": [
           { "item_name": "Item A1", "item_id": 11111 },
           { "item_name": "Item A2", "item_id": 11112 },
           { "item_name": "Item A3", "item_id": 11113 },
           { "item_name": "Item A4", "item_id": 11114 }
         ]
       },
       {
         "source_name": "Boss B",
         "items": [
           { "item_name": "Item B1", "item_id": 22221 },
           { "item_name": "Item B2", "item_id": 22222 },
           { "item_name": "Item B3", "item_id": 22223 },
           { "item_name": "Item B4", "item_id": 22224 }
         ]
       },
       {
         "source_name": "Boss C",
         "items": [
           { "item_name": "Item C1", "item_id": 33331 },
           { "item_name": "Item C2", "item_id": 33332 },
           { "item_name": "Item C3", "item_id": 33333 },
           { "item_name": "Item C4", "item_id": 33334 }
         ]
       },
       {
         "source_name": "Boss D",
         "items": [
           { "item_name": "Item D1", "item_id": 44441 },
           { "item_name": "Item D2", "item_id": 44442 },
           { "item_name": "Item D3", "item_id": 44443 },
           { "item_name": "Item D4", "item_id": 44444 }
         ]
       }
     ],
     "base_requirement": 1,
     "tier_increment": 1,
     "require_all_for_final_source": true
   }
   ```
   - **Base**: Get 1 item from any boss (any of Boss A's 4 items)
   - **Tier 2**: Get 2 items from a different boss (any 2 of Boss B's 4 items)
   - **Tier 3**: Get 3 items from another different boss (any 3 of Boss C's 4 items)
   - **Tier 4**: Get all 4 items from the last remaining boss (all 4 of Boss D's items)
   
   Each tier requires getting items from a source you haven't completed yet.
   
   **Example 3: Progressive items from any boss (same boss allowed across tiers)**
   ```json
   {
     "type": "UNIQUE_COLLECTION",
     "collection_mode": "MULTI_SOURCE",
     "sources": [
       {
         "source_name": "Boss A",
         "items": [
           { "item_name": "Item A1", "item_id": 11111 },
           { "item_name": "Item A2", "item_id": 11112 },
           { "item_name": "Item A3", "item_id": 11113 },
           { "item_name": "Item A4", "item_id": 11114 }
         ]
       },
       {
         "source_name": "Boss B",
         "items": [
           { "item_name": "Item B1", "item_id": 22221 },
           { "item_name": "Item B2", "item_id": 22222 },
           { "item_name": "Item B3", "item_id": 22223 },
           { "item_name": "Item B4", "item_id": 22224 }
         ]
       },
       {
         "source_name": "Boss C",
         "items": [
           { "item_name": "Item C1", "item_id": 33331 },
           { "item_name": "Item C2", "item_id": 33332 },
           { "item_name": "Item C3", "item_id": 33333 },
           { "item_name": "Item C4", "item_id": 33334 }
         ]
       },
       {
         "source_name": "Boss D",
         "items": [
           { "item_name": "Item D1", "item_id": 44441 },
           { "item_name": "Item D2", "item_id": 44442 },
           { "item_name": "Item D3", "item_id": 44443 },
           { "item_name": "Item D4", "item_id": 44444 }
         ]
       }
     ],
     "base_requirement": 1,
     "tier_increment": 1,
     "allow_same_source_across_tiers": true
   }
   ```
   - **Base**: Get 1 item from any boss (any of the 16 items total)
   - **Tier 2**: Get 2 items total from any boss(es) (could be 2 from Boss A, or 1 from A and 1 from B, etc.)
   - **Tier 3**: Get 4 items total from any boss(es) (could be all 4 from Boss A, or mix from different bosses)
   
   With `allow_same_source_across_tiers: true`, items can come from the same boss across tiers. The system tracks total unique items collected across all sources.
   
   **PROGRESSIVE mode**: Get progressively more unique items from the same source/set (e.g., Moons of Peril)
   ```json
   {
     "type": "UNIQUE_COLLECTION",
     "collection_mode": "PROGRESSIVE",
     "sources": [
       {
         "source_name": "Moons of Peril",
         "items": [
           { "item_name": "Moon 1", "item_id": 11111 },
           { "item_name": "Moon 2", "item_id": 22222 },
           { "item_name": "Moon 3", "item_id": 33333 },
           { "item_name": "Moon 4", "item_id": 44444 }
         ]
       }
     ],
     "base_requirement": 1,
     "tier_increment": 1,
     "require_all_for_final_tier": true
   }
   ```
   - **Base requirement**: Get 1 unique item from the set
   - **Tier 2**: Get 2 unique items from the set (total, can be any 2 different items)
   - **Tier 3**: Get ALL items from the set (all 4 moons)
   
   With `require_all_for_final_tier: true`, the final tier requires collecting all items. Without it, tier 3 would require `base_requirement + (2 * tier_increment)` = 3 items.

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

**Multiple items requirement (get X of any combination):**
```json
{
  "match_type": "all",
  "requirements": [
    {
      "type": "ITEM_DROP",
      "items": [
        { "item_name": "Dragon Warhammer", "item_id": 13576 },
        { "item_name": "Dragon Claws", "item_id": 13652 },
        { "item_name": "Dragon Crossbow", "item_id": 21902 }
      ],
      "total_amount": 2
    }
  ]
}
```
This requires getting 2 items total, which can be any combination of the 3 listed items.

**Unique collection requirement - MULTI_SOURCE mode (different sources per tier):**

**Simple example (1 item per boss):**
```json
{
  "match_type": "all",
  "requirements": [
    {
      "type": "UNIQUE_COLLECTION",
      "collection_mode": "MULTI_SOURCE",
      "sources": [
        {
          "source_name": "Boss A",
          "items": [
            { "item_name": "Unique A", "item_id": 12345 }
          ]
        },
        {
          "source_name": "Boss B",
          "items": [
            { "item_name": "Unique B", "item_id": 23456 }
          ]
        },
        {
          "source_name": "Boss C",
          "items": [
            { "item_name": "Unique C", "item_id": 34567 }
          ]
        },
        {
          "source_name": "Boss D",
          "items": [
            { "item_name": "Unique D", "item_id": 45678 }
          ]
        }
      ],
      "base_requirement": 1,
      "tier_increment": 1
    }
  ]
}
```
- **Base**: Get 1 unique from any boss (A, B, C, or D)
- **Tier 2**: Get 1 unique from a different boss
- **Tier 3**: Get 1 unique from another different boss
- **Tier 4**: Get 1 unique from the last remaining boss

**Progressive example (4 bosses, 4 items each - progressive items per tier):**
```json
{
  "match_type": "all",
  "requirements": [
    {
      "type": "UNIQUE_COLLECTION",
      "collection_mode": "MULTI_SOURCE",
      "sources": [
        {
          "source_name": "Boss A",
          "items": [
            { "item_name": "Item A1", "item_id": 11111 },
            { "item_name": "Item A2", "item_id": 11112 },
            { "item_name": "Item A3", "item_id": 11113 },
            { "item_name": "Item A4", "item_id": 11114 }
          ]
        },
        {
          "source_name": "Boss B",
          "items": [
            { "item_name": "Item B1", "item_id": 22221 },
            { "item_name": "Item B2", "item_id": 22222 },
            { "item_name": "Item B3", "item_id": 22223 },
            { "item_name": "Item B4", "item_id": 22224 }
          ]
        },
        {
          "source_name": "Boss C",
          "items": [
            { "item_name": "Item C1", "item_id": 33331 },
            { "item_name": "Item C2", "item_id": 33332 },
            { "item_name": "Item C3", "item_id": 33333 },
            { "item_name": "Item C4", "item_id": 33334 }
          ]
        },
        {
          "source_name": "Boss D",
          "items": [
            { "item_name": "Item D1", "item_id": 44441 },
            { "item_name": "Item D2", "item_id": 44442 },
            { "item_name": "Item D3", "item_id": 44443 },
            { "item_name": "Item D4", "item_id": 44444 }
          ]
        }
      ],
      "base_requirement": 1,
      "tier_increment": 1,
      "require_all_for_final_source": true
    }
  ]
}
```
- **Base**: Get 1 item from any boss (any of Boss A's 4 items)
- **Tier 2**: Get 2 items from a different boss (any 2 of Boss B's 4 items)
- **Tier 3**: Get 3 items from another different boss (any 3 of Boss C's 4 items)
- **Tier 4**: Get all 4 items from the last remaining boss (all 4 of Boss D's items)

**Unique collection requirement - PROGRESSIVE mode (progressive collection from same set):**
```json
{
  "match_type": "all",
  "requirements": [
    {
      "type": "UNIQUE_COLLECTION",
      "collection_mode": "PROGRESSIVE",
      "sources": [
        {
          "source_name": "Moons of Peril",
          "items": [
            { "item_name": "Moon 1", "item_id": 11111 },
            { "item_name": "Moon 2", "item_id": 22222 },
            { "item_name": "Moon 3", "item_id": 33333 },
            { "item_name": "Moon 4", "item_id": 44444 }
          ]
        }
      ],
      "base_requirement": 1,
      "tier_increment": 1,
      "require_all_for_final_tier": true
    }
  ]
}
```
This creates automatic tiers:
- **Base**: Get 1 unique item from the set (any moon)
- **Tier 2**: Get 2 unique items from the set (any 2 different moons)
- **Tier 3**: Get ALL items from the set (all 4 moons)

**Tiered requirements (manual tiers with points):**
```json
{
  "match_type": "all",
  "requirements": [], // Empty when using tiers
  "tiers": [
    {
      "tier": 1,
      "requirement": {
        "type": "SPEEDRUN",
        "location": "Inferno",
        "goal_seconds": 7200
      },
      "points": 10
    },
    {
      "tier": 2,
      "requirement": {
        "type": "SPEEDRUN",
        "location": "Inferno",
        "goal_seconds": 4800
      },
      "points": 15
    },
    {
      "tier": 3,
      "requirement": {
        "type": "SPEEDRUN",
        "location": "Inferno",
        "goal_seconds": 3900
      },
      "points": 20
    }
  ]
}
```
**How it works:**
- If someone completes Inferno in 3000 seconds (50 minutes):
  - They beat tier 3 (3900s) → Award 20 points
  - They beat tier 2 (4800s) → Award 15 points
  - They beat tier 1 (7200s) → Award 10 points
  - **Total: 45 points** (all tiers achieved)
- If someone completes in 5000 seconds:
  - They beat tier 2 (4800s) → Award 15 points
  - They beat tier 1 (7200s) → Award 10 points
  - **Total: 25 points** (tiers 1 and 2 achieved)

**Note:** When using `tiers`, the `requirements` array should be empty. Points are defined directly in each tier. The `bonus_tiers` array is NOT used for tiered requirements - it's only for value-based thresholds (e.g., "get 10 items").

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
            "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION (required)",
            // For ITEM_DROP (single item format):
            "item_name": "string (required for single item)",
            "item_id": "number (required for single item)",
            "item_amount": "number (required for single item)",
            // OR for ITEM_DROP (multiple items format):
            "items": "array of { item_name: string, item_id: number } (required for multiple items)",
            "total_amount": "number (required for multiple items)",
            // For PET:
            "pet_name": "string",
            "amount": "number",
            // For VALUE_DROP:
            "value": "number",
            // For SPEEDRUN:
            "location": "string",
            "goal_seconds": "number",
            // For EXPERIENCE:
            "skill": "string",
            "experience": "number",
            // For BA_GAMBLES:
            "amount": "number"
          }
        ],
        "tiers": [
          {
            "tier": "number (required, 1, 2, 3, etc.)",
            "requirement": {
              "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION (required)",
              // ... same structure as above
            },
            "points": "number (required) - Points awarded when this tier is completed"
          }
        ]
      },
      "bonus_tiers": [
      // ONLY for value-based thresholds (e.g., "get 10 items", "get 100k xp")
      // For tiered requirements, use points directly in requirements.tiers[].points
      {
        "threshold": "10_items",
        "requirementValue": 10,
        "points": 5
      }
    ],
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
        "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION (required)",
        // For ITEM_DROP (single item format):
        "item_name": "string (required for single item)",
        "item_id": "number (required for single item)",
        "item_amount": "number (required for single item)",
        // OR for ITEM_DROP (multiple items format):
        "items": "array of { item_name: string, item_id: number } (required for multiple items)",
        "total_amount": "number (required for multiple items)",
        // For PET:
        "pet_name": "string",
        "amount": "number",
        // For VALUE_DROP:
        "value": "number",
        // For SPEEDRUN:
        "location": "string",
        "goal_seconds": "number",
        // For EXPERIENCE:
        "skill": "string",
        "experience": "number",
        // For BA_GAMBLES:
        "amount": "number"
      }
    ],
    "tiers": [
      {
        "tier": "number (required, 1, 2, 3, etc.)",
        "requirement": {
          "type": "ITEM_DROP | PET | VALUE_DROP | SPEEDRUN | EXPERIENCE | BA_GAMBLES | UNIQUE_COLLECTION (required)",
          // ... same structure as above
        },
        "points": "number (required) - Points awarded when this tier is completed"
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
8. **Requirements vs Tiers vs Bonus Tiers:**
   - Use `requirements` array for simple, non-tiered requirements (e.g., "get 1 Dragon Warhammer").
   - Use `tiers` array for tiered requirements where each tier has different criteria (e.g., speedrun tiers with different time goals). Each tier MUST include `points`.
   - Use `bonus_tiers` ONLY for value-based thresholds on non-tiered requirements (e.g., "get 10 items" awards bonus points at milestones).
   - When using `tiers`, the `requirements` array should typically be empty (unless you want a base requirement in addition to tiers).
9. **UNIQUE_COLLECTION** requirements create dynamic tiers based on the number of sources. Points for these tiers should be defined in `bonus_tiers` using the `tier` field (e.g., `{ "tier": 1, "points": 4 }`).
10. **Tiered Requirements Progress Tracking:**
    - For tiles with `requirements.tiers`, progress is tracked per tier
    - Each tier's progress is stored in `progress_metadata.tier_N_progress` and `progress_metadata.tier_N_metadata`
    - Completed tiers are tracked in `progress_metadata.completed_tiers` array
    - The tile is marked `is_completed: true` when ANY tier is completed (so points are awarded immediately)
    - All tiers continue to be tracked even after the tile is marked complete, allowing players to complete additional tiers for more points
    - Check `progress_metadata.completed_tiers` to see which tiers have been completed
    - Check `progress_metadata.total_tiers` to see how many tiers exist
    - Example: If a tile has 3 tiers and only tier 1 is done, `completed_tiers: [1]`, `completed_tiers_count: 1`, `total_tiers: 3`
    
    **Frontend Display Guide for Tiered Tiles:**
    ```javascript
    // Check if tile has tiered requirements
    const hasTiers = tile.requirements?.tiers && tile.requirements.tiers.length > 0;
    
    if (hasTiers) {
      // Get tier progress from progress_entries[0].progress_metadata
      const metadata = tile.progress_entries[0]?.progress_metadata || {};
      const completedTiers = metadata.completed_tiers || [];
      const totalTiers = metadata.total_tiers || tile.requirements.tiers.length;
      
      // Display progress for each tier
      tile.requirements.tiers.forEach((tier, index) => {
        const tierNum = tier.tier;
        const isCompleted = completedTiers.includes(tierNum);
        const tierProgress = metadata[`tier_${tierNum}_progress`] || 0;
        const tierMetadata = metadata[`tier_${tierNum}_metadata`] || {};
        
        // Show tier status: completed, in progress, or not started
        console.log(`Tier ${tierNum}: ${isCompleted ? '✓ Completed' : tierProgress > 0 ? 'In Progress' : 'Not Started'}`);
        console.log(`  Progress: ${tierProgress}/${tierMetadata.target_value || tier.requirement.item_amount || 1}`);
        console.log(`  Points: ${tier.points}`);
      });
      
      // Show overall completion status
      console.log(`Tile Status: ${tile.is_completed ? 'Completed' : 'In Progress'}`);
      console.log(`Tiers Completed: ${completedTiers.length}/${totalTiers}`);
    }
    ```

---

## Important Notes

### Board Initialization
When an event status is changed to `active` via `PATCH /events/:id`, boards are automatically created for all teams in the event. The boards are created from the generic board configuration stored in `event.config.board`. This includes:
- Board structure (columns, rows, name, description)
- All tiles from `config.board.tiles` array
- Row effects from `config.board.row_effects` array
- Column effects from `config.board.column_effects` array
- Tile effects from `config.board.tile_effects` array

### Dink Event Processing
Dink webhook events are automatically processed for tile progress tracking. Events from players participating in active bingo events:
- Are processed for tile progress tracking
- Skip Discord notifications (to avoid spam)
- Still update the activity cache

Events from non-bingo participants follow the normal flow (Discord filtering, notifications, etc.).

