# Clan Events Admin API Documentation

Complete API reference for managing clan events (Bingo, etc.) including teams, registrations, and progress tracking.

## Base URL
```
/api/admin/clan-events
```

---

## Table of Contents

1. [Events](#events)
   - [List Events](#list-events)
   - [Get Event](#get-event)
   - [Get Event Statistics](#get-event-statistics)
   - [Get Event Leaderboard](#get-event-leaderboard)
   - [Create Event](#create-event)
   - [Duplicate Event](#duplicate-event)
   - [Update Event](#update-event)
   - [Event Lifecycle Actions](#event-lifecycle-actions)
   - [Recalculate Scores](#recalculate-event-scores)
   - [Delete Event](#delete-event)
2. [Event Registrations](#event-registrations)
3. [Teams](#teams)
4. [Team Members](#team-members)
5. [Team Boards](#team-boards)
6. [Team Progress](#team-progress)
7. [Bingo Tiles Library](#bingo-tiles-library)
8. [Typical Workflows](#typical-workflows)

---

## Events

Manage the lifecycle of clan events. Uses `EventsEntity` for database operations.

### List Events
```http
GET /events
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| event_type | string | - | Filter by type: `bingo`, `battleship_bingo`, etc. |
| status | string | - | Filter: `draft`, `scheduled`, `active`, `paused`, `completed`, `cancelled` |
| limit | number | 50 | Results per page |
| offset | number | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Summer Bingo 2025",
      "description": "Our summer event!",
      "eventType": "bingo",
      "status": "active",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-06-30T23:59:59.000Z",
      "config": { "board": { "columns": 7, "rows": 7 } },
      "createdAt": "2025-05-15T10:00:00.000Z",
      "updatedAt": "2025-05-15T10:00:00.000Z"
    }
  ],
  "pagination": { "limit": 50, "offset": 0 }
}
```

---

### Get Event
```http
GET /events/:id
```

Returns a single event by ID.

---

### Get Event Statistics
```http
GET /events/:id/statistics
```

Returns aggregated statistics for an event.

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "name": "Summer Bingo 2025",
      "status": "active",
      "eventType": "bingo"
    },
    "teams": {
      "total": 8,
      "topTeams": [
        { "id": "uuid", "name": "Team Alpha", "score": 450, "color": "#FF5733", "icon": "🔥" }
      ]
    },
    "registrations": { "total": 48 },
    "tiles": {
      "total": 392,
      "completed": 156,
      "completionPercentage": 39.8
    },
    "totalProgressValue": 15420
  }
}
```

---

### Get Event Leaderboard
```http
GET /events/:id/leaderboard
```

Returns all teams ranked by score.

**Response:**
```json
{
  "success": true,
  "data": {
    "event": { "id": "uuid", "name": "Summer Bingo 2025", "status": "active" },
    "leaderboard": [
      {
        "rank": 1,
        "id": "uuid",
        "name": "Team Alpha",
        "color": "#FF5733",
        "icon": "🔥",
        "score": 450,
        "memberCount": 6,
        "tilesCompleted": 28,
        "totalTiles": 49
      }
    ]
  }
}
```

---

### Create Event
```http
POST /events
```

**Request Body:**
```json
{
  "name": "Summer Bingo 2025",
  "description": "Our summer clan event!",
  "eventType": "bingo",
  "status": "draft",
  "startDate": "2025-06-01T00:00:00Z",
  "endDate": "2025-06-30T23:59:59Z",
  "config": {
    "board": {
      "columns": 7,
      "rows": 7,
      "metadata": { "showTileEffects": true, "showRowColumnBuffs": false },
      "tiles": [
        { "tileId": "get-fire-cape", "position": "A1" }
      ]
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Event name |
| eventType | string | Yes | `bingo`, `battleship_bingo`, etc. |
| description | string | No | Event description |
| status | string | No | Default: `draft` |
| startDate | string | No | ISO 8601 datetime (defaults to now) |
| endDate | string | No | ISO 8601 datetime (defaults to +30 days) |
| config | object | No | Event-type-specific configuration |

---

### Duplicate Event
```http
POST /events/:id/duplicate
```

Creates a copy of an event in draft status.

**Request Body:**
```json
{
  "name": "Summer Bingo 2025 v2",
  "includeTeams": true
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| name | string | "{original} (Copy)" | New event name |
| includeTeams | boolean | false | Also duplicate team structure |

---

### Update Event
```http
PATCH /events/:id
```

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Event Name",
  "description": "Updated description",
  "status": "active",
  "startDate": "2025-06-01T00:00:00Z",
  "endDate": "2025-06-30T23:59:59Z",
  "config": { ... }
}
```

**Note:** Changing status to `active` for bingo events auto-initializes boards for all teams.

---

### Event Lifecycle Actions

Dedicated endpoints for status changes with transition validation.

```http
POST /events/:id/activate   # → active (starts event, initializes boards)
POST /events/:id/pause      # → paused
POST /events/:id/complete   # → completed
POST /events/:id/cancel     # → cancelled
POST /events/:id/schedule   # → scheduled
```

**Valid Transitions:**
| From | To |
|------|-----|
| draft | scheduled, active, cancelled |
| scheduled | active, paused, cancelled |
| active | paused, completed, cancelled |
| paused | active, completed, cancelled |
| completed | (none - terminal) |
| cancelled | (none - terminal) |

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Event activated successfully",
  "previousStatus": "draft"
}
```

---

### Recalculate Event Scores
```http
POST /events/:id/recalculate-scores
```

Recalculates all team scores based on completed tile points.

**Response:**
```json
{
  "success": true,
  "data": {
    "teamsUpdated": 3,
    "changes": [
      { "teamId": "uuid", "teamName": "Team Alpha", "oldScore": 400, "newScore": 450 }
    ]
  },
  "message": "Recalculated scores for 3 teams"
}
```

---

### Delete Event
```http
DELETE /events/:id
```

⚠️ **Warning:** Cascades to delete all teams, boards, registrations, and progress.

---

## Event Registrations

Manage event sign-ups. Independent of team assignments.

### List Registrations
```http
GET /events/:eventId/registrations
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter: `pending`, `registered`, `rejected`, `withdrawn` |
| limit | number | Default: 100 |
| offset | number | Default: 0 |

---

### Get Available Members
```http
GET /events/:eventId/registrations/available
```

Returns members NOT yet registered for this event.

---

### Get Registration Statistics
```http
GET /events/:eventId/registrations/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 48,
    "byStatus": { "pending": 5, "registered": 40, "rejected": 3 },
    "pending": 5,
    "registered": 40,
    "rejected": 3,
    "withdrawn": 0
  }
}
```

---

### Register Member
```http
POST /events/:eventId/registrations
```

**Request Body:**
```json
{
  "memberId": 123,
  "osrsAccountId": 456,
  "status": "registered",
  "metadata": {}
}
```

---

### Batch Register
```http
POST /events/:eventId/registrations/batch
```

**Request Body:**
```json
{
  "status": "registered",
  "registrations": [
    { "memberId": 123, "osrsAccountId": 456 },
    { "memberId": 124, "osrsAccountId": 457 }
  ]
}
```

---

### Update Registration
```http
PATCH /events/:eventId/registrations/:id
```

### Approve Registration
```http
POST /events/:eventId/registrations/:id/approve
```

### Reject Registration
```http
POST /events/:eventId/registrations/:id/reject
```

### Delete Registration
```http
DELETE /events/:eventId/registrations/:id
```

---

## Teams

Manage teams within events.

### List Teams
```http
GET /teams
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| event_id | string | Filter by event |
| limit | number | Default: 50 |
| offset | number | Default: 0 |

---

### Get Team
```http
GET /teams/:id
```

Returns team with all members and OSRS account info.

---

### Create Team
```http
POST /teams
```

**Request Body:**
```json
{
  "eventId": "uuid",
  "name": "Team Alpha",
  "color": "#FF5733",
  "icon": "🔥",
  "metadata": {}
}
```

---

### Batch Create Teams
```http
POST /teams/batch
```

**Request Body:**
```json
{
  "eventId": "uuid",
  "teams": [
    { "name": "Team Alpha", "color": "#FF5733" },
    { "name": "Team Beta", "color": "#33FF57" }
  ]
}
```

---

### Update Team
```http
PATCH /teams/:id
```

---

### Delete Team
```http
DELETE /teams/:id
```

---

### Recalculate Team Score
```http
POST /teams/:id/recalculate-score
```

---

### Get Team Leaderboard
```http
GET /teams/:id/leaderboard
```

Returns members sorted by individual score.

---

## Team Members

### Add Member to Team
```http
POST /teams/:id/members
```

**Request Body:**
```json
{
  "memberId": 123,
  "osrsAccountId": 456,
  "role": "captain",
  "metadata": {}
}
```

---

### Update Team Member
```http
PATCH /teams/:teamId/members/:memberId
```

---

### Remove Member from Team
```http
DELETE /teams/:teamId/members/:memberId
```

---

### Transfer Member Between Teams
```http
POST /teams/:fromTeamId/members/:memberId/transfer
```

**Request Body:**
```json
{
  "toTeamId": "uuid"
}
```

Atomically moves a member from one team to another, preserving score and metadata.

---

## Team Boards

Manage the bingo board for a specific team.

### Get Team Board
```http
GET /events/:eventId/teams/:teamId/board
```

Returns complete board with tiles, progress, and effects.

---

### Update Board Configuration
```http
PATCH /events/:eventId/teams/:teamId/board
```

---

### Add Tile to Board
```http
POST /events/:eventId/teams/:teamId/board/tiles
```

---

### Update Board Tile
```http
PATCH /events/:eventId/teams/:teamId/board/tiles/:tileId
```

---

### Remove Tile from Board
```http
DELETE /events/:eventId/teams/:teamId/board/tiles/:tileId
```

---

### Manually Complete Tile
```http
POST /events/:eventId/teams/:teamId/board/tiles/:tileId/complete
```

**Request Body:**
```json
{
  "completionType": "manual_admin",
  "completedByOsrsAccountId": 456,
  "notes": "Verified via screenshot"
}
```

Sends Discord notification to team webhook.

---

### Revert Tile Completion
```http
POST /events/:eventId/teams/:teamId/board/tiles/:tileId/revert
```

---

## Team Progress

### Get Team Progress Summary
```http
GET /teams/:teamId/progress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "team": { "id": "uuid", "name": "Team Alpha", "score": 450 },
    "totalTiles": 49,
    "completedTiles": 28,
    "completionPercentage": 57.14,
    "totalProgressValue": 8520,
    "tilesWithProgress": 35,
    "memberContributions": [
      {
        "teamMemberId": "uuid",
        "memberId": 123,
        "discordTag": "Player#1234",
        "osrsAccountId": 456,
        "osrsAccountName": "PlayerRSN",
        "tilesCompleted": 12,
        "totalProgressContributed": 3250
      }
    ]
  }
}
```

---

### Get Tile Progress Details
```http
GET /teams/:teamId/progress/tiles
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| completed_only | boolean | Only show completed tiles |
| limit | number | Default: 50 |
| offset | number | Default: 0 |

---

### Get Member Contributions
```http
GET /teams/:teamId/progress/members
```

---

### Get Team Activity Log
```http
GET /teams/:teamId/progress/activity
```

Returns recent tile completions and progress updates.

---

## Bingo Tiles Library

Manage reusable tile templates.

### List Tiles
```http
GET /bingo/tiles
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category |
| difficulty | string | `easy`, `medium`, `hard`, `extreme` |
| search | string | Search in task, description, or ID |

---

### Get Tile
```http
GET /bingo/tiles/:id
```

---

### Create Tile
```http
POST /bingo/tiles
```

**Request Body:**
```json
{
  "id": "get-fire-cape",
  "task": "Obtain a Fire Cape",
  "category": "combat",
  "difficulty": "medium",
  "icon": "🔥",
  "description": "Complete the Fight Caves",
  "points": 50,
  "requirements": {
    "matchType": "ALL",
    "requirements": [
      {
        "type": "ITEM_DROP",
        "items": [{ "itemId": 6570, "itemName": "Fire cape", "itemAmount": 1 }]
      }
    ],
    "tiers": []
  }
}
```

---

### Bulk Create Tiles
```http
POST /bingo/tiles/bulk
```

---

### Update Tile
```http
PATCH /bingo/tiles/:id
```

---

### Delete Tile
```http
DELETE /bingo/tiles/:id
```

⚠️ Fails if tile is in use on any boards.

---

### Get Categories
```http
GET /bingo/tiles/categories/list
```

---

## Frontend Integration Guide

### Board Creation Flow

**Important:** Boards are **automatically created** when an event is activated. You do NOT need to manually create boards.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BOARD CREATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Admin creates EVENT with board config:                               │
│     POST /events                                                         │
│     {                                                                    │
│       "name": "Summer Bingo",                                           │
│       "eventType": "bingo",                                             │
│       "config": {                                                        │
│         "board": {                                                       │
│           "columns": 7, "rows": 7,                                      │
│           "tiles": [                                                     │
│             { "tileId": "fire-cape", "position": "A1" },                │
│             { "tileId": "barrows-100kc", "position": "A2" },            │
│             ...                                                          │
│           ]                                                              │
│         }                                                                │
│       }                                                                  │
│     }                                                                    │
│                                                                          │
│  2. Admin creates TEAMS for the event                                   │
│     POST /teams { event_id, name: "Team Alpha" }                        │
│     POST /teams { event_id, name: "Team Beta" }                         │
│                                                                          │
│  3. Admin ACTIVATES the event                                           │
│     POST /events/:id/activate                                           │
│                                                                          │
│     ┌─────────────────────────────────────────────────┐                 │
│     │  🔄 AUTOMATIC BOARD INITIALIZATION              │                 │
│     │                                                  │                 │
│     │  For EACH team:                                  │                 │
│     │   - Creates bingo_boards record                  │                 │
│     │   - Creates bingo_board_tiles for each tile      │                 │
│     │   - Creates bingo_tile_progress (empty)          │                 │
│     │   - Applies row/column/tile effects if any       │                 │
│     └─────────────────────────────────────────────────┘                 │
│                                                                          │
│  4. Frontend fetches team board (ready to display!)                     │
│     GET /events/:eventId/teams/:teamId/board                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### When to Create Boards Manually

You should **almost never** need to manually create boards. The only exception:

- If you add a NEW team to an already-active event, you may need to:
  1. Either: Fetch the board (GET) which auto-creates if missing
  2. Or: Call recalculate on the event

### Frontend Display Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DISPLAYING A BINGO BOARD                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Get the team's board:                                               │
│     GET /events/:eventId/teams/:teamId/board                            │
│                                                                          │
│  2. Response contains everything needed:                                │
│     {                                                                    │
│       "id": "board-uuid",                                               │
│       "columns": 7,                                                     │
│       "rows": 7,                                                        │
│       "tiles": [                                                        │
│         {                                                                │
│           "id": "board-tile-uuid",                                      │
│           "position": "A1",        // Column + Row                      │
│           "isCompleted": false,                                         │
│           "task": "Get Fire Cape",                                      │
│           "difficulty": "medium",                                       │
│           "basePoints": 50,                                             │
│           "requirements": {...},    // For progress display            │
│           "progressEntries": [     // Current progress                  │
│             { "progressValue": 0.5, "progressMetadata": {...} }         │
│           ]                                                              │
│         },                                                               │
│         ...                                                              │
│       ],                                                                 │
│       "tileEffects": [...],        // Buffs/debuffs on tiles           │
│       "rowEffects": [...],         // Row-wide effects                  │
│       "columnEffects": [...]       // Column-wide effects               │
│     }                                                                    │
│                                                                          │
│  3. Render grid based on columns/rows:                                  │
│     - Position format: "A1", "B3", etc.                                 │
│     - Column = letter (A-Z), Row = number (1-20)                        │
│     - Find tile by position: tiles.find(t => t.position === "A1")       │
│                                                                          │
│  4. For live updates, poll or use WebSocket:                            │
│     - Poll: GET board every 30-60 seconds                               │
│     - WebSocket: Listen for tile_completed events                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Position Format Reference

```
     A    B    C    D    E    F    G
   ┌────┬────┬────┬────┬────┬────┬────┐
 1 │ A1 │ B1 │ C1 │ D1 │ E1 │ F1 │ G1 │
   ├────┼────┼────┼────┼────┼────┼────┤
 2 │ A2 │ B2 │ C2 │ D2 │ E2 │ F2 │ G2 │
   ├────┼────┼────┼────┼────┼────┼────┤
 3 │ A3 │ B3 │ C3 │ D3 │ E3 │ F3 │ G3 │
   ├────┼────┼────┼────┼────┼────┼────┤
 4 │ A4 │ B4 │ C4 │ D4 │ E4 │ F4 │ G4 │
   ├────┼────┼────┼────┼────┼────┼────┤
 5 │ A5 │ B5 │ C5 │ D5 │ E5 │ F5 │ G5 │
   ├────┼────┼────┼────┼────┼────┼────┤
 6 │ A6 │ B6 │ C6 │ D6 │ E6 │ F6 │ G6 │
   ├────┼────┼────┼────┼────┼────┼────┤
 7 │ A7 │ B7 │ C7 │ D7 │ E7 │ F7 │ G7 │
   └────┴────┴────┴────┴────┴────┴────┘
```

### Progress Tracking Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATIC PROGRESS TRACKING                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Player gets a drop in-game                                             │
│           │                                                              │
│           ▼                                                              │
│  RuneLite Dink plugin sends webhook ──────────────────┐                 │
│           │                                            │                 │
│           ▼                                            │                 │
│  POST /webhooks/dink                                   │                 │
│           │                                            │                 │
│           ▼                                            │                 │
│  ┌─────────────────────────────────────────────────┐   │                 │
│  │  DinkService processes event:                   │   │                 │
│  │   1. Identifies player's OSRS account           │   │                 │
│  │   2. Finds active bingo events they're in       │   │                 │
│  │   3. Matches event against tile requirements    │   │                 │
│  │   4. Updates bingo_tile_progress                │   │                 │
│  │   5. Marks tile complete if requirements met    │   │                 │
│  │   6. Sends Discord notification                 │   │                 │
│  └─────────────────────────────────────────────────┘   │                 │
│           │                                            │                 │
│           ▼                                            │                 │
│  Frontend sees updated progress on next poll           │                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Requirement Types for Display

When rendering tile progress, check `requirements.type`:

| Type | Progress Display | Metadata Fields |
|------|-----------------|-----------------|
| `ITEM_DROP` | "3/10 items" | `currentCount`, `targetCount`, `itemName` |
| `VALUE_DROP` | "2.5M / 5M gp" | `currentHighestValue`, `targetValue` |
| `SPEEDRUN` | "1:45 / 2:00" | `currentBestTimeSeconds`, `goalSeconds` |
| `EXPERIENCE` | "500K / 1M XP" | `currentXp`, `targetXp`, `skill` |
| `PET` | "✓ / ✗" | `obtained`, `petName` |
| `BA_GAMBLES` | "50/100 gambles" | `currentCount`, `targetCount` |

For **tiered requirements**, check `progressMetadata.completedTiers`:
```javascript
const completedTiers = tile.progressEntries[0]?.progressMetadata?.completedTiers || [];
const highestTier = Math.max(...completedTiers.map(t => t.tier), 0);
```

---

## Typical Workflows

### 1. Setting Up a New Bingo Event

```
1. Create tiles in the library
   POST /bingo/tiles/bulk

2. Create the event with board configuration
   POST /events { name, event_type: "bingo", config: { board: {...} } }

3. Create teams
   POST /teams/batch { event_id, teams: [...] }

4. Register members
   POST /events/:eventId/registrations/batch

5. Add members to teams
   POST /teams/:teamId/members

6. Activate the event (auto-initializes boards)
   POST /events/:id/activate
```

### 2. Monitoring an Active Event

```
1. Check event-wide leaderboard
   GET /events/:id/leaderboard

2. Get event statistics
   GET /events/:id/statistics

3. View specific team progress
   GET /teams/:teamId/progress

4. Check team activity
   GET /teams/:teamId/progress/activity
```

### 3. Managing Teams During Event

```
1. Transfer member between teams
   POST /teams/:fromTeamId/members/:memberId/transfer

2. Recalculate scores after manual fix
   POST /events/:id/recalculate-scores

3. Manually complete a tile
   POST /events/:eventId/teams/:teamId/board/tiles/:tileId/complete
```

### 4. Ending an Event

```
1. Complete the event
   POST /events/:id/complete

2. Final score recalculation
   POST /events/:id/recalculate-scores

3. Export leaderboard
   GET /events/:id/leaderboard
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 409 | Conflict (duplicate, already exists) |
| 500 | Internal Server Error |

---

## Notes

1. **Discord Webhooks:** Team webhook URLs are NOT exposed via API for security. Set them directly in the database.

2. **Cascading Deletes:** Deleting an event/team cascades to all child records.

3. **Auto-initialization:** Activating a bingo event creates boards for all teams.

4. **Progress Tracking:** Progress is tracked automatically via the Dink webhook. Admin API provides manual overrides.

5. **Entity Classes:** All endpoints use the following entity classes:
   - `EventsEntity` - Event CRUD
   - `EventTeamsEntity` - Team CRUD
   - `EventTeamMembersEntity` - Team member CRUD
   - `EventRegistrationsEntity` - Registration CRUD

---

## Related Documentation

- **User-facing API:** See [`src/routes/app/clan-events/README.md`](../../app/clan-events/README.md) for endpoints that regular users use to view their events, teams, and progress.
