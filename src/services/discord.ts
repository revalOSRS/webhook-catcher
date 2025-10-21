/**
 * Discord API Service
 * Fetch Discord user data on-demand without storing it
 */

/**
 * Get Discord user avatar URL
 * @param discordId - Discord user ID
 * @returns Avatar URL or null if user not found
 */
export async function getDiscordAvatar(discordId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      console.error('Discord API error:', response.status, await response.text())
      return null
    }

    const user = await response.json()
    
    if (!user.avatar) {
      // User has no custom avatar, return default avatar URL
      // Discord default avatars are based on discriminator or user ID
      const defaultAvatarIndex = user.discriminator === '0' 
        ? (BigInt(discordId) >> 22n) % 6n  // New username system
        : parseInt(user.discriminator) % 5  // Legacy discriminator system
      
      return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`
    }

    // Construct avatar URL
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.${extension}`
  } catch (error) {
    console.error('Error fetching Discord avatar:', error)
    return null
  }
}

/**
 * Get multiple Discord avatars in parallel
 * @param discordIds - Array of Discord user IDs
 * @returns Map of discordId to avatar URL
 */
export async function getDiscordAvatars(discordIds: string[]): Promise<Map<string, string | null>> {
  const results = await Promise.allSettled(
    discordIds.map(async (id) => ({ id, avatar: await getDiscordAvatar(id) }))
  )

  const avatarMap = new Map<string, string | null>()
  
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      avatarMap.set(result.value.id, result.value.avatar)
    }
  })

  return avatarMap
}

/**
 * Construct default Discord avatar URL without API call
 * This returns a default avatar based on the user ID
 * @param discordId - Discord user ID
 * @returns Default avatar URL
 */
export function getDefaultDiscordAvatar(discordId: string): string {
  // For new username system (no discriminator), calculate based on user ID
  const defaultAvatarIndex = (BigInt(discordId) >> 22n) % 6n
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`
}

