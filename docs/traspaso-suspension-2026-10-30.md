# Acta de suspensión y traspaso

## Estado de la ejecución

- Fecha de suspensión: 2026-10-30.
- Motivo: suspensión solicitada por el responsable del proyecto.
- Estado: no se deben iniciar nuevas funcionalidades hasta una reanudación explícita.
- Rama y commits: el repositorio todavía no tiene un primer commit; todo el árbol aparece como
  no rastreado y debe revisarse antes de crear el commit inicial.
- Servicios locales: backend, frontend y proxy quedaron levantados mediante Docker Compose.
- Sistemas externos: no se escribieron datos en PostgreSQL ni en los NFS.

## Trabajo completado

### Fundación y gobierno técnico

- Se creó el monorepositorio con proyectos separados:
  - Laravel en `backend/`;
  - Nuxt en `frontend/`;
  - proxy Nginx local en `infrastructure/development/proxy/`.
- Se adoptó el protocolo de memoria viva versión 1.7.0 mediante `AGENTS.md`, instrucciones por
  capa, prompts, validador, schemas y pruebas del propio validador.
- Se documentaron arquitectura, entorno, convenciones, procedimientos, frontend, modelo de
  datos, API, reglas de negocio, decisiones, seguridad, proyecto, pruebas y licenciamiento.
- Se alineó la estructura documental con las exigencias técnicas usadas por el integrador OCR y
  con la directiva institucional de referencia. La correspondencia exacta con el Anexo oficial
  de Sistemas continúa pendiente.

### Entorno local

- El proxy publica Nuxt en `/` y retira el prefijo `/resources` antes de enviar solicitudes a
  Laravel.
- La conexión local usa PostgreSQL, base `proyectos`, esquema `normatividad`.
- Se montan como volúmenes externos de solo lectura:
  - `munis_regulations_nfs_ro`;
  - `normatividad_ocr_cache_nfs_ro`.
- Las IP de los NFS y las credenciales permanecen fuera de Git.
- El backend se ejecuta con UID/GID 33 para respetar los permisos del NFS heredado.
- El disco Laravel de originales usa como raíz lógica local
  `/mnt/regulations/regulations/regulations`; el volumen sigue montado en
  `/mnt/regulations`.
- El servidor PHP de desarrollo se inicia directamente con `php -S`. Se evitó
  `artisan serve` porque su proceso hijo descartaba la variable de raíz NFS.
- El arranque no ejecuta migraciones.

### Inventario y decisiones de datos

- Se verificaron siete entidades heredadas: tipos, siglas, procesos, documentos, archivos,
  estado OCR y artefactos OCR.
- La API parte de documentos publicados y verifica la pertenencia exacta de cada archivo.
- El ID de `regulation_files` es la identidad canónica nueva. No se usa como identidad la
  combinación documento, tomo y tipo porque existen 4,243 grupos lógicos duplicados.
- La relación muchos-a-muchos tipo–proceso no se usa y queda abandonada hasta un rediseño.
- Los procesos se consultan como catálogo independiente.
- Solo un artefacto moderno con estado `active` puede declarar una representación disponible.
  Los indicadores heredados `has_pdf`, `has_text` y `has_md` no sirven como fallback.
- El original es la raíz de confianza. Si falta, no se entrega ningún derivado.
- El backend nuevo no genera ni modifica artefactos OCR; el integrador sigue siendo su único
  escritor.

### Backend público implementado

Se implementaron 11 rutas de negocio bajo `/v1/public`:

- listado y detalle de tipos de documento;
- listado y detalle de siglas;
- listado y detalle de procesos;
- listado filtrable y detalle de documentos;
- listado y detalle de archivos pertenecientes a un documento;
- entrega de una representación concreta.

La superficie externa local queda bajo `/resources/v1/public/*`. Los detalles completos,
filtros, clasificación de recursos y matriz CRUD están en `docs/api.md`; el contrato ejecutable
está en `contracts/openapi-public.json`.

El módulo de Documentos resuelve estas representaciones:

| Tipo público | Fuente |
| --- | --- |
| `original` | NFS de originales |
| `pdf-searchable` | Artefacto OCR `pdf` activo |
| `jsonl` | Artefacto OCR `text` activo |
| `markdown` | Artefacto OCR `md` activo |

El PDF searchable es predeterminado cuando existe; de lo contrario se usa el original. JSONL y
Markdown nunca son predeterminados. Si el PDF searchable reutiliza el original, no se publican
dos opciones para el mismo binario.

