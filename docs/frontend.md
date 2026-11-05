# Frontend web

## Propósito y frontera

El frontend publicará búsqueda, detalle y representaciones documentales. No contiene reglas de
autorización, no accede directamente a PostgreSQL ni conoce rutas locales de almacenamiento.
Consume únicamente el contrato HTTP del backend.

La administración futura compartirá el proyecto, pero vivirá bajo `/administracion` y tendrá un
layout y middleware propios. La autenticación administrativa está diferida. El layout
administrativo tiene una muestra visual
exclusiva de desarrollo; no hay operaciones administrativas implementadas.

Los criterios visuales, densidad, tokens y patrones de pantalla tienen su fuente única en
[`diseno.md`](diseno.md). Esta guía conserva la organización técnica y distingue objetivos de
capacidades ya implementadas.

## Stack confirmado

- Nuxt 4, Vue 3 y TypeScript.
- Renderizado administrado por Nuxt; no se convertirá el portal en una SPA Vite independiente.
- Pinia se incorporará cuando exista un flujo de negocio compartido que lo requiera; el buscador
  conserva estado en URL, `useAsyncData` y formulario local. El tema lo gestiona el módulo de color
  integrado con Nuxt UI, sin otro store.
- Nuxt UI 4 y Tailwind CSS 4 constituyen la base visual. El kit local y sus decisiones viven
  en `docs/diseno.md`; no se incorporan paquetes `@cambio-peru`.
- OpenAPI genera los contratos TypeScript del transporte público centralizado.

No se incorpora TanStack Query inicialmente. `useFetch` y `useAsyncData` son la primera opción
para estado remoto y evitan dos cachés superpuestas.

## Organización del frontend

La estructura objetivo, creada de forma incremental, es:

```text
frontend/app/
├── pages/                 # coordinadores asociados a rutas
├── layouts/               # público y futura administración
├── middleware/            # fronteras de navegación
├── modules/
│   ├── documents/
│   ├── viewer/
│   ├── search/
│   └── catalogs/
├── components/
│   ├── ui/                # piezas sin conocimiento del dominio
│   └── layout/
├── stores/                # estado transversal mínimo
├── plugins/
└── utils/
```

Actualmente existe `modules/documents`, con componentes del formulario y resultados, composable,
servicio HTTP y utilidades de filtros. Posee búsqueda, iconos de adjuntos y ficha con metadatos
y tabla de archivos; `modules/viewer` posee el visor público. Los catálogos son
datos de referencia de este flujo. Los otros directorios objetivo no se crean hasta necesitarlos.

El contexto funcional está en
[`frontend/app/modules/documents/context.md`](../frontend/app/modules/documents/context.md).
El visor se documenta en
[`frontend/app/modules/viewer/context.md`](../frontend/app/modules/viewer/context.md).
`app/types/api.d.ts` se genera desde OpenAPI con `npm run generate:api`; `npm run check:api`
comprueba deriva sin sobrescribirlo.

Cada página coordina parámetros, carga y composición. Los servicios, tipos, stores, composables
y componentes específicos permanecen junto al módulo propietario. Un subflujo se extrae cuando
tiene una responsabilidad observable, no para cumplir una nomenclatura.

### Layouts y composición técnica objetivo

`app.vue` configura `UApp` con el locale español, el anunciador de navegación y la composición
`NuxtLayout` / `NuxtPage`. El marco público posee header, región principal, selector de tema y
footer. Las dos páginas actuales lo seleccionan con `definePageMeta({ layout: 'public' })`.

| Archivo objetivo | Responsabilidad | Estado |
| --- | --- | --- |
| `app/layouts/public.vue` | Marco del portal público; listado y ficha usan patrones internos distintos | Implementado |
| `app/layouts/administration.vue` | Barra superior, navegación lateral y área de trabajo administrativa | Implementado y probado con muestra de desarrollo; administración funcional pendiente |
| `app/layouts/viewer.vue` | Marco de visualización documental | Implementado para el visor público |

Las rutas eligen el layout mediante metadatos de Nuxt; la selección no concede permisos. Cada
layout aporta una sola región principal y su contenido mediante slot, sin duplicar header,
sidebar ni footer dentro de páginas.

