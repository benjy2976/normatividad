// A bounded plain-text preview; the complete artifact remains available via download.
export const TEXT_PREVIEW_BYTES = 2 * 1024 * 1024

export async function readTextArtifact(url: string, signal: AbortSignal) {
  const controller = new AbortController()
  const cancel = () => controller.abort(signal.reason)
  if (signal.aborted) cancel()
  else signal.addEventListener('abort', cancel, { once: true })
  const timeout = setTimeout(() => controller.abort(), 15_000)
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin', redirect: 'error' })
    if (!response.ok || !response.body) throw new Error('Artefacto no disponible')
    reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytes = 0
    let text = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) return { text: text + decoder.decode(), truncated: false }
      const length = Math.min(value.length, TEXT_PREVIEW_BYTES - bytes)
      text += decoder.decode(value.subarray(0, length), { stream: true })
      bytes += length
      if (length < value.length) return { text: text + decoder.decode(), truncated: true }
    }
  } finally {
    await reader?.cancel().catch(() => {})
    clearTimeout(timeout)
    signal.removeEventListener('abort', cancel)
  }
}
