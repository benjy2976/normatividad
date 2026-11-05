# Frontend de Normatividad

Aplicación Nuxt 4 para el portal público y la futura administración. Implementa búsqueda
convencional en `/` y `/documentos`, ficha en `/documentos/{documento}` y visor público en
`/documentos/{documento}/archivos/{archivo}`. El visor admite PDF, imágenes y artefactos de texto
declarados por la API; otros formatos ofrecen descarga.

`/muestras` y `/muestras/componentes` muestran componentes reutilizables;
`/muestras/administracion` muestra el layout administrativo. Solo se registran en desarrollo,
usan datos sintéticos y no implementan sesión ni operaciones administrativas.

La organización aprobada, el reparto del estado y las rutas previstas se documentan en
[`docs/frontend.md`](../docs/frontend.md). Las reglas de implementación viven en
[`.github/instructions/frontend.instructions.md`](../.github/instructions/frontend.instructions.md).

## Desarrollo

Abrir la raíz de Normatividad en VS Code. La carpeta `.vscode` recomienda ESLint y Vue Official,
resuelve ESLint desde `frontend/node_modules` y aplica sus correcciones al guardar JS, TS y Vue.
El formato conserva dos espacios y la alineación de objetos acordada; `npm run lint:fix` permite
aplicarlo desde terminal. El IDE necesita dependencias locales legibles, aunque Nuxt corra en
Docker. La política y el diagnóstico están en los procedimientos enlazados abajo.

Para Vue 3, desactivar Vetur **en este workspace** y mantener Vue Official habilitado. Los alias
`~/` y los autoimports los describe Nuxt en `.nuxt`; no hace falta declararlos manualmente.
Después de cambiar extensiones, recargar la ventana del editor. El formato al guardar lo aplica
la acción de ESLint, aunque `editor.formatOnSave` esté desactivado para evitar otros formatters.

El entorno recomendado se inicia desde la raíz con `compose.yml`. Los comandos de calidad,
generación de tipos OpenAPI y pruebas de navegador están en
[`docs/procedimientos.md`](../docs/procedimientos.md). En una instalación limpia, desde
`frontend/` con Node `22.23.4`:

```bash
npm ci
npm run check:api
```

`npm ci` instala desde `package-lock.json` y prepara `.nuxt`; no copiar dependencias ni archivos
generados de otro equipo. `check:api` requiere el checkout completo para leer `contracts/`.
Para validar el build y la exclusión de muestras:

```bash
npm run build
node tests/production-routes.mjs
```

Ese comando ejecuta primero lint, comprobación de tipos y pruebas. Para comprobar también la
deriva de OpenAPI, ejecutar `npm run check:api` desde el checkout completo. Node de referencia:
`22.23.4`, fijado en `.nvmrc` y en el contenedor. No omitir los controles al entregar un build.

## Pendientes de mantenimiento

En el checkpoint de P7 del 2026-10-30, `npm audit` informa siete avisos de severidad baja en la
cadena existente Nuxt–Nitro–`deepmerge`. Esas versiones no cambiaron con P7. Su resolución queda
fuera de este bloque y requiere evaluar la actualización del stack, sin aplicar un downgrade
automático. La aceptación funcional del buscador sigue pendiente del responsable.
