# Contexto del módulo: Documentos

## Propósito y límites

El módulo publica metadatos de documentos, sus archivos exactos y las representaciones físicas
confiables. No modifica documentos, no ejecuta OCR y no escribe en los NFS.

## Glosario

| Término funcional | Nombre técnico | Persistencia |
| --- | --- | --- |
| Documento | `Document` | `regulations` |
| Archivo | `DocumentFile` | `regulation_files` |
| Estado OCR | `DocumentOcrState` | `regulation_file_ocrs` |
| Artefacto OCR | `OcrArtifact` | `regulation_file_ocr_artifacts` |
| Representación | `RepresentationType` | Proyección HTTP de un original o artefacto |

## Actores y permisos

- El público solo puede consultar documentos con `reg_status = 1`.
- Un documento no publicado, un archivo ajeno al documento o una representación no confiable
  responden `404` para no revelar existencia ni relaciones internas.
- No hay sesión ni rutas administrativas en este módulo.

## Reglas

- El archivo original es la raíz de confianza. Si no existe físicamente, no se entrega ningún
  artefacto derivado.
- La disponibilidad OCR se obtiene únicamente de un registro `active` en
  `regulation_file_ocr_artifacts` y de la existencia física del archivo.
- `regulation_file_ocrs` aporta estado y cantidad de páginas, pero no es un fallback para servir
  artefactos.
- El integrador OCR es el único escritor de artefactos derivados.
- El PDF searchable es la representación predeterminada cuando existe; de lo contrario lo es el
  original. JSONL y Markdown nunca son la vista predeterminada.
- Cuando el PDF searchable reutiliza el original, el manifiesto no ofrece dos entradas para el
  mismo binario.

## Flujo

1. El listado filtra metadatos en PostgreSQL y solo incluye documentos publicados.
2. El detalle de archivo exige pertenencia exacta `documento → archivo`.
3. El resolver verifica primero el original y después el artefacto activo solicitado.
4. La respuesta física no expone el path del NFS.

La búsqueda OCR completa está aprobada como ruta independiente, pero no está implementada ni
enlazada en esta etapa.

## Datos y relaciones

Ver `docs/modelo-datos.md`. El ID de archivo es la identidad canónica nueva porque la combinación
histórica documento–tomo–tipo presenta duplicados.

## Integraciones y fallos

- PostgreSQL aporta metadatos y disponibilidad registrada.
- Los discos Laravel `regulations` y `ocr_cache` apuntan a montajes de solo lectura.
- Una ruta vacía, absoluta o con `..` se rechaza antes de consultar el almacenamiento.

## Evidencia y validación

- `backend/tests/Feature/PublicNormatividadApiTest.php` cubre publicación, pertenencia, manifiesto,
  artefactos activos y ausencia del original.
- `contracts/openapi-public.json` describe las operaciones públicas.

## Pendientes explícitos

- Definir y probar entrega interna mediante Nginx para archivos grandes antes de producción.
- Definir rate limiting y caché públicos antes de publicar el dominio.
- Implementar la búsqueda OCR como capacidad separada y evaluar su riesgo de datos personales.
