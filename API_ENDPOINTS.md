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

## Admin Endpoints

### GET `/api/admin/members`
Get all members from the database (admin only).

**Authentication:**
Requires `ADMIN_API_KEY` in either:
- Header: `X-Admin-Key: your_admin_key`
- Query parameter: `?admin_key=your_admin_key`

**Example:**
```
GET /api/admin/members
Headers: X-Admin-Key: your_admin_key
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 123,
      "discord_id": "603849391970975744",
      "discord_tag": "Username",
      "member_code": 1001,
      "token_balance": 1500,
      "is_active": true,
      "in_discord": true,
      "notes": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-10-20T00:00:00.000Z",
      "last_seen": "2024-10-20T00:00:00.000Z",
      "osrs_accounts_count": "2",
      "total_donations": "50000000"
    }
  ],
  "count": 150
}
```

**Error Responses:**
- `401` - Unauthorized (invalid or missing admin key)
- `500` - Server error

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

### GET `/api/wom/clan/statistics`
Get the latest clan statistics snapshot (updated daily at midnight by Discord bot).

**Example:**
```
GET /api/wom/clan/statistics
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "groupName": "Reval",
    "totalMembers": 87,
    "averageLevel": 1847,
    "averageXP": 145000000,
    "maxedPlayers": {
      "count": 12,
      "percentage": 13.79
    },
    "totalStats": {
      "clues": 5432,
      "bossKills": 123456,
      "cox": 4567,
      "toa": 1234,
      "tob": 890,
      "ehp": 12543,
      "ehb": 3421
    },
    "snapshotDate": "2024-10-30",
    "lastUpdated": "2024-10-30T00:00:15.123Z",
    "failedMembers": 2
  }
}
```

**Notes:**
- Data is cached from daily snapshots (refreshes automatically at midnight)
- Much faster than live WOM API calls
- Includes all clan-wide statistics
- `failedMembers` shows how many members couldn't be fetched during the snapshot

### GET `/api/wom/clan/statistics/history`
Get historical clan statistics snapshots for tracking progress over time.

**Parameters:**
- `days` (query) - Number of days of history to return (1-365, default: 30)

**Example:**
```
GET /api/wom/clan/statistics/history?days=30
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "snapshot_date": "2024-10-30",
      "total_members": 87,
      "average_level": 1847,
      "average_xp": 145000000,
      "maxed_count": 12,
      "maxed_percentage": 13.79,
      "total_ehp": 12543,
      "total_ehb": 3421,
      "total_clues": 5432,
      "total_boss_kills": 123456,
      "total_cox": 4567,
      "total_toa": 1234,
      "total_tob": 890,
      "created_at": "2024-10-30T00:00:15.123Z"
    },
    {
      "snapshot_date": "2024-10-29",
      "total_members": 86,
      "average_level": 1845,
      "average_xp": 144500000,
      "maxed_count": 12,
      "maxed_percentage": 13.95,
      "total_ehp": 12500,
      "total_ehb": 3400,
      "total_clues": 5400,
      "total_boss_kills": 123000,
      "total_cox": 4560,
      "total_toa": 1230,
      "total_tob": 885,
      "created_at": "2024-10-29T00:00:12.456Z"
    }
  ],
  "count": 2
}
```

**Notes:**
- Returns snapshots in descending order (newest first)
- Useful for tracking clan growth and progress
- Can be used to generate charts and trend analysis

### GET `/api/wom/clan/players` 🌐 PUBLIC
Get detailed player snapshots from the latest clan snapshot. **No authentication required** - perfect for landing pages.

