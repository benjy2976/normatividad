# Documentación del proyecto

## Estado general

- Proyecto: Normatividad.
- Propósito: portal público y futura administración del repositorio documental institucional.
- Etapa: desarrollo y pruebas.
- Producción: no; las rutas históricas de Munis continúan siendo las vigentes.
- Directiva de referencia: `N°02.S5.DI.SGMTD`, versión `1.0`.
- Modelo de documentación: organización por familias, alineada con
  `ocr-normatividad-integrador`.

## Artefactos y exigibilidad

| Familia | Artefacto | Estado | Observación |
| --- | --- | --- | --- |
| Proyecto | `proyecto.yml` | Parcial | Metadatos técnicos completos; hito institucional pendiente |
| Proyecto | `proyecto/ficha-proyecto.md` | OK técnico | Titularidad formal pendiente |
| Técnica | `documentacion-tecnica/ficha-tecnica-solucion.md` | OK técnico | Primera API pública documentada |
| Técnica | `arquitectura.md` | OK | Backend, frontend, proxy y almacenamientos |
| Técnica | `modelo-datos.md` | OK inicial | Siete entidades heredadas mapeadas |
| Técnica | `documentacion-tecnica/reglas-negocio.md` | OK inicial | Reglas RN-PUB-001 a RN-PUB-010 |
| Técnica | `documentacion-tecnica/decisiones/` | OK inicial | Dos decisiones registradas |
| Contratos | `../contracts/openapi-public.json` | OK inicial | API pública v1 |
| Seguridad | `documentacion-tecnica/seguridad/seguridad.md` | Parcial | Falta evaluación institucional de datos personales |
| Manuales | `entorno.md` y `procedimientos.md` | OK para desarrollo | Producción aún no diseñada |
| Pruebas | `pruebas-validaciones/verificacion-inicial.md` | OK inicial | Pruebas automatizadas aisladas de producción |
| Licenciamiento | `licenciamiento/README.md` | Pendiente | Inventario y determinación aún no realizados |
| Administrativa | Titularidad | Pendiente | Requiere designación de Sistemas/GORE Huánuco |
| Producción | Acta o informe de puesta en producción | No aplica aún | El proyecto no está desplegado |

## Bloqueantes para publicación

- Validación de la matriz exacta de artefactos contra el Anexo oficial usado por Sistemas.
- Titularidad y unidad responsable institucional.
- Evaluación formal de seguridad y tratamiento de datos personales.
- Rol PostgreSQL público de solo lectura.
- Diseño de entrega de archivos grandes y rate limiting.
- Plan, casos y resultados de prueba de aceptación sobre un ambiente no productivo.
- Configuración del proxy inverso para exponer exclusivamente la superficie pública.

## Fuentes técnicas vigentes

El índice operativo para agentes permanece en `guia_IA.md`. Este archivo administra el estado
institucional de los artefactos y no duplica sus contenidos.
