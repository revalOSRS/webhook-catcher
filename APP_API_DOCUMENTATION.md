# App API Documentation

API endpoints for regular users (non-admin) to interact with bingo events.

**Base URL:** `/api/app/clan-events`

**Authentication:** All endpoints require authentication via headers:
- `x-member-code`: Member code (integer)
- `x-discord-id`: Discord ID (string)

---

## Endpoints

### GET `/api/app/clan-events`
Get list of all active events. Shows team information only for events where the user is participating.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "event_type": "bingo",
      "status": "active",
      "start_date": "ISO8601 string | null",
      "end_date": "ISO8601 string | null",
      "team_count": "number",
      "is_participating": "boolean", // true if user is participating, false otherwise
      "team_id": "uuid | undefined", // Only present if is_participating is true
      "team_name": "string | undefined", // Only present if is_participating is true
      "team_score": "number | undefined" // Only present if is_participating is true
    }
  ]
}
```

**Notes:**
- Returns all active events (not just ones user is in)
- `is_participating` indicates if the user is a team member
- Team information (`team_id`, `team_name`, `team_score`) is only included for events where `is_participating` is `true`
- Use this endpoint to see what events are available, then use the detail endpoint to get full information (requires participation)

---

### GET `/api/app/clan-events/:eventId`
Get detailed event information for the user's team. Includes board, tiles with progress, team members, and buffs/debuffs.

**Authentication:** Required

**Security:** Users can only access events they are participating in. Returns 403 if user is not a team member.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "event_type": "bingo",
    "status": "active",
    "start_date": "ISO8601 string | null",
    "end_date": "ISO8601 string | null",
    "config": { /* event configuration */ },
    "team": {
      "id": "uuid",
      "name": "string",
      "color": "string | null",
      "icon": "string | null",
      "score": "number",
      "members": [
        {
          "id": "uuid",
          "member_id": "number",
          "discord_tag": "string",
          "role": "leader | member",
          "osrs_account_id": "number | null",
          "osrs_account_name": "string | null"
        }
      ]
    },
    "board": {
      "id": "uuid",
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
          "completed_at": "ISO8601 string | null",
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
                // For ITEM_DROP requirements:
                "count": "number",
                "current_value": "number",
                "target_value": "number",
                "last_update_at": "ISO8601 string",
                "last_items_obtained": [],
                // For EXPERIENCE requirements:
                "gained_xp": "number",
                "target_xp": "number",
                "current_xp": "number",
                "baseline_xp": "number",
                "last_update_at": "ISO8601 string",
                // For tiered requirements:
                "completed_tiers": [1, 2, 3],
                "total_tiers": "number",
                "completed_tiers_count": "number",
                "tier_1_progress": "number",
                "tier_1_metadata": {},
                "tier_1_completed_at": "ISO8601 string | null",
                // ... additional tiers
              },
              "completion_type": "auto | manual_admin | null",
              "completed_at": "ISO8601 string | null",
              "completed_by_osrs_account_id": "number | null",
              "completed_by_member_id": "number | null",
              "recorded_at": "ISO8601 string"
            }
          ],
          "team_total_xp_gained": "number | null", // For EXPERIENCE requirements only: Total XP gained by entire team
          "tile_effects": [
            {
              "id": "uuid",
              "buff_name": "string",
              "buff_type": "buff | debuff",
              "effect_type": "string",
              "effect_value": "number",
              "buff_icon": "string | null",
              "is_active": "boolean",
              "expires_at": "ISO8601 string | null"
            }
          ]
        }
      ],
      "tile_effects": [ /* all tile effects */ ],
      "row_effects": [
        {
          "id": "uuid",
          "line_type": "row",
          "line_identifier": "string",
          "buff_name": "string",
          "buff_type": "buff | debuff",
          "effect_type": "string",
          "effect_value": "number",
          "buff_icon": "string | null",
          "is_active": "boolean",
          "expires_at": "ISO8601 string | null"
        }
      ],
      "column_effects": [
        {
          "id": "uuid",
          "line_type": "column",
          "line_identifier": "string",
          "buff_name": "string",
          "buff_type": "buff | debuff",
          "effect_type": "string",
          "effect_value": "number",
          "buff_icon": "string | null",
          "is_active": "boolean",
          "expires_at": "ISO8601 string | null"
        }
      ]
    }
  }
}
```

**Notes:**
- `progress_entries` contains progress from ALL team members, not just the authenticated user
- For EXPERIENCE requirements, `team_total_xp_gained` shows the sum of all team members' `gained_xp`
- Tile effects are filtered based on `show_tile_buffs` setting:
  - If `show_tile_buffs` is `false`, only active effects are returned
  - If `show_tile_buffs` is `true`, all effects (active and inactive) are returned
- Row and column effects only include active effects

---

### GET `/api/app/clan-events/:eventId/team/progress`
Get team progress summary (total tiles, completed tiles, completion percentage, team score).

