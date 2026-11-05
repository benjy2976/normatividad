import type { DataColumn } from '../components/ui/table'

export const sampleRows = Array.from({ length: 12 }, (_, index) => ({
  id          : index + 1,
  title       : `Documento de ejemplo ${String(index + 1).padStart(2, '0')}`,
  description : index % 2 ? 'Descripción breve de demostración.' : 'Contenido sintético para comprobar el ajuste de textos largos en escritorio y móvil, sin consultar documentos reales.',
  state       : index % 3 ? 'Publicado' : 'Borrador'
}))

export const sampleColumns: DataColumn[] = [
  { key: 'title', label: 'Registro de ejemplo', sortable: true },
  { key: 'state', label: 'Estado', class: 'date-column' }
]

export const sampleNavigation = [
  { label: 'Muestra administrativa', to: '/muestras/administracion', symbol: '▦' },
  { label: 'Componentes', to: '/muestras/componentes', symbol: '◫' }
]
