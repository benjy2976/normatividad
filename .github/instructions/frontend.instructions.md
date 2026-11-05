---
applyTo: "frontend/**/*.{vue,ts,js,json}"
---

# Instrucciones de la capa frontend

Aplicar primero `AGENTS.md` y `docs/frontend.md`. La estructura nativa es Nuxt 4 bajo
`frontend/app`; no crear `src` o `views` para satisfacer herramientas externas.

## Diseño visual y layouts

- Antes de diseñar o modificar una vista, leer `docs/diseno.md`. Es la fuente única de criterios
  visuales, densidad, tokens y patrones; no definir otra escala o paleta en cada módulo.
- Reutilizar el layout y el patrón de vista aplicables. Las rutas técnicas y su estado viven en
  `docs/frontend.md`; no crear un layout por entidad ni duplicar el marco en cada página.
- Nuxt UI es la biblioteca adoptada. Reutilizar `app.config.ts`, tokens semánticos y componentes
  locales; no introducir otro kit. Claro y oscuro comparten variantes y densidad. Los selects
  nativos existentes consumen esos mismos tokens. El visor público y el marco administrativo
  están implementados; la administración funcional
  sigue pendiente. Las muestras se registran solo en desarrollo según `docs/frontend.md`.
- En el cierre de una implementación visual, aplicar la revisión de escritorio, móvil, foco y
  densidad de `docs/diseno.md`, además de las pruebas funcionales pertinentes.

## Organización

- `pages` coordina rutas y composición.
- `modules` posee servicios, types, stores, composables y componentes del dominio.
- `components/ui` contiene solo piezas independientes de ruta y dominio.
- Crear `context.md` y `module.json` con el primer comportamiento real de un módulo.
- Los listados reutilizan `AppListPage`, `AppDataTable` y `AppPagination`. El módulo aporta
  columnas, slots y adaptación de metadatos; orden y paginación siguen remotos y en URL.
- Conservar un solo árbol de filas y adjuntos al adaptar móvil; no duplicar peticiones por
  renderizar dos presentaciones. No habilitar sort local sobre una página remota.
- No crear carpetas futuras vacías. `app/dev` contiene solo muestras visuales sintéticas; sus
  páginas se registran condicionalmente, nunca bajo el escaneo público automático de `app/pages`.
  Verificar su ausencia con la prueba del artefacto antes de cerrar cambios de ese registro.
- El kit reutilizable pertenece a este proyecto. No incorporar `@cambio-peru/ui` ni copiar
  `@cambio-peru/vue-table`; adaptar las ideas según `docs/diseno.md` y el contrato propio.

## IDE, dependencias y formato

- Abrir la raíz del repositorio en VS Code y usar la configuración compartida de `.vscode`.
  ESLint se resuelve desde `frontend/node_modules` con directorio de trabajo `frontend`.
- Vue Official analiza Vue 3 y los proyectos TypeScript generados por Nuxt; desactivar Vetur
  en este workspace. `~` ya apunta a `app` mediante `.nuxt/tsconfig.app.json`: antes de cambiar
  aliases por un error del IDE, contrastarlo con `vue-tsc` y comprobar la extensión que lo emite.
  No añadir declaraciones comodín de `.vue` que borren tipos ni editar `.nuxt` manualmente.
- Mantener `node_modules` y `.nuxt` accesibles para el IDE en el checkout, con la identidad del
  desarrollador. No ocultarlos en un volumen exclusivo del contenedor ni usar ESLint global.
- La configuración normativa es `frontend/eslint.config.mjs`, tanto en IDE como en terminal.
  El formato usa dos espacios y alineación de dos puntos en objetos multilínea, con ESLint
  Stylistic y las reglas Vue declaradas allí. Ejecutar `npm run lint:fix` para aplicarlo.
- Los ajustes por lenguaje fijan ESLint como formatter y usan `source.fixAll.eslint` al guardar
  explícitamente. `formatOnSave` queda desactivado para evitar una segunda pasada de otro motor;
  la corrección de ESLint sigue activa. Los `:` se alinean en objetos multilínea, no en imports
  o declaraciones `const`; el formato no convierte por sí solo todas las líneas en bloques.
- No añadir un formatter competidor ni desactivar reglas de corrección para facilitar formato.
  PHP y Markdown conservan sus herramientas; los tipos generados no se formatean manualmente.
- `npm run build` ejecuta lint, tipos y pruebas mediante `prebuild`; un fallo debe impedir la
  compilación y entrega. No omitir el lifecycle con `--ignore-scripts` para publicar.

## Datos y estado

- Usar URL para estado compartible.
- Usar `useFetch` o `useAsyncData` para estado remoto.
- Usar Pinia para estado transversal de negocio o flujos que sobreviven a un componente cuando
  se requiera. El tema pertenece al módulo de color de Nuxt UI; no duplicarlo en un store.
- Mantener estado visual efímero en el componente.
- Centralizar el transporte HTTP en services; no llamar `$fetch` desde componentes dispersos.
- No duplicar respuestas remotas completas en Pinia sin una razón documentada.

## Seguridad y experiencia

- El backend decide autorización; ocultar un control solo mejora la experiencia.
- Sanitizar Markdown y tratar nombres, metadatos y JSON como datos no confiables.
- No exponer paths, credenciales ni detalles de almacenamiento.
- Diseñar carga, vacío, error recuperable y 404.
- Conservar foco visible, teclado completo y estados no dependientes solo del color.

## Validación

```bash
cd frontend
npm run check:api
npm run build
```

El build incluye lint, tipos y pruebas; para verificaciones focalizadas se ejecutan por separado.

Las pruebas de navegador (`npm run test:e2e`) requieren el entorno local y Chromium; usan datos
sintéticos. Los procedimientos y exclusiones se documentan en `docs/procedimientos.md`.
No editar `app/types/api.d.ts` manualmente: se genera desde OpenAPI con `npm run generate:api`.
