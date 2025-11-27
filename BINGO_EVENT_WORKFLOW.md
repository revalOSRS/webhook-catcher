# Bingo Event Creation and Management Workflow

This document describes the complete workflow for creating and managing bingo events, including all admin endpoints and the step-by-step process.

## Table of Contents

1. [Overview](#overview)
2. [Event Creation Workflow](#event-creation-workflow)
3. [Event Registration System](#event-registration-system)
4. [Team Management](#team-management)
5. [Board Configuration](#board-configuration)
6. [Progress Tracking](#progress-tracking)
7. [Manual Tile Management](#manual-tile-management)
8. [API Endpoints Reference](#api-endpoints-reference)

---

## Overview

The bingo event system allows admins to:
1. Create events with bingo board configurations
2. Register members for events
3. Create teams and assign members
4. Configure team-specific bingo boards
5. Track tile progress automatically via game events
6. Manually complete/revert tiles when needed
7. View team progress and member contributions

### Key Concepts

- **Event**: The main container for a bingo competition
- **Registration**: Members signing up for an event (manual for now, automatic later)
- **Team**: A group of members competing together
- **Board**: A team-specific bingo board with tiles
- **Tile**: A task/requirement on the board
- **Progress**: Tracking completion status and progress values for tiles

---

## Event Creation Workflow

### Step 1: Create Event (Draft Status)

Create a new event with `status: 'draft'`. The event config should include the generic board template.

**Endpoint:** `POST /api/admin/clan-events/events`

**Request Body:**
```json
{
  "name": "Winter Bingo 2025",
  "description": "A fun winter bingo competition",
  "event_type": "bingo",
  "status": "draft",
  "start_date": "2025-02-01T00:00:00Z",
  "end_date": "2025-02-28T23:59:59Z",
  "config": {
    "board": {
      "columns": 5,
      "rows": 5,
      "name": "Winter Bingo Board",
      "description": "Complete tasks to win!",
      "show_row_column_buffs": true,
      "show_tile_buffs": true,
      "tiles": [],
      "row_effects": [],
      "column_effects": [],
      "tile_effects": [],
      "metadata": {}
    }
  },
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Winter Bingo 2025",
    "event_type": "bingo",
    "status": "draft",
    "start_date": "2025-02-01T00:00:00Z",
    "end_date": "2025-02-28T23:59:59Z",
    "config": { /* board config */ },
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

**Note:** Keep the event in `draft` status until teams are configured.

---

### Step 2: Register Members for Event

Before creating teams, register members who will participate in the event.

#### 2a. View Available Members

Get a list of members who are NOT yet registered for the event.

**Endpoint:** `GET /api/admin/clan-events/events/:eventId/registrations/available`

**Query Params:**
- `search` (optional): Filter by username/name
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "discord_id": "123456789",
      "discord_username": "player1",
      "discord_name": "Player One",
      "discord_avatar": "https://...",
      "osrs_accounts": [
        {
          "id": 456,
          "osrs_nickname": "Player1",
          "account_type": "main"
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

#### 2b. Register a Member

**Endpoint:** `POST /api/admin/clan-events/events/:eventId/registrations`

**Request Body:**
```json
{
  "member_id": 123,
  "osrs_account_id": 456,
  "status": "pending",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "registration-uuid",
    "event_id": "event-uuid",
    "member_id": 123,
    "osrs_account_id": 456,
    "status": "pending",
    "registered_at": "2025-01-15T10:05:00Z"
  }
}
```

**Note:** `osrs_account_id` is optional but recommended for progress tracking.

#### 2c. View All Registrations

**Endpoint:** `GET /api/admin/clan-events/events/:eventId/registrations`

**Query Params:**
- `status` (optional): Filter by status (`pending`, `confirmed`, `cancelled`)
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "registration-uuid",
      "event_id": "event-uuid",
      "member_id": 123,
      "osrs_account_id": 456,
      "status": "pending",
      "discord_username": "player1",
      "discord_name": "Player One",
      "osrs_account_name": "Player1",
      "registered_at": "2025-01-15T10:05:00Z"
    }
  ]
}
```

---

### Step 3: Create Teams

Create teams for the event. Each team will get its own bingo board.

**Endpoint:** `POST /api/admin/clan-events/teams`

**Request Body:**
```json
{
  "event_id": "event-uuid",
  "name": "Team Alpha",
  "color": "#FF5733",
  "icon": "⚔️",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "team-uuid",
    "event_id": "event-uuid",
    "name": "Team Alpha",
    "color": "#FF5733",
    "icon": "⚔️",
    "score": 0,
    "created_at": "2025-01-15T10:10:00Z"
  }
}
```

**Repeat** for each team you want to create.

---

### Step 4: Add Members to Teams

Add registered members to teams. Each member can optionally have an OSRS account assigned.

**Endpoint:** `POST /api/admin/clan-events/teams/:teamId/members`

**Request Body:**
```json
{
  "member_id": 123,
  "osrs_account_id": 456,
  "role": "member",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "team-member-uuid",
    "team_id": "team-uuid",
    "member_id": 123,
    "osrs_account_id": 456,
    "role": "member",
    "individual_score": 0,
    "joined_at": "2025-01-15T10:15:00Z"
  }
}
```

**Note:** 
- `osrs_account_id` is optional but required for automatic progress tracking
- `role` can be `'captain'`, `'member'`, etc.
- The OSRS account must belong to the member (validated automatically)

---

### Step 5: Configure Team Boards

Each team needs a bingo board. Boards are created automatically when first accessed, or you can configure them manually.

#### 5a. Get/Create Team Board

**Endpoint:** `GET /api/admin/clan-events/:eventId/teams/:teamId/board`

This endpoint will:
- Create the board if it doesn't exist (using the event's generic board config)
- Return the board with all tiles, effects, and progress

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "board-uuid",
    "event_id": "event-uuid",
    "team_id": "team-uuid",
    "name": "Team Alpha Board",
    "columns": 5,
    "rows": 5,
    "show_tile_buffs": true,
    "tiles": [
      {
        "id": "board-tile-uuid",
        "tile_id": "tile-library-id",
        "position": "A1",
        "task": "Obtain a Dragon Warhammer",
        "category": "pvm",
        "difficulty": "hard",
        "base_points": 10,
        "is_completed": false,
        "requirements": { /* tile requirements */ }
      }
    ],
    "tile_effects": [],
    "line_effects": []
  }
}
```

#### 5b. Add Tiles to Board

Tiles are added from the tile library. See `ADMIN_API_DOCUMENTATION.md` for tile library endpoints.

**Endpoint:** `POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles`

**Request Body:**
```json
{
  "tile_id": "tile-library-id",
  "position": "A1",
  "custom_points": null,
  "metadata": {}
}
```

#### 5c. Add Buffs/Debuffs

Add tile-specific or row/column effects. See `ADMIN_API_DOCUMENTATION.md` for details.

---

### Step 6: Activate Event

Once all teams and boards are configured, activate the event.

**Endpoint:** `PATCH /api/admin/clan-events/events/:eventId`

**Request Body:**
```json
{
  "status": "active"
}
```

**Note:** Once active, the event will start tracking progress automatically via Dink webhooks.

---

## Progress Tracking

### Automatic Progress Tracking

The system automatically tracks progress when:
- Players receive loot (for `ITEM_DROP`, `VALUE_DROP` requirements)
- Players get pets (for `PET` requirements)
- Players complete speedruns (for `SPEEDRUN` requirements)
- Players log out (for `EXPERIENCE` requirements - fetches from WiseOldMan)
- Players gamble at BA (for `BA_GAMBLES` requirements)

**How it works:**
1. Dink webhook receives a game event
2. System checks if player is in an active event
3. System matches event to board tiles
4. System updates progress and marks tiles complete when requirements are met

### Viewing Team Progress

#### Team Progress Summary

**Endpoint:** `GET /api/admin/clan-events/:eventId/teams/:teamId/progress`

**Response:**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team-uuid",
      "name": "Team Alpha",
      "score": 150
    },
    "total_tiles": 25,
    "completed_tiles": 5,
    "completion_percentage": 20.0,
    "total_progress_value": 1250.5,
    "tiles_with_progress": 12,
    "member_contributions": [
      {
        "team_member_id": "member-uuid",
        "member_id": 123,
        "discord_username": "player1",
        "osrs_account_name": "Player1",
        "tiles_completed": 3,
        "total_progress_contributed": 750.5
      }
    ]
  }
}
```

#### Detailed Tile Progress

**Endpoint:** `GET /api/admin/clan-events/:eventId/teams/:teamId/progress/tiles`

**Query Params:**
- `completed_only` (optional, boolean): Filter to only completed tiles
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "board-tile-uuid",
      "tile_id": "tile-library-id",
      "position": "A1",
      "task": "Obtain a Dragon Warhammer",
      "is_completed": true,
      "completed_at": "2025-01-16T14:30:00Z",
      "base_points": 10,
      "requirements": { /* requirements */ },
      "progress_entries": [
        {
          "id": "progress-uuid",
          "osrs_account_id": 456,
          "progress_value": 1,
          "progress_metadata": {
            "count": 1,
            "current_value": 1,
            "target_value": 1
          },
          "completion_type": "auto",
          "completed_at": "2025-01-16T14:30:00Z"
        }
      ]
    }
  ]
}
```

#### Member Contributions

**Endpoint:** `GET /api/admin/clan-events/:eventId/teams/:teamId/progress/members`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "team_member_id": "member-uuid",
      "role": "member",
      "individual_score": 50,
      "member_id": 123,
      "discord_username": "player1",
      "discord_name": "Player One",
      "osrs_account_id": 456,
      "osrs_account_name": "Player1",
      "tiles_completed": 3,
      "total_progress_contributed": 750.5,
      "tiles_contributed_to": 8
    }
  ]
}
```

---

## Manual Tile Management

### Manually Complete a Tile

Sometimes tiles need to be marked complete manually (e.g., from Discord screenshots, special circumstances).

**Endpoint:** `POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId/complete`

**Request Body:**
```json
{
  "completion_type": "manual_admin",
  "completed_by_osrs_account_id": 456,
  "notes": "Verified via Discord screenshot"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "board-tile-uuid",
    "is_completed": true,
    "completed_at": "2025-01-16T15:00:00Z",
    /* ... other tile fields ... */
  },
  "message": "Tile marked as completed successfully"
}
```

**Note:**
- `completed_by_osrs_account_id` is optional (can be null for team completions)
- `notes` is optional but recommended for audit trail
- Creates/updates progress entry with `completion_type: 'manual_admin'`

### Revert a Completed Tile

If a tile was completed incorrectly, revert it back to incomplete.

**Endpoint:** `POST /api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId/revert`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "board-tile-uuid",
    "is_completed": false,
    "completed_at": null,
    /* ... other tile fields ... */
  },
  "message": "Tile reverted successfully"
}
```

**Note:** Progress data is preserved, only completion flags are removed.

---

## API Endpoints Reference

### Event Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clan-events/events` | List all events |
| GET | `/api/admin/clan-events/events/:id` | Get event details |
| POST | `/api/admin/clan-events/events` | Create event |
| PATCH | `/api/admin/clan-events/events/:id` | Update event |
| DELETE | `/api/admin/clan-events/events/:id` | Delete event |

