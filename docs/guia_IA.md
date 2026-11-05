# Guía para agentes de IA

## Propósito y cuándo aplica

Este documento orienta hacia la fuente normativa correcta. El protocolo operativo completo
vive en `AGENTS.md`; esta guía no lo duplica ni autoriza cambios fuera de la petición actual.

## Adopción del estándar

- Skill: `gestionar-memoria-viva-proyecto`.
- Versión adoptada: `1.7.0`.
- Fecha de adopción: `2026-10-30`.
- Versión anterior: no aplica; esta es la primera adopción.
- Adaptación local: el detector reconoce módulos Nuxt 4 en `frontend/app/modules`.

## Fuentes normativas

| Pregunta | Fuente |
| --- | --- |
| ¿Cómo debe ejecutarse una tarea? | `AGENTS.md` |
| ¿Cuál es el estado del expediente institucional? | `docs/README.md` y `docs/proyecto.yml` |
| ¿Cómo se divide y comunica el sistema? | `docs/arquitectura.md` |
| ¿Qué contrato HTTP existe? | `docs/api.md` y `contracts/openapi-public.json` |
| ¿Cómo se organiza el frontend? | `docs/frontend.md` |
| ¿Cómo deben diseñarse las vistas, componentes y layouts? | `docs/diseno.md` |
| ¿Qué prácticas técnicas se aceptaron? | `docs/convenciones.md` |
| ¿Qué necesita cada entorno? | `docs/entorno.md` |
| ¿Cómo se instala, valida y opera? | `docs/procedimientos.md` |
| ¿Cuál es el avance y qué depende de terceros? | `docs/plan-implementacion.md` |
| ¿Cómo se retoma la ejecución suspendida? | `docs/traspaso-suspension-2026-10-30.md` |
| ¿Cómo se gobiernan recursos y contexto? | `docs/memoria-viva/README.md` |
| ¿Cómo se mapean las entidades heredadas? | `docs/modelo-datos.md` |
| ¿Qué reglas tiene Laravel? | `.github/instructions/backend.instructions.md` |
| ¿Qué reglas tiene Nuxt? | `.github/instructions/frontend.instructions.md` |
| ¿Qué reglas tiene la infraestructura? | `.github/instructions/infrastructure.instructions.md` |

`docs/cli.md` no existe porque el proyecto no publica comandos propios. El comando `inspire`
pertenece al esqueleto de Laravel y no es una interfaz del producto. El modelo de datos y los
contextos de módulos ya son obligatorios por la primera API pública.

## Estado de las decisiones

Distinguir siempre estas categorías:

- **Implementado:** existe evidencia ejecutable actual.
- **Aprobado, no implementado:** orienta el diseño, pero no puede presentarse como capacidad.
- **Diferido:** se resolverá antes de cruzar el umbral indicado.
- **Hipótesis:** requiere evidencia o decisión adicional.

La autenticación administrativa, el modelo persistente y el protocolo físico de baja de
artefactos OCR están diferidos. No deben resolverse por inferencia.

## Flujos críticos actuales

| Flujo | Invariante | Fuente | Verificación |
| --- | --- | --- | --- |
| Entrada local | `/` va a Nuxt y `/resources/` a Laravel | `docs/arquitectura.md` | `docs/procedimientos.md` |
| Datos locales | PostgreSQL usa el esquema `normatividad` | `docs/entorno.md` | configuración Laravel |
| Almacenamiento | Ambos NFS están montados en solo lectura | `docs/arquitectura.md` | Compose e inspección Docker |

## Contextos de módulos

| Módulo | Contexto |
| --- | --- |
| Catálogos | `backend/app/Modules/Catalogs/context.md` |
| Documentos | `backend/app/Modules/Documents/context.md` |
| Consulta pública documental frontend | `frontend/app/modules/documents/context.md` |
| Visor público frontend | `frontend/app/modules/viewer/context.md` |

## Instrucciones por capa

- Backend Laravel: `.github/instructions/backend.instructions.md`.
- Frontend Nuxt: `.github/instructions/frontend.instructions.md`.
- Infraestructura local: `.github/instructions/infrastructure.instructions.md`.

## Cierre de un cambio

El cierre debe identificar capacidades anteriores y posteriores, archivos modificados,
validaciones reales, resultados no evaluados y decisiones que todavía necesitan intervención
humana. Un validador en verde no reemplaza la revisión semántica.
