# Contexto del módulo: Catálogos documentales

## Propósito y límites

El módulo publica los tipos de documento, las siglas y los procesos que sirven para clasificar
y filtrar documentos. No administra estos catálogos todavía y no interpreta la tabla heredada
`regulations_tipos_processes`.

## Glosario

| Término funcional | Nombre técnico | Persistencia |
| --- | --- | --- |
| Tipo de documento | `DocumentType` | `regulations_tipos` |
| Sigla | `DocumentTypeAcronym` | `regulations_tipos_siglas` |
| Proceso | `DocumentProcess` | `regulation_processes` |

El nombre público `sigla` se conserva por compatibilidad con el dominio actual. No se sustituye
por “serie documental”.

## Actores y permisos

- Una solicitud pública solo lee tipos con `tip_show_portal = 1`, siglas visibles cuyo tipo
  también sea publicable y procesos activos.
- La futura administración autenticada podrá consultar todos los registros por rutas de
  administración. Esa capacidad no está implementada.

## Reglas

- La relación muchos-a-muchos tipo–proceso fue planificada, pero no se usa actualmente y queda
  abandonada hasta un rediseño explícito.
- Los procesos se publican como catálogo independiente. El endpoint de procesos no acepta un
  filtro por tipo de documento.
- Una sigla sí puede conservar sus referencias directas a un tipo y a un proceso.

## Flujo

Los endpoints públicos están inventariados en `docs/api.md` y su contrato ejecutable vive en
`contracts/openapi-public.json`.

## Datos y relaciones

La semántica heredada y las relaciones toleradas están en `docs/modelo-datos.md`. La base no
declara claves foráneas, por lo que las relaciones ausentes deben tolerarse al serializar.

## Integraciones y fallos

El módulo solo consulta PostgreSQL. Un catálogo oculto, inactivo o inexistente responde `404`
en su operación individual.

## Evidencia y validación

- `backend/tests/Feature/PublicNormatividadApiTest.php` comprueba visibilidad pública.
- `backend/app/Modules/Catalogs/Queries/PublicCatalogQuery.php` contiene los filtros efectivos.

## Pendientes explícitos

- Antes de habilitar administración se debe definir autenticación, políticas y el comportamiento
  de los catálogos completos.
- Si vuelve a requerirse una restricción tipo–proceso, se rediseñará el contrato y se evaluará la
  tabla pivote heredada; no se activará implícitamente.
