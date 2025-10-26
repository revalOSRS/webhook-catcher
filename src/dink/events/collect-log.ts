import { addImageToPayload } from '../util.js'
import { CollectionEvent } from './event.js'

export const createCollectLogEmbed = async (fields: CollectionEvent, imageBuffer, imageFilename) => {
  console.log('Collection event', fields)
  
  const {
    playerName,
    accountType,
    dinkAccountHash,
    clanName,
    seasonalWorld,
    world,
    regionId,
    extra,
    discordUser: {
      id: discordUserId,
      name: discordUserName,
      avatar: discordUserAvatarHash,
    },
    embeds
  } = fields

  // Get the item icon from the thumbnail URL in the original embeds
  const itemIconUrl = embeds?.[0]?.thumbnail?.url || `https://static.runelite.net/cache/item/icon/${extra.itemId}.png`

  const payload = {
    embeds: [
      {
        "title": `${playerName} sai Collection Logis endale ${extra.itemName} (${extra.price} kuldmünti)`,
        "author": {
          "name": playerName,
          "url": `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
        },
        "color": 0,
        "thumbnail": {
          "url": itemIconUrl
        },
        "fields": [],
        "footer": {
          "text": `Kokku on Collection Log ${extra.completedEntries} / ${extra.totalEntries}`,
          "icon_url": "https://oldschool.runescape.wiki/images/Collection_log_detail.png"
        },
        "timestamp": new Date().toISOString()
      }
    ]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}