Las piezas reutilizables del marco pertenecen a `app/components/layout`. Los patrones de listado,
ficha y formulario son composición dentro del layout; no justifican otro archivo de layout por
entidad. El estado visual compartido seguirá las reglas de estado de esta guía.

El layout administrativo recibe navegación por propiedades. La muestra lo compone explícitamente
con `NuxtLayout` y `layout: false` para evitar duplicar el marco. Los layouts públicos se eligen
mediante metadatos de página. El visor también usa `layout: false` y compone explícitamente
`NuxtLayout name="viewer"` para aportar los slots `tools` y `actions`: el layout conserva tema
y región principal; el coordinador aporta controles y contexto del archivo. Así se mantiene una sola
barra sin marca institucional ni consultas en el marco. Las nuevas piezas requieren una vista
y validación reales.
La composición visual y las medidas se consultan en `docs/diseno.md`, sin copiarlas aquí.

### Revisión de módulos frontend

Antes de cerrar un cambio bajo `frontend/app/modules` verificar:

- que el coordinador no mezcle listado, formulario y detalle sin necesidad;
- que los subflujos con varias piezas tengan un coordinador propio;
- que los recursos no regresen a layouts o componentes genéricos;
- que cada módulo funcional tenga `context.md` y `module.json`;
- que sus pruebas cubran carga, vacío, error, 404 y recuperación cuando apliquen.

### Reutilización y toolchain

El kit y la tabla reutilizable son locales a este proyecto, según [diseno.md](diseno.md).
Los componentes genéricos reciben propiedades y emiten eventos; el módulo posee el transporte,
la adaptación del contrato y los slots con significado funcional. No hay un paquete compartido
entre servicios ni se copia el contrato de paginación de Voice.

Componentes implementados:

| Archivo bajo `app/` | Responsabilidad |
| --- | --- |
| `components/layout/SiteBrand.vue` | Identidad y enlace al inicio compartidos entre los tres marcos |
| `components/layout/ThemeToggle.vue` | Selector de color de Nuxt UI con locale global español |
| `components/ui/AppListPage.vue` | Título y slots `actions`, `filters`, `notices` y contenido |
| `components/ui/AppDataTable.vue` | `UTable`, estados, celdas personalizables y orden remoto |
| `components/ui/AppPagination.vue` | Enlaces de interfaz, página actual y eventos de navegación |
| `components/ui/table.ts` | Contratos visuales `DataColumn`, `TableSort` y `TablePage` |
| `app.config.ts` | Variantes compartidas de la biblioteca |
| `assets/main.css` | Tokens y reflujo de filas a bloques en móvil |

`AppDataTable<T>` recibe `rows`, `columns`, `rowKey` y `label`. Las columnas declaran `key`,
`label`, `sortable` y una clase opcional para ancho/presentación. Un slot `<clave>-cell` recibe
`row` (dato original tipado) y `value`; las reglas de negocio permanecen en el consumidor.
`title`, `headingId` y los slots `filters` y `controls` componen el encabezado compacto con el
total. `filters` admite contenido del consumidor sin trasladar reglas documentales a la tabla.
`loading`, `error` y los textos configuran los estados. `sort` es controlado: `sortChange` propone
un criterio que el coordinador convierte a parámetros HTTP. `manualSorting` y `manualPagination`
impiden transformar localmente el conjunto recibido. Al terminar una ordenación, se restaura el
foco de la cabecera si quedó en el body; no se mueve si el usuario eligió otro control.

El propio `AppDataTable` aplica estilos encapsulados para alternancia, separadores de registros
y resaltado por hover o foco dentro de la fila. Todas sus instancias heredan esa presentación,
incluido el reflujo móvil; no requiere propiedades del módulo, listeners ni estado de selección.
Los colores se centralizan como tokens de ambos temas según `docs/diseno.md`.

`page` adapta los metadatos a `{ current, last, total, from, to }`; `pageLocation(numero)` produce
un destino Vue Router que conserva los filtros. `pageChange` es una notificación opcional; el
consumidor no debe duplicar la navegación que ya realiza el enlace. No usar los links del backend.
La paginación incluye controles aunque una página solicitada haya quedado fuera de rango.

