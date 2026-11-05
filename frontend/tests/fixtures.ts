import type { Catalogs, Collection, DocumentFile, PublicDocument } from '../app/modules/documents/services/publicApi'

export const catalogs: Catalogs = {
  types : [
    { id: 1, descripcion: 'Resolución ejecutiva regional', usaNumeracionPorProceso: false, permiteVersiones: false, permiteAdendas: false },
    ...[{ id: 7, descripcion: 'Resolución gerencial regional' }, { id: 10, descripcion: 'Directiva' }, { id: 11, descripcion: 'Resolución directoral regional' }, { id: 15, descripcion: 'Directiva 2.0' }].map(type => ({ ...type, usaNumeracionPorProceso: false, permiteVersiones: false, permiteAdendas: false }))
  ],
  acronyms  : [{ id: 2, tipoDocumentoId: 1, procesoId: 3, codigo: 'RER', nombre: 'Ejecutiva regional', sigla: 'GRH', manual: false }],
  processes : [{ id: 3, codigo: '01', descripcion: 'Gestión institucional' }]
}

export const document: PublicDocument = {
  id            : 42,
  titulo        : 'Resolución ejecutiva regional N.° 125-2026-GRH',
  descripcion   : 'Documento de prueba sobre gestión institucional.',
  observacion   : null,
  fecha         : '2026-10-15',
  anio          : '2026',
  numero        : 125,
  correlativo   : null,
  version       : null,
  tipoDocumento : catalogs.types[0]!,
  sigla         : catalogs.acronyms[0]!,
  proceso       : catalogs.processes[0]!
}

export const files: DocumentFile[] = [1, 2].map(volume => ({
  id              : 500 + volume,
  documentoId     : 42,
  tomo            : volume,
  tipoArchivo     : 1,
  nombre          : `Documento-tomo-${volume}.pdf`,
  mimeType        : 'application/pdf',
  tamano          : 123456,
  md5             : '',
  cantidadPaginas : 5
}))

export function fileDetail(file: DocumentFile, preferred: 'original' | 'pdf-searchable' = 'pdf-searchable', trusted = true) {
  return {
    ...file,
    representaciones : {
      trusted,
      defaultRepresentation : trusted ? preferred : null,
      representations       : trusted ? [{ tipo: preferred, mimeType: 'application/pdf', tamano: 123456, fuenteReutilizada: false }] : []
    }
  }
}

export function collection<T>(data: T[], page = 1, total = data.length): Collection<T> {
  return {
    data,
    meta  : { paginaActual: page, desde: data.length ? (page - 1) * 25 + 1 : null, hasta: data.length ? (page - 1) * 25 + data.length : null, ultimaPagina: Math.max(1, Math.ceil(total / 25)), porPagina: 25, total },
    links : { primera: '', ultima: '', anterior: null, siguiente: null }
  }
}

// PDF mínimo, íntegramente sintético, con offsets reales para probar el lector.
export function samplePdf(pageCount = 2) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Count ${pageCount} /Kids [${Array.from({ length: pageCount }, (_, index) => `${4 + index * 2} 0 R`).join(' ')}] >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ]
  for (let index = 0; index < pageCount; index++) {
    const content = `BT /F1 18 Tf 30 140 Td (Pagina sintetica ${index + 1}) Tj ET`
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  }
  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, '0')} 00000 n \n`
  return body + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
}
