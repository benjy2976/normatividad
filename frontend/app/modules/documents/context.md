# Contexto del módulo: Consulta pública documental

## Propósito y límites

Posee el buscador convencional y la ficha de metadatos por ID de documento. Consume el contrato
de [API pública](../../../../docs/api.md); no accede a almacenamiento ni decide publicación.
Los catálogos son datos de referencia del formulario, no un módulo de administración.
El listado ofrece un icono por archivo para abrir su representación predeterminada. La ficha
incorpora la tabla ampliada de archivos y sus enlaces; el visor público pertenece al módulo `viewer`.

## Actores y permisos

El visitante consulta documentos públicos sin sesión. El backend conserva la autoridad sobre
publicación y permisos. Un detalle inexistente o no publicado produce el mismo estado visible
de documento no encontrado. No existen controles administrativos ni enlaces a búsqueda OCR.

## Reglas y estado

- La URL posee filtros, orden, tamaño de página y página actual. Buscar, cambiar un filtro o
  limpiar reinicia la página; paginar conserva filtros. Recargar y navegar por el historial
  restaura el formulario.
- La búsqueda es sobre metadatos; no consulta contenido OCR.
- El formulario visible contiene tipo, año y búsqueda. Orden y resultados por página están
  junto al encabezado de resultados. Se retiran los controles separados de número, sigla,
  proceso y rango de fechas; las URLs anteriores siguen siendo válidas y sus filtros aparecen
  como etiquetas que se pueden quitar.
- La caja de búsqueda interpreta un entero como número, cuatro dígitos como año y `045-2026`
  como número más año. Las demás expresiones siguen siendo texto de metadatos. Una referencia
  con año explícito actualiza el selector de año. No se incorpora búsqueda OCR.
- Seleccionar tipo o año aplica ese filtro inmediatamente, también al elegir todos. Conserva
  los demás criterios aplicados, orden y tamaño; cambiar tipo retira la sigla anterior. Buscar
  o Enter aplica el texto: escribir no consulta. Un texto pendiente se conserva al usar los
  selectores o accesos frecuentes, pero no se envía hasta confirmar la búsqueda. Al cambiar
  año sobre una referencia ya aplicada se conserva el número y se actualiza su año, sin
  reinterpretar la referencia anterior ni reemplazar el texto pendiente.
- El selector ofrece todo el histórico y años desde el actual hasta 1900; un año de una URL
  fuera de ese intervalo se conserva como opción para no alterar su significado.
- Los accesos frecuentes corresponden a RER, RGR, todas las normas, directivas, resoluciones
  directorales y Directivas 2.0 cuando el catálogo identifica cada tipo sin ambigüedad. Se usan
  sus IDs reales, sin constantes numéricas. Un acceso ausente o ambiguo se omite; no se infiere
  que Directivas 2.0 equivale a una regla de versiones o a un conjunto arbitrario de tipos.
- Los tres catálogos se cargan hasta la última página. Los procesos siguen siendo independientes
  del tipo; no se reconstruye la relación heredada tipo–proceso.
- Los filtros inválidos de una URL se muestran como error local e impiden consultar documentos.
- `useAsyncData` posee datos, carga y errores; el borrador del formulario es estado local.
  No existe un flujo que requiera Pinia y no se duplica la respuesta remota en un store.
- Las consultas se realizan en el navegador con `server: false`, usando el prefijo público
  configurado. La estructura se renderiza con Nuxt; los resultados y la ficha aún no tienen SSR.
  Así no se introduce una URL interna de backend ni un proxy adicional en Nuxt.
- Carga y error ocultan resultados anteriores. El catálogo puede fallar sin impedir búsquedas
  por texto, año o número. Cada error transitorio ofrece reintento.
- Cada lectura HTTP del frontend tiene un límite de 15 segundos y conserva la cancelación de
  Nuxt al cambiar de consulta o abandonar la vista. No hay reintento automático: al fallar o
  agotar la espera se muestra el error recuperable y el usuario decide reintentar. Este límite
  aplica a metadatos y manifiestos, no a la entrega de archivos que se abre por enlace.
- El formulario considera `idle` y `pending` como carga inicial. El estado `disabled` coincide
  entre el HTML del servidor y la primera renderización cliente, sin ocultar avisos de Vue.
- Los metadatos se interpolan como texto, nunca mediante `v-html`. La fecha se presenta sin
  conversión de zona horaria y se toleran campos nulos.
- El listado conserva título y descripción sin una línea adicional de número, año o sigla.
  La etiqueta de tipo aparece solo cuando no se filtra por un tipo específico. Si la respuesta
  incluye un proceso vinculado, se presenta como etiqueta al final, junto al tipo cuando aplica
  y al enlace de consulta. No se deduce el proceso desde la sigla ni se hacen lecturas adicionales.
  El título de respaldo conserva número y año cuando no existe un título; la ficha mantiene
  sus metadatos completos.

## Flujo y componentes

1. `pages/documentos/index.vue`, con alias `/`, coordina parámetros y consultas. Ambas direcciones
   comparten identidad de vista para conservar el texto pendiente al aplicar filtros desde el inicio.
