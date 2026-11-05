# Backend de Normatividad

Aplicación Laravel 13 con API pública de lectura para catálogos, documentos, archivos y
representaciones, además del health check `/up`. Consulta el esquema heredado `normatividad`;
la administración autenticada y las escrituras permanecen pendientes.

Las reglas de esta capa viven en
[`.github/instructions/backend.instructions.md`](../.github/instructions/backend.instructions.md).
El contrato actual está en [`docs/api.md`](../docs/api.md).

## Desarrollo

El entorno recomendado se prepara desde la raíz con `compose.yml`. La creación de `.env`,
instalación desde `composer.lock` y generación inicial de `APP_KEY` se describen en
[Primera instalación](../docs/procedimientos.md#primera-instalación). PostgreSQL y los NFS son
externos; no se incluyen datos ni credenciales en el repositorio. El runtime Docker es PHP 8.5.

Desde `backend/`, para validar esta capa sin modificar formato:

```bash
vendor/bin/phpunit
vendor/bin/pint --test
```

PHPUnit fuerza SQLite en memoria antes de iniciar Laravel. No usar `php artisan test` con las
credenciales PostgreSQL heredadas: Artisan puede arrancar antes de aplicar esa barrera.
Las pruebas usan datos sintéticos y almacenamiento temporal, sin PostgreSQL ni NFS.

Los procedimientos completos están en [procedimientos.md](../docs/procedimientos.md#backend).
No ejecutar migraciones contra el esquema compartido sin un plan aprobado; los montajes NFS
permanecen en solo lectura. No usar `composer setup` para este monorepositorio: conserva tareas
del esqueleto para un frontend Vite que no corresponde al portal Nuxt.
