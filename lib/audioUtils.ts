// =============================================
// UTILIDADES DE ÁUDIO PARA CHAMADAS
// Gera tons de chamada usando Web Audio API
// =============================================

/**
 * Cria um tom de ringback (para quem está chamando)
 * Tom suave "tooom... tooom..." com intervalo de 4 segundos
 */
export function createRingbackTone(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null

  try {
    // Criar contexto de áudio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Criar buffer para armazenar o som (8 segundos: 1s tom + 3s pausa + 1s tom + 3s pausa)
    const sampleRate = audioContext.sampleRate
    const duration = 8 // segundos
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    // Função para gerar tom suave (fade in/out)
    const generateTone = (startSample: number, durationSamples: number, frequency: number) => {
      const fadeInSamples = sampleRate * 0.1 // 100ms fade in
      const fadeOutSamples = sampleRate * 0.2 // 200ms fade out

      for (let i = 0; i < durationSamples; i++) {
        const sampleIndex = startSample + i
        if (sampleIndex >= data.length) break

        // Gerar onda senoidal
        const t = i / sampleRate
        let amplitude = Math.sin(2 * Math.PI * frequency * t)

        // Aplicar fade in
        if (i < fadeInSamples) {
          amplitude *= i / fadeInSamples
        }
        // Aplicar fade out
        else if (i > durationSamples - fadeOutSamples) {
          amplitude *= (durationSamples - i) / fadeOutSamples
        }

        data[sampleIndex] = amplitude * 0.3 // Volume 30%
      }
    }

    // Tom 1: 0s a 1s (frequência 440Hz - Lá)
    generateTone(0, sampleRate * 1, 440)

    // Pausa: 1s a 4s (silêncio)

    // Tom 2: 4s a 5s (frequência 440Hz - Lá)
    generateTone(sampleRate * 4, sampleRate * 1, 440)

    // Pausa: 5s a 8s (silêncio)

    // Converter buffer para Blob e criar URL
    const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate)
    const source = offlineContext.createBufferSource()
    source.buffer = buffer
    source.connect(offlineContext.destination)
    source.start()

    return offlineContext.startRendering().then((renderedBuffer) => {
      // Converter AudioBuffer para WAV
      const wav = audioBufferToWav(renderedBuffer)
      const blob = new Blob([wav], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)

      const audio = new Audio(url)
      audio.loop = true
      return audio
    }).catch(err => {
      console.error('Erro ao criar ringback tone:', err)
      return null
    }) as any

  } catch (err) {
    console.error('Web Audio API não suportada:', err)
    return null
  }
}

/**
 * Cria um tom de ringtone (para quem está recebendo)
 * Tom de chamada padrão com padrão ring-ring
 */
export function createRingTone(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const sampleRate = audioContext.sampleRate
    const duration = 6 // segundos (ring curto + pausa + ring curto + pausa longa)
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    const generateRing = (startSample: number, durationSamples: number) => {
      // Dual-tone (480Hz + 620Hz) - tom de telefone BR
      const freq1 = 480
      const freq2 = 620

      for (let i = 0; i < durationSamples; i++) {
        const sampleIndex = startSample + i
        if (sampleIndex >= data.length) break

        const t = i / sampleRate
        const wave1 = Math.sin(2 * Math.PI * freq1 * t)
        const wave2 = Math.sin(2 * Math.PI * freq2 * t)

        data[sampleIndex] = (wave1 + wave2) * 0.25 // Volume 25%
      }
    }

    // Ring 1: 0s a 0.4s
    generateRing(0, sampleRate * 0.4)
    // Pausa: 0.4s a 0.6s
    // Ring 2: 0.6s a 1s
    generateRing(sampleRate * 0.6, sampleRate * 0.4)
    // Pausa longa: 1s a 6s

    const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate)
    const source = offlineContext.createBufferSource()
    source.buffer = buffer
    source.connect(offlineContext.destination)
    source.start()

    return offlineContext.startRendering().then((renderedBuffer) => {
      const wav = audioBufferToWav(renderedBuffer)
      const blob = new Blob([wav], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)

      const audio = new Audio(url)
      audio.loop = true
      return audio
    }).catch(err => {
      console.error('Erro ao criar ringtone:', err)
      return null
    }) as any

  } catch (err) {
    console.error('Web Audio API não suportada:', err)
    return null
  }
}

/**
 * Converte AudioBuffer para formato WAV
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44
  const arrayBuffer = new ArrayBuffer(length)
  const view = new DataView(arrayBuffer)
  const channels: Float32Array[] = []
  let offset = 0
  let pos = 0

  // Escrever header WAV
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true)
    pos += 2
  }
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true)
    pos += 4
  }

  // "RIFF"
  setUint32(0x46464952)
  setUint32(length - 8)
  // "WAVE"
  setUint32(0x45564157)
  // "fmt "
  setUint32(0x20746d66)
  setUint32(16)
  setUint16(1)
  setUint16(buffer.numberOfChannels)
  setUint32(buffer.sampleRate)
  setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels)
  setUint16(buffer.numberOfChannels * 2)
  setUint16(16)
  // "data"
  setUint32(0x61746164)
  setUint32(length - pos - 4)

  // Escrever samples
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  offset = pos
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return arrayBuffer
}
