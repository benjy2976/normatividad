# Verificación inicial de la API pública

## Alcance

La verificación automatizada usa SQLite en memoria y discos Laravel falsos. No consulta ni
modifica PostgreSQL, originales NFS ni caché OCR real.

## Casos cubiertos

- Catálogos públicos excluyen tipos y procesos ocultos o inactivos.
- Listado documental excluye documentos no publicados y acepta filtros de metadatos.
- Un detalle no publicado responde `404`.
- Un archivo exige pertenencia al documento indicado.
- El manifiesto usa exclusivamente artefactos modernos activos.
- El PDF searchable es predeterminado cuando está disponible.
- Un artefacto reemplazado no se publica.
- Sin original no se entrega ningún derivado.

## Comando

```bash
cd backend
vendor/bin/phpunit --filter=PublicNormatividadApiTest
```

## Resultado automatizado

El 2026-10-30 a las 16:13 (-05) se ejecutó la suite completa con SQLite en memoria: 6 pruebas
y 33 aserciones, sin fallos. La prueba funcional específica aporta 4 pruebas y 31 aserciones.

También se verificaron con resultado satisfactorio el formato Pint, `composer validate`, las 11
rutas públicas, la sintaxis de OpenAPI, Compose, Nginx, Markdownlint y el validador global de
memoria viva. Este último no encontró errores ni advertencias; mantiene como `NOT_EVALUATED` la
revisión semántica humana prevista por el propio estándar.

## Verificación de integración local

Con autorización expresa se consultó una muestra pública real y se verificó, sin modificarla:

- conexión de lectura al esquema PostgreSQL `normatividad`;
- original legible desde el volumen NFS de solo lectura;
- manifiesto con PDF searchable, original y JSONL físicamente disponibles;
- entrega del original con estado `200` y `Content-Type: application/pdf`;
- ejecución del backend con UID/GID 33, compatible con los permisos del NFS.

No se conservaron contenidos documentales ni se incorporaron identificadores de la muestra a
las pruebas o a la documentación.

## Cobertura pendiente

- Archivos grandes, rangos HTTP y entrega interna de Nginx.
- Carga, concurrencia y rate limiting.
- Búsqueda OCR.
- Sesión y administración.
- Pruebas de aceptación del frontend.