### Seguridad aplicada

- Un documento no publicado responde `404`.
- Un archivo que no pertenece al documento de la ruta responde `404`.
- Un artefacto ausente, eliminado, reemplazado o físicamente inexistente responde `404`.
- Las rutas absolutas, vacías, con byte nulo o con segmentos `..` se rechazan.
- El manifiesto público no expone paths del NFS.
- Los montajes son de solo lectura.
- Las rutas históricas de Munis no fueron modificadas ni redirigidas.

### Pruebas y verificación

- PHPUnit: 6 pruebas y 33 aserciones, sin fallos.
- Pint: 39 archivos conformes.
- OpenAPI JSON: sintaxis válida.
- `composer validate --strict`: satisfactorio.
- Rutas: 11 operaciones públicas de negocio detectadas.
- Compose: configuración válida.
- Nginx: sintaxis válida.
- Nuxt: compilación satisfactoria; se observó una advertencia porque el host usa Node 25 y Nuxt
  recomienda Node 22, 24 o 26.
- Markdownlint: 45 documentos sin incidencias.
- Pruebas del validador de memoria: 4 pruebas satisfactorias.
- Validador global de memoria: cero errores y cero advertencias. Conserva como
  `NOT_EVALUATED` la revisión semántica humana del diseño HTTP, tal como exige el estándar.
- Integración real de solo lectura: conexión PostgreSQL correcta, original accesible por NFS,
  manifiesto con representaciones reales y respuesta PDF `200 application/pdf`.

La prueba automatizada usa SQLite en memoria. No debe sustituirse por `php artisan test` en el
entorno actual porque el arranque previo de Artisan puede tomar la conexión PostgreSQL. El
comando seguro documentado es `vendor/bin/phpunit`.

## Estado de la hoja de ruta

| Bloque | Estado al suspender | Dependencia para continuar |
| --- | --- | --- |
| Base del monorepositorio y memoria viva | Completado | Ninguna |
| Mapeo de lectura heredado | Completado | Ninguna |
| API pública de catálogos | Completado | Ninguna |
| API pública de documentos | Completado | Ninguna |
| Archivos y representaciones | Completado | Ninguna |
| Contrato y pruebas del backend | Completado | Ninguna |
| Integración local PostgreSQL/NFS | Completado | Volúmenes locales ya disponibles |
| Buscador convencional en Nuxt | No iniciado | Reanudar el desarrollo |
| Vista documental y visor | No iniciado | Buscador/base frontend y estrategia de archivos grandes |
| Búsqueda OCR independiente | No iniciada | Decisión de acceso y privacidad |
| Sesión y administración | No iniciada | Autenticación, roles y reglas de escritura |
| Publicación productiva | No iniciada | Frontend aceptado y controles externos |
| Migración gradual desde Munis | No iniciada | Equivalencia funcional y decisión por ruta |

## Trabajo necesario para terminar

### 1. Portal público convencional

1. Crear la arquitectura frontend por módulos, componentes, composables y stores centralizados.
2. Consumir tipos, siglas, procesos y documentos desde `/resources/v1/public`.
3. Implementar el buscador inicial por tipo, año, número y texto de metadatos.
4. Añadir paginación, estados de carga, vacío, error y accesibilidad.
5. Implementar la ruta pública estable de documento basada en ID de regulation.
6. Ejecutar pruebas de componentes, integración y aceptación visual.

Este bloque está listo para iniciar sin cambiar el contrato del backend.

### 2. Vista documental y visor

1. Mostrar los archivos pertenecientes al documento seleccionado.
2. Consultar el manifiesto del archivo y mostrar únicamente representaciones disponibles.
3. Elegir por defecto PDF searchable y, si no existe, PDF original.
4. Ofrecer JSONL y Markdown como vistas alternativas, nunca como vista inicial.
5. Mantener el original como condición de confianza para todas las representaciones.
6. Definir el visor PDF propio y sus capacidades: navegación, zoom, búsqueda, descarga,
   impresión y accesibilidad.
7. Probar archivos grandes y solicitudes parciales.

Antes de producción debe decidirse la entrega eficiente. La recomendación vigente es que
Laravel autorice y Nginx entregue el binario mediante una ubicación interna, conservando
`Range`, `Content-Length`, `Content-Disposition` y tipos MIME correctos. La configuración local
contiene ubicaciones reservadas, pero todavía no implementa `X-Accel-Redirect`.

### 3. Búsqueda OCR separada

