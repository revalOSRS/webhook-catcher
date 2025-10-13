import { addImageToPayload, formatRuneScapeNumber } from '../util.js'
import { LootEvent } from './event.js'

export const createLootEmbed = async (fields: LootEvent, imageBuffer, imageFilename) => {
  console.log('Loot event', fields)
  
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

  const payload = {
    embeds: [
      {
        "title": `${playerName} sai endale ${extra.items.map(item => `${item.quantity} x ${item.name}`).join(', ')} (${extra.items.reduce((acc, item) => acc + item.priceEach * item.quantity, 0)} kuldmünti)`,
        "author": {
          "name": playerName,
          "url": `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
        },
        "color": 0,
        "thumbnail": {
          "url": "https://oldschool.runescape.wiki/images/Coins_detail.png"
        },
        "fields": [],
        "footer": {
          "text": `KC: ${extra.killCount} - Tõenäosus: ${extra.rarestProbability}%`,
          "icon_url": "https://oldschool.runescape.wiki/images/Coins_detail.png"
        },
        "timestamp": new Date().toISOString()
      }
    ]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}