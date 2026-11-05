# Seguridad y datos personales

## Clasificación inicial

Los documentos pueden contener datos personales en su contenido y en el texto OCR. El proyecto
se clasifica provisionalmente con `personal_data: true`. Esta clasificación exige revisión
institucional antes de publicar búsquedas de contenido completo.

## Controles implementados

- Solo se consultan documentos publicados.
- Un recurso oculto, inexistente o no relacionado responde `404`.
- No se exponen rutas de almacenamiento.
- Se rechazan paths absolutos, vacíos o con segmentos `..`.
- El original debe existir antes de entregar un derivado.
- Los NFS están montados en solo lectura.
- PHPUnit usa SQLite en memoria y no la conexión PostgreSQL del contenedor.

## Riesgos pendientes

- La búsqueda OCR puede revelar datos personales dentro de documentos legítimamente publicados.
- La conexión local PostgreSQL posee permisos de escritura aunque la aplicación actual solo lee.
- Falta rate limiting específico para listados, búsquedas y descargas.
- La respuesta directa de PHP no es la estrategia final para archivos grandes.
- Falta definir autenticación, sesión, auditoría y segregación de funciones administrativas.

## Controles requeridos antes de producción

1. Revisión de seguridad y privacidad por el responsable institucional.
2. Rol PostgreSQL exclusivo de lectura para la API pública.
3. Configuración del proxy que no exponga `/v1/management/*`.
4. Límites de tasa, cabeceras y política de caché aprobados.
5. Entrega interna de archivos mediante Nginx o mecanismo equivalente probado.
6. Decisión formal sobre acceso a la futura búsqueda OCR.
