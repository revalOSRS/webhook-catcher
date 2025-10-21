# API Endpoints Documentation

## Base URL
`https://webhook-catcher-zeta.vercel.app`

## Authentication Endpoints

### POST `/api/auth/discord`
Discord OAuth authentication endpoint.

**Request Body:**
```json
{
  "code": "discord_oauth_code"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Discord authentication successful",
  "data": {
    "id": 123,
    "discord_id": "603849391970975744",
    "discord_tag": "Username",
    "discord_avatar": "https://cdn.discordapp.com/avatars/603849391970975744/a_1234567890abcdef.png",
    "member_code": 1001,
    "is_active": true
  }
}
```

**Note:** `discord_avatar` is fetched on-demand from Discord API, not stored in database.

### POST `/api/login`
Login with member code.

**Request Body:**
```json
{
  "code": 1001
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "id": 123,
    "discord_id": "603849391970975744",
    "discord_tag": "Username",
    "member_code": 1001,
    "is_active": true
  }
}
```

---

## Member Profile Endpoints

### GET `/api/member/:id`
Get member profile by member ID (requires member code for verification).

**Parameters:**
- `id` (path) - Member ID
- `code` (query or header X-Member-Code) - Member code for verification

**Example:**
```
GET /api/member/123?code=1001
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "member": { /* member info */ },
    "osrs_accounts": [ /* OSRS accounts */ ],
    "recent_movements": [ /* join/leave history */ ],
    "donations": {
      "total_approved": 50000000,
      "total_pending": 0,
      "recent_donations": [ /* recent donations */ ]
    },
    "coffer_movements": [ /* coffer transactions */ ],
    "stats": {
      "total_ehp": 45.5,
      "total_ehb": 12.3,
      "days_as_member": 365
    }
  }
}
```

### GET `/api/player/:discordId`
Get comprehensive player profile with WiseOldMan data.

**Parameters:**
- `discordId` (path) - Discord ID
- `code` (query, optional) - Member code for verification

**Example:**
```
GET /api/player/603849391970975744?code=1001
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "member": {
      "id": 123,
      "discord_id": "603849391970975744",
      "discord_tag": "Username",
      "discord_avatar": "https://cdn.discordapp.com/avatars/603849391970975744/a_1234567890abcdef.png",
      "member_code": 1001,
      "token_balance": 1500,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "last_seen": "2024-10-20T00:00:00.000Z"
    },
    "osrs_accounts": [
      {
        "id": 1,
        "discord_id": "603849391970975744",
        "osrs_nickname": "PlayerName",
        "dink_hash": "abc123",
        "wom_player_id": 12345,
        "ehp": 45.5,
        "ehb": 12.3,
        "is_primary": true,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "donations": {
      "total_approved": 50000000,
      "total_pending": 0,
      "recent": [ /* donation objects */ ]
    },
    "token_movements": [
      {
        "id": 1,
        "member_id": 123,
        "discord_id": "603849391970975744",
        "type": "earn",
        "amount": 100,
        "balance_before": 1400,
        "balance_after": 1500,
        "event_id": null,
        "description": "Event participation",
        "note": null,
        "created_at": "2024-10-20T00:00:00.000Z",
        "created_by": "system"
      }
    ]
  }
}

**Note:** WOM data is not included in this endpoint for performance. Use dedicated WOM endpoints below for player statistics.
```

---

## WiseOldMan Endpoints

### GET `/api/wom/player/:username`
Get player data from WiseOldMan.

**Example:**
```
GET /api/wom/player/Lynx_Titan
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 12345,
    "username": "lynx_titan",
    "displayName": "Lynx Titan",
    "type": "regular",
    "build": "main",
    "exp": 4600000000,
    "ehp": 5000.5,
    "ehb": 1500.2,
    "updatedAt": "2024-10-20T00:00:00.000Z"
  }
}
```

### POST `/api/wom/player/:username/update`
Trigger a player data update from OSRS hiscores.

**Example:**
```
POST /api/wom/player/Lynx_Titan/update
```

**Response:**
```json
{
  "status": "success",
  "message": "Player updated successfully",
  "data": { /* updated player data */ }
}
```

### GET `/api/wom/player/:username/gains`
Get player gains for a specific period.

**Parameters:**
- `period` (query) - `day`, `week`, `month`, or `year` (default: `week`)