### Event Registrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clan-events/events/:eventId/registrations` | List registrations |
| GET | `/api/admin/clan-events/events/:eventId/registrations/available` | List available members |
| POST | `/api/admin/clan-events/events/:eventId/registrations` | Register member |
| PATCH | `/api/admin/clan-events/events/:eventId/registrations/:id` | Update registration |
| DELETE | `/api/admin/clan-events/events/:eventId/registrations/:id` | Remove registration |

### Team Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clan-events/teams` | List teams |
| GET | `/api/admin/clan-events/teams/:id` | Get team details |
| POST | `/api/admin/clan-events/teams` | Create team |
| PATCH | `/api/admin/clan-events/teams/:id` | Update team |
| DELETE | `/api/admin/clan-events/teams/:id` | Delete team |
| POST | `/api/admin/clan-events/teams/:id/members` | Add member to team |
| PATCH | `/api/admin/clan-events/teams/:teamId/members/:memberId` | Update team member |
| DELETE | `/api/admin/clan-events/teams/:teamId/members/:memberId` | Remove member from team |

### Board Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clan-events/:eventId/teams/:teamId/board` | Get/create board |
| PATCH | `/api/admin/clan-events/:eventId/teams/:teamId/board` | Update board |
| POST | `/api/admin/clan-events/:eventId/teams/:teamId/board/tiles` | Add tile to board |
| PATCH | `/api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId` | Update board tile |
| DELETE | `/api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId` | Remove tile |
| POST | `/api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId/complete` | Manually complete tile |
| POST | `/api/admin/clan-events/:eventId/teams/:teamId/board/tiles/:tileId/revert` | Revert tile completion |

