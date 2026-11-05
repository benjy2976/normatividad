# Ficha técnica de la solución

## Stack

- Backend: Laravel 13, PHP 8.3 o posterior.
- Frontend: Nuxt 4, Vue 3 y TypeScript.
- Datos: PostgreSQL 17, base `proyectos`, esquema `normatividad`.
- Desarrollo: Docker Compose y Nginx.
- Almacenamiento: NFS de originales y caché OCR, ambos de solo lectura.

## Componentes

| Componente | Responsabilidad | Estado |
| --- | --- | --- |
| `backend` | API pública y futura administración | Primera API pública implementada |
| `frontend` | Portal público y futura administración | Esqueleto |
| Proxy de desarrollo | Reproducir `/` y `/resources/*` | Implementado solo para desarrollo |
| PostgreSQL externo | Metadatos heredados | Conectado en entorno local |
| NFS de originales | Fuente documental | Montado en solo lectura |
| NFS OCR | Caché derivada | Montado en solo lectura |

## Módulos funcionales iniciales

- Catálogos: tipos de documento, siglas y procesos.
- Documentos: metadatos, archivos y representaciones.

Sus reglas viven en los respectivos `context.md`; el contrato de transporte vive en
`docs/api.md` y `contracts/openapi-public.json`.

## Propiedades de seguridad

- Solo se publican documentos y catálogos marcados como visibles.
- Los recursos ocultos responden `404`.
- El original es la raíz de confianza.
- El backend no expone paths ni escribe artefactos OCR.
- Las pruebas fuerzan SQLite en memoria y almacenamientos falsos.

## Límites actuales

No existe todavía autorización administrativa, entrega optimizada de archivos grandes,
rate limiting específico, búsqueda OCR pública ni evaluación institucional completa.
