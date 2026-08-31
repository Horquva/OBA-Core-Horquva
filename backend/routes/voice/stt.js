const https = require('https')

const MOCK_TRANSCRIPT = "Check the status of workflow wf_001 and escalate if blocked"

async function transcribeAudio(audioBuffer, mimeType = 'audio/wav') {
  if (!process.env.DEEPGRAM_API_KEY) {
    console.warn('[STT] No DEEPGRAM_API_KEY found — using mock transcript')
    return { transcript: MOCK_TRANSCRIPT, source: 'mock' }
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepgram.com',
      path: '/v1/listen?punctuate=true&language=en',
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': mimeType,
        'Content-Length': audioBuffer.length
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          const transcript = parsed?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
          if (!transcript) return reject(new Error('Empty transcript from Deepgram'))
          resolve({ transcript, source: 'deepgram' })
        } catch (err) {
          reject(new Error(`Deepgram parse error: ${err.message}`))
        }
      })
    })

    req.on('error', (err) => reject(new Error(`Deepgram request failed: ${err.message}`)))
    req.write(audioBuffer)
    req.end()
  })
}

async function transcribeText(text) {
  if (!text || text.trim() === '') {
    console.warn('[STT] No text provided — using mock transcript')
    return { transcript: MOCK_TRANSCRIPT, source: 'mock' }
  }
  return { transcript: text.trim(), source: 'text' }
}

module.exports = { transcribeAudio, transcribeText }