### Progress Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/clan-events/:eventId/teams/:teamId/progress` | Team progress summary |
| GET | `/api/admin/clan-events/:eventId/teams/:teamId/progress/tiles` | Detailed tile progress |
| GET | `/api/admin/clan-events/:eventId/teams/:teamId/progress/members` | Member contributions |

### Tile Library

See `ADMIN_API_DOCUMENTATION.md` for tile library endpoints:
- `/api/admin/clan-events/bingo/tiles` - CRUD operations for tile library
- `/api/admin/clan-events/buffs` - Buff/debuff library management

---

## Complete Workflow Example

Here's a complete example of creating a bingo event from start to finish:

```javascript
// 1. Create event (draft)
const event = await POST('/api/admin/clan-events/events', {
  name: "Winter Bingo 2025",
  event_type: "bingo",
  status: "draft",
  config: { board: { columns: 5, rows: 5 } }
});

// 2. Get available members
const available = await GET(`/api/admin/clan-events/events/${event.id}/registrations/available`);

// 3. Register members
for (const member of available.data.slice(0, 10)) {
  await POST(`/api/admin/clan-events/events/${event.id}/registrations`, {
    member_id: member.id,
    osrs_account_id: member.osrs_accounts[0]?.id
  });
}

// 4. Create teams
const team1 = await POST('/api/admin/clan-events/teams', {
  event_id: event.id,
  name: "Team Alpha",
  color: "#FF5733"
});

const team2 = await POST('/api/admin/clan-events/teams', {
  event_id: event.id,
  name: "Team Beta",
  color: "#33FF57"
});

// 5. Add members to teams
const registrations = await GET(`/api/admin/clan-events/events/${event.id}/registrations`);
const members = registrations.data;

// Add first 5 members to team1
for (const reg of members.slice(0, 5)) {
  await POST(`/api/admin/clan-events/teams/${team1.id}/members`, {
    member_id: reg.member_id,
    osrs_account_id: reg.osrs_account_id
  });
}

// Add remaining members to team2
for (const reg of members.slice(5)) {
  await POST(`/api/admin/clan-events/teams/${team2.id}/members`, {
    member_id: reg.member_id,
    osrs_account_id: reg.osrs_account_id
  });
}

// 6. Configure boards (boards are auto-created, but you can add tiles)
// Get board to see current state
const board1 = await GET(`/api/admin/clan-events/${event.id}/teams/${team1.id}/board`);

// Add tiles from library (see ADMIN_API_DOCUMENTATION.md for tile library)
// ... add tiles to board ...

// 7. Activate event
await PATCH(`/api/admin/clan-events/events/${event.id}`, {
  status: "active"
});

// 8. Monitor progress
const progress = await GET(`/api/admin/clan-events/${event.id}/teams/${team1.id}/progress`);
console.log(`Team Alpha: ${progress.data.completed_tiles}/${progress.data.total_tiles} tiles completed`);
```

---

## Notes and Best Practices

1. **Event Status Flow**: `draft` → `scheduled` → `active` → `completed`/`cancelled`
2. **Always register members before creating teams** - This ensures you know who's participating
3. **Assign OSRS accounts** - Required for automatic progress tracking
4. **Keep events in draft** until teams and boards are fully configured
5. **Use manual completion** sparingly - Only for verified special cases
6. **Monitor progress regularly** - Use the progress endpoints to track team performance
7. **Tile requirements** - See `ADMIN_API_DOCUMENTATION.md` for detailed requirement types and formats

---

## Future Enhancements

- Automatic registration via Discord forms
- User-facing endpoints for players to view their own team progress
- Real-time progress updates via WebSockets
- Leaderboard endpoints
- Event analytics and statistics

