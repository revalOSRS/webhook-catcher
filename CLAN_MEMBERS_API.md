# Clan Members API Documentation

## Overview
Public endpoints for retrieving clan member information with Discord ranks from WiseOldMan and snapshot data.

## Base Path
All endpoints are prefixed with `/api/clan/members`

---

## Endpoints

### 1. Get All Clan Members
```
GET /api/clan/members
```

Returns a list of all clan members with their information, Discord rank from WiseOldMan, and latest snapshot data.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 100 | Maximum number of members to return |
| `offset` | number | No | 0 | Number of members to skip (pagination) |
| `search` | string | No | - | Search by ingame name or Discord username |

#### Response Format
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "ingame_name": "PlayerName",
      "discord_username": "DiscordUser#1234",
      "discord_id": "123456789",
      "is_active": true,
      "joined_date": "2024-01-01T00:00:00.000Z",
      "left_date": null,
      "wom_id": 12345,
      "role": "Administrator",
      "snapshot": {
        "total_level": 2277,
        "total_xp": 4600000000,
        "ehp": 2500.5,
        "ehb": 1200.3,
        "last_changed": "2024-11-16T12:00:00.000Z",
        "last_imported_at": "2024-11-16T12:30:00.000Z"
      }
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 100,
    "offset": 0
  }
}
```

#### Member Role Values (from WiseOldMan)
- `Owner` - Clan owner
- `Deputy_owner` - Deputy owner
- `Overseer` - Overseer
- `Coordinator` - Coordinator
- `Corporal` - Corporal
- `Recruit` - Recruit
- `Smiley` - Smiley rank
- `Member` - Regular member
- `null` - Not in WOM group or role not assigned

#### Example Requests

**Get all members:**
```bash
GET /api/clan/members
```

**Get members with pagination:**
```bash
GET /api/clan/members?limit=20&offset=40
```

**Search for members:**
```bash
GET /api/clan/members?search=zezima
```

---

### 2. Get Specific Member
```
GET /api/clan/members/:id
```

Returns detailed information for a specific clan member by their database ID.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Member's database ID |

#### Response Format
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "ingame_name": "PlayerName",
    "discord_username": "DiscordUser#1234",
    "discord_id": "123456789",
    "is_active": true,
    "joined_date": "2024-01-01T00:00:00.000Z",
    "left_date": null,
    "wom_id": 12345,
    "member_code": 1234,
    "role": "Administrator",
    "snapshot": {
      "total_level": 2277,
      "total_xp": 4600000000,
      "ehp": 2500.5,
      "ehb": 1200.3,
      "last_changed": "2024-11-16T12:00:00.000Z",
      "last_imported_at": "2024-11-16T12:30:00.000Z"
    }
  }
}
```

#### Error Responses

**Member Not Found (404):**
```json
{
  "status": "error",
  "message": "Member not found"
}
```

**Server Error (500):**
```json
{
  "status": "error",
  "message": "Failed to fetch member",
  "error": "Error details"
}
```

#### Example Request
```bash
GET /api/clan/members/1
```

---

## Notes

### Data Consistency
- Members are ordered by:
  1. Active status (active members first)
  2. Total level (highest first, null snapshots last)
  3. Ingame name (alphabetically)

### WiseOldMan Integration
- Discord ranks are fetched from WiseOldMan group membership data
- If WiseOldMan is unavailable, the endpoint will still return member data with `role: null`
- Requires `WOM_GROUP_ID` environment variable to be set

### Snapshot Data
- Only the most recent snapshot for each member is returned
- If no snapshot exists, `snapshot` will be `null`
- Snapshot data includes:
  - Total level and XP
  - EHP (Efficient Hours Played)
  - EHB (Efficient Hours Bossed)
  - Last changed and imported timestamps

### Performance
- The endpoint joins with the `snapshots` table to get the latest snapshot
- Uses subquery to efficiently get only the most recent snapshot per member
- Search queries use case-insensitive pattern matching (ILIKE)

---

## Use Cases

### Member Directory Page
Display a public list of all clan members with their stats and ranks:
```javascript
const response = await fetch('/api/clan/members?limit=50');
const { data: members } = await response.json();

// Display members in a table/grid with:
// - Ingame name
// - Discord rank (role)
// - Total level
// - Total XP
// - Active status
```

### Member Profile Page
Show detailed information for a specific member:
```javascript
const response = await fetch(`/api/clan/members/${memberId}`);
const { data: member } = await response.json();

// Display:
// - Full member details
// - Latest snapshot stats
// - Clan role
// - Join/leave dates
```

### Member Search
Allow users to search for specific members:
```javascript
const searchTerm = 'zezima';
const response = await fetch(`/api/clan/members?search=${searchTerm}`);
const { data: members } = await response.json();
```