**Example:**
```
GET /api/wom/clan/players
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "clanSnapshot": {
      "id": 42,
      "snapshotDate": "2024-10-30",
      "groupName": "Reval"
    },
    "players": [
      {
        "id": 1,
        "playerId": 12345,
        "username": "player_name",
        "displayName": "Player Name",
        "type": "regular",
        "build": "main",
        "country": "US",
        "status": "active",
        "patron": false,
        "stats": {
          "totalExp": 450000000,
          "totalLevel": 2100,
          "combatLevel": 126,
          "ehp": 245.5,
          "ehb": 67.3,
          "ttm": 1234.5,
          "tt200m": 9876.4
        },
        "skills": [
          {
            "skill": "attack",
            "experience": 13034431,
            "level": 99,
            "rank": 12345,
            "ehp": 12.5
          },
          {
            "skill": "defence",
            "experience": 13034431,
            "level": 99,
            "rank": 23456,
            "ehp": 11.8
          }
          // ... all 23 skills
        ],
        "bosses": [
          {
            "boss": "zulrah",
            "kills": 1500,
            "rank": 5432,
            "ehb": 15.2
          },
          {
            "boss": "vorkath",
            "kills": 850,
            "rank": 8765,
            "ehb": 8.5
          }
          // ... all bosses with kills
        ],
        "activities": [
          {
            "activity": "clue_scrolls_all",
            "score": 450,
            "rank": 12345
          },
          {
            "activity": "bounty_hunter_hunter",
            "score": 0,
            "rank": -1
          }
          // ... all activities
        ],
        "computed": [
          {
            "metric": "ehp",
            "value": 245.5,
            "rank": 3456
          },
          {
            "metric": "ehb",
            "value": 67.3,
            "rank": 6789
          }
          // ... computed metrics
        ],
        "timestamps": {
          "registeredAt": "2023-01-15T10:30:00.000Z",
          "updatedAt": "2024-10-30T05:15:30.000Z",
          "lastChangedAt": "2024-10-29T18:45:00.000Z"
        }
      }
      // ... more players (sorted by EHP DESC)
    ],
    "count": 87
  }
}
```

**Notes:**
- ✅ **Public endpoint** - No authentication required
- 🚀 **Highly optimized** - Uses efficient SQL queries with parallel fetching
- 📊 **Complete data** - All skills, bosses, activities, and computed metrics
- 🔄 **Auto-updates** - Refreshes daily with clan snapshot
- 📈 **Sorted by EHP** - Most efficient players first
- 🎯 **Perfect for landing pages** - Showcase your clan's stats

**Performance:**
- Single database round-trip for player list
- Parallel fetching of skills/bosses/activities/computed data
- Efficient grouping and formatting
- Typical response time: 100-300ms for 100 players with full data

**Data Structure:**
- **clanSnapshot**: Info about when this data was captured
- **players**: Array of player objects with all their data
- **count**: Total number of players in the snapshot

**Use Cases:**
- 🏠 Landing page leaderboards
- 📊 Clan statistics dashboard
- 🎮 Interactive player cards
- 📈 Skill distribution charts
- 🏆 Boss KC rankings
- 🌍 Country/region breakdowns

### GET `/api/wom/clan/players/:playerId` 🌐 PUBLIC
Get detailed player snapshot by WiseOldMan player ID from the latest clan snapshot. **No authentication required**.

**Parameters:**
- `playerId` (path) - WiseOldMan player ID (numeric)

**Example:**
```
GET /api/wom/clan/players/12345
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "clanSnapshot": {
      "id": 42,
      "snapshotDate": "2024-10-30",
      "groupName": "Reval"
    },
    "player": {
      "id": 1,
      "playerId": 12345,
      "username": "player_name",
      "displayName": "Player Name",
      "snapshotDate": "2024-10-30",
      "type": "regular",
      "build": "main",
      "country": "US",
      "status": "active",
      "patron": false,
      "stats": {
        "totalExp": 450000000,
        "totalLevel": 2100,
        "combatLevel": 126,
        "ehp": 245.5,
        "ehb": 67.3,
        "ttm": 1234.5,
        "tt200m": 9876.4
      },
      "skills": [
        {
          "skill": "attack",
          "experience": 13034431,
          "level": 99,
          "rank": 12345,
          "ehp": 12.5
        }
        // ... all 23 skills
      ],
      "bosses": [
        {
          "boss": "zulrah",
          "kills": 1500,
          "rank": 5432,
          "ehb": 15.2
        }
        // ... all bosses
      ],
      "activities": [
        {
          "activity": "clue_scrolls_all",
          "score": 450,
          "rank": 12345
        }
        // ... all activities
      ],
      "computed": [
        {
          "metric": "ehp",
          "value": 245.5,
          "rank": 3456
        }
        // ... computed metrics
      ],
      "timestamps": {
        "registeredAt": "2023-01-15T10:30:00.000Z",
        "updatedAt": "2024-10-30T05:15:30.000Z",
        "lastChangedAt": "2024-10-29T18:45:00.000Z"
      }
    }
  }
}
```

