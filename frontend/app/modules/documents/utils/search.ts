import type { DocumentQuery, DocumentType } from '../services/publicApi'

export const initialFields = {
  texto           : '',
  tipoDocumentoId : '',
  siglaId         : '',
  procesoId       : '',
  anio            : '',
  numero          : '',
  desde           : '',
  hasta           : '',
  orden           : 'fechaDesc',
  porPagina       : '25'
}
export type SearchFields = typeof initialFields
type RawQuery = Record<string, string | number | null | undefined | (string | null)[]>

export function compactSearch(fields: SearchFields): SearchFields {
  const result = { ...fields, texto: fields.texto.trim(), numero: '' }
  const reference = /^(\d+)\s*[-/]\s*(\d{4})$/.exec(result.texto)
  if (reference) {
    result.numero = String(Number(reference[1]))
    result.anio = reference[2]!
    result.texto = ''
  } else if (/^\d{4}$/.test(result.texto)) {
    result.anio = result.texto
    result.texto = ''
  } else if (/^\d+$/.test(result.texto)) {
    result.numero = result.texto
    result.texto = ''
  }
  return result
}

export function commonDocumentTypes(types: DocumentType[]) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  const groups = [
    { label: 'Resoluciones Ejecutivas (RER)', names: ['resolucion ejecutiva regional', 'resoluciones ejecutivas regionales'] },
    { label: 'Resoluciones Gerenciales (RGR)', names: ['resolucion gerencial regional', 'resoluciones gerenciales regionales'] },
    { label: 'Todas las normas', names: [] },
    { label: 'Directivas', names: ['directiva', 'directivas'] },
    { label: 'Resoluciones Directorales', names: ['resolucion directoral', 'resolucion directoral regional', 'resoluciones directorales', 'resoluciones directorales regionales'] },
    { label: 'Directivas 2.0', names: ['directiva 2 0', 'directivas 2 0'] }
  ]
  return groups.flatMap(group => {
    if (!group.names.length) return [{ label: group.label, id: '' }]
    const matches = types.filter(type => group.names.includes(normalize(type.descripcion || '')))
    return matches.length === 1 ? [{ label: group.label, id: String(matches[0]!.id) }] : []
  })
}

export function readSearchQuery(raw: RawQuery) {
  const fields = { ...initialFields }
  const errors: string[] = []
  const query: DocumentQuery = {}
  const scalar = (key: string, fallback = '') => {
    const value = raw[key]
    if (Array.isArray(value)) {
      errors.push(`El parámetro ${key} debe tener un solo valor.`)
      return fallback
    }
    return value == null ? fallback : String(value).trim()
  }
  for (const key of Object.keys(fields) as (keyof SearchFields)[]) {
    fields[key] = scalar(key, initialFields[key])
  }
  const page = scalar('pagina', '1')
  if (fields.texto.length > 250) errors.push('El texto admite hasta 250 caracteres.')
  else if (fields.texto) query.texto = fields.texto

  for (const key of ['tipoDocumentoId', 'siglaId', 'procesoId', 'numero', 'porPagina', 'pagina'] as const) {
    const value = key === 'pagina' ? page : fields[key]
    if (value === '') continue
    const number = Number(value)
    const minimum = key === 'numero' ? 0 : 1
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < minimum || (key === 'porPagina' && number > 100)) {
      errors.push(`El parámetro ${key} no es válido.`)
    } else query[key] = number
  }
  if (fields.anio) {
    if (/^\d{4}$/.test(fields.anio)) query.anio = fields.anio
    else errors.push('El año debe tener cuatro dígitos.')
  }
  for (const key of ['desde', 'hasta'] as const) {
    const value = fields[key]
    if (!value) continue
    const date = new Date(`${value}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
      errors.push(`La fecha ${key} no es válida.`)
    } else query[key] = value
  }
  if (query.desde && query.hasta && query.hasta < query.desde) errors.push('La fecha final debe ser igual o posterior a la inicial.')
  if (['fechaDesc', 'fechaAsc', 'idDesc'].includes(fields.orden)) query.orden = fields.orden as DocumentQuery['orden']
  else errors.push('El orden solicitado no es válido.')
  return { fields, query, errors }
}

export function searchLocation(fields: SearchFields) {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    const text = String(value).trim()
    if (text) query[key] = text
  }
  return { path: '/documentos', query }
}

export function documentTitle(document: { titulo: string | null, numero: number, anio: string | null }) {
  return document.titulo?.trim() || `Documento N.° ${document.numero}${document.anio ? ` · ${document.anio}` : ''}`
}

export function formatDate(value: string | null) {
  if (!value) return 'Fecha no registrada'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
