import axios from 'axios'

export const formatRuneScapeNumber = (num) => {
  const number = parseInt(num) || 0

  if (number >= 1000000000) {
    // Billions
    const billions = number / 1000000000
    return billions % 1 === 0 ? `${billions}b` : `${billions.toFixed(1)}b`
  } else if (number >= 1000000) {
    // Millions
    const millions = number / 1000000
    return millions % 1 === 0 ? `${millions}m` : `${millions.toFixed(1)}m`
  } else if (number >= 1000) {
    // Thousands
    const thousands = number / 1000
    return thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`
  } else {
    // Regular number
    return number.toLocaleString()
  }
}

export const addImageToPayload = (payload, imageBuffer, imageFilename) => {
  if (imageBuffer && imageFilename) {
    const formData = new FormData()

    const blob = new Blob([imageBuffer])

    formData.append('payload_json', JSON.stringify({
      ...payload,
      embeds: [{
        ...payload.embeds[0],
        image: {
          url: 'attachment://' + imageFilename
        }
      }]
    }))
    formData.append('file', blob, imageFilename)

    return formData
  }

  return payload
}



export const sendToDeathChannelDiscord = async (payload) => {
  const discordDeathWebhookUrl = 'https://discord.com/api/webhooks/1426849646675886152/A9R_7-FCacRkeCdtLLzHL4d8qCuRQFf_q26vBuBj-f2JF128usremCGbYTR7heav7Mhn'

  if (payload instanceof FormData) {
    // Multipart form data with image
    await axios.post(discordDeathWebhookUrl, payload, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } else {
    // JSON payload
    await axios.post(discordDeathWebhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export const sendToMeenedChannelDiscord = async (payload) => {
  const discordMeenedWebhookUrl = 'https://discord.com/api/webhooks/1427361462539649156/FnC1JJEWQmineXYeFOkwFlUAuI8RLgoVR7Tz475BI3ApD8FrL0GEqE8r4DDmgJEard65'

  if (payload instanceof FormData) {
    // Multipart form data with image
    await axios.post(discordMeenedWebhookUrl, payload, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } else {
    // JSON payload
    await axios.post(discordMeenedWebhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}
