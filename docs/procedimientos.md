# Procedimientos reproducibles

## Primera instalación

Trabajar desde un clon o checkout completo. Se requieren Docker con Compose, acceso a los
registros de paquetes para instalar dependencias y la infraestructura externa descrita en
[entorno.md](entorno.md). El responsable de esa infraestructura debe preparar la red
`grh_network`, PostgreSQL y los volúmenes `munis_regulations_nfs_ro` y
`normatividad_ocr_cache_nfs_ro`. No crear volúmenes locales vacíos con esos nombres: no sustituyen
los NFS. No iniciar ni reconfigurar PostgreSQL compartido como parte de esta instalación.

1. Crear la configuración local únicamente si no existe:

   ```bash
   test -e backend/.env || cp backend/.env.example backend/.env
   ```

2. Completar `DB_USERNAME` y `DB_PASSWORD`, confirmar host, puerto, base y `DB_SCHEMA`, y revisar
   `APP_URL`. Los valores se obtienen del responsable del entorno y nunca se publican en Git.
   Compose define las raíces NFS y el prefijo público; no copiar un `.env` de otro proyecto.
3. Si `APP_KEY` está vacía, instalar dependencias del backend y generar una clave nueva:

   ```bash
   LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
     docker compose run --build --rm --no-deps backend sh -lc \
     'su-exec "$HOST_UID:$HOST_GID" composer install --no-interaction --prefer-dist &&
      su-exec "$HOST_UID:$HOST_GID" php artisan key:generate --no-interaction'
   ```

   El contenedor temporal monta los volúmenes y usa la red ya preparados; `--no-deps` evita
   iniciar otros servicios. Composer usa `composer.lock`; no ejecutar `update`, `setup`,
   `create-project`, migraciones ni seeders para preparar el esquema heredado. No regenerar
   una clave existente. `composer setup` conserva tareas del esqueleto Vite, ajenas al portal.
4. Iniciar el entorno según la sección siguiente, esperar a Nuxt y comprobar portada y health
   check. Después verificar una búsqueda y un archivo autorizado: los dos HTTP 200 iniciales
   no certifican acceso a PostgreSQL ni a los NFS.

Los lockfiles reproducen dependencias de aplicación. El entorno completo con documentos reales
depende de los servicios externos; no se distribuyen dumps, originales ni cachés OCR. Las pruebas
unitarias y de componentes usan datos sintéticos y pueden ejecutarse sin esas dependencias una
vez instalados los paquetes. Los requisitos del IDE y de Chromium se describen más abajo.

## Iniciar el entorno local

```bash
LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose up --build
```

`--build` reconstruye las imágenes. Sin esa opción, Compose reutiliza las existentes y solo
construye las que falten; reconstruir hace falta tras cambiar un `Dockerfile.dev`, porque el código
se monta desde el checkout y no se copia a la imagen. `-d` arranca en segundo plano y devuelve la
terminal; los logs siguen disponibles con `docker compose logs -f <servicio>`.

```bash
# Sin reconstruir imágenes, en segundo plano
LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose up -d

# Reconstruyendo imágenes, en segundo plano
LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose up --build -d
```

Comprobar la entrada:

```bash
curl --fail http://localhost:8080/
curl --fail http://localhost:8080/resources/up
```

El Compose no inicia PostgreSQL: es una dependencia compartida externa. Antes de consultar
documentos, su responsable debe dejar accesible el host configurado en `grh_network`. Una portada
con HTTP 200 o el health check de Laravel no demuestran que la consulta documental funcione.
No iniciar ni reconfigurar ese servicio compartido sin autorización específica.

El frontend instala dependencias y prepara Nuxt durante el arranque. Nginx puede responder 502
hasta que sus logs anuncien `Ready`; revisar con
`docker compose logs -f frontend`. Si la portada carga pero el buscador falla,
revisar el estado de PostgreSQL y los logs recientes de backend. No publicar trazas, SQL ni datos
reales. La interfaz limita cada lectura de metadatos a 15 segundos y permite reintentar; el límite
no sustituye restablecer la dependencia que falló.

Detener sin borrar dependencias o volúmenes:

```bash
docker compose down
```

### Si el arranque falla

Revisar primero el estado de los tres servicios con `docker compose ps -a`.