Ejemplo de composición, con nombres de datos aportados por el módulo consumidor:

```vue
<AppListPage title="Registros">
  <template #filters><ModuleFilters /></template>
  <AppDataTable
    :rows="records"
    :columns="columns"
    row-key="id"
    label="Registros publicados"
    :page="page"
    :page-location="pageLocation"
    :sort="sort"
    @sort-change="changeRemoteSort">
    <template #nombre-cell="{ row }">{{ row.nombre }}</template>
  </AppDataTable>
</AppListPage>
```

El buscador es el ejemplo ejecutable: `DocumentResults` adapta los metadatos y slots documentales;
`index.vue` posee URL, toolbar y consultas. `ActiveDocumentFilters` presenta criterios aplicados
y emite su retirada; se compone en la franja de resultados y en la recuperación de URLs inválidas.
Solo la fecha tiene cabecera ordenable porque el
contrato admite `fechaAsc` y `fechaDesc`; `idDesc` sigue disponible en el selector existente.
Las filas mantienen un solo árbol DOM al cambiar de ancho: cada adjunto se monta una sola vez.

El tema utiliza `@nuxtjs/color-mode`, integrado por Nuxt UI, con preferencia inicial `light`,
almacenamiento cookie y clave `normatividad-theme`. La cookie dura un año, usa `SameSite=Lax`
y solo contiene la preferencia visual. El script inicial aplica el color antes de pintar y el
selector protege su primera hidratación. No crear otro store o acceso directo a almacenamiento.
Las fuentes externas están desactivadas y los iconos Lucide se incluyen en el cliente, con el
proveedor remoto deshabilitado. Las dependencias siguen accesibles al IDE mediante el bind mount.

