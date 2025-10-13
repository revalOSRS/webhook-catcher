import { addImageToPayload, formatRuneScapeNumber } from '../util.js'

const PVM_DEATH_DESCRIPTIONS = [
  '☠️ **${victimName}** suri ${killerName}-i käte läbi. 🕯️',
  '☠️ **${victimName}**-le sõideti kelku ${killerName}-i poolt. 🕯️',
  '☠️ ${killerName} sõitis **${victimName}**-st toorelt üle. 🕯️',
  '☠️ **${victimName}** häbistas Eestlaseid surres ${killerName}-ile. 🕯️',
]

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
    discordUser: {
      id: discordUserId,
      name: discordUserName,
      avatar: discordUserAvatarHash,
    },
    embeds
  } = fields

  const randomDescription = PVM_DEATH_DESCRIPTIONS[Math.floor(Math.random() * PVM_DEATH_DESCRIPTIONS.length)]
  const description = randomDescription
    .replace('${victimName}', playerName)
    .replace('${killerName}', killerName || 'Grim Reaper')

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