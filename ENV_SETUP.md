# Environment Variables Setup

This document describes the environment variables needed for the webhook-catcher application.

## Required Environment Variables

### Database Configuration

```env
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
```

Get this from your Neon Database dashboard.

### Discord OAuth Configuration

```env
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://reval-games.vercel.app/auth/callback
DISCORD_BOT_TOKEN=your_discord_bot_token
```

#### How to get Discord OAuth credentials:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. **OAuth2 Settings:**
   - Go to "OAuth2" section
   - Copy the **Client ID** and **Client Secret**
   - Add your redirect URI in the "Redirects" section
     - For production: `https://reval-games.vercel.app/auth/callback`
     - For local dev: `http://localhost:5173/auth/callback`
4. **Bot Token:**
   - Go to "Bot" section
   - Copy the **Bot Token** (used for fetching user avatars on-demand)
   - Make sure the bot has necessary intents enabled if needed

### Admin API Key

```env
ADMIN_API_KEY=your_secure_random_key_here
```

Generate a secure random key for admin endpoints. Keep this secret!

### Discord Webhooks (Optional - for Dink integration)

```env
DISCORD_WEBHOOK_URL_MEENED=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_URL_DEATH=https://discord.com/api/webhooks/...
```

## Vercel Deployment

Add these environment variables in your Vercel project settings:

1. Go to your project in Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the appropriate value
4. Make sure to add them for all environments (Production, Preview, Development)

## Local Development

Create a `.env` file in the root directory with all the variables listed above.

**Note:** Never commit your `.env` file to version control!