**Authentication:** Required

**Security:** Users can only access their own team's progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_tiles": "number",
    "completed_tiles": "number",
    "completion_percentage": "number", // 0-100, rounded to 2 decimal places
    "team_score": "number"
  }
}
```

**Example:**
```json
{
  "success": true,
  "data": {
    "total_tiles": 25,
    "completed_tiles": 12,
    "completion_percentage": 48.0,
    "team_score": 150
  }
}
```

---

### GET `/api/app/clan-events/:eventId/my-contributions`
Get the authenticated user's individual contributions to tiles in the event.

**Authentication:** Required

**Security:** Users can only access their own contributions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "board_tile_id": "uuid",
      "position": "string",
      "task": "string",
      "category": "string",
      "icon": "string | null",
      "progress_value": "number",
      "progress_metadata": { /* progress metadata */ },
      "completion_type": "auto | manual_admin | null",
      "completed_at": "ISO8601 string | null",
      "recorded_at": "ISO8601 string"
    }
  ]
}
```

**Notes:**
- Returns tiles where the user's OSRS accounts have made progress
- Ordered by most recent contribution first
- Includes both completed and in-progress tiles

---

## Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "You are not participating in this event"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Event not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to fetch [resource]",
  "message": "Error details"
}
```

---

## Important Notes

### Authentication
All endpoints require authentication via headers:
- `x-member-code`: Your member code (integer)
- `x-discord-id`: Your Discord ID (string)

### Security
- Users can only access events they are participating in
- Users can only see their own team's information
- Attempting to access another team's data returns 403 Forbidden

### Progress Tracking
- `progress_entries` contains progress from ALL team members
- Each entry includes `osrs_account_id` to identify who made the contribution
- For EXPERIENCE requirements, use `team_total_xp_gained` to see total team XP
- For tiered requirements, check `progress_metadata.completed_tiers` to see which tiers are done

### Buffs/Debuffs Filtering
- Tile effects are filtered based on `board.metadata.show_tile_buffs`:
  - `false`: Only active effects shown
  - `true`: All effects shown (including inactive)
- Row and column effects always show only active effects

### Displaying Tier Progress
For tiles with tiered requirements (`requirements.tiers`), check `progress_entries[0].progress_metadata`:
- `completed_tiers`: Array of completed tier numbers (e.g., `[1, 3]`)
- `total_tiers`: Total number of tiers
- `tier_N_progress`: Progress value for tier N
- `tier_N_metadata`: Full metadata for tier N
- `tier_N_completed_at`: When tier N was completed

Example:
```javascript
const tile = event.board.tiles[0];
if (tile.requirements?.tiers) {
  const metadata = tile.progress_entries[0]?.progress_metadata || {};
  const completedTiers = metadata.completed_tiers || [];
  const totalTiers = metadata.total_tiers || tile.requirements.tiers.length;
  
  // Display each tier's status
  tile.requirements.tiers.forEach(tier => {
    const isCompleted = completedTiers.includes(tier.tier);
    const progress = metadata[`tier_${tier.tier}_progress`] || 0;
    console.log(`Tier ${tier.tier}: ${isCompleted ? '✓' : progress > 0 ? 'In Progress' : 'Not Started'}`);
  });
}
```

---

## Frontend Integration Examples

### Fetch Active Events
```javascript
const response = await fetch('/api/app/clan-events', {
  headers: {
    'x-member-code': memberCode,
    'x-discord-id': discordId
  }
});
const { data: events } = await response.json();
```

### Fetch Event Details
```javascript
const response = await fetch(`/api/app/clan-events/${eventId}`, {
  headers: {
    'x-member-code': memberCode,
    'x-discord-id': discordId
  }
});
const { data: event } = await response.json();

// Access team info
console.log(`Team: ${event.team.name} (Score: ${event.team.score})`);

// Access board tiles
event.board.tiles.forEach(tile => {
  console.log(`Tile ${tile.position}: ${tile.task}`);
  console.log(`Progress entries: ${tile.progress_entries.length}`);
  
  // For XP tiles, show team total
  if (tile.team_total_xp_gained !== null) {
    console.log(`Team XP: ${tile.team_total_xp_gained}`);
  }
});
```

### Fetch Team Progress
```javascript
const response = await fetch(`/api/app/clan-events/${eventId}/team/progress`, {
  headers: {
    'x-member-code': memberCode,
    'x-discord-id': discordId
  }
});
const { data: progress } = await response.json();
console.log(`${progress.completed_tiles}/${progress.total_tiles} tiles completed (${progress.completion_percentage}%)`);
```

### Fetch User Contributions
```javascript
const response = await fetch(`/api/app/clan-events/${eventId}/my-contributions`, {
  headers: {
    'x-member-code': memberCode,
    'x-discord-id': discordId
  }
});
const { data: contributions } = await response.json();
console.log(`You've contributed to ${contributions.length} tiles`);
```

