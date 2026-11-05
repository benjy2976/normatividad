# Ficha del proyecto

## Identificación

- Nombre: Normatividad.
- Entidad: Gobierno Regional de Huánuco.
- Modalidad: desarrollo interno.
- Estado: desarrollo y pruebas; no sustituye todavía a Munis.
- Dominio planificado: `normatividad.regionhuanuco.gob.pe`.

## Finalidad

Publicar documentos institucionales mediante enlaces estables y evolucionar progresivamente
hacia una administración independiente del módulo heredado. La solución incluye un frontend
público Nuxt y un backend Laravel, separados en ejecución y reunidos en un monorepositorio.

## Alcance actual

- API pública de catálogos, documentos, archivos y representaciones.
- Lectura del esquema heredado `normatividad`.
- Acceso de solo lectura a originales y caché OCR.
- Contrato OpenAPI y pruebas automatizadas aisladas.

No incluye todavía interfaz pública funcional, sesión, administración, búsqueda OCR, mutaciones,
migraciones, despliegue Kubernetes ni sustitución de enlaces históricos.

## Responsabilidades pendientes

La unidad responsable, titular técnico institucional y responsables de seguridad deben ser
designados por GORE Huánuco antes de la publicación. Los autores técnicos registrados por Git no
equivalen a una designación institucional.
