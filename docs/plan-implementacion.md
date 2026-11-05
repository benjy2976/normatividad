# Plan de implementación

Estado de referencia: 2026-10-30, reanudación de P7.

El responsable reanudó explícitamente P7. El estado previo y las precondiciones de reanudación
se conservan en `docs/traspaso-suspension-2026-10-30.md`, como acta histórica.

## Estados

- **Completado:** código, contrato y validación disponibles en el repositorio.
- **Listo para iniciar:** dependencias técnicas resueltas; no exige una decisión previa.
- **Pendiente de decisión:** requiere una definición del responsable funcional o institucional.
- **Pendiente externo:** necesita una actuación fuera de este repositorio.
- **Implementado, pendiente de aceptación:** código disponible; falta revisión funcional del
  responsable para dar por aceptada la pantalla pública.

## Hoja de ruta

| ID | Bloque | Estado | Depende de | Intervención necesaria |
| --- | --- | --- | --- | --- |
| P0 | Base Laravel, Nuxt, proxy local y memoria viva | Completado | Ninguna | Ninguna |
| P1 | Mapeo de lectura del esquema heredado | Completado | P0 | Ninguna |
| P2 | API pública de tipos, siglas y procesos | Completado | P1 | Ninguna |
| P3 | API pública de documentos y filtros de metadatos | Completado | P1, P2 | Ninguna |
| P4 | API de archivos y representaciones confiables | Completado | P1, P3 | Ninguna |
| P5 | OpenAPI, reglas, decisiones y pruebas aisladas | Completado | P2, P3, P4 | Ninguna |
| P6 | Verificación local con PostgreSQL y NFS en solo lectura | Completado | P4, volúmenes locales | Ninguna; los volúmenes permanecen fuera de Git |
| P7 | Buscador público convencional en Nuxt | Implementado, pendiente de aceptación | P2, P3 | Revisar pantalla, filtros, paginación y ficha de metadatos; ver `frontend/app/modules/documents/context.md` |
| P8 | Vista de documento y visor de representaciones | Implementado, pendiente de aceptación | P4, P7 | Ficha y visor público de PDF e imágenes; descarga de otros formatos. Antes de producción, validar archivos grandes y rangos HTTP |
| P9 | Búsqueda OCR independiente y no enlazada | Pendiente de decisión | P3, política de privacidad | Definir acceso real; conocer una URL no constituye control de acceso |
| P10 | Sesión y administración completa | Pendiente de decisión | Reglas de negocio administrativas | Definir proveedor de identidad, roles, permisos y primeros casos de escritura |
| P11 | Preparación y publicación productiva | Pendiente externo | P5, P7, P8 y controles institucionales | DBA: rol de solo lectura; Sistemas: proxy, seguridad, titularidad, pruebas de aceptación y anexos |
| P12 | Migración gradual desde Munis | Pendiente de decisión | P10, equivalencia funcional comprobada | Elegir por capacidad qué rutas conservar, redirigir o retirar; no romper enlaces históricos |

## Secuencia inmediata recomendada

1. Aceptar funcionalmente P7, que consume exclusivamente el contrato público versionado.
2. Aceptar P8: visor público por ID, sin rutas físicas y con original como raíz de confianza.
3. Probar aceptación local y archivos grandes antes de cerrar el diseño de entrega productiva.
4. Resolver P9 y P10 como iniciativas separadas; ninguna bloquea el portal público convencional.
5. Ejecutar P11 cuando el frontend público esté aceptado y los responsables externos completen
   sus controles.

## Límites vigentes

- Las rutas históricas de Munis continúan funcionando y no fueron modificadas.
- El backend nuevo no escribe en PostgreSQL ni en los NFS durante esta etapa.
- Los artefactos OCR solo son modificados por el integrador; este backend únicamente los lee y,
  en una futura administración aprobada, podrá solicitar su baja o eliminación.
- La relación heredada tipo–proceso queda abandonada hasta un rediseño explícito.

El layout administrativo y las muestras de componentes fueron autorizados el 2026-11-03 para
revisión visual exclusiva en desarrollo. No completan P10: sesión, permisos y escrituras siguen
pendientes de decisión. La implementación se describe en `docs/frontend.md`.
