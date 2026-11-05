import type { FileDetail, Representation } from '../../documents/services/publicApi'

export type ViewerRepresentation = Representation['tipo']
const types: ViewerRepresentation[] = ['original', 'pdf-searchable', 'markdown', 'jsonl']
type QueryValue = string | (string | null)[] | null | undefined

export function readViewerQuery(query: Record<string, QueryValue>) {
  const errors: string[] = []
  const rawPage = query.pagina
  const page = rawPage === undefined ? 1 : typeof rawPage === 'string' && /^[1-9]\d*$/.test(rawPage) ? Number(rawPage) : NaN
  if (!Number.isSafeInteger(page)) errors.push('La página debe ser un entero positivo.')
  const rawRepresentation = query.representacion
  const representation = typeof rawRepresentation === 'string' && types.includes(rawRepresentation as ViewerRepresentation) ? rawRepresentation as ViewerRepresentation : undefined
  if (rawRepresentation !== undefined && !representation) errors.push('La representación solicitada no es válida para el visor.')
  return { page, representation, errors }
}

export function availableRepresentations(file: FileDetail, documentId: number, fileId: number): Representation[] {
  if (file.id !== fileId || file.documentoId !== documentId || !file.representaciones.trusted) return []
  return file.representaciones.representations.filter(item => types.includes(item.tipo))
}

export function selectRepresentation(file: FileDetail, documentId: number, fileId: number, requested?: ViewerRepresentation) {
  const preferred = file.representaciones.defaultRepresentation
  if (!requested && preferred !== 'original' && preferred !== 'pdf-searchable') return null
  const type = requested ?? preferred
  return availableRepresentations(file, documentId, fileId).find(item => item.tipo === type) ?? null
}

export function representationKind(representation: Representation): 'pdf' | 'image' | 'text' | 'download' {
  if (representation.tipo === 'markdown' || representation.tipo === 'jsonl') return 'text'
  if (representation.tipo === 'pdf-searchable' || representation.mimeType === 'application/pdf') return 'pdf'
  if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(representation.mimeType)) return 'image'
  return 'download'
}

export function representationLabel(type: ViewerRepresentation) {
  return { original: 'Original', 'pdf-searchable': 'PDF con texto', markdown: 'Texto (Markdown)', jsonl: 'Datos OCR (JSONL)' }[type]
}
