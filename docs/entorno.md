# Entorno y configuración

## Requisitos

- Docker Engine con Docker Compose.
- Volúmenes externos `munis_regulations_nfs_ro` y `normatividad_ocr_cache_nfs_ro`.
- Red externa `grh_network` con PostgreSQL accesible mediante el alias local configurado.
- `backend/.env` creado localmente; nunca se versionan credenciales.

Los Dockerfiles definen PHP `8.5` y Node `22.23.4`. `composer.lock` y `package-lock.json` fijan
las dependencias de aplicación; instalar con `composer install` y `npm ci`, respectivamente.
Las etiquetas PHP, Composer y Nginx pueden recibir nuevas revisiones: no se promete una imagen
idéntica bit a bit sin fijar también sus digests. El entorno actual solo implementa desarrollo.

Un checkout nuevo requiere crear `backend/.env` desde la plantilla, completar credenciales y
generar `APP_KEY` una sola vez según
[Primera instalación](procedimientos.md#primera-instalación). La plantilla no contiene secretos.
El frontend recibe su prefijo público desde Compose y no requiere un `.env` adicional.

Cada contexto Docker tiene `.dockerignore` para excluir configuración local, dependencias,
cachés y resultados de pruebas. Estas exclusiones son independientes de `.gitignore` y no
ocultan el bind mount de `node_modules` o `.nuxt` al IDE. Los datos PostgreSQL y NFS no forman
parte de la distribución: su acceso debe ser proporcionado por el responsable de infraestructura.

## Dependencias de desarrollo y acceso del IDE

El frontend usa Node `22.23.4` en `Dockerfile.dev` y `frontend/.nvmrc`. El host que ejecute la
toolchain debe usar esa versión; la instalación local se prepara según
[procedimientos.md](procedimientos.md#frontend).

`frontend/` se monta por bind en `/app`, incluido `node_modules` y la salida generada `.nuxt`.
Ambos deben existir en el checkout y ser legibles por el proceso que ejecuta VS Code. El
contenedor frontend usa `LOCAL_UID:LOCAL_GID` para mantener la propiedad del desarrollador.
No añadir un volumen anónimo sobre `/app/node_modules` que los oculte al IDE ni versionarlos.
Tampoco instalar ESLint globalmente para suplir dependencias ausentes.

En una sesión SSH o contenedor remoto, el IDE necesita acceso a esas mismas rutas dentro de su
entorno. Una recomendación de extensión no acredita que esté instalada o activa. Los únicos
archivos compartidos de `.vscode` son `settings.json` y `extensions.json`; los demás siguen
siendo locales. Sus valores no contienen rutas absolutas del equipo ni credenciales.

## Servicios locales

| Servicio | Puerto interno | Responsabilidad |
| --- | --- | --- |
| `proxy` | `80` | Entrada local y reparto de rutas |
| `backend` | `8000` | Laravel |
| `frontend` | `3000` | Nuxt en desarrollo |
| PostgreSQL externo | `5432` habitual | Base `proyectos`, esquema `normatividad` |

El puerto publicado del proxy se controla con `DEV_HTTP_PORT` y por defecto es `8080`.

## Variables del backend

| Variable | Obligatoria | Propósito |
| --- | --- | --- |
| `APP_KEY` | Sí | Cifrado y firma de Laravel |
| `APP_URL` | Sí | URL base del entorno |
| `DB_HOST`, `DB_PORT` | Sí | Conexión PostgreSQL |
| `DB_DATABASE` | Sí | Base de datos, actualmente `proyectos` |
| `DB_USERNAME`, `DB_PASSWORD` | Sí | Credenciales locales no versionadas |
| `DB_SCHEMA` | Sí | `search_path`, actualmente `normatividad` |
| `PUBLIC_API_PREFIX` | Sí | Prefijo externo para enlaces, actualmente `/resources` |
| `REGULATIONS_STORAGE_PATH` | Sí | Raíz lógica de originales; en el Compose local es `/mnt/regulations/regulations/regulations` porque el volumen monta la exportación completa en `/mnt/regulations` |
| `OCR_CACHE_STORAGE_PATH` | Sí | Caché OCR, `/mnt/ocr-cache` en Compose |

## Variables del frontend

| Variable | Propósito |
| --- | --- |
| `NUXT_PUBLIC_API_BASE` | Prefijo público del backend; localmente `/resources` |

## Seguridad y almacenamiento

Los dos NFS se montan con `ro` tanto en backend como en proxy. Sus IP, opciones de montaje y
credenciales no pertenecen al repositorio. El acceso de escritura futuro requiere un diseño y
una autorización separados; no se obtiene quitando `ro` del entorno actual.

La conexión local puede tener permisos amplios para desarrollo. En producción se separarán las
credenciales de lectura pública, administración y migración. Ningún contenedor ejecuta
migraciones durante el arranque.

El servidor Laravel de desarrollo se ejecuta como UID/GID `33:33`, igual que PHP-FPM en Munis,
porque parte del NFS conserva directorios `700` propiedad de `www-data`. Composer se ejecuta
antes con `LOCAL_UID` y `LOCAL_GID` para no crear dependencias propiedad de root en el checkout.
Los logs, vistas compiladas, sesión y caché del runtime se mantienen en memoria o bajo `/tmp`.
