# Contrato HTTP

## Convención de publicación

Laravel recibe las rutas bajo `/v1/public/*`. El proxy institucional añade `/resources`, por lo
que una operación pública se consume externamente como `/resources/v1/public/*`.

Todas las operaciones de negocio actuales son públicas, de solo lectura y responden JSON salvo
la entrega de una representación física. Un recurso inexistente, oculto, ajeno al padre o no
confiable responde `404`.

## Índice de endpoints

| Método | Ruta | Acceso | Tipo | Rol | Ciclo | Recurso o concepto | Módulo propietario | Ruta canónica | Propósito | Decisión |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/up` | `public` | Consulta | Canónica | Dependiente | Estado de aplicación | Plataforma | `/up` | Comprobar vida del backend | Operación técnica de lectura |
| `GET` | `/v1/public/tipos-documento` | `public` | Recurso | Canónica | Propio | Tipo de documento | Catálogos | `/v1/public/tipos-documento/{documentType}` | Listar tipos publicables | Lectura pública aprobada |
| `GET` | `/v1/public/tipos-documento/{documentType}` | `public` | Recurso | Canónica | Propio | Tipo de documento | Catálogos | `/v1/public/tipos-documento/{documentType}` | Obtener un tipo publicable | Lectura pública aprobada |
| `GET` | `/v1/public/siglas` | `public` | Recurso | Canónica | Propio | Sigla | Catálogos | `/v1/public/siglas/{acronym}` | Listar siglas visibles | Lectura pública aprobada |
| `GET` | `/v1/public/siglas/{acronym}` | `public` | Recurso | Canónica | Propio | Sigla | Catálogos | `/v1/public/siglas/{acronym}` | Obtener una sigla visible | Lectura pública aprobada |
| `GET` | `/v1/public/procesos` | `public` | Recurso | Canónica | Propio | Proceso | Catálogos | `/v1/public/procesos/{process}` | Listar procesos activos | Lectura pública aprobada |
| `GET` | `/v1/public/procesos/{process}` | `public` | Recurso | Canónica | Propio | Proceso | Catálogos | `/v1/public/procesos/{process}` | Obtener un proceso activo | Lectura pública aprobada |
| `GET` | `/v1/public/documentos` | `public` | Recurso | Canónica | Propio | Documento | Documentos | `/v1/public/documentos/{document}` | Listar y filtrar documentos publicados | Lectura pública aprobada |
| `GET` | `/v1/public/documentos/{document}` | `public` | Recurso | Canónica | Propio | Documento | Documentos | `/v1/public/documentos/{document}` | Obtener un documento publicado | Lectura pública aprobada |
| `GET` | `/v1/public/documentos/{document}/archivos` | `public` | Subrecurso | Canónica | Propio | Archivo | Documentos | `/v1/public/documentos/{document}/archivos/{file}` | Listar archivos pertenecientes al documento | La pertenencia al documento forma parte de la identidad pública |
| `GET` | `/v1/public/documentos/{document}/archivos/{file}` | `public` | Subrecurso | Canónica | Propio | Archivo | Documentos | `/v1/public/documentos/{document}/archivos/{file}` | Obtener el archivo exacto y su manifiesto | La pertenencia al documento forma parte de la identidad pública |
| `GET` | `/v1/public/documentos/{document}/archivos/{file}/representaciones/{representation}` | `public` | Proyección | Contextual | Dependiente | Representación física | Documentos | `/v1/public/documentos/{document}/archivos/{file}` | Entregar contenido físico confiable | La representación depende del archivo y no tiene ciclo independiente |

La búsqueda OCR independiente está aprobada, pero no implementada. No aparece en este índice ni
en OpenAPI hasta existir código y pruebas.

## Matriz de aplicabilidad CRUD

| Recurso o concepto | List | Create | Get | Update | Delete | Fuente de justificación |
| --- | --- | --- | --- | --- | --- | --- |
| Tipo de documento | Aplica | No permitida: API pública de lectura | Aplica | No permitida: API pública de lectura | No permitida: API pública de lectura | RN-PUB-001 y decisión 0001 |
| Sigla | Aplica | No permitida: API pública de lectura | Aplica | No permitida: API pública de lectura | No permitida: API pública de lectura | RN-PUB-001 y decisión 0001 |
| Proceso | Aplica | No permitida: API pública de lectura | Aplica | No permitida: API pública de lectura | No permitida: API pública de lectura | RN-PUB-001 y decisión 0001 |
| Documento | Aplica | No permitida: primera etapa pública | Aplica | No permitida: primera etapa pública | No permitida: primera etapa pública | RN-PUB-001, RN-PUB-002 y decisión 0001 |
| Archivo | Aplica | No permitida: primera etapa pública | Aplica | No permitida: primera etapa pública | No permitida: primera etapa pública | RN-PUB-003 y RN-PUB-004 |

Las mutaciones futuras pertenecerán a `/v1/management/*` y no se inferirán desde estas rutas.

## Filtros

### Catálogos

- Todos aceptan `texto`, `pagina` y `porPagina`.
- `siglas` acepta además `tipoDocumentoId` y `procesoId`.
- `procesos` no acepta tipo de documento: la relación pivote heredada se abandonó.

### Documentos

`GET /v1/public/documentos` acepta:

- `texto`: título, descripción u observación;
- `tipoDocumentoId`, `siglaId`, `procesoId`;
- `anio`, `numero`, `desde`, `hasta`;
- `orden`: `fechaDesc`, `fechaAsc` o `idDesc`;
- `pagina` y `porPagina`, con máximo 100.

La búsqueda de `texto` es sobre metadatos PostgreSQL. No busca dentro del OCR.

## Respuestas

Las colecciones usan nombres españoles en `camelCase`:

```json
{
  "data": [],
  "meta": {
    "paginaActual": 1,
    "desde": null,
    "hasta": null,
    "ultimaPagina": 1,
    "porPagina": 25,
    "total": 0
  },
  "links": {
    "primera": "...",
    "ultima": "...",
    "anterior": null,
    "siguiente": null
  }
}
```

El detalle de archivo incluye un manifiesto sin rutas físicas. Solo enumera representaciones
existentes y confiables.

## Representaciones

| Tipo público | Registro OCR | MIME |
| --- | --- | --- |
| `original` | No aplica | MIME del original |
| `pdf-searchable` | `pdf` | `application/pdf` |
| `jsonl` | `text` | `application/x-ndjson; charset=utf-8` |
| `markdown` | `md` | `text/markdown; charset=utf-8` |

`?disposition=attachment` fuerza descarga; por defecto el contenido se entrega `inline`.

## Seguridad y autoridad

- La consulta siempre comienza en un documento publicado.
- El archivo debe pertenecer al documento de la ruta.
- El original debe existir antes de cualquier derivado.
- Solo se usa un artefacto moderno `active` físicamente presente.
- El backend nunca genera ni modifica artefactos OCR.
- Las rutas absolutas o con `..` se rechazan.

## Compatibilidad

Las rutas históricas de `proyectos.regionhuanuco.gob.pe/regulations/*` permanecen en Munis y no
son redirigidas por este cambio. La nueva identidad canónica del archivo es su ID. No se replica
la resolución ambigua por tomo y tipo.

## Contrato ejecutable y pruebas

- OpenAPI: `contracts/openapi-public.json`.
- Pruebas: `backend/tests/Feature/PublicNormatividadApiTest.php`.
- Reglas: `docs/documentacion-tecnica/reglas-negocio.md`.
