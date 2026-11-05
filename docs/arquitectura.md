# Arquitectura del proyecto

## Propósito

Normatividad será el portal público y, progresivamente, el sistema de administración del
repositorio documental institucional. El backend ya contiene la primera API pública de lectura;
el frontend implementa búsqueda convencional, ficha de metadatos y visor público. El proyecto no reemplaza
todavía ningún flujo de `munis`.

## Estado implementado

```text
Navegador
   |
   v
Nginx de desarrollo :8080
   |-- /resources/* --> Laravel :8000
   `-- /*            --> Nuxt :3000
                            |
Laravel --------------------+--> PostgreSQL / esquema normatividad
   |-- /mnt/regulations (exportación NFS de solo lectura)
       `-- regulations/regulations (raíz lógica usada por el backend local)
   `-- /mnt/ocr-cache  (solo lectura)
```

El proxy de desarrollo reproduce el reparto previsto en producción, pero no forma parte del
despliegue productivo. El proxy institucional será la única entrada pública.

## Stack

- Laravel 13 y PHP en `backend/`.
- Nuxt 4, Vue 3 y TypeScript en `frontend/`.
- Nginx y Docker Compose para desarrollo local.
- PostgreSQL, base `proyectos` y esquema `normatividad`.
- NFS de originales y caché OCR montados en solo lectura.

## Componentes

### Backend

`backend/` contiene Laravel 13 y PHP 8.3 o posterior. Expone el health check y recursos públicos
de catálogos, documentos, archivos y representaciones. Es un monolito modular que alojará tanto
la API pública como la administración autenticada futura.

La separación prevista es:

- `/v1/public/*`: recursos de lectura publicables;
- `/v1/management/*`: administración futura;
- `app/Modules/*`: cortes verticales de negocio cuando existan;
- `app/Shared/*`: infraestructura realmente transversal.

`/v1/public/*` y los módulos `Catalogs` y `Documents` son capacidades actuales. El espacio de
administración sigue siendo una decisión aprobada no implementada.

### Frontend

`frontend/` contiene Nuxt 4, Vue 3 y TypeScript. Su módulo `documents` implementa el buscador
público convencional, los accesos a archivos por icono y la ficha con metadatos y archivos por ID.
Las páginas coordinan el módulo y el
transporte centralizado consume exclusivamente la API pública; OpenAPI genera sus tipos.
Las consultas se ejecutan en el navegador a través del prefijo público del proxy; Nuxt renderiza
la estructura inicial sin solicitar datos mediante direcciones internas de Laravel.
La organización y los límites se detallan en `docs/frontend.md`. El módulo `viewer` implementa P8
para PDF, imágenes admitidas y descarga de formatos sin vista previa.
El listado consulta archivos y manifiestos al hacerse visible cada fila; los enlaces abren la
ruta pública del visor por ID. El visor obtiene la representación autorizada por Laravel,
sin introducir otra ruta de entrega.
La ficha reutiliza el componente documental de adjuntos en presentación ampliada y carga al montar,
con los mismos manifiestos y enlaces por ID. PDF.js presenta lectura continua en cliente,
con placeholders para todas las hojas y render de las próximas al área visible. Cada página
posee su canvas y capa de texto cancelables; workers y recursos se sirven localmente. Markdown
y JSONL declarados admiten una vista de texto acotada al seleccionarlos, sin interpretar HTML
ni sustituir automáticamente la representación predeterminada.
La administración futura vivirá bajo `/administracion`, sin estar expuesta por el proxy público.

`app.vue` configura Nuxt UI y compone el layout público con la página activa. El buscador y la
ficha comparten `layouts/public.vue`; `AppListPage`, `AppDataTable` y `AppPagination` concentran
composición de listados, estados y navegación. El módulo documental conserva las consultas y
la adaptación del contrato. El tema claro/oscuro se comparte mediante el módulo de color de
Nuxt UI y una cookie de preferencia. Organización y límites: `docs/frontend.md`; decisiones
visuales: `docs/diseno.md`. El visor compone `layouts/viewer.vue` con slots de herramientas y acciones
para reunir los controles y el contexto del archivo en una barra, sin footer ni consultas. El marco
`layouts/administration.vue` está implementado y se revisa en una muestra de desarrollo; la
administración funcional y su autenticación siguen diferidas. Portal y administración usan
`SiteBrand`; el visor prioriza las herramientas y el archivo.
Esta composición no introduce sesión ni cambios en el contrato HTTP. Las rutas `/muestras`
se registran solo en Nuxt dev y quedan fuera del artefacto de producción; sus datos son sintéticos.

### Infraestructura de desarrollo

`compose.yml` inicia backend, frontend y proxy. Se conecta a la red externa de PostgreSQL y
monta dos volúmenes Docker externos. No ejecuta migraciones automáticamente. Es el único Compose
del repositorio y define el entorno de desarrollo; se dividirá cuando exista un segundo entorno.

Composer usa la identidad del desarrollador; el servidor Laravel usa `www-data` para respetar la
propiedad real del NFS sin modificar permisos ni ejecutar la aplicación como root.

## Fronteras de publicación

El dominio público solo deberá publicar:

- el frontend bajo `/`;
- la API pública bajo `/resources/v1/public/*`;
- health checks explícitamente aprobados.

Las rutas de administración no se protegen únicamente con autenticación: además deben quedar
fuera de la superficie del proxy público. El dominio interno podrá exponerlas cuando se defina
su autenticación.

## Flujo global

Una petición pública entra por el proxy institucional. Las rutas de interfaz se entregan a Nuxt
y las rutas `/resources/v1/public/*` a Laravel. Laravel valida publicación y autorización antes
de consultar PostgreSQL o preparar una entrega interna de archivos. El navegador nunca recibe
paths de NFS ni consulta directamente el almacenamiento.

La API actual ejecuta este flujo:

```text
Ruta pública
  -> Form Request
  -> Query de lectura
  -> modelo heredado PostgreSQL
  -> API Resource

Representación física
  -> documento publicado y pertenencia del archivo
  -> original presente
  -> artefacto moderno activo y presente, si corresponde
  -> respuesta controlada sin path físico
```

## Propiedad del almacenamiento

El documento original pertenece al repositorio de Normatividad. Los artefactos derivados de OCR
son caché y el integrador OCR es su única autoridad de generación y modificación.

El backend de Normatividad puede consultar disponibilidad y registrar una baja. No puede crear,
reemplazar, renombrar ni reconstruir artefactos. La ejecución física de una eliminación se
diseñará antes de implementar la baja; la opción preferida es solicitarla al integrador para
conservar un único escritor del caché.

Si el original no existe, ninguna representación derivada es confiable y no debe entregarse.
Un documento no publicado o fuera del ámbito autorizado responde `404` externamente.

## Evolución desde Munis

La migración seguirá un patrón de estrangulamiento por capacidad:

1. inventariar el comportamiento y contrato vigente en `munis`;
2. implementar lectura equivalente y comparar resultados;
3. elegir un único escritor canónico;
4. mantener compatibilidad o delegación desde `munis`;
5. retirar el flujo anterior solo después de verificar consumidores.

No se permiten escrituras dobles silenciosas. Las rutas históricas permanecerán compatibles o
redirigirán de manera explícita cuando se planifique su migración.

## Decisiones diferidas

- Autenticación y sesión de administración.
- Modelo de datos y ownership de migraciones sobre el esquema existente.
- Protocolo de baja física de artefactos OCR.
- Separación futura del frontend administrativo en otro despliegue, si el riesgo lo exige.
- Entrega interna de archivos grandes mediante Nginx.
- Rate limiting y política de caché definitivos.
- Búsqueda OCR independiente y su control de privacidad.
