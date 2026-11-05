import { describe, expect, it } from 'vitest'
import { commonDocumentTypes, compactSearch, documentTitle, formatDate, initialFields, readSearchQuery, searchLocation } from '../app/modules/documents/utils/search'
import { catalogs } from './fixtures'

describe('filtros compartibles de metadatos', () => {
  it.each([
    ['045-2026', { numero: '45', anio: '2026', texto: '' }],
    ['125', { numero: '125', texto: '' }],
    ['2026', { anio: '2026', texto: '' }],
    ['comité de selección', { texto: 'comité de selección', numero: '' }]
  ])('convierte la búsqueda compacta %s al contrato existente', (texto, expected) => {
    expect(compactSearch({ ...initialFields, texto })).toMatchObject(expected)
  })
  it('resuelve tipos frecuentes sin fijar IDs ni elegir coincidencias ambiguas', () => {
    expect(commonDocumentTypes(catalogs.types).find(type => type.label.includes('Gerenciales'))?.id).toBe('7')
    const duplicate = { ...catalogs.types[0]!, id: 99 }
    expect(commonDocumentTypes([catalogs.types[0]!, duplicate])).toEqual([{ label: 'Todas las normas', id: '' }])
    expect(commonDocumentTypes([])).toEqual([{ label: 'Todas las normas', id: '' }])
  })
  it('conserva los filtros públicos y la página al restaurar la URL', () => {
    const result = readSearchQuery({ texto: '  gestión  ', tipoDocumentoId: '1', siglaId: '2', procesoId: '3', anio: '2026', numero: '0', pagina: '2', porPagina: '50', orden: 'fechaAsc', desde: '2026-01-01', hasta: '2026-12-31', privado: 'ignorar' })
    expect(result.errors).toEqual([])
    expect(result.query).toEqual({ texto: 'gestión', tipoDocumentoId: 1, siglaId: 2, procesoId: 3, anio: '2026', numero: 0, pagina: 2, porPagina: 50, orden: 'fechaAsc', desde: '2026-01-01', hasta: '2026-12-31' })
  })
  it.each([
    { pagina: '-1' }, { pagina: '9007199254740992' }, { numero: '1.5' },
    { anio: '26' }, { tipoDocumentoId: '0' }, { porPagina: '101' },
    { texto: ['a', 'b'] }, { texto: 'x'.repeat(251) }, { orden: 'sql' },
    { desde: '2026-02-30' }, { desde: '2026-10-30', hasta: '2026-01-01' }
  ])('detecta parámetros inválidos sin enviarlos a la API: %j', raw => {
    expect(readSearchQuery(raw).errors.length).toBeGreaterThan(0)
  })
  it('reinicia la paginación al buscar y al limpiar', () => {
    expect(searchLocation({ ...initialFields, texto: '  acuerdo  ' })).toEqual({ path: '/documentos', query: { texto: 'acuerdo', orden: 'fechaDesc', porPagina: '25' } })
    expect(searchLocation(initialFields).query).not.toHaveProperty('pagina')
  })
  it('tolera metadatos ausentes y fechas sin cambio de zona horaria', () => {
    expect(documentTitle({ titulo: null, numero: 5, anio: null })).toBe('Documento N.° 5')
    expect(formatDate('2026-10-30')).toBe('30/10/2026')
    expect(formatDate(null)).toBe('Fecha no registrada')
  })
})