**Notes:**
- ✅ **Public endpoint** - No authentication required
- 📊 **Complete player data** - All skills, bosses, activities, computed metrics
- 🔄 **Auto-updates** - Refreshes daily with clan snapshot
- 🎯 **Consistent API** - `/clan/players` for all, `/clan/players/:playerId` for one
- 🚀 **Fast lookup** - Direct query by WOM player ID

**Error Responses:**
- `400` - Invalid player ID (non-numeric)
- `404` - No clan snapshots available yet
- `404` - Player not found in latest clan snapshot

**Use Cases:**
- 👤 Individual player profile pages
- 📊 Personal statistics dashboard
- 🎮 Player comparison tools
- 📈 Progress tracking for specific players
- 🔍 Quick player lookup by WOM ID

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

### Landing Page Examples - Clan Players Data

```javascript
// Fetch all clan players (PUBLIC - no auth required)
const response = await fetch('/api/wom/clan/players')
const { data } = await response.json()

console.log(`Clan: ${data.clanSnapshot.groupName}`)
console.log(`Snapshot from: ${data.clanSnapshot.snapshotDate}`)
console.log(`Total players: ${data.count}`)

// Example 1: Create a leaderboard
const topPlayers = data.players.slice(0, 10)
topPlayers.forEach((player, index) => {
  console.log(`${index + 1}. ${player.displayName || player.username}`)
  console.log(`   EHP: ${player.stats.ehp} | EHB: ${player.stats.ehb}`)
  console.log(`   Total Level: ${player.stats.totalLevel} | Combat: ${player.stats.combatLevel}`)
})

// Example 2: Get specific skill data
const player = data.players[0]
const attackSkill = player.skills.find(s => s.skill === 'attack')
console.log(`Attack: Level ${attackSkill.level} (${attackSkill.experience.toLocaleString()} XP)`)

// Example 3: Find top boss killers
const players = data.players.map(p => ({
  username: p.username,
  zulrah: p.bosses.find(b => b.boss === 'zulrah')?.kills || 0
}))
const topZulrahKillers = players
  .sort((a, b) => b.zulrah - a.zulrah)
  .slice(0, 10)

console.log('Top 10 Zulrah Killers:')
topZulrahKillers.forEach((p, i) => {
  console.log(`${i + 1}. ${p.username}: ${p.zulrah.toLocaleString()} KC`)
})

// Example 4: Calculate clan-wide stats
const clanStats = {
  totalPlayers: data.count,
  totalCombatLevel: data.players.reduce((sum, p) => sum + p.stats.combatLevel, 0),
  totalEHP: data.players.reduce((sum, p) => sum + p.stats.ehp, 0),
  totalEHB: data.players.reduce((sum, p) => sum + p.stats.ehb, 0),
  maxedPlayers: data.players.filter(p => p.stats.totalLevel >= 2277).length
}

console.log('Clan Statistics:')
console.log(`Average Combat Level: ${(clanStats.totalCombatLevel / clanStats.totalPlayers).toFixed(1)}`)
console.log(`Total EHP: ${clanStats.totalEHP.toFixed(1)}`)
console.log(`Total EHB: ${clanStats.totalEHB.toFixed(1)}`)
console.log(`Maxed Players: ${clanStats.maxedPlayers} (${(clanStats.maxedPlayers / clanStats.totalPlayers * 100).toFixed(1)}%)`)

// Example 5: Filter by country
const usPlayers = data.players.filter(p => p.country === 'US')
console.log(`Players from US: ${usPlayers.length}`)

// Example 6: Get all 99s for a player
const player99s = player.skills.filter(s => s.level === 99)
console.log(`${player.username} has ${player99s.length} level 99 skills`)

// Example 7: Create skill distribution chart data
const skillLevels = {}
data.players.forEach(player => {
  player.skills.forEach(skill => {
    if (!skillLevels[skill.skill]) {
      skillLevels[skill.skill] = { total: 0, maxed: 0 }
    }
    skillLevels[skill.skill].total += skill.level
    if (skill.level === 99) {
      skillLevels[skill.skill].maxed++
    }
  })
})

// Calculate average and maxed percentage for each skill
Object.keys(skillLevels).forEach(skill => {
  const avg = skillLevels[skill].total / data.count
  const maxedPct = (skillLevels[skill].maxed / data.count) * 100
  console.log(`${skill}: Avg ${avg.toFixed(1)}, ${skillLevels[skill].maxed} maxed (${maxedPct.toFixed(1)}%)`)
})
```