**Example:**
```
GET /api/wom/player/Lynx_Titan/gains?period=week
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "startsAt": "2024-10-13T00:00:00.000Z",
    "endsAt": "2024-10-20T00:00:00.000Z",
    "data": {
      "skills": {
        "overall": { "gained": 1000000, "start": 2000000000, "end": 2001000000 },
        "attack": { "gained": 50000, "start": 13034431, "end": 13084431 }
      },
      "bosses": {
        "zulrah": { "gained": 50, "start": 1000, "end": 1050 }
      },
      "computed": {
        "ehp": { "gained": 2.5, "start": 1000.0, "end": 1002.5 }
      }
    }
  }
}
```

### GET `/api/wom/player/:username/achievements`
Get player achievements.

**Parameters:**
- `limit` (query) - Number of achievements to return (default: 20)

**Example:**
```
GET /api/wom/player/Lynx_Titan/achievements?limit=10
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "playerId": 12345,
      "name": "99 Attack",
      "metric": "attack",
      "measure": "experience",
      "threshold": 13034431,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "accuracy": null
    }
  ],
  "count": 10
}
```

### GET `/api/wom/player/:username/records`
Get player records.

**Parameters:**
- `period` (query) - Period for records (default: `week`)
- `metric` (query, optional) - Specific metric (e.g., `zulrah`, `overall`)

**Example:**
```
GET /api/wom/player/Lynx_Titan/records?period=week&metric=zulrah
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 123,
      "playerId": 12345,
      "period": "week",
      "metric": "zulrah",
      "value": 150,
      "updatedAt": "2024-10-20T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET `/api/wom/player/:username/snapshots`
Get historical player snapshots.

**Parameters:**
- `limit` (query) - Number of snapshots (default: 10)

**Example:**
```
GET /api/wom/player/Lynx_Titan/snapshots?limit=5
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "createdAt": "2024-10-20T00:00:00.000Z",
      "importedAt": null,
      "data": {
        "skills": { /* skill data */ },
        "bosses": { /* boss KC data */ },
        "activities": { /* activity data */ },
        "computed": { /* computed metrics */ }
      }
    }
  ],
  "count": 5
}
```

### GET `/api/wom/player/:username/groups`
Get player's groups/clans.

**Example:**
```
GET /api/wom/player/Lynx_Titan/groups
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 456,
      "name": "Cool Clan",
      "clanChat": "CoolCC",
      "description": "A cool clan",
      "verified": true,
      "memberCount": 100,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET `/api/wom/player/:username/comprehensive`
Get all WiseOldMan data in one request (player, gains, achievements, records, groups).

**Example:**
```
GET /api/wom/player/Lynx_Titan/comprehensive
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "player": { /* player data */ },
    "gains": { /* weekly gains */ },
    "achievements": [ /* achievements */ ],
    "records": [ /* records */ ],
    "groups": [ /* groups */ ]
  }
}
```

---

## Usage Examples for Profile Page

### Complete Profile Page Data
```javascript
// 1. Get comprehensive player data with WOM
const response = await fetch(`/api/player/${discordId}?code=${memberCode}`)
const { data } = await response.json()

// Access member info
console.log(data.member.discord_tag)
console.log(data.member.is_active)

// Access OSRS accounts
const primaryAccount = data.osrs_accounts.find(acc => acc.is_primary)
console.log(primaryAccount.osrs_nickname)

// Access donation stats
console.log(`Total donated: ${data.donations.total_approved} gp`)

// Access token balance
console.log(`Token balance: ${data.member.token_balance}`)

// Access token movements
console.log(`Recent token movements:`, data.token_movements)
```

### Get WOM Data Separately
```javascript
// Get WOM player data (use OSRS username, not Discord ID)
const womResponse = await fetch(`/api/wom/player/${primaryAccount.osrs_nickname}/comprehensive`)
const womData = await womResponse.json()

// Get specific period gains
const gainsResponse = await fetch(`/api/wom/player/${username}/gains?period=month`)
const monthlyGains = await gainsResponse.json()

// Update player data
await fetch(`/api/wom/player/${username}/update`, { method: 'POST' })
```

---

## Error Responses

All endpoints follow the same error response format:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (invalid member code)
- `404` - Not Found (player/member not found)
- `500` - Internal Server Error

