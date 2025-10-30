import { addImageToPayload, formatRuneScapeNumber } from '../util.js'
import { getDeathDescription } from '../handler.js'

export const createDeathEmbed = async (fields, imageBuffer, imageFilename) => {
  const {
    playerName,
    accountType,
    dinkAccountHash,
    clanName,
    seasonalWorld,
    world,
    regionId,
    extra: {
      valueLost,
      isPvp,
      killerName,
      killerNpcId,
      keptItems,
      lostItems,
      location: {
        locationRegionId,
        locationPlane,
        locationInstanced
      }
    },
    discordUser,
    embeds
  } = fields

  // Handle optional discordUser field
  const discordUserId = discordUser?.id
  const discordUserName = discordUser?.name
  const discordUserAvatarHash = discordUser?.avatar

  // Use the shared death description function with proper Estonian grammar
  const description = `☠️ **${getDeathDescription(playerName, killerName || 'Grim Reaper')}** 🕯️`

  const payload = {
    embeds: [
      {
        "title": description,
        "author": {
          "name": playerName,
          "url": `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
        },
        "color": 0,
        "thumbnail": {
          "url": "https://oldschool.runescape.wiki/images/Items_kept_on_death.png"
        },
        "fields": [],
        "footer": {
          "text": `${playerName} kaotas ${formatRuneScapeNumber(valueLost)} gp`,
          "icon_url": "https://oldschool.runescape.wiki/images/Coins_detail.png"
        },
        "timestamp": new Date().toISOString()
      }
    ]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}