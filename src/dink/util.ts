import axios from 'axios'

export const addImageToPayload = (payload, imageBuffer, imageFilename) => {
  if (imageBuffer && imageFilename) {
    const formData = new FormData()
    formData.append('payload_json', JSON.stringify({
      ...payload,
      embeds: [{
        ...payload.embeds[0],
        image: {
          url: 'attachment://' + imageFilename
        }
      }]
    }))
    formData.append('file', imageBuffer, { filename: imageFilename } as any)

    return formData
  }

  return payload
}

export const sendToDiscord = async (payload) => {
  const discordWebhookUrl = 'https://discord.com/api/webhooks/1426849646675886152/A9R_7-FCacRkeCdtLLzHL4d8qCuRQFf_q26vBuBj-f2JF128usremCGbYTR7heav7Mhn'

  if (payload instanceof FormData) {
    // Multipart form data with image
    await axios.post(discordWebhookUrl, payload, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } else {
    // JSON payload
    await axios.post(discordWebhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}
