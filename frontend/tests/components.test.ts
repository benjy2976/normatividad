import { config, mount } from '@vue/test-utils'
import { computed, h, reactive, watch } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppDataTable from '../app/components/ui/AppDataTable.vue'
import SearchFilters from '../app/modules/documents/components/SearchFilters.vue'
import ActiveDocumentFilters from '../app/modules/documents/components/ActiveDocumentFilters.vue'
import DocumentResults from '../app/modules/documents/components/DocumentResults.vue'
import { catalogs, collection, document } from './fixtures'
import { initialFields, type SearchFields } from '../app/modules/documents/utils/search'

vi.stubGlobal('computed', computed)
vi.stubGlobal('reactive', reactive)
vi.stubGlobal('watch', watch)
afterEach(() => vi.clearAllMocks())
config.global.stubs = {
  UButton : {
    props    : ['to', 'type'],
    template : `<component :is="to ? 'a' : 'button'" :href="typeof to === 'string' ? to : to?.path" :type="type || 'button'"><slot /></component>`
  },
  UInput : {
    props    : ['modelValue'],
    emits    : ['update:modelValue'],
    template : `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
  },
  UTable : {
    name     : 'UTable',
    props    : ['data', 'columns', 'sorting', 'sortingOptions', 'paginationOptions', 'getRowId', 'caption'],
    template : `<table><caption>{{ caption }}</caption><thead><tr><th v-for="column in columns" :key="column.id"><slot :name="column.id + '-header'" /></th></tr></thead><tbody><tr v-for="row in data" :key="getRowId(row)"><td v-for="column in columns" :key="column.id"><slot :name="column.id + '-cell'" :row="{ original: row }" :getValue="() => column.accessorFn(row)" /></td></tr></tbody></table>`
  }
}
const options = { global: { stubs: { DocumentAttachments: true, NuxtLink: { props: ['to'], template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>' } } } }


describe('formulario público', () => {
  it('reduce los filtros a tipo, año y búsqueda y reconoce una referencia documental', async () => {
    const wrapper = mount(SearchFilters, { props: { fields: initialFields, catalogs, loading: false } })
    await wrapper.get('#texto').setValue('045-2026')
    await wrapper.get('#tipoDocumentoId').setValue('1')
    expect(wrapper.emitted('search')?.[0]?.[0]).toMatchObject({ texto: '', numero: '', anio: '', tipoDocumentoId: '1' })
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('search')?.[1]?.[0]).toMatchObject({ texto: '', numero: '45', anio: '2026', tipoDocumentoId: '1' })
    expect(wrapper.find('#siglaId').exists()).toBe(false)
    expect(wrapper.find('#procesoId').exists()).toBe(false)
    expect(wrapper.find('#desde').exists()).toBe(false)
    expect(wrapper.find('#numero').exists()).toBe(false)
    expect(wrapper.findAll('label')).toHaveLength(3)
  })
  it('permite texto cuando los catálogos fallan y restaura filtros de navegación', async () => {
    const wrapper = mount(SearchFilters, { props: { fields: initialFields, catalogs: null, loading: false } })
    expect(wrapper.get('#tipoDocumentoId').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#texto').attributes('disabled')).toBeUndefined()
    await wrapper.setProps({ fields: { ...initialFields, texto: 'URL restaurada', anio: '2026' } })
    expect((wrapper.get('#texto').element as HTMLInputElement).value).toBe('URL restaurada')
    await wrapper.get('button[aria-label="Limpiar filtros"]').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })
  it('aplica accesos con IDs del catálogo y conserva la referencia documental', async () => {
    const wrapper = mount(SearchFilters, { props: { fields: { ...initialFields, anio: '2026', numero: '45', procesoId: '3' }, catalogs, loading: false } })
    const shortcut = wrapper.findAll('nav button').find(button => button.text().includes('Gerenciales'))!
    await shortcut.trigger('click')
    expect(wrapper.emitted('search')?.[0]?.[0]).toMatchObject({ tipoDocumentoId: '7', anio: '2026' })
    expect((wrapper.get('#texto').element as HTMLInputElement).value).toBe('45-2026')
  })
  it('aplica tipo y año inmediatamente, conserva criterios y permite elegir todos', async () => {
    const fields = { ...initialFields, texto: 'vigente', tipoDocumentoId: '1', siglaId: '2', procesoId: '3', desde: '2020-01-01', hasta: '2026-10-30', orden: 'fechaAsc', porPagina: '20' }
    const wrapper = mount(SearchFilters, { props: { fields, catalogs, loading: false } })
    await wrapper.get('#anio').setValue('2025')
    expect(wrapper.emitted('search')?.[0]?.[0]).toEqual({ ...fields, anio: '2025' })
    await wrapper.setProps({ fields: wrapper.emitted('search')![0]![0] as SearchFields })
    await wrapper.get('#tipoDocumentoId').setValue('7')
    expect(wrapper.emitted('search')?.[1]?.[0]).toEqual({ ...fields, tipoDocumentoId: '7', siglaId: '', anio: '2025' })
    await wrapper.setProps({ fields: wrapper.emitted('search')![1]![0] as SearchFields })
    await wrapper.get('#anio').setValue('')
    expect(wrapper.emitted('search')?.[2]?.[0]).toMatchObject({ tipoDocumentoId: '7', anio: '', texto: 'vigente' })
    await wrapper.setProps({ fields: wrapper.emitted('search')![2]![0] as SearchFields })
    await wrapper.get('#tipoDocumentoId').setValue('')
    expect(wrapper.emitted('search')?.[3]?.[0]).toMatchObject({ tipoDocumentoId: '', anio: '', texto: 'vigente' })
  })
  it('conserva texto pendiente al seleccionar y solo lo aplica al enviar el formulario', async () => {
    const wrapper = mount(SearchFilters, { props: { fields: { ...initialFields, texto: 'vigente' }, catalogs, loading: false } })
    await wrapper.get('#texto').setValue('nuevo borrador')
    expect(wrapper.emitted('search')).toBeUndefined()
    await wrapper.get('#anio').setValue('2025')
    expect(wrapper.emitted('search')?.[0]?.[0]).toMatchObject({ texto: 'vigente', anio: '2025' })
    await wrapper.setProps({ fields: wrapper.emitted('search')![0]![0] as SearchFields })
    expect((wrapper.get('#texto').element as HTMLInputElement).value).toBe('nuevo borrador')
    await wrapper.findAll('nav button').find(button => button.text().includes('Gerenciales'))!.trigger('click')
    expect(wrapper.emitted('search')?.[1]?.[0]).toMatchObject({ texto: 'vigente', anio: '2025', tipoDocumentoId: '7' })
    await wrapper.setProps({ fields: wrapper.emitted('search')![1]![0] as SearchFields })
    expect((wrapper.get('#texto').element as HTMLInputElement).value).toBe('nuevo borrador')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('search')?.[2]?.[0]).toMatchObject({ texto: 'nuevo borrador', anio: '2025', tipoDocumentoId: '7' })
    await wrapper.setProps({ fields: { ...initialFields, texto: 'historial' } })
    expect((wrapper.get('#texto').element as HTMLInputElement).value).toBe('historial')
  })
  it('cambia el año de una referencia aplicada sin reinterpretar su año anterior', async () => {
    const wrapper = mount(SearchFilters, { props: { fields: { ...initialFields, numero: '45', anio: '2026' }, catalogs, loading: false } })
    await wrapper.get('#anio').setValue('2024')
    expect(wrapper.emitted('search')?.[0]?.[0]).toMatchObject({ numero: '45', anio: '2024', texto: '' })
    await wrapper.setProps({ fields: wrapper.emitted('search')![0]![0] as SearchFields })
    expect((wrapper.get('#texto').element as HTMLInputElement).value).toBe('45-2024')
    await wrapper.get('#anio').setValue('')
    await wrapper.setProps({ fields: wrapper.emitted('search')![1]![0] as SearchFields })
    expect((wrapper.get('#texto').element as HTMLInputElement).value).toBe('45')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('search')?.[2]?.[0]).toMatchObject({ numero: '45', anio: '', texto: '' })
  })
})

describe('resultados y recuperación', () => {
  const props = { result: null, status: 'pending', error: false, pageLocation: (page: number) => ({ path: `/documentos?pagina=${page}` }) }
  it('agrupa filtros activos con resultados y conserva criterios al quitar uno', async () => {
    const fields = { ...initialFields, anio: '2026', numero: '45', procesoId: '3', orden: 'fechaAsc', porPagina: '20' }
    const wrapper = mount(DocumentResults, {
      props : { ...props, status: 'success', result: collection([document]) },
      slots : { filters: () => h(ActiveDocumentFilters, { fields, catalogs }) },
      ...options
    })
    const filters = wrapper.findComponent(ActiveDocumentFilters)
    expect(wrapper.get('.section-heading').text()).toContain('Año: 2026')
    expect(wrapper.get('.section-heading').text()).toContain('Resultados')
    await filters.get('button[aria-label="Quitar Proceso: 3"]').trigger('click')
    expect(filters.emitted('search')?.[0]?.[0]).toEqual({ ...fields, procesoId: '' })
  })
  it('anuncia carga sin mantener resultados anteriores', () => {
    const wrapper = mount(DocumentResults, { props: { ...props, result: collection([document]) }, ...options })
    expect(wrapper.get('[role="status"]').text()).toContain('Consultando')
    expect(wrapper.find('article').exists()).toBe(false)
  })
  it('anuncia vacío y permite volver desde una página fuera de rango', () => {
    const wrapper = mount(DocumentResults, { props: { ...props, status: 'success', result: collection([], 9, 30) }, ...options })
    expect(wrapper.text()).toContain('No se encontraron documentos')
    expect(wrapper.text()).toContain('Volver a la primera página')
  })
  it('permite reintentar un error recuperable', async () => {
    const wrapper = mount(DocumentResults, { props: { ...props, status: 'error', error: true }, ...options })
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
  it('enlaza por ID, escapa metadatos y pagina con la ruta de interfaz', () => {
    const wrapper = mount(DocumentResults, { props: { ...props, status: 'success', result: collection([{ ...document, titulo: '<script>alert(1)</script>' }], 1, 30) }, ...options })
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.get('h3 a').attributes('href')).toBe('/documentos/42')
    expect(wrapper.get('h3').text()).toContain('<script>')
    expect(wrapper.get('nav a').attributes('href')).toBe('/documentos?pagina=2')
  })
  it('presenta tipo y proceso al final y oculta el tipo cuando ya está filtrado', async () => {
    const wrapper = mount(DocumentResults, { props: { ...props, status: 'success', result: collection([document]) }, ...options })
    const content = wrapper.get('.document-content')
    expect(content.element.firstElementChild?.tagName).toBe('H3')
    expect(content.get('.document-bottom').findAll('.type-label').map(tag => tag.text())).toEqual([
      'Tipo: Resolución ejecutiva regional',
      'Proceso: Gestión institucional'
    ])
    expect(content.get('.document-bottom').text()).not.toContain('N.°')
    expect(content.get('.document-bottom').text()).not.toContain('2026')
    await wrapper.setProps({ showDocumentType: false })
    expect(content.get('.document-bottom').findAll('.type-label').map(tag => tag.text())).toEqual(['Proceso: Gestión institucional'])
    expect(content.get('h3 a').text()).toBe(document.titulo)
    expect(content.get('.document-description').text()).toBe(document.descripcion)
    await wrapper.setProps({ result: collection([{ ...document, proceso: null }]) })
    expect(content.find('.type-label').exists()).toBe(false)
    expect(content.get('.document-bottom a').attributes('href')).toBe('/documentos/42')
  })
  it('conserva el título de respaldo y escapa el texto del proceso', () => {
    const wrapper = mount(DocumentResults, {
      props : { ...props, status: 'success', result: collection([{ ...document, titulo: null, descripcion: null, sigla: null, proceso: { id: 3, codigo: 'P03', descripcion: '<img src=x onerror=alert(1)>' } }]) },
      ...options
    })
    expect(wrapper.get('h3 a').text()).toBe('Documento N.° 125 · 2026')
    expect(wrapper.get('.document-bottom').text()).toContain('Proceso: <img src=x onerror=alert(1)>')
    expect(wrapper.find('.document-bottom img').exists()).toBe(false)
    expect(wrapper.find('.document-description').exists()).toBe(false)
  })
})

describe('tabla reutilizable con estado remoto', () => {
  const rows = [{ id: 8, name: 'Zeta' }, { id: 2, name: 'Alfa' }]
  const props = { rows, columns: [{ key: 'name', label: 'Nombre', sortable: true }], rowKey: 'id' as const, label: 'Registros' }
  it('conserva el orden remoto y comunica el siguiente criterio sin reordenar la página', async () => {
    const wrapper = mount(AppDataTable, { props: { ...props, sort: { key: 'name', direction: 'asc' } } })
    const table = wrapper.findComponent({ name: 'UTable' })
    expect(table.props('sortingOptions')).toEqual({ manualSorting: true })
    expect(table.props('paginationOptions')).toEqual({ manualPagination: true })
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual(['Nombre Zeta', 'Nombre Alfa'])
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('sortChange')?.[0]).toEqual([{ key: 'name', direction: 'desc' }])
    expect(table.props('data')).toEqual(rows)
  })
  it('oculta datos anteriores durante carga y error y permite recuperar la consulta', async () => {
    const wrapper = mount(AppDataTable, { props: { ...props, loading: true } })
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('Consultando')
    await wrapper.setProps({ loading: false, error: true })
    expect(wrapper.find('table').exists()).toBe(false)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
  it('conserva enlaces compartibles y emite navegación sin mutar los registros', async () => {
    const wrapper = mount(AppDataTable, { props: { ...props, page: { current: 2, last: 3, total: 60, from: 21, to: 40 }, pageLocation: page => `/registros?pagina=${page}&anio=2026` } })
    const next = wrapper.findAll('nav a')[1]!
    expect(next.attributes('href')).toBe('/registros?pagina=3&anio=2026')
    await next.trigger('click')
    expect(wrapper.emitted('pageChange')?.[0]).toEqual([3])
    expect(wrapper.text()).toContain('Página 2 de 3')
  })
})
