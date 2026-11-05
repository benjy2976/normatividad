# Convenciones del proyecto

## Lenguaje y nombres

- URLs, textos públicos y conceptos funcionales se expresan en español.
- PHP, TypeScript, clases, funciones y variables se nombran en inglés.
- Los campos JSON usan `camelCase`.
- Cada módulo documentará un glosario cuando el nombre funcional y el técnico difieran.
- Los nombres deben expresar responsabilidad; no se crean capas o interfaces ceremoniales.

## Diseño HTTP orientado a recursos

Toda operación se clasifica antes de implementarse como recurso canónico, subrecurso, relación,
proyección, consulta calculada o acción personalizada. `docs/api.md` registra propietario,
acceso, ruta canónica, CRUD aplicable, errores y compatibilidad.

Se prefieren recursos y estados sobre verbos de acción. Por ejemplo, iniciar OCR se modelará
como creación de un procesamiento, no como una ruta `reprocesar`, salvo justificación explícita.

Las respuestas externas no revelan si existe un documento no autorizado. Un recurso ausente,
no publicado o fuera de ámbito usa `404`. Los errores JSON tendrán una forma común cuando se
implemente la primera familia de API.

## Backend Laravel

- Controladores delgados coordinan requests, acciones y resources.
- Form Requests validan entrada; API Resources construyen salida.
- Actions representan casos de uso y fronteras transaccionales.
- Policies deciden autorización; el frontend nunca es la autoridad.
- Queries encapsulan lecturas complejas o proyecciones.
- No se crea una interfaz Repository sin una segunda implementación o frontera real.
- Las tablas heredadas se mapearán explícitamente antes de escribir sobre ellas.
- Las migraciones no se ejecutan al arrancar contenedores.

## Frontend Nuxt

- Los criterios visuales y patrones de pantalla viven en `docs/diseno.md`; se leen antes de
  diseñar una vista y no se duplican en los contextos de módulos.
- `pages` coordina rutas; no se añade una carpeta paralela `views`.
- La lógica funcional vive junto a su módulo en `app/modules`.
- Un componente pasa a `app/components/ui` solo si desconoce ruta y dominio consumidor.
- El transporte HTTP se centraliza; no se dispersan llamadas `$fetch` por componentes.
- Los contratos TypeScript se generarán desde OpenAPI cuando exista la primera API funcional.
- Markdown y cualquier contenido no confiable se sanitizan antes de renderizarse.

## Estado del cliente

Pinia será el gestor común, no un almacén único de todos los datos:

- la URL conserva filtros, página y representación compartibles;
- `useFetch` o `useAsyncData` conserva datos remotos;
- stores de módulo conservan flujos entre componentes o rutas;
- stores raíz conservan únicamente estado transversal;
- `ref` local conserva estado visual efímero.

No se añade TanStack Query mientras las capacidades nativas de Nuxt sean suficientes. Las
mutaciones invalidarán únicamente los datos relacionados y las operaciones sensibles no usarán
actualizaciones optimistas sin un contrato específico.

## Calidad

El formato frontend se aplica con ESLint y su configuración local; la preparación del IDE y
las dependencias se documentan en [procedimientos.md](procedimientos.md#frontend).
Se usan dos espacios, alineación de dos puntos en objetos multilínea y las reglas de plantilla
Vue declaradas en `frontend/eslint.config.mjs`. El código generado queda excluido. Los agentes
deben conservar este estilo, sin reemplazarlo por preferencias propias ni debilitar reglas de
errores o tipos al incorporar reglas de formato.

Cada cambio funcional necesita la prueba automatizada más cercana y actualiza la memoria cuyo
umbral cruce. Los formatters corrigen estilo; las pruebas demuestran comportamiento. No se
presenta una compilación correcta como prueba de autorización, persistencia o negocio.

## Administración futura: estado y concurrencia

Políticas aprobadas para aplicar al implementar administración; no describen funciones actuales:

- Aislar las cachés de datos privados por identidad y ámbito autorizado, nunca por el token
  secreto. Vaciar stores y cachés privados al cerrar sesión, cambiar de identidad o recibir
  `401`; la autenticación concreta sigue diferida.
- No confirmar visualmente de forma optimista cambios de permisos, aprobación o publicación.
  Esperar la decisión del backend y actualizar únicamente las consultas relacionadas.
- Ante un conflicto `409`, conservar el borrador, explicar el conflicto y ofrecer recargar o
  conciliar; no sobrescribir silenciosamente. Esto no incorpora un `409` al contrato actual.
- Definir control de versiones e idempotencia con el contrato de cada escritura cuando exista.
  El frontend no inventa campos, cabeceras ni endpoints para anticiparlos.