1. Definir si será pública, autenticada o restringida por otra política real.
2. Evaluar exposición de datos personales y contenido interno.
3. Diseñar un contrato de búsqueda independiente del buscador convencional.
4. Implementar límites, paginación, ranking, observabilidad y pruebas.
5. Mantener la ruta sin enlaces desde el portal mientras esa sea la decisión funcional.

Conocer una URL no es un control de acceso; este punto requiere intervención del responsable.

### 4. Administración y migración funcional

1. Definir proveedor de identidad, sesión, roles y permisos.
2. Inventariar cada operación administrativa existente en Munis.
3. Definir reglas de validación, concurrencia, auditoría y transacciones.
4. Crear las rutas `/v1/management/*` y sus pruebas.
5. Mantener al integrador como único escritor de artefactos OCR. La administración podrá dar de
   baja o solicitar eliminación cuando esa regla sea aprobada, pero no generarlos.
6. Migrar capacidades una por una y mantener compatibilidad con los enlaces históricos.
7. Solo después de comprobar equivalencia, decidir qué rutas se conservan, redirigen o retiran.

### 5. Preparación productiva

1. Crear imágenes de producción separadas para backend y frontend.
2. Incorporar servidor PHP productivo; no usar `php -S` en producción.
3. Crear un rol PostgreSQL exclusivo de solo lectura para la superficie pública.
4. Configurar el proxy institucional para publicar únicamente `/resources/*` hacia Laravel y
   `/` hacia el frontend público.
5. Implementar rate limiting, caché, cabeceras de seguridad, logs y monitoreo.
6. Validar rangos HTTP y entrega de documentos grandes.
7. Ejecutar pruebas de carga, seguridad, privacidad, respaldo, recuperación y aceptación.
8. Completar titularidad, responsables, licenciamiento, Anexo documental y acta de despliegue.
9. Preparar manifiestos de Kubernetes cuando la operación Docker esté estabilizada.

## Intervenciones necesarias

### Responsable funcional

- Reanudar explícitamente el desarrollo.
- Revisar y aceptar la primera pantalla del buscador convencional.
- Definir el alcance y el acceso real de la búsqueda OCR.
- Definir los primeros casos de administración que se migrarán desde Munis.
- Aprobar la estrategia definitiva para enlaces públicos y compatibilidad histórica.

### Sistemas, seguridad y DBA

- Confirmar la matriz exacta de artefactos exigidos por la directiva y su Anexo.
- Designar titular técnico y unidad responsable.
- Evaluar seguridad y tratamiento de datos personales.
- Proporcionar el rol PostgreSQL productivo de solo lectura.
- Configurar y aprobar proxy, dominio, TLS, límites y observabilidad.
- Participar en aceptación y autorización de publicación.

## Procedimiento seguro de reanudación

1. Leer `AGENTS.md`, `docs/guia_IA.md`, `docs/plan-implementacion.md` y esta acta.
2. Verificar `git status`; no existe aún un commit base.
3. Revisar que `backend/.env`, `.nuxt`, `.output` y la caché de PHPUnit sigan ignorados.
4. Confirmar que no se versionaron IP, credenciales ni configuración privada de NFS.
5. Levantar el entorno con los dos volúmenes externos y la red `grh_network`.
6. Ejecutar PHPUnit, Pint, Markdownlint y el validador global antes de modificar código.
7. Retomar P7, el buscador público convencional, salvo que el responsable cambie la prioridad.

## Comandos de control

```bash
LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose up -d

docker compose exec -T backend \
  vendor/bin/phpunit

docker compose exec -T backend \
  vendor/bin/pint --test app routes tests

scripts/validate-project-memory \
  --expected-standard-version 1.7.0 \
  --profile balanced \
  --level L3

npx --yes markdownlint-cli2 '**/*.md' \
  '#backend/vendor/**' \
  '#frontend/node_modules/**' \
  '#frontend/.nuxt/**' \
  '#frontend/.output/**'
```

## Riesgos abiertos

- El árbol completo sigue sin commit inicial; puede ser difícil distinguir cambios si se edita
  antes de establecer una línea base revisada.
- La conexión local reutilizada posee permisos mayores que los necesarios para una API pública.
- La entrega actual mediante PHP no es todavía la solución productiva para PDF grandes.
- No existen autenticación, autorización administrativa ni auditoría de escrituras.
- La búsqueda OCR puede exponer información sensible si se publica sin una política real.
- Los datos heredados no tienen claves foráneas declaradas y presentan registros huérfanos.
- El expediente institucional está incompleto y requiere responsables externos.
