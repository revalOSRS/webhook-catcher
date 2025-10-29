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
    discordUser,
    embeds
  } = fields
  
  // Handle optional discordUser field
  const discordUserId = discordUser?.id
  const discordUserName = discordUser?.name
  const discordUserAvatarHash = discordUser?.avatar

  const minimumDropValue = 1000000;

  // Filter items that meet the minimum value requirement
  const valuableItems = extra.items.filter(item => item.priceEach * item.quantity >= minimumDropValue);

  // Only proceed if there are valuable items to show
  if (valuableItems.length === 0) {
    return null; // Don't send notification for low-value drops
  }

  // Calculate total value of valuable items only
  const totalValue = valuableItems.reduce((acc, item) => acc + item.priceEach * item.quantity, 0);

  // Extract author URL and thumbnail URL from the embeds array
  const authorUrl = embeds?.[0]?.author?.url || `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`;
  const thumbnailUrl = embeds?.[0]?.thumbnail?.url || "https://oldschool.runescape.wiki/images/Coins_detail.png";

  const payload = {
    embeds: [
      {
        "title": `${playerName} sai endale ${valuableItems.map(item => `${item.quantity} x ${item.name}`).join(', ')} (${formatRuneScapeNumber(totalValue)} gp)`,
        "author": {
          "name": playerName,
          "url": authorUrl
        },
        "color": 0,
        "thumbnail": {
          "url": thumbnailUrl
        },
        "fields": [],
        "footer": {
          "text": `KC: ${extra.killCount} - Tõenäosus: 1/${Math.round(1 / extra.rarestProbability)}`,
          "icon_url": "https://oldschool.runescape.wiki/images/Coins_detail.png"
        },
        "timestamp": new Date().toISOString()
      }
    ]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}