2. `SearchFilters.vue` posee el borrador; emite selección inmediata, búsqueda de texto o limpiar.
   `ActiveDocumentFilters.vue` presenta los filtros de la URL y emite su retirada conservando los
   demás criterios. Se compone con el resumen de resultados y también junto al error de URL.
3. `publicApi.ts` centraliza exclusivamente lecturas bajo `/resources/v1/public` por defecto.
4. `DocumentResults.vue` adapta filas y metadatos a `AppDataTable`, conserva las celdas y enlaces
   documentales y transforma el orden de fecha en `fechaAsc` o `fechaDesc`. Los estados y la
   navegación comunes pertenecen al kit local, sin conocer la API. El selector de orden conserva
   también `idDesc`. El reflujo móvil usa las mismas instancias de adjuntos.
5. `pages/documentos/[documento]/index.vue` consulta metadatos del documento exacto y compone sus
   archivos después de los metadatos y antes de la descripción. Ambas
   páginas usan el layout público; el buscador compone el patrón `AppListPage`. Los temas y
   medidas se gobiernan en `docs/diseno.md`, sin preferencias particulares de este módulo.
6. `DocumentAttachments.vue` ofrece presentación compacta para el listado y ampliada para la
   ficha. La compacta consulta al entrar en pantalla; la ampliada consulta al montar. Recorre todas
   sus páginas y resuelve hasta dos manifiestos simultáneamente por fila. Cada ID de archivo
   conserva su propio icono, incluso si comparte tomo o tipo con otro archivo. La ficha adapta
   archivos por ID a `AppDataTable`, con columnas de información y acceso, sin orden ni paginación
   visual; la carga, el vacío y el error recuperable usan los estados de la tabla compartida.
7. `DocumentFileLink.vue` centraliza el acceso en ambas presentaciones, sin nuevas consultas.
   Un icono solo enlaza si el manifiesto es confiable y declara `original` o `pdf-searchable`
   como representación predeterminada disponible. Abre el visor público por ID de documento y
   archivo en una nueva pestaña, con `noopener noreferrer`; el visor vuelve a validar el manifiesto.
   La descarga y apertura directa de la representación están dentro del visor. JSONL y Markdown
   no se usan como opción inicial ni como fallback.
   Un archivo no disponible se representa sin enlace; los errores transitorios permiten reintento.

En la ficha, cada archivo conserva tomo, nombre, formato original, tamaño original y páginas
cuando están registradas. Cero bytes es un tamaño válido; páginas nulas o no positivas se omiten.
La acción es «Ver PDF» o «Abrir archivo» y conserva el manifiesto de confianza del listado.
El enlace de interfaz se construye con ambos IDs, nunca desde el nombre o el tomo. Carga
y errores no ocultan los metadatos del documento; se permite reintentar y se declara el vacío.
El componente se identifica por documento al navegar entre fichas. No se deducen relaciones de
adendas desde el tomo, el nombre ni `permiteAdendas`: el contrato actual no las proporciona.

El acceso identifica el formato PDF si el original tiene MIME `application/pdf` o si el enlace
abre la representación `pdf-searchable`. En la presentación compacta, con un solo adjunto la
etiqueta es «PDF» o «Archivo»; con varios se sustituye por el tomo exacto («T. 0», «T. 1»...),
incluido cero, sin
inferir que sea un archivo principal ni fusionar IDs. Nombre y tomo completos se conservan en
la ayuda y el nombre accesible. Su geometría y color se gobiernan en `docs/diseno.md`.

Los contratos TypeScript se generan desde `contracts/openapi-public.json` en
`app/types/api.d.ts`; no se modifica OpenAPI desde este módulo.

## Integraciones y fallos

Los errores del transporte se conservan para distinguir un `404` de un fallo recuperable.
Los mensajes públicos no reproducen errores internos del backend. Los enlaces de paginación
se construyen con rutas de interfaz y metadatos de página, no con `links` de la API.

Limitación preexistente: el contrato permite `numero=0`, pero la consulta Laravel actual omite
ese filtro por su condición de valor verdadero. El frontend conserva el parámetro; su corrección
requiere una tarea backend autorizada y no forma parte de P7.

## Evidencia y validación

Los comandos están en [procedimientos](../../../../docs/procedimientos.md). Las pruebas de
`frontend/tests` cubren parámetros, transporte, componentes y navegación con datos sintéticos.
Playwright intercepta todas las consultas públicas; no ejecuta la integración real PostgreSQL/NFS.
La aceptación funcional del responsable sigue siendo una intervención separada.

El checkpoint inicial del 2026-10-30 validó 23 pruebas unitarias y de componentes, seis casos de
navegador en escritorio y móvil, tipos generados, lint, typecheck y compilación. La revisión del
buscador amplía las pruebas a filtros compactos, accesos frecuentes y múltiples adjuntos.
La memoria global conserva
`NOT_EVALUATED` para la semántica HTTP; no acredita una auditoría funcional completa de la API.
La integración real con los datos y los archivos no se repitió durante P7.
