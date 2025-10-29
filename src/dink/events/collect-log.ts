import { addImageToPayload, formatRuneScapeNumber } from '../util.js'
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

  const itemPrice = extra.price || 0
  const MIN_PRICE_THRESHOLD = 500000 // 500k

  // Filter: Only show items worth more than 500k OR untradeable items (price is 0 or very low)
  // Untradeable items typically have a price of 0 or very low value in the GE data
  const isUntradeable = itemPrice === 0 || itemPrice < 100 // Items with price 0 or less than 100gp are likely untradeable
  const isValuable = itemPrice > MIN_PRICE_THRESHOLD

  if (!isValuable && !isUntradeable) {
    console.log(`Collection log item filtered out: ${extra.itemName} (price: ${itemPrice}gp) - not valuable enough and not untradeable`)
    return null
  }

  console.log(`Collection log item passed filter: ${extra.itemName} (price: ${itemPrice}gp, untradeable: ${isUntradeable}, valuable: ${isValuable})`)

  // Get the item icon from the thumbnail URL in the original embeds
  const itemIconUrl = embeds?.[0]?.thumbnail?.url || `https://static.runelite.net/cache/item/icon/${extra.itemId}.png`

  const formattedPrice = formatRuneScapeNumber(itemPrice)
  
  const payload = {
    embeds: [
      {
        "title": `${playerName} sai Collection Logis endale ${extra.itemName} (${formattedPrice} kuldmünti)`,
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