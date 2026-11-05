import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPublicApi, type PublicFetch } from '../app/modules/documents/services/publicApi'
import { collection, document, fileDetail, files } from './fixtures'

afterEach(() => vi.useRealTimers())

describe('transporte público centralizado', () => {
  it('obtiene un archivo exacto y construye representaciones sin aceptar paths o IDs inseguros', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: fileDetail(files[0]!) })
    const api = createPublicApi(fetcher as PublicFetch, '/resources/')
    await api.file('42', '501')
    expect(fetcher.mock.calls[0]?.[0]).toBe('/documentos/42/archivos/501')
    expect(api.representationURL(42, 501, 'original')).toBe('/resources/v1/public/documentos/42/archivos/501/representaciones/original')
    expect(() => api.file('../42', '501')).toThrow()
    expect(() => api.file('42', '9007199254740992')).toThrow()
    expect(() => api.representationURL(0, 501, 'original')).toThrow()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('conserva cada archivo de todas las páginas y elige el manifiesto de su ID exacto', async () => {
    const fetcher = vi.fn().mockImplementation(async (path, options) => {
      if (path.endsWith('/archivos')) return { ...collection([files[options.query.pagina - 1]]), meta: { ultimaPagina: 2 } }
      const file = files.find(item => path.endsWith(`/${item.id}`))!
      return { data: fileDetail(file, file.tomo === 1 ? 'pdf-searchable' : 'original') }
    })
    const result = await createPublicApi(fetcher as PublicFetch, '/resources').attachments(42)
    expect(result.map(item => item.href)).toEqual([
      '/resources/v1/public/documentos/42/archivos/501/representaciones/pdf-searchable',
      '/resources/v1/public/documentos/42/archivos/502/representaciones/original'
    ])
    expect(fetcher).toHaveBeenCalledTimes(4)
  })
  it('no ofrece derivados sin confianza ni archivos ajenos, y permite reintentar errores transitorios', async () => {
    const untrusted = fileDetail(files[0]!, 'pdf-searchable', false)
    untrusted.representaciones.defaultRepresentation = 'pdf-searchable'
    const fetcher = vi.fn().mockImplementation(async path => {
      if (path.endsWith('/archivos')) return collection([...files, { ...files[0], id: 503, documentoId: 99 }])
      if (path.endsWith('/501')) return { data: untrusted }
      throw { statusCode: 503 }
    })
    const result = await createPublicApi(fetcher as PublicFetch, '/resources').attachments(42)
    expect(result.map(item => item.href)).toEqual([null, null, null])
    expect(result.map(item => item.retryable)).toEqual([false, true, false])
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it('no usa fallback ante un 404 ni ofrece JSONL como opción inicial', async () => {
    const fetcher = vi.fn().mockImplementation(async path => {
      if (path.endsWith('/archivos')) return collection(files)
      if (path.endsWith('/501')) throw { statusCode: 404 }
      return { data: { ...fileDetail(files[1]!), representaciones: { trusted: true, defaultRepresentation: 'jsonl', representations: [{ tipo: 'jsonl' }] } } }
    })
    const result = await createPublicApi(fetcher as PublicFetch, '/resources').attachments(42)
    expect(result.every(item => !item.href && !item.retryable)).toBe(true)
  })
  it('usa exclusivamente el contrato versionado y propaga cancelación', async () => {
    const fetcher = vi.fn().mockResolvedValue(collection([document]))
    const controller = new AbortController()
    await createPublicApi(fetcher as PublicFetch, '/resources/').documents({ texto: 'gestión', pagina: 2 }, controller.signal)
    expect(fetcher).toHaveBeenCalledWith('/documentos', {
      baseURL : '/resources/v1/public',
      query   : { texto: 'gestión', pagina: 2 },
      signal  : expect.any(AbortSignal),
      retry   : false
    })
    controller.abort()
    expect(fetcher.mock.calls[0]![1].signal.aborted).toBe(false)
  })
  it('interrumpe una lectura sin respuesta a los 15 segundos aunque Nuxt aporte una señal', async () => {
    vi.useFakeTimers()
    const parent = new AbortController()
    const fetcher = vi.fn().mockImplementation((_path, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })
    }))
    const request = createPublicApi(fetcher as PublicFetch, '/resources').documents({}, parent.signal)
    const rejected = expect(request).rejects.toMatchObject({ name: 'TimeoutError' })
    await vi.advanceTimersByTimeAsync(15_000)
    await rejected
    expect(parent.signal.aborted).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]![1].retry).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('propaga la cancelación de Nuxt antes del límite y limpia el temporizador', async () => {
    vi.useFakeTimers()
    const parent = new AbortController()
    const fetcher = vi.fn().mockImplementation((_path, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })
    }))
    const request = createPublicApi(fetcher as PublicFetch, '/resources').documents({}, parent.signal)
    const reason = new DOMException('Navegación cancelada', 'AbortError')
    const rejected = expect(request).rejects.toBe(reason)
    parent.abort(reason)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })
  it('consulta todas las páginas de los tres catálogos sin inferir relaciones', async () => {
    const fetcher = vi.fn().mockImplementation(async (_path, options) => ({ ...collection([{ id: options.query.pagina }]), meta: { ultimaPagina: 2 } }))
    const result = await createPublicApi(fetcher as PublicFetch, '/resources').catalogs()
    expect(result.types).toHaveLength(2)
    expect(result.acronyms).toHaveLength(2)
    expect(result.processes).toHaveLength(2)
    expect(fetcher).toHaveBeenCalledTimes(6)
    expect(fetcher.mock.calls.every(([, options]) => Object.keys(options.query).join(',') === 'pagina,porPagina')).toBe(true)
  })
  it('mantiene el error 404 y rechaza identificadores ajenos a la ruta aprobada', async () => {
    const fetcher = vi.fn().mockRejectedValue({ statusCode: 404 })
    const api = createPublicApi(fetcher as PublicFetch, '/resources')
    await expect(api.document('42')).rejects.toEqual({ statusCode: 404 })
    expect(() => api.document('../admin')).toThrow('Identificador documental inválido')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
