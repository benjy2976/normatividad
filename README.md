# Normatividad

Monorepositorio inicial del portal `normatividad.regionhuanuco.gob.pe` y de la futura
administración independiente del módulo. Contiene dos proyectos y un proxy usado
exclusivamente durante el desarrollo local:

- `backend/`: API pública y futura administración en Laravel.
- `frontend/`: portal público y futura interfaz administrativa en Nuxt.
- `infrastructure/development/proxy/`: entrada local que reproduce el reparto
  de rutas previsto para el proxy inverso de producción.

El backend contiene la primera API pública de lectura para catálogos, documentos, archivos y
representaciones. El frontend implementa el buscador convencional, la ficha de metadatos y el
visor público por ID.
El proyecto no reemplaza todavía las rutas públicas de `munis`.

La arquitectura, las convenciones y los procedimientos se indexan en
[`docs/guia_IA.md`](docs/guia_IA.md). `AGENTS.md` es el protocolo operativo canónico.
El avance, las dependencias y las intervenciones pendientes están en
[`docs/plan-implementacion.md`](docs/plan-implementacion.md).
P7 fue reanudado explícitamente; el acta histórica de suspensión está en
[`docs/traspaso-suspension-2026-10-30.md`](docs/traspaso-suspension-2026-10-30.md).

## Rutas locales

| URL | Destino |
| --- | --- |
| `http://localhost:8080/` | Nuxt |
| `http://localhost:8080/resources/*` | Laravel, retirando el prefijo `/resources` |
| `http://localhost:8080/resources/up` | Health check nativo de Laravel (`/up`) |

En producción el proxy institucional realizará el mismo reparto, por lo que el
contenedor de proxy definido aquí no forma parte del despliegue productivo.

## Requisitos locales

- Docker con Docker Compose.
- Volumen externo `munis_regulations_nfs_ro`.
- Volumen externo `normatividad_ocr_cache_nfs_ro`.
- Red Docker externa `grh_network`, donde el PostgreSQL local publica el alias
  `pg17` usado por la configuración de `munis`.
- `backend/.env` con la conexión local a PostgreSQL.

PostgreSQL, sus datos y los NFS son dependencias institucionales externas: no se crean al
clonar este repositorio. Su responsable debe proporcionar acceso y preparar los volúmenes y
la red antes del arranque. El código y las pruebas aisladas se reproducen desde los lockfiles;
consultar documentos reales requiere esas dependencias. No importar datos ni ejecutar migraciones
para sustituirlas.

Los dos NFS se montan dentro de los contenedores en solo lectura:

- `/mnt/regulations` (el Compose local apunta el disco Laravel al subdirectorio
  `regulations/regulations` que contiene las rutas relativas registradas en la base)
- `/mnt/ocr-cache`

Ni las direcciones de los NFS ni las credenciales de PostgreSQL se almacenan
en Git. Los nombres de los volúmenes externos son el único dato compartido por
el repositorio.

## Desarrollo

En un checkout nuevo, crear la configuración local sin sobrescribir un `.env` existente:

```bash
test -e backend/.env || cp backend/.env.example backend/.env
```

Completar las credenciales `DB_USERNAME` y `DB_PASSWORD` y revisar conexión, esquema y `APP_URL`
según [el entorno documentado](docs/entorno.md). No versionar esos valores.
Después, solo en esta primera instalación, instalar el backend y generar su clave:

```bash
LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose run --build --rm --no-deps backend sh -lc \
  'su-exec "$HOST_UID:$HOST_GID" composer install --no-interaction --prefer-dist &&
   su-exec "$HOST_UID:$HOST_GID" php artisan key:generate --no-interaction'
```

Este paso requiere los volúmenes y la red externos, aunque no inicia PostgreSQL. No regenerar
una `APP_KEY` existente. La secuencia completa y sus límites están en
[Primera instalación](docs/procedimientos.md#primera-instalación).

Para iniciar los tres servicios:

```bash
LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose up --build
```

Después de iniciar:

```bash
curl --fail http://localhost:8080/
curl --fail http://localhost:8080/resources/up
```

Esperar a que Nuxt anuncie `Ready`; puede haber un 502 durante la preparación inicial.
Estos controles verifican la entrada y Laravel; comprobar también una búsqueda y la apertura
de un archivo autorizado para verificar PostgreSQL y almacenamiento.

Para detener el entorno sin eliminar dependencias descargadas:

```bash
docker compose down
```

Los cambios en ambos proyectos se reflejan automáticamente mediante los
servidores de desarrollo de Laravel y Nuxt.

## Validación

Los comandos de pruebas, formato, build y verificación de muestras están en
[procedimientos.md](docs/procedimientos.md). El frontend usa Node `22.23.4` y `npm ci` para una
instalación limpia; el backend usa `composer install` desde `composer.lock`. No ejecutar
`composer update` ni `npm update` para reproducir este estado. PHPUnit se ejecuta directamente
con SQLite en memoria, sin consultar PostgreSQL ni NFS.

El entorno Docker actual es exclusivamente de desarrollo. Despliegue productivo y licenciamiento
institucional siguen pendientes según [el plan](docs/plan-implementacion.md) y
[el expediente de licencias](docs/licenciamiento/README.md).

## Estado funcional actual

- El backend publica recursos bajo `/v1/public/*`.
- Existen módulos de Catálogos y Documentos con pruebas aisladas.
- El contrato se versiona en `contracts/openapi-public.json`.
- El frontend consume la API pública para catálogos, búsqueda convencional, metadatos y archivos.
- La ficha abre el visor público: PDF con navegación y zoom, imágenes admitidas y descarga de
  otros formatos. La entrega productiva de archivos grandes conserva su validación pendiente.
- `/muestras/componentes` y `/muestras/administracion` permiten revisar componentes y el marco
  administrativo exclusivamente en desarrollo, con datos sintéticos y sin sesión de gestión.
- No hay migraciones propias y el arranque no ejecuta migraciones.
- No se escribe en los NFS.
- Las rutas anteriores de `proyectos.regionhuanuco.gob.pe` no se modifican.
