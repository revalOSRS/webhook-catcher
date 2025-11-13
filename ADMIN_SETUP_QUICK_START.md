# Admin Setup Quick Start

This guide helps you quickly set up admin access for the clan events management API.

## Step 1: Add Your Discord ID to the Whitelist

Edit `src/middleware/auth.ts` and add your Discord ID:

```typescript
const ADMIN_DISCORD_IDS = [
  '123456789012345678',  // Replace with YOUR Discord ID
]
```

**How to find your Discord ID:**
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your name and select "Copy ID"

## Step 2: Get Your Member Code

Query your database to find your member code:

```sql
SELECT discord_id, member_code, discord_username
FROM members
WHERE discord_id = 'YOUR_DISCORD_ID';
```

**If you don't have a member code yet:**

The member code should be automatically assigned when the member is created. If not, you can assign one manually:

```sql
UPDATE members
SET member_code = floor(random() * 9000 + 1000)::int
WHERE discord_id = 'YOUR_DISCORD_ID';

-- Verify it was set
SELECT member_code FROM members WHERE discord_id = 'YOUR_DISCORD_ID';
```

## Step 3: Restart Your Server

After editing the whitelist, restart your Node.js server for the changes to take effect.

## Step 4: Test Your Access

Test with a simple GET request:

```bash
curl -X GET "http://localhost:3000/api/admin/clan-events/events" \
  -H "X-Discord-Id: YOUR_DISCORD_ID" \
  -H "X-Member-Code: YOUR_MEMBER_CODE"
```

**Expected responses:**
- ✅ **200 OK** - Success! You have admin access
- ❌ **403 Forbidden (not authorized)** - Your Discord ID is not in the whitelist
- ❌ **403 Forbidden (invalid member code)** - Your member code is incorrect
- ❌ **404 Not Found** - Your Discord ID is not in the members table

## Step 5: Add More Admins

To add more admins, simply add their Discord IDs to the array:

```typescript
const ADMIN_DISCORD_IDS = [
  '123456789012345678',  // Admin 1
  '234567890123456789',  // Admin 2
  '345678901234567890',  // Admin 3
]
```

Then get their member codes from the database and share them securely.

## Production Setup (Recommended)

For production, use environment variables instead of hardcoding Discord IDs:

### 1. Create `.env` file:

```env
ADMIN_DISCORD_IDS=123456789012345678,234567890123456789,345678901234567890
```

### 2. Update `src/middleware/auth.ts`:

```typescript
// At the top of the file
const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS
  ? process.env.ADMIN_DISCORD_IDS.split(',')
  : []
```

### 3. Restart your server

This way you can manage admins without code changes and redeployments.

## Security Best Practices

1. **Keep Member Codes Secret**: Treat member codes like passwords
2. **Use HTTPS**: Always use HTTPS in production
3. **Rotate Codes**: If a member code is compromised, rotate it immediately
4. **Remove Access Promptly**: Remove Discord IDs from the whitelist when admin access should be revoked
5. **Audit Logs**: Consider implementing audit logging for all admin actions

## Troubleshooting

### I'm getting 403 Forbidden
- Check that your Discord ID is in the `ADMIN_DISCORD_IDS` array
- Verify your member code is correct
- Make sure you restarted the server after updating the whitelist

### I'm getting 404 Not Found
- You need to be in the `members` table first
- Check with: `SELECT * FROM members WHERE discord_id = 'YOUR_DISCORD_ID';`

### My member code doesn't work
- Query the database to get the correct code
- Make sure you're passing it as a string in the header
- Verify it matches exactly (case-sensitive)

## Quick Reference

**Headers Required:**
```
X-Discord-Id: your_discord_id
X-Member-Code: your_member_code
```

**Whitelist Location:**
`src/middleware/auth.ts` → `ADMIN_DISCORD_IDS` array

**Routes Location:**
`src/routes/admin/clan-events/` → All admin route files

**Database Query:**
```sql
SELECT discord_id, member_code FROM members WHERE discord_id = 'YOUR_ID';
```

---

For more detailed information, see [ADMIN_AUTHENTICATION_GUIDE.md](./ADMIN_AUTHENTICATION_GUIDE.md)

