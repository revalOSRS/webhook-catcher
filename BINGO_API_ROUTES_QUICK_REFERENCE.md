# Clan Events API Route Structure

## Quick Reference

```
/api/clan-events
├── /events
│   ├── GET    /                  - List all events
│   ├── GET    /:id               - Get single event
│   ├── POST   /                  - Create event
│   ├── PATCH  /:id               - Update event
│   ├── DELETE /:id               - Delete event
│   └── GET    /:id/stats         - Get event statistics
│
├── /boards
│   ├── GET    /                     - List all boards
│   ├── GET    /:id                  - Get single board with tiles
│   ├── POST   /                     - Create board
│   ├── PATCH  /:id                  - Update board
│   ├── DELETE /:id                  - Delete board
│   ├── POST   /:id/tiles            - Add tile to board
│   ├── DELETE /:boardId/tiles/:tileId - Remove tile from board
│   └── PATCH  /:boardId/tiles/:tileId - Update board tile
│
├── /teams
│   ├── GET    /                           - List all teams
│   ├── GET    /:id                        - Get single team with members
│   ├── POST   /                           - Create team
│   ├── PATCH  /:id                        - Update team
│   ├── DELETE /:id                        - Delete team
│   ├── POST   /:id/members                - Add member to team
│   ├── PATCH  /:teamId/members/:memberId  - Update team member
│   ├── DELETE /:teamId/members/:memberId  - Remove member from team
│   └── GET    /:id/leaderboard            - Get team leaderboard
│
├── /tiles/library
│   ├── GET    /                  - List all tiles
│   ├── GET    /:id               - Get single tile
│   ├── POST   /                  - Create tile
│   ├── POST   /bulk              - Bulk create tiles
│   ├── PATCH  /:id               - Update tile
│   ├── DELETE /:id               - Delete tile
│   └── GET    /categories/list   - Get categories list
│
└── /buffs
    ├── /library
    │   ├── GET    /              - List all buffs/debuffs
    │   ├── GET    /:id           - Get single buff/debuff
    │   ├── POST   /              - Create buff/debuff
    │   ├── PATCH  /:id           - Update buff/debuff
    │   └── DELETE /:id           - Delete buff/debuff
    │
    └── /effects
        ├── POST   /tile          - Apply effect to tile
        ├── POST   /row           - Apply effect to row
        ├── POST   /column        - Apply effect to column
        ├── DELETE /tile/:id      - Remove effect from tile
        ├── DELETE /row/:id       - Remove effect from row
        ├── DELETE /column/:id    - Remove effect from column
        ├── PATCH  /tile/:id      - Update tile effect
        └── GET    /board/:boardId - Get all board effects
```

## File Structure

```
src/routes/clan-events/
├── index.ts                       - Main bingo router
├── events.routes.ts               - Event CRUD operations
├── boards.routes.ts               - Board management & tile placement
├── teams.routes.ts                - Team & member management
├── tiles/
│   ├── index.ts                   - Tiles sub-router
│   └── library.routes.ts          - Tile library CRUD
└── buffs/
    ├── index.ts                   - Buffs sub-router
    ├── library.routes.ts          - Buff/debuff library CRUD
    └── effects.routes.ts          - Apply/remove effects
```

## Common Patterns

### Filtering
Most list endpoints support filtering via query parameters:
```
GET /api/clan-events/events?status=active&event_type=bingo
GET /api/clan-events/tiles/library?category=pvm&difficulty=hard
```

### Pagination
All list endpoints support pagination:
```
GET /api/clan-events/events?limit=20&offset=40
```

### Search
Some endpoints support search:
```
GET /api/clan-events/tiles/library?search=hydra
```

### Partial Updates
All PATCH endpoints support partial updates - only send fields you want to change:
```json
PATCH /api/clan-events/events/:id
{
  "status": "active"
}
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Error
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Key Features

1. **Full CRUD Operations** - Create, Read, Update, Delete for all entities
2. **Nested Resources** - Teams have members, boards have tiles
3. **Validation** - Input validation with helpful error messages
4. **Cascading Deletes** - Deleting events removes all associated data
5. **Usage Tracking** - Check if resources are in use before deletion
6. **Statistics** - Aggregated stats for events and resources
7. **Bulk Operations** - Bulk create tiles
8. **Flexible Metadata** - JSONB fields for custom data
9. **Effect Management** - Apply buffs/debuffs at tile, row, or column level
10. **Leaderboards** - Team and member scoring

## Example Workflow

### 1. Create Event
```bash
POST /api/clan-events/events
{
  "name": "Summer Bingo 2025",
  "event_type": "bingo",
  "status": "draft"
}
```

### 2. Create Teams
```bash
POST /api/clan-events/teams
{
  "event_id": "event-uuid",
  "name": "Red Team",
  "color": "#FF0000"
}
```

### 3. Add Members to Teams
```bash
POST /api/clan-events/teams/:teamId/members
{
  "member_id": 1
}
```

### 4. Create Tiles (Bulk)
```bash
POST /api/clan-events/tiles/library/bulk
{
  "tiles": [/* array of tile objects */]
}
```

### 5. Create Board
```bash
POST /api/clan-events/boards
{
  "event_id": "event-uuid",
  "name": "Main Board",
  "columns": 7,
  "rows": 7
}
```

### 6. Place Tiles on Board
```bash
POST /api/clan-events/boards/:boardId/tiles
{
  "tile_id": "boss_hydra_20",
  "position": "A1"
}
```

### 7. Apply Buffs/Debuffs
```bash
POST /api/clan-events/buffs/effects/row
{
  "board_id": "board-uuid",
  "row_number": 1,
  "buff_debuff_id": "double_points"
}
```

### 8. Mark Tile Complete
```bash
PATCH /api/clan-events/boards/:boardId/tiles/:tileId
{
  "is_completed": true,
  "completed_by_team_id": "team-uuid",
  "completed_at": "2025-06-15T12:00:00Z"
}
```

### 9. Update Team Score
```bash
PATCH /api/clan-events/teams/:teamId
{
  "score": 2000
}
```

### 10. View Event Stats
```bash
GET /api/clan-events/events/:eventId/stats
```

## Notes

- All endpoints return JSON
- Timestamps use ISO 8601 format
- UUIDs are used for primary keys (except tiles and buffs which use string IDs)
- No authentication shown - add authentication middleware as needed
- Error handling is consistent across all endpoints
- Foreign key constraints ensure data integrity