### Individual Player Profile - By Player ID

```javascript
// Fetch single player snapshot by WOM player ID (PUBLIC - no auth required)
const playerId = 12345  // WiseOldMan player ID
const response = await fetch(`/api/wom/clan/players/${playerId}`)
const { data } = await response.json()

// Access clan snapshot info
console.log(`Clan: ${data.clanSnapshot.groupName}`)
console.log(`Snapshot Date: ${data.clanSnapshot.snapshotDate}`)

// Access player data
const player = data.player
console.log(`Username: ${player.username}`)
console.log(`Display Name: ${player.displayName}`)
console.log(`Total Level: ${player.stats.totalLevel}`)
console.log(`Combat Level: ${player.stats.combatLevel}`)
console.log(`EHP: ${player.stats.ehp}`)
console.log(`EHB: ${player.stats.ehb}`)

// Example 1: Display all skills
console.log('\nSkills:')
player.skills.forEach(skill => {
  console.log(`${skill.skill}: Level ${skill.level} (${skill.experience.toLocaleString()} XP) - Rank ${skill.rank.toLocaleString()}`)
})

// Example 2: Get maxed skills count
const maxedSkills = player.skills.filter(s => s.level === 99)
console.log(`\nMaxed Skills: ${maxedSkills.length}/23`)

// Example 3: Top 5 bosses by KC
const topBosses = player.bosses
  .filter(b => b.kills > 0)
  .sort((a, b) => b.kills - a.kills)
  .slice(0, 5)

console.log('\nTop 5 Bosses:')
topBosses.forEach((boss, i) => {
  console.log(`${i + 1}. ${boss.boss}: ${boss.kills.toLocaleString()} KC - Rank ${boss.rank.toLocaleString()}`)
})

// Example 4: Total clue scrolls
const clueScroll = player.activities.find(a => a.activity === 'clue_scrolls_all')
if (clueScroll) {
  console.log(`\nTotal Clue Scrolls: ${clueScroll.score.toLocaleString()}`)
}

// Example 5: Build a skill progress component
function SkillProgressCard({ skill }) {
  const percentTo99 = (skill.experience / 13034431) * 100
  return {
    name: skill.skill,
    level: skill.level,
    experience: skill.experience,
    percentTo99: Math.min(percentTo99, 100).toFixed(2),
    rank: skill.rank,
    ehp: skill.ehp
  }
}

// Example 6: Calculate total boss KC
const totalBossKC = player.bosses.reduce((sum, boss) => {
  return sum + (boss.kills > 0 ? boss.kills : 0)
}, 0)
console.log(`\nTotal Boss KC: ${totalBossKC.toLocaleString()}`)

// Example 7: Display player card
const playerCard = {
  playerId: player.playerId,
  osrsUsername: player.username,
  displayName: player.displayName,
  country: player.country,
  type: player.type,
  build: player.build,
  patron: player.patron,
  stats: {
    totalLevel: player.stats.totalLevel,
    combatLevel: player.stats.combatLevel,
    totalExp: player.stats.totalExp,
    ehp: player.stats.ehp,
    ehb: player.stats.ehb,
    timeToMax: player.stats.ttm,
    timeTo200m: player.stats.tt200m
  },
  achievements: {
    maxedSkills: maxedSkills.length,
    totalBossKC: totalBossKC,
    clueScrolls: clueScroll?.score || 0
  },
  lastUpdated: player.timestamps.updatedAt
}

console.log('\nPlayer Card:', playerCard)

// Example 8: Get player from leaderboard first, then fetch details
async function getPlayerDetails(username) {
  // First, get all players to find the player ID
  const allPlayersResponse = await fetch('/api/wom/clan/players')
  const allPlayers = await allPlayersResponse.json()
  
  const player = allPlayers.data.players.find(p => 
    p.username.toLowerCase() === username.toLowerCase()
  )
  
  if (!player) {
    throw new Error('Player not found in clan')
  }
  
  // Now fetch full details for this player
  const detailsResponse = await fetch(`/api/wom/clan/players/${player.playerId}`)
  return detailsResponse.json()
}

// Usage: getPlayerDetails('player_name').then(data => console.log(data))
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

