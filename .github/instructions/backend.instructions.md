---
applyTo: "backend/**/*.php,backend/composer.json,backend/phpunit.xml"
---

# Instrucciones de la capa backend

Aplicar primero `AGENTS.md`. Esta capa usa Laravel 13 y PHP; confirmar versiones instaladas antes
de depender de una API concreta.

## Arquitectura

- Mantener controladores delgados.
- Usar Form Requests, API Resources, Policies, Actions y Queries según su responsabilidad.
- Crear módulos verticales en `app/Modules` solo al implementar una capacidad real.
- No introducir Repository interfaces sin una frontera de persistencia demostrable.
- Versionar APIs funcionales y registrar cada operación en `docs/api.md`.
- Crear archivos Laravel mediante `php artisan make:* --no-interaction` cuando el generador aplique.

## PHP y Laravel

- Declarar tipos de parámetros y retorno.
- Usar llaves en todas las estructuras de control.
- Preferir promoción de propiedades en constructores con dependencias.
- Usar nombres descriptivos y PHPDoc para shapes o contratos que el tipo no exprese.
- Generar enlaces con rutas nombradas.
- Usar factories en pruebas cuando existan modelos.
- No crear modelos, migraciones o seeders sin mapear antes el esquema heredado.

## Datos y almacenamiento

- PostgreSQL usa `DB_SCHEMA` como `search_path`.
- No ejecutar migraciones automáticamente al iniciar el contenedor.
- El integrador OCR es el único escritor de artefactos derivados.
- No escribir en los NFS montados en solo lectura.
- No exponer rutas físicas; preparar respuestas controladas o `X-Accel-Redirect` interno.

## Preflight adicional

Leer `docs/api.md` para transporte, `docs/arquitectura.md` para fronteras y el `context.md` del
módulo cuando exista. Si el cambio toca persistencia y aún no existe `docs/modelo-datos.md`,
detenerse para evaluar el umbral.

## Validación

```bash
cd backend
vendor/bin/pint --dirty --format agent
vendor/bin/phpunit
```

Ejecutar primero la prueba focalizada del flujo. La suite completa corresponde a un checkpoint
estructural, candidato a commit o despliegue.

En Docker no usar `php artisan test` mientras el servicio herede la conexión PostgreSQL del
entorno: Artisan arranca antes de que PHPUnit fuerce su configuración. `vendor/bin/phpunit`
aplica `phpunit.xml` antes de crear Laravel y garantiza SQLite en memoria.