**Volumen NFS inaccesible.** `failed to mount local volume` seguido de `connection refused` indica
que no respondió el servidor de uno de los volúmenes externos descritos en
[entorno.md](entorno.md#seguridad-y-almacenamiento). Backend y proxy los montan; frontend no.
Tras un reinicio de Docker o WSL con el NFS caído, `restart: unless-stopped` solo recupera el
frontend y el puerto publicado queda sin proxy. Revisar la conectividad del equipo o esperar a que
su responsable restablezca el servidor y repetir `up -d`. No retirar los volúmenes ni su `ro`
para arrancar.

**Puerto ocupado.** `port is already allocated` indica que otro proceso usa el puerto publicado
del proxy. Comprobar si es un contenedor:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep ':8080->'
```

Un contenedor iniciado fuera de Compose puede servir la portada sin enrutar `/resources/` hacia
Laravel: catálogos y búsqueda fallan y `/resources/up` responde `404`. Confirmar quién lo inició
antes de detenerlo con `docker stop <nombre>`, y no sustituir el proxy con contenedores manuales.
Si el puerto pertenece a otro servicio legítimo, publicar el proxy en otro con `DEV_HTTP_PORT`;
las pruebas de navegador asumen `8080`.

## Backend

Desde `backend/` o mediante el contenedor:

```bash
vendor/bin/phpunit
vendor/bin/pint --test
php artisan route:list --except-vendor
```

`phpunit.xml` fuerza SQLite en memoria mediante variables `server`. Ejecutar PHPUnit directamente
es una barrera de seguridad: `php artisan test` puede iniciar Laravel con la conexión PostgreSQL
heredada por el contenedor antes de que PHPUnit aplique el entorno de pruebas.

`pint --test` comprueba toda la capa sin modificar archivos; es el control para el primer commit
y los checkpoints globales. `pint --dirty` se reserva para cambios ya rastreados por Git y puede
omitir archivos nuevos. Aplicar formato es una acción separada y requiere revisar su diff.

No ejecutar `php artisan migrate` contra el esquema compartido sin un plan de migración aprobado.

## Frontend

### Preparar dependencias e IDE

Abrir la raíz del repositorio en VS Code. Instalar las extensiones recomendadas ESLint
(`dbaeumer.vscode-eslint`) y Vue Official (`Vue.volar`) en el entorno donde se ejecuta el editor;
en Remote SSH, en el host remoto. Los ajustes compartidos fijan `frontend` como directorio de
trabajo, `frontend/node_modules` como ruta de resolución y corrección al guardar para JS, TS y
Vue. PHP y Markdown mantienen sus herramientas.

Para Nuxt 4 y Vue 3, usar **Vue Official** para tipos, navegación e IntelliSense y **ESLint**
para formato. Desactivar **Vetur** solo para este workspace desde Extensiones → Vetur →
**Disable (Workspace)**. La recomendación negativa en `extensions.json` no desactiva una extensión
ya instalada. Los ajustes compartidos deshabilitan su validación y formatter mientras se completa
ese paso; no modifican la configuración global ni otros proyectos. Esta elección sigue la
[guía oficial de Vue](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

Los ajustes individuales `[javascript]`, `[typescript]` y `[vue]` fijan ESLint como formatter.
Al guardar explícitamente, `source.fixAll.eslint` aplica sus correcciones. `editor.formatOnSave`
se desactiva en esos lenguajes para evitar otra pasada de un formatter competidor; no desactiva
la corrección de ESLint. **Format Document With… → ESLint** también ejecuta ese motor.
La sangría es de dos espacios y los `:` se alinean en objetos multilínea, como en Voice. Esa regla
no alinea `const` o imports ni transforma automáticamente cada objeto compacto en varias líneas.

Si aparecen errores en `~/modules/...`, `definePageMeta` o los composables de Nuxt:

1. Comprobar que el diagnóstico no procede de Vetur y que Vue Official está habilitado.
2. Comprobar que existen `.nuxt/tsconfig.app.json` y `.nuxt/imports.d.ts`; si faltan, reconstruirlos
   con `npm exec nuxt prepare` desde `frontend/`, usando el runtime documentado abajo.
3. En **TypeScript: Select TypeScript Version**, elegir la versión del workspace. El ajuste
   `typescript.tsdk` apunta al TypeScript local de `frontend/node_modules`.
4. Ejecutar desde `frontend/` `./node_modules/.bin/vue-tsc --noEmit -p .nuxt/tsconfig.app.json`.
   Esta comprobación focalizada funciona en el host y revisa la aplicación y sus imports Vue.
5. Tras corregir extensiones o ajustes, ejecutar **Developer: Reload Window** y revisar de nuevo.

El `tsconfig.json` de Nuxt 4 referencia los proyectos generados; `~/*` ya resuelve a `app/*`.
No duplicar aliases ni añadir un `declare module '*.vue'` genérico para silenciar un diagnóstico
del editor: eso puede ocultar problemas y perder los tipos concretos de los componentes.

Para una instalación reproducible, desde `frontend/` con Node `22.23.4`:

```bash
nvm use
npm ci
```

`nvm use` requiere nvm instalado y lee `.nvmrc`; si no se usa nvm, preparar esa versión por el
gestor del equipo. `npm ci` ejecuta `nuxt prepare` por `postinstall`; si se elimina `.nuxt` después,
reconstruirla con `npm exec nuxt prepare`. No es necesario repetirlo en cada arranque.

La alternativa existente es instalar con el contenedor de desarrollo, cuyo bind mount deja
`node_modules` y `.nuxt` accesibles en el host. Ambas opciones usan el lockfile y la misma
configuración de ESLint; ejecutar instalación y compilación en un mismo entorno evita mezclar
binarios nativos de distintas plataformas. No ejecutar `npm ci` sobre dependencias compartidas
mientras otro proceso las utiliza. El arranque local actual conserva `npm install`; la entrega
reproducible debe usar `npm ci`.

Si el IDE no resuelve ESLint, verificar existencia y lectura de `frontend/node_modules/eslint`
y `.nuxt`, usuario propietario y directorio de trabajo. Abrir la salida **ESLint** del editor,
comprobar que carga `frontend/eslint.config.mjs` y reiniciar su servidor con **ESLint: Restart
ESLint Server** tras cambiar dependencias. No resolverlo con paquetes globales, permisos `777`
ni cambios al backend.

### Formato y checkpoint de calidad

Desde `frontend/`:

```bash
npm run lint:fix
npm run check:api
npm run build
```

`lint:fix` modifica únicamente el código bajo las reglas de ESLint; revisar el diff antes de
aceptarlo. El formato usa dos espacios, alineación de dos puntos para objetos multilínea y las
reglas Vue del archivo de configuración. El IDE aplica el mismo motor; no añadir Prettier con
reglas paralelas. La migración de reglas obsoletas a sus equivalentes está descrita en
[ESLint Stylistic](https://eslint.style/guide/migration).

`npm run build` ejecuta `prebuild`: `npm run lint`, `npm run typecheck` y `npm test`, en ese orden,
antes de `nuxt build`. El primer fallo detiene la cadena. No repetir estos comandos por separado
antes del build en el mismo checkpoint. Se pueden ejecutar individualmente para una comprobación
focalizada o repetir solo el control que falló. No usar `--ignore-scripts` ni invocar `nuxt build`
directamente para eludir el gate de entrega.

Usar Node 22 del contenedor; Node 25 del host produce advertencias de compatibilidad con Nuxt.
El build también se ejecuta mediante
`docker compose exec -T frontend npm run build` desde la raíz.
La generación y comprobación OpenAPI se ejecutan desde el checkout del host: el contenedor
frontend solo monta `frontend/` y no dispone de `contracts/`.

`check:api` comprueba que los tipos coinciden con OpenAPI sin escribirlos. Después de un cambio
autorizado del contrato, regenerar con `npm run generate:api`.

Pruebas de navegador con el entorno local ya levantado en el puerto 8080:

```bash
npx playwright install chromium
npm run test:e2e
```

En Linux se requieren las bibliotecas nativas de Chromium. `npx playwright install-deps chromium`
permite prepararlas con los permisos del host; no es necesario modificar los servicios del proyecto.

La adopción visual utiliza Nuxt UI, con configuración y ejemplos en [frontend.md](frontend.md).
`npm ci` prepara también sus tipos. No cambiar el formatter ni ocultar las dependencias al IDE.
El selector del header recuerda el tema; para revisar el estado inicial, borrar únicamente la
cookie `normatividad-theme`. El valor inicial debe ser claro incluso si el sistema usa oscuro.
Vitest se ejecuta fuera de Nuxt y resuelve `~` hacia `app` en `vitest.config.ts`; no modifica
los aliases generados de la aplicación ni requiere declaraciones comodín de Vue.
Las pruebas de navegador verifican persistencia, hidratación, recursos locales y que el reflujo
no duplique las consultas de adjuntos.

Playwright usa un solo worker y dos perfiles, escritorio y móvil. Intercepta las lecturas de API
con datos sintéticos: no consulta PostgreSQL ni NFS. Los screenshots quedan en
`frontend/test-results/`, excluido de Git. La aceptación visual automatizada no sustituye la
aceptación funcional del responsable. Las pruebas de componentes usan Happy DOM y no requieren
servicios. El visor añade pruebas con PDF sintético renderizado, scroll continuo, barra única y
render de hojas cercanas, artefactos de texto escapados, imágenes y descargas. Los fixtures de veinte
páginas comprueban navegación y liberación de canvas lejanos; no certifican archivos grandes. La
integración real,
los archivos grandes y los rangos HTTP conservan su validación productiva pendiente.

### Muestras y verificación del artefacto

Con `npm run dev`, abrir `/muestras/componentes` y `/muestras/administracion` en el puerto 8080.
El catálogo no consulta datos reales. Para comprobar exclusión de muestras después del build:

```bash
npm run build
node tests/production-routes.mjs
```

Ambos comandos se ejecutan dentro del frontend con Node 22. El segundo inicia temporalmente el
artefacto en loopback, comprueba 404 de muestras y administración, 200 de las estructuras públicas
y ausencia de contenido sintético en bundles públicos. Cierra el proceso al terminar y no consulta
la API, PostgreSQL ni NFS. No repetir el build si el mismo checkpoint ya tiene uno vigente.

El visor se revisa con una URL pública por ID y `?pagina=2&representacion=pdf-searchable` cuando
el manifiesto lo ofrezca. `tests/viewer.spec.ts` intercepta todo el transporte y usa un PDF mínimo
sintético; no se presenta como validación de datos reales ni de entrega productiva optimizada.

## Infraestructura

### Política de entrega

El entorno actual solo implementa desarrollo. Al incorporar una imagen de entrega, su etapa de
construcción instalará desde lockfile con `npm ci` y ejecutará `npm run build`, incluido `prebuild`.
La comprobación `check:api` necesita el contrato en ese contexto o en un paso previo del pipeline.
El runtime y el artefacto deben corresponder a Nuxt; no copiar la salida Vite o Nginx estático de
otro proyecto suponiendo equivalencia con el servidor Nuxt actual.

Un fallo de construcción o validación bloquea la publicación. Construir y levantar la versión
nueva deben ser pasos dependientes: nunca continuar con `up` o una imagen anterior por ignorar
el código de salida del build. Esta política no constituye un despliegue ni instala un pipeline
de producción en esta unidad. El arranque de desarrollo no ejecuta toda la suite en cada recarga.

### Comprobaciones locales

```bash
docker compose config --quiet
docker compose exec proxy nginx -t
```

Para verificar que un montaje continúa siendo de solo lectura:

```bash
docker inspect normatividad-backend-1 \
  --format '{{range .Mounts}}{{println .Destination .RW}}{{end}}'
```

## Mantenimiento de memoria

Prueba focalizada del detector local:

```bash
python3 -m unittest tests/project-memory/test_validator.py
```

Validación estructural global:

```bash
scripts/validate-project-memory --strict
```

Validación Markdown global:

```bash
npx --yes markdownlint-cli2 '**/*.md' '#backend/vendor/**' \
  '#frontend/node_modules/**' '#frontend/.nuxt/**' '#frontend/.output/**'
```

Una ejecución estricta puede producir `NOT_EVALUATED` cuando el detector no conoce una
tecnología. Debe informarse como límite de cobertura, no reinterpretarse como aprobación.

## Contratos

Validar que el OpenAPI versionado sea JSON correcto:

```bash
python3 -m json.tool contracts/openapi-public.json >/dev/null
```

La generación y comparación de tipos del frontend se ejecuta con `npm run generate:api` y
`npm run check:api` desde `frontend/`.
