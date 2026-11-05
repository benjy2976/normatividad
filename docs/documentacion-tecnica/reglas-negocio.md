# Reglas de negocio de la publicación documental

| ID | Regla | Evidencia ejecutable |
| --- | --- | --- |
| RN-PUB-001 | Solo se listan y muestran documentos con `reg_status = 1`. | `PublicDocumentQuery` |
| RN-PUB-002 | Tipos y siglas públicas respetan sus indicadores de portal; procesos públicos deben estar activos. | `PublicCatalogQuery` |
| RN-PUB-003 | Tipo y proceso son catálogos independientes; la tabla pivote heredada no se usa. | Contexto de Catálogos |
| RN-PUB-004 | Un recurso no publicado, no relacionado o no confiable responde `404`. | Controladores públicos y pruebas |
| RN-PUB-005 | El original es la raíz de confianza; sin original no se entregan derivados. | `DocumentRepresentationResolver` |
| RN-PUB-006 | Solo un artefacto moderno activo y físicamente existente se publica. | `DocumentRepresentationResolver` |
| RN-PUB-007 | PDF searchable es la vista predeterminada cuando existe; JSONL y Markdown nunca lo son. | Manifiesto de representaciones |
| RN-PUB-008 | El backend público no escribe artefactos OCR ni expone rutas físicas. | Configuración y resolver |
| RN-PUB-009 | La identidad canónica nueva del archivo es su ID, no tomo y tipo. | Rutas y modelo de datos |
| RN-PUB-010 | Los nombres funcionales del JSON son españoles en `camelCase`; identificadores OCR conservan su nombre técnico. | API Resources y OpenAPI |

## Decisiones diferidas

- Una sesión administrativa podrá consultar catálogos completos mediante rutas de administración;
  no se modifica condicionalmente la respuesta pública en esta etapa.
- La búsqueda OCR será una ruta separada, no enlazada desde el portal convencional. No está
  implementada todavía y requerirá controles específicos de privacidad y tasa.
- La entrega optimizada de archivos grandes mediante Nginx se resolverá antes de producción.
