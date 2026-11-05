# 0002. Registro moderno como fuente pública de artefactos

- Estado: aceptada e implementada.
- Fecha: 2026-10-30.

## Contexto

Munis conserva indicadores heredados en `regulation_file_ocrs` y un registro moderno versionado
en `regulation_file_ocr_artifacts`. La inspección encontró 20 indicadores PDF y 19 de texto sin
registro moderno, pero todos pertenecen a archivos padres ya ausentes.

## Decisión

- Publicar solamente artefactos modernos con estado `active`.
- Exigir siempre la existencia física del original y del derivado.
- Usar el estado OCR heredado únicamente para metadatos como cantidad de páginas.
- No incorporar fallback de disponibilidad heredada en el backend nuevo.

## Consecuencias

El contrato público tiene una única fuente de disponibilidad y no puede revivir artefactos de
archivos eliminados. Munis conserva su compatibilidad interna sin que este proyecto la replique.
