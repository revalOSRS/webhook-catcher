# API Integration Guide

## Overview

This guide explains the new authentication flow and API endpoints for the frontend application. The WiseOldMan (WOM) endpoints have been removed as they are no longer needed - all player data is now retrieved through our own snapshot system.

---

## Authentication Flow

### 1. Discord OAuth Login

**Endpoint:** `POST /api/auth/discord`

**Description:** Authenticates a user via Discord OAuth and returns their member information.

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
  "data": {
    "member": {
      "id": 123,
      "discord_id": "123456789",
      "discord_tag": "Username#1234",
      "member_code": 5678,
      "token_balance": 100,
      "is_active": true,
      "in_discord": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "last_seen": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Important:** Save the `member.id`, `member.discord_id`, and `member.member_code` from this response. You'll need them for subsequent authenticated requests.

---

## Member Data Flow

After successful authentication, fetch member data in the following order:

### 2. Get Member Profile

**Endpoint:** `GET /api/members/:memberId`

**Description:** Retrieves the full member profile including OSRS accounts, donations, and Discord avatar.

**Authentication:** Required
- Header: `X-Discord-Id: {discord_id}`
- Header: `X-Member-Code: {member_code}`

**Parameters:**
- `memberId` - The member ID from the auth response

**Response:**
```json
{
  "status": "success",
  "data": {
    "member": {
      "id": 123,
      "discord_id": "123456789",
      "discord_tag": "Username#1234",
      "discord_avatar": "https://cdn.discordapp.com/avatars/...",
      "token_balance": 100,
      "is_active": true,
      "in_discord": true,
      "notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "last_seen": "2024-01-01T00:00:00Z"
    },
    "osrs_accounts": [
      {
        "id": 1,
        "discord_id": "123456789",
        "osrs_nickname": "PlayerName",
        "dink_hash": "abc123",
        "wom_player_id": 456,
        "wom_rank": "member",
        "ehp": 1234.56,
        "ehb": 789.12,
        "is_primary": true,
        "last_synced_at": "2024-01-01T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "donations": {
      "total_approved": 1000000,
      "total_pending": 500000,
      "all": [
        {
          "id": 1,
          "player_discord_id": "123456789",
          "amount": 1000000,
          "category_id": 1,
          "screenshot_url": "https://...",
          "status": "approved",
          "submitted_at": "2024-01-01T00:00:00Z",
          "reviewed_at": "2024-01-01T00:00:00Z",
          "reviewed_by": "987654321",
          "denial_reason": null,
          "message_id": "msg123",
          "channel_id": "ch123",
          "note": null
        }
      ]
    }
  }
}
```

**Important:** The `osrs_accounts` array contains all OSRS accounts for this member. You'll need to fetch detailed snapshots for each account.

---

### 3. Get OSRS Account Snapshots (For Each Account)

**Endpoint:** `GET /api/members/:memberId/osrs-accounts/:osrsAccountId`

**Description:** Retrieves detailed snapshot data for a specific OSRS account, including skills, bosses, activities, and computed metrics.

**Authentication:** Required
- Header: `X-Discord-Id: {discord_id}`
- Header: `X-Member-Code: {member_code}`

**Parameters:**
- `memberId` - The member ID from the auth response
- `osrsAccountId` - The OSRS account ID from the previous response

**Implementation:**
```javascript
// After getting member profile
for (const osrsAccount of memberProfile.osrs_accounts) {
  const snapshotData = await fetch(
    `/api/members/${memberId}/osrs-accounts/${osrsAccount.id}`,
    {
      headers: {
        'X-Discord-Id': discordId,
        'X-Member-Code': memberCode
      }
    }
  );
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "osrs_account": {
      "id": 1,
      "discord_id": "123456789",
      "osrs_nickname": "PlayerName",
      "dink_hash": "abc123",
      "wom_player_id": 456,
      "wom_rank": "member",
      "ehp": 1234.56,
      "ehb": 789.12,
      "is_primary": true,
      "last_synced_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    "snapshot": {
      "id": 1,
      "player_id": 456,
      "username": "PlayerName",
      "display_name": "Player Name",
      "snapshot_date": "2024-01-01",
      "player_type": "regular",
      "player_build": "main",
      "country": "US",
      "status": "active",
      "patron": false,
      "stats": {
        "total_exp": 123456789,
        "total_level": 2277,
        "combat_level": 126,
        "ehp": 1234.56,
        "ehb": 789.12,
        "ttm": 100.5,
        "tt200m": 5000.25
      },
      "skills": [
        {
          "skill": "attack",
          "experience": 13034431,
          "level": 99,
          "rank": 12345,
          "ehp": 50.5
        }
        // ... more skills
      ],
      "bosses": [
        {
          "boss": "zulrah",
          "kills": 1000,
          "rank": 5000,
          "ehb": 25.5
        }
        // ... more bosses
      ],
      "activities": [
        {
          "activity": "clue_scrolls_all",
          "score": 500,
          "rank": 10000
        }
        // ... more activities
      ],
      "computed": [
        {
          "metric": "ehp",
          "value": 1234.56,
          "rank": 5000
        }
        // ... more computed metrics
      ],
      "timestamps": {
        "registered_at": "2023-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "last_changed_at": "2024-01-01T12:00:00Z",
        "last_imported_at": "2024-01-01T12:00:00Z"
      }
    },
    "clan_snapshot": {
      "id": 1,
      "snapshot_date": "2024-01-01",
      "group_name": "Clan Name"
    }
  }
}
```

**Edge Cases:**
- If the account has no WOM player ID: Returns `snapshots: null` with appropriate message
- If no clan snapshots exist: Returns `snapshots: null` with appropriate message
- If no snapshot found for this account: Returns `snapshots: null` with appropriate message

---

## Landing Page (Public)

### Get Current Clan Statistics

**Endpoint:** `GET /api/clan/statistics/current`

**Description:** Retrieves the latest clan statistics snapshot. This endpoint is public and does not require authentication.

**Authentication:** Not required

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "snapshot_date": "2024-01-01",
    "group_id": 123,
    "group_name": "Clan Name",
    "total_members": 50,
    "average_level": 2100,
    "average_xp": 500000000,
    "maxed_count": 25,
    "maxed_percentage": 50.00,
    "total_clues": 5000,
    "total_boss_kills": 100000,
    "total_cox": 5000,
    "total_toa": 3000,
    "total_tob": 4000,
    "total_ehp": 50000,
    "total_ehb": 25000,
    "failed_members": 0,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Use Case:** Display clan statistics on the landing page before users log in.

---

## Additional Endpoints

### Get Active Member Count

**Endpoint:** `GET /api/clan/members/count`

**Description:** Returns the count of active clan members.

**Authentication:** Not required

**Response:**
```json
{
  "status": "success",
  "data": {
    "active_members": 50
  }
}
```

---

## Complete Login Flow Example

```javascript
// 1. User clicks "Login with Discord"
const authResponse = await fetch('/api/auth/discord', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: discordOAuthCode })
});

const { member } = authResponse.data;
const { id: memberId, discord_id: discordId, member_code: memberCode } = member;

// Save these for authenticated requests
localStorage.setItem('memberId', memberId);
localStorage.setItem('discordId', discordId);
localStorage.setItem('memberCode', memberCode);

// 2. Fetch member profile with OSRS accounts
const profileResponse = await fetch(`/api/members/${memberId}`, {
  headers: {
    'X-Discord-Id': discordId,
    'X-Member-Code': memberCode
  }
});

const { member, osrs_accounts, donations } = profileResponse.data;

// 3. Fetch snapshots for each OSRS account
const accountSnapshots = await Promise.all(
  osrs_accounts.map(account =>
    fetch(`/api/members/${memberId}/osrs-accounts/${account.id}`, {
      headers: {
        'X-Discord-Id': discordId,
        'X-Member-Code': memberCode
      }
    }).then(res => res.json())
  )
);

// Now you have:
// - member: Full member profile
// - osrs_accounts: List of all OSRS accounts
// - donations: All donation history
// - accountSnapshots: Detailed stats for each account
```

---

## Important Changes

### ❌ Removed Endpoints

The following WiseOldMan (WOM) proxy endpoints have been **removed** and should no longer be used:

- `GET /api/wom/player/:username` - Get player by username
- `GET /api/wom/player/id/:id` - Get player by ID
- `GET /api/wom/player/search` - Search for player
- `GET /api/wom/player/username/:username` - Get player details by username
- `GET /api/wom/player/username/:username/gained` - Get player gains
- `GET /api/wom/player/username/:username/records` - Get player records
- `GET /api/wom/player/username/:username/achievements` - Get player achievements
- `GET /api/wom/player/username/:username/competition-participations` - Get competition participations
- `GET /api/wom/player/:id/competitions` - Get player competitions
- `GET /api/wom/player/:id/groups` - Get player groups
- `POST /api/wom/player/:username/update` - Update player
- All group-related WOM endpoints

**Reason:** All player data is now retrieved through our own snapshot system, which provides more comprehensive and consistent data.

### ✅ New Snapshot System

All player statistics are now retrieved through our snapshot system:
- Skills, bosses, activities, and computed metrics
- Historical data tied to clan snapshots
- Consistent data format across all players
- No need to make external API calls to WiseOldMan

---

## Security Notes

1. **Member Code Security:** The `member_code` is sensitive and should be stored securely (e.g., in httpOnly cookies or secure storage). Never expose it in URLs or logs.

2. **Discord ID Verification:** Both the Discord ID and member code must match for authentication to succeed.

3. **Member ID Validation:** The middleware validates that the `memberId` in the URL matches the authenticated member.

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common error responses:
- `401`: Authentication required or invalid credentials
- `403`: Member account is inactive or access denied
- `404`: Member or resource not found
- `500`: Server error

---

## Summary

**Login Flow:**
1. `POST /api/auth/discord` - Authenticate with Discord
2. `GET /api/members/:memberId` - Get member profile and OSRS accounts list
3. `GET /api/members/:memberId/osrs-accounts/:osrsAccountId` - Get detailed snapshots for each account

**Landing Page:**
- `GET /api/clan/statistics/current` - Get latest clan statistics (public)

**Removed:**
- All `/api/wom/*` endpoints - No longer needed

**Authentication:**
- Headers: `X-Discord-Id` and `X-Member-Code` required for all member endpoints

