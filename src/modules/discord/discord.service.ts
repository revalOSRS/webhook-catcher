/**
 * Discord Service
 * Discord API integration and user data fetching
 */

/**
 * Discord Service Class
 * Handles Discord API interactions and user data retrieval
 */
export class DiscordService {
  /**
   * Get Discord user avatar URL
   * @param discordId - Discord user ID
   * @returns Avatar URL or null if user not found
   */
  static async getDiscordAvatar(discordId: string): Promise<string | null> {
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

      console.log('Discord user:', user)

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
  static async getDiscordAvatars(discordIds: string[]): Promise<Map<string, string | null>> {
    const results = await Promise.allSettled(
      discordIds.map(async (id) => ({ id, avatar: await this.getDiscordAvatar(id) }))
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
  static getDefaultDiscordAvatar(discordId: string): string {
    // For new username system (no discriminator), calculate based on user ID
    const defaultAvatarIndex = (BigInt(discordId) >> 22n) % 6n
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`
  }

  /**
   * Validate Discord bot token
   */
  static isBotTokenValid(): boolean {
    return !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN.length > 0)
  }

  /**
   * Get Discord API rate limit status
   */
  static async getRateLimitStatus(): Promise<{
    remaining: number
    resetAfter: number
    limit: number
  } | null> {
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`
        }
      })

      const remaining = response.headers.get('X-RateLimit-Remaining')
      const resetAfter = response.headers.get('X-RateLimit-Reset-After')
      const limit = response.headers.get('X-RateLimit-Limit')

      if (remaining && resetAfter && limit) {
        return {
          remaining: parseInt(remaining),
          resetAfter: parseFloat(resetAfter),
          limit: parseInt(limit)
        }
      }

      return null
    } catch (error) {
      console.error('Error checking rate limit:', error)
      return null
    }
  }
}
