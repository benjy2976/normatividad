---
applyTo: "compose*.yml,infrastructure/**,backend/Dockerfile*,frontend/Dockerfile*"
---

# Instrucciones de infraestructura

Aplicar primero `AGENTS.md`, `docs/arquitectura.md` y `docs/entorno.md`.

## Límites

- El proxy del repositorio es solo para desarrollo.
- El proxy público expone frontend y API pública, nunca administración por accidente.
- Los NFS permanecen en solo lectura en el entorno actual.
- No versionar IP de NFS, credenciales ni contenido de `.env`.
- No ejecutar migraciones como parte del arranque de un contenedor.
- Una futura imagen de entrega debe instalar con lockfile y ejecutar los controles de build
  documentados en `docs/procedimientos.md`. Si falla el build o un control, detener la entrega;
  no continuar levantando una imagen anterior ni saltarse `prebuild`.
- Mantener rutas internas de medios con `internal` antes de usar `X-Accel-Redirect`.

## Validación

```bash
docker compose config --quiet
docker compose exec proxy nginx -t
```

Un cambio de montaje exige inspeccionar `RW`, probar el acceso mínimo necesario y documentar el
riesgo. Nunca convertir un montaje de solo lectura en escritura por conveniencia local.
