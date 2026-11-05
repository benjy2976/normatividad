import { JSONParser } from '@streamparser/json'

export const TEXT_PREVIEW_BYTES = 2 * 1024 * 1024
export const JSON_SCAN_BYTES = 32 * 1024 * 1024

export class ArtifactLimitError extends Error {}

async function withArtifactReader<T>(url: string, signal: AbortSignal, consume: (reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController()
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  const stop = (reason?: unknown) => {
    controller.abort(reason)
    void reader?.cancel().catch(() => {})
  }
  const cancel = () => stop(signal.reason)
  if (signal.aborted) cancel()
  else signal.addEventListener('abort', cancel, { once: true })
  const timeout = setTimeout(() => stop(new DOMException('Tiempo de lectura agotado.', 'TimeoutError')), 15_000)
  try {
    controller.signal.throwIfAborted()
    const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin', redirect: 'error' })
    if (!response.ok || !response.body) throw new Error('Artefacto no disponible')
    reader = response.body.getReader()
    return await consume(reader, controller.signal)
  } finally {
    await reader?.cancel().catch(() => {})
    controller.abort()
    clearTimeout(timeout)
    signal.removeEventListener('abort', cancel)
  }
}

export function readTextArtifact(url: string, signal: AbortSignal) {
  return withArtifactReader(url, signal, async (reader, activeSignal) => {
    const decoder = new TextDecoder()
    let bytes = 0
    let text = ''
    while (true) {
      const { value, done } = await reader.read()
      activeSignal.throwIfAborted()
      if (done) return { text: text + decoder.decode(), truncated: false }
      const length = Math.min(value.length, TEXT_PREVIEW_BYTES - bytes)
      text += decoder.decode(value.subarray(0, length), { stream: true })
      bytes += length
      if (length < value.length) return { text: text + decoder.decode(), truncated: true }
    }
  })
}

export function readJsonPage(url: string, page: number, signal: AbortSignal) {
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Página inválida')
  return withArtifactReader(url, signal, async (reader, activeSignal) => {
    // The OCR artifact is a document envelope: { page_count, metadata, pages: [{ page, ... }] }.
    // Emit pages separately and discard completed siblings, including root metadata.
    const parser = new JSONParser({ paths: ['$.page_count', '$.pages.*'], keepStack: false, separator: '' })
    const ready = new Error('Página encontrada')
    let text: string | null = null
    let pages: number | null = null
    let zeroBased = false
    let bytes = 0
    parser.onValue = ({ key, value }) => {
      if (key === 'page_count' && typeof value === 'number' && Number.isSafeInteger(value) && value > 0) pages = value
      if (typeof key !== 'number' || !value || typeof value !== 'object' || Array.isArray(value)) return
      if (key === 0 && value.page === 0) zeroBased = true
      if (value.page !== page - Number(zeroBased)) return
      const formatted = JSON.stringify(value, null, 2)
      if (new TextEncoder().encode(formatted).length > TEXT_PREVIEW_BYTES) throw new ArtifactLimitError('Esta página supera el límite de vista previa. Descarga el JSONL completo.')
      text = formatted
      throw ready
    }
    while (true) {
      const { value, done } = await reader.read()
      activeSignal.throwIfAborted()
      try {
        if (done) {
          parser.end()
          return { text, pages }
        }
        const length = Math.min(value.length, JSON_SCAN_BYTES - bytes)
        parser.write(value.subarray(0, length))
        bytes += length
        if (length < value.length) throw new ArtifactLimitError('No se alcanzó esta página dentro del límite de lectura. Descarga el JSONL completo.')
      } catch (error) {
        if (error === ready) return { text, pages }
        throw error
      }
    }
  })
}
