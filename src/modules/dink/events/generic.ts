import { addImageToPayload } from '../discord-utils.js'

export const createGenericEmbed = async (fields, imageBuffer, imageFilename) => {
  const playerName = fields.playerName || fields.player_name || 'Unknown Player'
  const type = fields.type || fields.payload_json?.type || 'UNKNOWN'

  // Create a basic description from all available fields
  let description = `**Type:** ${type}\n`
  if (playerName !== 'Unknown Player') {
    description += `**Player:** ${playerName}\n`
  }

  // Add other relevant fields
  const relevantFields = ['itemName', 'item_name', 'quantity', 'price', 'status', 'action', 'message', 'level', 'xp']
  for (const field of relevantFields) {
    if (fields[field]) {
      const displayName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      description += `**${displayName}:** ${fields[field]}\n`
    }
  }

  const payload = {
    embeds: [
      {
        type: 'rich',
        title: `Dink Notification - ${type}`,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Pane friikad kotti',
          icon_url: 'https://github.com/pajlads/DinkPlugin/raw/master/icon.png'
        },
        description: description,
        color: 16776960, // Yellow color for generic notifications
        author: playerName !== 'Unknown Player' ? {
          name: playerName,
          url: `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
        } : undefined
      }
    ]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}
