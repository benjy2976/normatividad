import type { components, operations } from '../../../types/api'

export type PublicDocument = components['schemas']['Document']
export type DocumentQuery = NonNullable<operations['listDocuments']['parameters']['query']>
export type DocumentType = components['schemas']['DocumentType']
export type Acronym = components['schemas']['Acronym']
export type Process = components['schemas']['Process']
export type DocumentFile = components['schemas']['DocumentFile']
export type FileDetail = components['schemas']['DocumentFileDetail']
export type Representation = components['schemas']['Representation']
export type Attachment = { file: DocumentFile, href: string | null, retryable: boolean }
export type Collection<T> = Omit<components['schemas']['PaginatedResponse'], 'data'> & { data: T[] }
export type Catalogs = { types: DocumentType[], acronyms: Acronym[], processes: Process[] }

type RequestOptions = {
  baseURL : string
  query?  : Record<string, string | number>
  signal? : AbortSignal
  retry   : false
}
export type PublicFetch = <T>(path: string, options: RequestOptions) => Promise<T>

export function createPublicApi(fetcher: PublicFetch, base: string) {
  const baseURL = `${base.replace(/\/+$/, '')}/v1/public`

  async function get<T>(path: string, query?: Record<string, string | number>, signal?: AbortSignal) {
    const controller = new AbortController()
    const cancel = () => controller.abort(signal?.reason)
    if (signal?.aborted) cancel()
    else signal?.addEventListener('abort', cancel, { once: true })
    const timeout = setTimeout(() => {
      controller.abort(new DOMException('Se agotó el tiempo de consulta.', 'TimeoutError'))
    }, 15_000)
    try {
      return await fetcher<T>(path, { baseURL, query, signal: controller.signal, retry: false })
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', cancel)
    }
  }

  async function all<T>(path: string, signal?: AbortSignal): Promise<T[]> {
    const items: T[] = []
    let page = 1
    let lastPage: number
    do {
      const response = await get<Collection<T>>(path, { pagina: page, porPagina: 100 }, signal)
      items.push(...response.data)
      lastPage = response.meta.ultimaPagina
      page++
    } while (page <= lastPage)
    return items
  }

  async function attachments(documentId: number, signal?: AbortSignal): Promise<Attachment[]> {
    if (!Number.isSafeInteger(documentId) || documentId < 1) throw new Error('Identificador documental inválido')
    const path = `/documentos/${documentId}/archivos`
    const files = await all<DocumentFile>(path, signal)
    const results: Attachment[] = new Array(files.length)
    let next = 0
    async function worker() {
      while (next < files.length) {
        const index = next++
        const file = files[index]!
        if (file.documentoId !== documentId || !Number.isSafeInteger(file.id) || file.id < 1) {
          results[index] = { file, href: null, retryable: false }
          continue
        }
        try {
          const { data } = await get<{ data: FileDetail }>(`${path}/${file.id}`, undefined, signal)
          const manifest = data.representaciones
          const preferred = manifest.defaultRepresentation
          const available = data.id === file.id && data.documentoId === documentId && manifest.trusted
            && (preferred === 'original' || preferred === 'pdf-searchable')
            && manifest.representations.some(item => item.tipo === preferred)
          results[index] = {
            file,
            href      : available ? `${baseURL}${path}/${file.id}/representaciones/${preferred}` : null,
            retryable : false
          }
        } catch (error) {
          if (signal?.aborted) throw error
          const status = (error as { statusCode?: number, status?: number }).statusCode
            ?? (error as { status?: number }).status
          results[index] = { file, href: null, retryable: status !== 404 }
        }
      }
    }
    await Promise.all([worker(), worker()])
    return results
  }

  return {
    attachments,
    file : (documentId: string, fileId: string, signal?: AbortSignal) => {
      if (![documentId, fileId].every(id => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)))) throw new Error('Identificador de archivo inválido')
      return get<{ data: FileDetail }>(`/documentos/${documentId}/archivos/${fileId}`, undefined, signal)
    },
    representationURL : (documentId: number, fileId: number, representation: Representation['tipo']) => {
      if (![documentId, fileId].every(id => Number.isSafeInteger(id) && id > 0)
        || !['original', 'pdf-searchable', 'markdown', 'jsonl'].includes(representation)) throw new Error('Representación inválida')
      return `${baseURL}/documentos/${documentId}/archivos/${fileId}/representaciones/${representation}`
    },
    documents : (query: DocumentQuery, signal?: AbortSignal) =>
      get<Collection<PublicDocument>>('/documentos', query, signal),
    document : (id: string, signal?: AbortSignal) => {
      if (!/^[1-9]\d*$/.test(id)) throw new Error('Identificador documental inválido')
      return get<{ data: PublicDocument }>(`/documentos/${id}`, undefined, signal)
    },
    catalogs : async (signal?: AbortSignal): Promise<Catalogs> => {
      const types = await all<DocumentType>('/tipos-documento', signal)
      const acronyms = await all<Acronym>('/siglas', signal)
      const processes = await all<Process>('/procesos', signal)
      return { types, acronyms, processes }
    }
  }
}
