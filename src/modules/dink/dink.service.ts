/**
 * Dink Service
 * RuneLite webhook event processing and Discord integration
 */

import Busboy from 'busboy'
import { MembersService } from '../members/members.service.js'

// Import event embed creators
import { createDeathEmbed } from './events/death.js'
import { createGenericEmbed } from './events/generic.js'
import { createGrandExchangeEmbed } from './events/grand-exchange.js'
import { createCollectLogEmbed } from './events/collect-log.js'
import { createLootEmbed } from './events/loot.js'
import { sendToDeathChannelDiscord, sendToMeenedChannelDiscord } from './discord-utils.js'

// Bingo event processing
import { tileProgressService } from '../events/bingo/tile-progress.service.js'
import { BingoService } from '../events/bingo/bingo.service.js'
import { BingoXpSnapshotsService } from '../events/bingo/xp-snapshots.service.js'
import { OsrsAccountsService } from '../osrs-accounts/osrs-accounts.service.js'
import { query } from '../../db/connection.js'

// Cache for dink hash verification (10 minutes)
const dinkHashCache = new Map<string, { isValid: boolean; expiresAt: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes in milliseconds

export interface ActivityEvent {
  id: string
  event_type: string
  icon: string
  text: string
  player_name?: string
  created_at: string
}

/**
 * Dink Service Class
 * Handles RuneLite webhook processing and Discord integration
 */
export class DinkService {
  // ===== In-Memory Activity Cache =====
  private static activityEvents: ActivityEvent[] = []
  private static readonly MAX_EVENTS = 20

  /**
   * Get a random death description with proper Estonian grammar
   */
  static getDeathDescription(playerName: string, killerName: string): string {
    // Estonian vowels
    const vowels = ['a', 'e', 'i', 'o', 'u', 'õ', 'ä', 'ö', 'ü', 'A', 'E', 'I', 'O', 'U', 'Õ', 'Ä', 'Ö', 'Ü']

    // Check if killerName ends with a consonant
    const lastChar = killerName.slice(-1)
    const endsWithConsonant = !vowels.includes(lastChar)

    // Add 'i genitive ending only if it ends with a consonant
    const killerGenitive = endsWithConsonant ? `${killerName}'i` : killerName

    const deathDescriptions = [
      `${playerName} suri ${killerGenitive} käte läbi`,
      `${playerName}'le sõideti kelku ${killerGenitive} poolt`,
      `${killerName} sõitis ${playerName}'st toorelt üle`,
      `${playerName} häbistas Eestlaseid surres ${killerName}'ile`,
      `${playerName} libastus ${killerGenitive} otsa`,
      `${playerName} peaks mõne õpetliku video läbi vaatama ${killerGenitive} kohta`,
    ]

    return deathDescriptions[Math.floor(Math.random() * deathDescriptions.length)]
  }

  /**
   * Map Dink events to display format
   */
  static formatDinkEvent(payloadData: any): ActivityEvent | null {
    const eventMap: Record<string, { icon: string; textTemplate: (e: any) => string }> = {
      'COLLECTION': {
        icon: '📖',
        textTemplate: (e) => `${e.playerName} sai Collection Logis endale ${e.extra?.itemName || 'eseme'}!`
      },
      'LEVEL': {
        icon: '⬆️',
        textTemplate: (e) => {
          const skills = e.extra?.levelledSkills || {}
          const skillName = Object.keys(skills)[0]
          const level = skills[skillName]
          return `${e.playerName} jõudis tasemele ${level} (${skillName})!`
        }
      },
      'LOOT': {
        icon: '💰',
        textTemplate: (e) => {
          const items = e.extra?.items || []
          const itemName = items[0]?.name || 'haruldast looti'
          return `${e.playerName} sai endale ${itemName}!`
        }
      },
      'QUEST': {
        icon: '✅',
        textTemplate: (e) => `${e.playerName} lõpetas questi: ${e.extra?.questName || 'quest'}!`
      },
      'ACHIEVEMENT_DIARY': {
        icon: '📜',
        textTemplate: (e) => `${e.playerName} lõpetas ${e.extra?.area || ''} ${e.extra?.tier || ''} diary!`
      },
      'COMBAT_ACHIEVEMENT': {
        icon: '🏆',
        textTemplate: (e) => `${e.playerName} lõpetas combat achievementi: ${e.extra?.task || 'achievement'}!`
      },
      'DEATH': {
        icon: '💀',
        textTemplate: (e) => {
          const killerName = e.extra?.killerName || 'Grim Reaper'
          return this.getDeathDescription(e.playerName, killerName)
        }
      },
      'PET': {
        icon: '🐾',
        textTemplate: (e) => `${e.playerName} sai peti: ${e.extra?.petName || 'pet'}!`
      },
      'SPEEDRUN': {
        icon: '⏱️',
        textTemplate: (e) => `${e.playerName} lõpetas ${e.extra?.quest || ''} speedruni!`
      },
      'CLUE': {
        icon: '🗺️',
        textTemplate: (e) => `${e.playerName} lõpetas ${e.extra?.clueType || ''} clue scrolli!`
      },
      'SLAYER': {
        icon: '⚔️',
        textTemplate: (e) => `${e.playerName} lõpetas slayer taski: ${e.extra?.monster || 'monsters'}!`
      },
      'KILL_COUNT': {
        icon: '🎯',
        textTemplate: (e) => `${e.playerName} võitis ${e.extra?.boss || 'bossi'} (KC: ${e.extra?.count || '?'})!`
      },
      'CHAT': {
        icon: '💬',
        textTemplate: (e) => `${e.playerName}: ${e.extra?.message || '...'}`
      }
    }

    const mapping = eventMap[payloadData.type] || {
      icon: '🎮',
      textTemplate: (e) => `${e.playerName || 'Keegi'} saavutas midagi!`
    }

    try {
      return {
        id: `${Date.now()}-${Math.random()}`,
        event_type: payloadData.type,
        icon: mapping.icon,
        text: mapping.textTemplate(payloadData),
        player_name: payloadData.playerName,
        created_at: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error formatting dink event:', error)
      return null
    }
  }

  /**
   * Add event to activity cache
   */
  private static addActivityEvent(event: ActivityEvent): void {
    this.activityEvents.unshift(event) // Add to beginning (newest first)
    if (this.activityEvents.length > this.MAX_EVENTS) {
      this.activityEvents.pop() // Remove oldest
    }
  }

  /**
   * Get recent activity events from cache
   */
  static getRecentActivityEvents(limit: number = 7): ActivityEvent[] {
    return this.activityEvents.slice(0, Math.min(limit, this.activityEvents.length))
  }

  /**
   * Verify dink hash with caching
   */
  private static async verifyDinkHashCached(dinkHash: string): Promise<boolean> {
    const now = Date.now()
    const cached = dinkHashCache.get(dinkHash)

    if (cached && cached.expiresAt > now) {
      console.log(`Using cached verification for dink hash ${dinkHash.substring(0, 8)}...`)
      return cached.isValid
    }

    console.log(`Verifying dink hash ${dinkHash.substring(0, 8)}... from database`)
    const isValid = await MembersService.verifyDinkHash(dinkHash)

    // Cache the result
    dinkHashCache.set(dinkHash, {
      isValid,
      expiresAt: now + CACHE_DURATION
    })

    return isValid
  }

  /**
   * Process multipart form data and create Discord payload
   */
  private static async createDiscordPayload(fields: any, imageBuffer: Buffer | null, imageFilename: string | null): Promise<any> {
    let payloadData = fields.payload_json
    if (typeof payloadData === 'string') {
      try {
        payloadData = JSON.parse(payloadData)
      } catch (e) {
        console.error('Failed to parse payload_json:', e)
        payloadData = {}
      }
    }

    const { type = 'UNKNOWN', world, dinkAccountHash } = payloadData

    // Verify dink hash
    if (dinkAccountHash) {
      const isValid = await this.verifyDinkHashCached(dinkAccountHash)
      if (!isValid) {
        console.log(`Event filtered out because dink hash ${dinkAccountHash.substring(0, 8)}... is not valid or member is not active/in discord`)
        return null
      }
    } else {
      console.log('Event filtered out because no dink hash provided')
      return null
    }

    // Filter out events from worlds greater than 625 (special/tournament worlds)
    // if (world && world >= 627) {
    //   console.log(`Event filtered out because world ${world} is greater than 625, not sending to Discord`)
    //   return null;
    // }

    if (type === 'UNKNOWN') {
      console.log('Event filtered out because the type is UNKNOWN, not sending to Discord')
      return null
    }

    // Filter out COMBAT_ACHIEVEMENT events
    if (type === 'COMBAT_ACHIEVEMENT') {
      console.log('Event filtered out because the type is COMBAT_ACHIEVEMENT, not sending to Discord')
      return null
    }

    // Filter out LEVEL events
    if (type === 'LEVEL') {
      console.log('Event filtered out because the type is LEVEL, not sending to Discord')
      return null
    }

    // Filter out KILL_COUNT events
    if (type === 'KILL_COUNT') {
      console.log('Event filtered out because the type is KILL_COUNT, not sending to Discord')
      return null
    }

    // Filter out CLUE events
    if (type === 'CLUE') {
      console.log('Event filtered out because the type is CLUE, not sending to Discord')
      return null
    }

    // Filter out SLAYER events
    if (type === 'SLAYER') {
      console.log('Event filtered out because the type is SLAYER, not sending to Discord')
      return null
    }

    // Only send CHAT events if the message is "::triggerdink"
    if (type === 'CHAT') {
      const message = payloadData?.extra?.message
      if (message !== '::triggerdink') {
        console.log(`Chat event filtered out because message "${message}" is not "::triggerdink"`)
        return null
      }
    }

    const typeHandlers = {
      GRAND_EXCHANGE: createGrandExchangeEmbed,
      DEATH: createDeathEmbed,
      LOOT: createLootEmbed,
      COLLECTION: createCollectLogEmbed,
      CHAT: createGenericEmbed,
      UNKNOWN: createGenericEmbed,
    }

    const handler = typeHandlers[type] || createGenericEmbed
    return await handler(payloadData, imageBuffer, imageFilename)
  }

  /**
   * Get the appropriate send function based on event type
   */
  private static getSendFunction(eventType: string): Function | null {
    switch (eventType) {
      case 'LOOT':
      case 'COLLECTION':
      case 'CHAT':
        return sendToMeenedChannelDiscord
      case 'DEATH':
        return sendToDeathChannelDiscord
      default:
        return null
    }
  }

  /**
   * Process RuneLite webhook
   */
  static async processWebhook(req: any): Promise<{ status: string; message: string }> {
    const ct = req.headers['content-type'] || ''

    if (ct.includes('multipart/form-data')) {
      const bb = Busboy({
        headers: req.headers,
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB, adjust if needed (Vercel limit ~4.5MB request)
          files: 10,
          fields: 200,
        },
      })

      const fields: any = {}
      let imageBuffer: Buffer | null = null
      let imageFilename: string | null = null

      // Return a promise that resolves when processing is complete
      return new Promise((resolve, reject) => {
        bb.on('field', (name, val) => {
          fields[name] = val
        })

        bb.on('file', (name, file, info) => {
          const { filename, mimeType } = info
          const chunks: any[] = []

          file.on('data', (chunk) => {
            chunks.push(chunk)
          })

          file.on('end', () => {
            const buffer = Buffer.concat(chunks)

            // Store image data for Discord upload
            if (mimeType.startsWith('image/')) {
              imageBuffer = buffer
              imageFilename = filename
            }
          })
        })

        bb.on('error', (err) => {
          console.error('Busboy error:', err)
          reject(new Error('Invalid multipart payload'))
        })

        bb.on('finish', async () => {
          console.log('Fields:', JSON.stringify(fields, null, 2))

          try {
            // Parse payload data to extract event info
            let payloadData = fields.payload_json
            if (typeof payloadData === 'string') {
              payloadData = JSON.parse(payloadData)
            }
            const eventType = payloadData?.type || 'UNKNOWN'
            const playerName = payloadData?.playerName || 'Unknown Player'

            // Check if player is in an active bingo event BEFORE filtering
            const isBingoParticipant = await BingoService.isPlayerInActiveBingoEvent(undefined, playerName)

            // Log LOGIN/LOGOUT events prominently
            if (eventType === 'LOGIN' || eventType === 'LOGOUT') {
              console.log('═══════════════════════════════════════════════════════════')
              console.log(`🔐 ${eventType} EVENT: ${playerName}`)
              console.log(`   Bingo Participant: ${isBingoParticipant ? 'YES' : 'NO'}`)
              console.log(`   Timestamp: ${new Date().toISOString()}`)
              console.log('═══════════════════════════════════════════════════════════')
            }

            // Capture XP snapshot on LOGIN for bingo participants
            if (eventType === 'LOGIN' && isBingoParticipant) {
              try {
                await this.captureLoginXpSnapshot(playerName, payloadData)
              } catch (error) {
                console.error('[DinkService] Error capturing XP snapshot:', error)
              }
            }

            // Process tile progress tracking FIRST (for all events, but especially for bingo participants)
            // This must happen before any filtering
            try {
              await tileProgressService.processDinkEvent(payloadData)
            } catch (error) {
              console.error('[DinkService] Error processing tile progress:', error)
            }

            // Bingo participants still get their events processed through regular Discord flow
            if (isBingoParticipant) {
              console.log(`[DinkService] Player ${playerName} is in active bingo event, processed for bingo tracking, continuing to Discord`)
            }

            // Add event to activity cache (before Discord filtering)
            // Skip CHAT events from activity cache
            if (eventType !== 'CHAT') {
              const activityEvent = this.formatDinkEvent(payloadData)
              if (activityEvent) {
                this.addActivityEvent(activityEvent)
                console.log(`Added ${eventType} event to activity cache for ${playerName}`)
              }
            }

            // Transform Dink data to Discord webhook format
            const discordPayload = await this.createDiscordPayload(fields, imageBuffer, imageFilename)

            // If no payload (e.g., filtered out low-value loot), skip sending
            if (!discordPayload) {
              console.log(`Event filtered out: ${eventType} for ${playerName}, not sending to Discord`)
              resolve({ status: 'ok', message: 'Webhook received but filtered out' })
              return
            }

            // Route to appropriate Discord channel based on event type
            const sendFunction = this.getSendFunction(eventType)
            if (sendFunction) {
              await sendFunction(discordPayload)
            }

            console.log('Successfully sent to Discord')
            resolve({ status: 'ok', message: 'Webhook received and forwarded to Discord' })
          } catch (error) {
            console.error('Error sending to Discord:', error)
            reject(error)
          }
        })

        req.pipe(bb)
      })
    }

    console.log('Received Dink webhook (non-multipart)')
    console.log('Body:', JSON.stringify(req.body, null, 2))

    try {
      // Extract event info
      const eventType = req.body?.type || 'UNKNOWN'
      const playerName = req.body?.playerName || 'Unknown Player'

      // Check if player is in an active bingo event BEFORE filtering
      const isBingoParticipant = await BingoService.isPlayerInActiveBingoEvent(undefined, playerName)

      // Log LOGIN/LOGOUT events prominently
      if (eventType === 'LOGIN' || eventType === 'LOGOUT') {
        console.log('═══════════════════════════════════════════════════════════')
        console.log(`🔐 ${eventType} EVENT: ${playerName}`)
        console.log(`   Bingo Participant: ${isBingoParticipant ? 'YES' : 'NO'}`)
        console.log(`   Timestamp: ${new Date().toISOString()}`)
        console.log('═══════════════════════════════════════════════════════════')
      }

      // Capture XP snapshot on LOGIN for bingo participants
      if (eventType === 'LOGIN' && isBingoParticipant) {
        try {
          await this.captureLoginXpSnapshot(playerName, req.body)
        } catch (error) {
          console.error('[DinkService] Error capturing XP snapshot:', error)
        }
      }

      // Process tile progress tracking FIRST (for all events, but especially for bingo participants)
      // This must happen before any filtering
      try {
        await tileProgressService.processDinkEvent(req.body)
      } catch (error) {
        console.error('[DinkService] Error processing tile progress:', error)
      }

      // Bingo participants still get their events processed through regular Discord flow
      if (isBingoParticipant) {
        console.log(`[DinkService] Player ${playerName} is in active bingo event, processed for bingo tracking, continuing to Discord`)
      }

      // Add event to activity cache (before Discord filtering)
      // Skip CHAT events from activity cache
      if (eventType !== 'CHAT') {
        const activityEvent = this.formatDinkEvent(req.body)
        if (activityEvent) {
          this.addActivityEvent(activityEvent)
          console.log(`Added ${eventType} event to activity cache for ${playerName}`)
        }
      }

      // Transform JSON data to Discord webhook format
      const discordPayload = await this.createDiscordPayload(req.body, null, null)

      // If no payload (e.g., filtered out low-value loot), skip sending
      if (!discordPayload) {
        console.log(`Event filtered out: ${eventType} for ${playerName}, not sending to Discord`)
        return { status: 'ok', message: 'Webhook received but filtered out' }
      }

      // Route to appropriate Discord channel based on event type
      const sendFunction = this.getSendFunction(eventType)
      if (sendFunction) {
        await sendFunction(discordPayload)
      }

      console.log('Successfully sent to Discord')
      return { status: 'ok', message: 'Webhook received and forwarded to Discord' }
    } catch (error) {
      console.error('Error sending to Discord:', error)
      throw error
    }
  }

  /**
   * Capture XP snapshot from LOGIN event for bingo participants
   * 
   * Extracts skills XP data from the LOGIN event and stores it as a snapshot.
   * First login after event start captures baseline, subsequent logins update current.
   */
  private static async captureLoginXpSnapshot(playerName: string, payloadData: any): Promise<void> {
    // Get player's OSRS account
    const account = await OsrsAccountsService.getAccountByNickname(playerName)
    if (!account) {
      console.log(`[XpSnapshot] No OSRS account found for ${playerName}, skipping XP capture`)
      return
    }

    // Get the skills XP data from the LOGIN event
    const skills = payloadData?.extra?.skills
    if (!skills?.experience || !skills?.totalExperience) {
      console.log(`[XpSnapshot] No skills data in LOGIN event for ${playerName}`)
      return
    }

    // Get active bingo events for this player
    const activeEvents = await query<{ eventId: string }>(`
      SELECT DISTINCT e.id as event_id
      FROM event_team_members etm
      JOIN event_teams et ON etm.team_id = et.id
      JOIN events e ON et.event_id = e.id
      WHERE etm.osrs_account_id = $1
        AND e.event_type = 'bingo'
        AND e.status = 'active'
        AND (e.start_date IS NULL OR (e.start_date AT TIME ZONE 'Europe/Tallinn') <= NOW())
        AND (e.end_date IS NULL OR (e.end_date AT TIME ZONE 'Europe/Tallinn') > NOW())
    `, [account.id])

    if (activeEvents.length === 0) {
      console.log(`[XpSnapshot] Player ${playerName} not in any active bingo events`)
      return
    }

    // Capture snapshot for each active event
    for (const { eventId } of activeEvents) {
      try {
        const snapshot = await BingoXpSnapshotsService.captureLoginSnapshot(
          eventId,
          account.id,
          skills.experience, // e.g., { "Attack": 7285226, "Strength": 14602484, ... }
          skills.totalExperience
        )
        console.log(`[XpSnapshot] Captured for ${playerName} in event ${eventId} (login #${snapshot.loginCount})`)
      } catch (error) {
        console.error(`[XpSnapshot] Error capturing for event ${eventId}:`, error)
      }
    }
  }
}