El formato se centraliza en `eslint.config.mjs`, también consumido por VS Code. Los archivos
compartidos `.vscode/settings.json` y `.vscode/extensions.json` habilitan la resolución desde el
checkout, sin configurar un formatter global para otras capas. Preparación de dependencias,
`lint:fix` y gate de compilación: [procedimientos.md](procedimientos.md#frontend).

## Estado y navegación

La fuente de verdad se selecciona por duración y necesidad de compartir:

| Estado | Fuente |
| --- | --- |
| Página, filtros y representación | URL |
| Respuesta del servidor | `useFetch` o `useAsyncData` |
| Flujo entre rutas o componentes | Pinia del módulo |
| Sesión o estado transversal de negocio | Pinia raíz, cuando se implemente |
| Preferencia de tema | Módulo de color integrado con Nuxt UI |
| Diálogo o interacción local | `ref` del componente |

Una URL compartible del visor puede tomar esta forma:

```text
/documentos/132690/archivos/124129?representacion=pdf-searchable&pagina=12
```

`representacion` y `pagina` son compartibles; un store no debe esconderlos.

## Experiencia y seguridad

- Navegación completa por teclado y foco visible.
- Estados no dependientes únicamente del color.
- Diseños de tabla y tarjeta adecuados a escritorio y móvil.
- Markdown sanitizado sin HTML, scripts, estilos ni URLs peligrosas.
- Ningún path de NFS, credencial o detalle interno llega al navegador.
- Un documento fuera de ámbito y uno inexistente se representan igual externamente.
- Cada pantalla diseña carga, vacío, error recuperable y no encontrado.

## Rutas implementadas

- `/` y `/documentos`: mismo buscador convencional de metadatos, con filtros y paginación en URL.
- `/documentos/{documento}`: ficha pública de metadatos y archivos por ID.
- `/documentos/{documento}/archivos/{archivo}`: visor público de un archivo exacto; `pagina` y
  `representacion` son compartibles. PDF continuo, imágenes admitidas, texto de artefactos
  Markdown/JSONL y descarga de los otros formatos.

El buscador presenta accesos a tipos frecuentes y un formulario compacto de tipo, año y
búsqueda. Conserva orden y resultados por página. Cada norma puede mostrar varios iconos de
archivo; cada uno abre el visor público por su ID exacto en otra pestaña.
`DocumentAttachments` reutiliza transporte y estados en dos presentaciones: compacta en el listado
y ampliada en la ficha. La primera carga al entrar en pantalla; la segunda al montar. La página
identifica el componente por ID documental para recrearlo al navegar entre fichas. La presentación
ampliada adapta cada archivo por su ID a `AppDataTable`, sin orden ni paginación visual, y delega
sus estados a esa tabla. `DocumentFileLink` concentra el acceso, nombre accesible y variante de
formato para ambas presentaciones, sin consultas propias. Las reglas viven
en el contexto del módulo. Los accesos disponibles conducen al visor público conservando el ID
exacto y la apertura en otra pestaña; el visor ofrece también el enlace al contenido original.

Los datos se consultan en el navegador con `server: false` a través de `NUXT_PUBLIC_API_BASE`,
por defecto `/resources`. Nuxt renderiza la estructura inicial. No existe una dirección interna
de API ni una segunda capa proxy en Nuxt; los metadatos no se incluyen aún en el HTML SSR.
Un `404` de la API muestra el estado de documento no encontrado en el cliente. Los identificadores
de ruta que no son enteros positivos se rechazan también en la navegación de Nuxt.

## Rutas aprobadas, no implementadas

- `/busqueda-ocr`: búsqueda OCR independiente, aprobada pero no enlazada ni implementada todavía.
- `/administracion/*`: administración futura, no expuesta públicamente.

Estas rutas futuras no constituyen capacidades existentes. La aceptación funcional de P7
continúa pendiente del responsable.

## Catálogo visual exclusivo de desarrollo

Autorizado por el responsable el 2026-11-03. `app/dev/pages/components.vue` y
`app/dev/pages/administration.vue` son tooling visual, no módulos de negocio ni administración.
`app/dev/fixtures.ts` aporta datos sintéticos sin consultas API. La configuración registra estas
páginas mediante `extendPages` únicamente cuando `nuxt.options.dev` es verdadero:

- `/muestras` y `/muestras/componentes`: mismo catálogo de controles, tabla, estados y paginación.
- `/muestras/administracion`: marco administrativo completo con contenido de demostración.

No ubicar estas páginas bajo `app/pages`, donde tendrían registro automático en producción.
No basta ocultar enlaces ni comprobar el entorno solo en el navegador. El build excluye las rutas
completas y sus fixtures; la prueba del artefacto verifica 404 y ausencia de contenido de muestras.
Los componentes de layout siguen siendo reutilizables; las muestras no conceden permisos.
El catálogo conserva identidad de página entre su alias y la paginación para no perder estado
local. Sus controles y el marco administrativo quedan inertes hasta completar el montaje cliente.
No se crea `/administracion` ni un login ficticio.

La ficha vive en `pages/documentos/[documento]/index.vue` para que la ruta de archivo sea una
página hermana y no exija un `NuxtPage` dentro de la ficha. Las URLs existentes no cambian.
El lector PDF usa `pdfjs-dist` 6.5.438 y sus workers compilados por Vite, cargados solo en cliente.
CMaps, fuentes estándar y WASM se publican localmente con Nitro bajo `/pdf-assets/`; no hay CDN.
La biblioteca se limita al documento y no sustituye Nuxt UI ni los tokens del marco.

`PdfTools` presenta navegación y zoom controlados por el coordinador. `PdfReader.client` posee
la carga y el scroll continuo, calcula el rango cercano y delega canvas/texto en `PdfPage.client`.
Los tamaños aún no consultados usan el de la primera hoja hasta conocer su geometría real.
La URL de página cambia con `replace` al desplazar y con `push` al navegar explícitamente.
`TextArtifact.client` consulta únicamente el artefacto seleccionado mediante el servicio de
lectura acotada de `viewer`; no interpreta Markdown ni JSONL como HTML.
El coordinador conserva la misma estructura de carga durante la hidratación inicial, aunque
los metadatos lleguen antes de resolver el layout asíncrono. Los iconos esenciales del visor se
incluyen explícitamente en el bundle local para conservar su disponibilidad también en desarrollo.
