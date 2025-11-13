# Admin Authentication Guide

## Overview

The clan events management API endpoints are protected by Discord ID whitelist authentication combined with member code verification. Only pre-authorized Discord IDs can access these administrative endpoints.

## How It Works

### Two-Layer Security

1. **Discord ID Whitelist**: Your Discord ID must be in the admin whitelist
2. **Member Code Verification**: You must provide your member code from the database

This ensures both authorization (are you an admin?) and authentication (are you who you say you are?).

## Required Configuration

### 1. Add Admin Discord IDs

Edit `ADMIN_DISCORD_IDS` array in `src/middleware/auth.ts`:

```typescript
const ADMIN_DISCORD_IDS = [
  '123456789012345678',  // Replace with actual Discord IDs
  '234567890123456789',
  '345678901234567890',
  // Add more admin Discord IDs here
]
```

**💡 Tip**: Consider moving this to environment variables for production:
```typescript
const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS?.split(',') || []
```

### 2. Get Your Member Code

Your member code is stored in the `members` table. You can find it by querying:

```sql
SELECT member_code FROM members WHERE discord_id = 'YOUR_DISCORD_ID';
```

## How It Works

### 1. User Makes Request

The user sends a request to any admin endpoint with their Discord ID and member code:

```bash
curl -X GET "https://yourapi.com/api/admin/clan-events/events" \
  -H "X-Discord-Id: 123456789012345678" \
  -H "X-Member-Code: 1234"
```

### 2. Middleware Checks Authentication

The `requireDiscordAdmin` middleware:
1. Extracts the Discord ID from the `X-Discord-Id` header
2. Extracts the member code from the `X-Member-Code` header
3. Checks if the Discord ID is in the admin whitelist
4. Looks up the user in the `members` table
5. Verifies the member code matches the database
6. Checks if the user is active
7. Either allows or denies access

### 3. Response

**Success (200):**
```json
{
  "success": true,
  "data": [ /* event data */ ]
}
```

**Unauthorized (401):**
```json
{
  "status": "error",
  "message": "Authentication required. Provide X-Discord-Id header."
}
```

**Forbidden (403) - Not in Whitelist:**
```json
{
  "status": "error",
  "message": "Forbidden: Admin privileges required",
  "hint": "Your Discord ID is not authorized for admin access"
}
```

**Forbidden (403) - Invalid Member Code:**
```json
{
  "status": "error",
  "message": "Authentication failed. Invalid member code."
}
```

**Not Found (404):**
```json
{
  "status": "error",
  "message": "Discord member not found in clan"
}
```

## Integration Examples

### Frontend JavaScript/TypeScript

```typescript
async function createEvent(eventData: any) {
  const discordId = getUserDiscordId(); // Get from your auth system
  const memberCode = getUserMemberCode(); // Get from your auth system
  
  const response = await fetch('/api/admin/clan-events/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Discord-Id': discordId,
      'X-Member-Code': memberCode
    },
    body: JSON.stringify(eventData)
  });
  
  if (response.status === 403) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
}
```

### Python

```python
import requests

def create_event(discord_id: str, member_code: int, event_data: dict):
    headers = {
        'Content-Type': 'application/json',
        'X-Discord-Id': discord_id,
        'X-Member-Code': str(member_code)
    }
    
    response = requests.post(
        'https://yourapi.com/api/admin/clan-events/events',
        headers=headers,
        json=event_data
    )
    
    if response.status_code == 403:
        raise PermissionError(response.json().get('message'))
    
    response.raise_for_status()
    return response.json()
```

### cURL

```bash
# Create an event
curl -X POST "https://yourapi.com/api/admin/clan-events/events" \
  -H "Content-Type: application/json" \
  -H "X-Discord-Id: 123456789012345678" \
  -H "X-Member-Code: 1234" \
  -d '{
    "name": "Summer Bingo 2025",
    "event_type": "bingo",
    "status": "draft",
    "start_date": "2025-06-01",
    "end_date": "2025-06-30"
  }'
```

## Security Considerations

1. **Two-Factor Security**: The combination of Discord ID whitelist and member code provides two-factor authentication.

2. **Whitelist Management**: Keep the `ADMIN_DISCORD_IDS` array up to date. Remove Discord IDs when someone should no longer have admin access.

3. **Member Code Security**: Member codes should be treated as passwords. They should not be shared or stored in plain text on the client side.

4. **HTTPS Only**: Always use HTTPS in production to prevent header interception.

5. **Environment Variables**: Consider moving the admin Discord IDs to environment variables in production:
   ```bash
   ADMIN_DISCORD_IDS=123456789012345678,234567890123456789,345678901234567890
   ```

6. **Rate Limiting**: Consider adding rate limiting to prevent brute-force attacks on member codes.

7. **Audit Logging**: Consider logging all admin actions for accountability.

## Managing Admin Access

### Adding a New Admin

1. Get their Discord ID
2. Add it to the `ADMIN_DISCORD_IDS` array in `src/middleware/auth.ts`:
   ```typescript
   const ADMIN_DISCORD_IDS = [
     '123456789012345678',
     '234567890123456789',
     '987654321098765432',  // New admin
   ]
   ```
3. Restart your server
4. Provide them with their member code from the database

### Removing an Admin

1. Remove their Discord ID from the `ADMIN_DISCORD_IDS` array
2. Restart your server

### Rotating Member Codes

If a member code is compromised:

```sql
-- Generate a new random member code
UPDATE members 
SET member_code = floor(random() * 9000 + 1000)::int
WHERE discord_id = '123456789012345678';

-- Return the new code
SELECT member_code FROM members WHERE discord_id = '123456789012345678';
```

## Testing

### Check if a user has admin access

```bash
curl -X GET "https://yourapi.com/api/admin/clan-events/events" \
  -H "X-Discord-Id: YOUR_DISCORD_ID" \
  -H "X-Member-Code: YOUR_MEMBER_CODE"
```

**Success Response**: You'll get the list of events

**403 with "not authorized"**: Your Discord ID is not in the admin whitelist

**403 with "Invalid member code"**: Your member code is incorrect

### Test with different users

1. Add a test Discord ID to the whitelist
2. Get that user's member code from the database:
```sql
SELECT discord_id, member_code FROM members WHERE discord_id = '123456789012345678';
```
3. Test with both headers

## Troubleshooting

### "Discord member not found in clan"
- The Discord ID is not in the `members` table
- Make sure the user is registered in your system

### "Forbidden: Admin privileges required"
- The Discord ID is not in the `ADMIN_DISCORD_IDS` whitelist
- Add the Discord ID to the whitelist in `src/middleware/auth.ts`

### "Authentication failed. Invalid member code."
- The member code doesn't match the database
- Get the correct member code from the database:
  ```sql
  SELECT member_code FROM members WHERE discord_id = 'YOUR_DISCORD_ID';
  ```

## Database Schema

The middleware relies on the following columns in the `members` table:
- `discord_id` (VARCHAR) - User's Discord ID
- `member_code` (INTEGER) - User's member code for authentication
- `is_active` (BOOLEAN) - Whether the account is active
- `discord_username` (VARCHAR) - For logging/display purposes

Ensure these columns exist and are properly populated.

