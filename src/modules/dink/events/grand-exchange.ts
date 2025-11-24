import { addImageToPayload } from '../discord-utils.js'

export const createGrandExchangeEmbed = async (fields, imageBuffer, imageFilename) => {
  const {
    playerName,
    accountType,
    dinkAccountHash,
    clanName,
    seasonalWorld,
    world,
    regionId,
    extra: {
      slot,
      status,
      item: {
        id,
        quantity,
        priceEach,
        name
      },
      marketPrice,
      targetPrice,
      targetQuantity,
    },
    discordUser,
    embeds
  } = fields

  // Handle optional discordUser field
  const discordUserId = discordUser?.id
  const discordUserName = discordUser?.name
  const discordUserAvatarHash = discordUser?.avatar

  const formattedPrice = (parseInt(priceEach) || 0).toLocaleString()

  const description = `${playerName} ${status} ${quantity} x [${name}](https://oldschool.runescape.wiki/w/Special:Search?search=${encodeURIComponent(name)}) on the GE`

  const payload = {
    embeds: [
      {
        type: 'rich',
        title: 'Grand Exchange',
        timestamp: new Date().toISOString(),
        thumbnail: {
          url: 'https://oldschool.runescape.wiki/images/Grand_Exchange_icon.png'
        },
        footer: {
          text: 'Pane friikad kotti',
          icon_url: 'https://github.com/pajlads/DinkPlugin/raw/master/icon.png'
        },
        fields: [
          {
            name: 'Status',
            value: `\`\`\`\n${status}\n\`\`\``,
            inline: true
          },
          {
            name: 'Market Unit Price',
            value: `\`\`\`ldif\n${formattedPrice} gp\n\`\`\``,
            inline: true
          }
        ],
        description: description,
        color: 15990936, // Same color as in the example
        author: {
          name: playerName,
          url: `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(playerName)}`
        }
      }
    ]
  }

  return addImageToPayload(payload, imageBuffer, imageFilename)
}