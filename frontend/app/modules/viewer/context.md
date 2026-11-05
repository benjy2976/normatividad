# Contexto del módulo: Visor público

## Propósito y frontera

Posee la lectura de un archivo exacto en `/documentos/{documento}/archivos/{archivo}`. Reutiliza
el transporte de `documents` y el [contrato público](../../../../docs/api.md). No consulta NFS,
no decide publicación ni crea una segunda API. El visitante no necesita sesión.

El módulo documental conserva búsqueda, ficha, archivos y manifiestos. Este módulo adapta el
manifiesto a una vista y gobierna la navegación dentro del archivo, sin mutaciones.

## Actores y permisos

El visitante consulta sin sesión. Laravel decide publicación, pertenencia y confianza; el visor
no concede permisos ni diferencia recursos ocultos de inexistentes. No hay escrituras.

## Reglas y estados

- Documento y archivo se consultan por sus IDs positivos y seguros. El archivo debe coincidir
  con ambos IDs, y el documento devuelto debe coincidir con el padre solicitado.
- Se ofrecen las cuatro representaciones declaradas en un manifiesto confiable: `original`,
  `pdf-searchable`, `markdown` y `jsonl`. La elección inicial respeta `defaultRepresentation`
  exclusivamente original o PDF; una solicitud explícita ausente no se sustituye silenciosamente.
  JSONL y Markdown solo se cargan al elegirlos, nunca como opción inicial ni fallback.
- `representacion` y `pagina` pertenecen a la URL. Cambiar versión vuelve a la primera página;
  anterior, siguiente, Enter en el campo, recarga e historial conservan navegación compartible.
  El scroll continuo actualiza página mediante `replace`, sin añadir entradas al historial;
  la navegación explícita usa `push`. Un cambio por scroll no vuelve a desplazar la hoja.
  Entradas repetidas, páginas no positivas o no seguras y versiones ajenas muestran error local.
- Un archivo ausente, no publicable, ajeno al documento o sin confianza comparte el estado de
  archivo no disponible. Los fallos transitorios permiten reintentar sin exponer trazas.
- La representación `pdf-searchable` y los originales PDF se leen con PDF.js, cargado solo
  en el cliente. Todas las hojas tienen un lugar consecutivo; solo las próximas al viewport
  (una altura adicional a cada lado) mantienen canvas y texto seleccionable. El resto usa
  placeholders del tamaño inicial, ajustados al consultar las dimensiones reales de cada hoja.
  Las páginas fuera de rango ofrecen volver a la primera. Un PDF ilegible permite reintento
  y descarga; un fallo de render tiene reintento por página sin ocultar las demás.
- La carga inicial del PDF se interrumpe tras 45 segundos sin progreso. Navegar a otro archivo
  destruye la tarea anterior; abandonar una hoja, cambiar ancho o zoom cancela su render.
  El presupuesto de los canvas cercanos es de 32 millones de píxeles en conjunto, hasta
  16 millones por hoja y 32767 píxeles por dimensión. Las hojas que intersectan el viewport
  solicitan densidad de render igual al mayor entre 2 y el DPR real, dentro del presupuesto.
  Las vecinas solicitan densidad 1 y se vuelven a renderizar al entrar en pantalla. No limita
  los datos internos de PDF.js ni certifica archivos grandes. Los metadatos de cada hoja se
  consultan cuando se aproxima a la vista.
- JPEG, PNG, WebP y GIF se muestran como imagen. Los otros formatos ofrecen descarga explícita;
  HTML, SVG y TIFF no se incrustan. No se ejecutan scripts del documento ni HTML de sus nombres.
- JSONL muestra una sola página OCR. El formato observado es un objeto documental con
  `page_count`, `metadata` y `pages: [{ page, text, char_count, word_count, empty }]`; no se
  interpreta cada línea como una página. El parser incremental selecciona `pages.*` y descarta
  hermanos y metadatos raíz. El número visible comienza en 1; si la primera página declara
  `page: 0`, se adapta la selección sin cambiar el JSON original mostrado o copiado.
- La navegación JSON usa `pagina` en URL, anterior/siguiente y Enter. CodeMirror presenta solo
  el objeto seleccionado, con sangría, colores, números de línea, plegado y selección; no permite
  editar. Copiar devuelve ese JSON completo y formateado, sin las otras páginas ni metadatos raíz.
  Página ausente, JSON ilegible y límites tienen estados explícitos; no se presenta JSON truncado
  como válido. No se incluye un total inventado si falta el conteo del artefacto y del manifiesto.
- La API sigue entregando un archivo completo: cada consulta JSON recorre el stream desde el
  inicio y cancela al completar la página elegida. No conserva páginas anteriores ni descarga
  representaciones no elegidas. Limita el recorrido a 32 MiB y el JSON formateado a 2 MiB por
  página. Estos límites acotan lectura y presentación, no certifican memoria constante para un
  token enorme o estructuras maliciosas. Llegar a páginas tardías puede agotar el presupuesto;
  se ofrece descarga completa, sin inventar una paginación HTTP ni usar rangos no contratados.
- Markdown inicia en vista renderizada con títulos, párrafos, saltos, énfasis, listas, tablas y
  código. `markdown-it` deshabilita HTML e imágenes; DOMPurify aplica una lista permitida de
  etiquetas y atributos antes de insertar HTML. No admite scripts, estilos, imágenes remotas,
  iframes, SVG ni URLs ejecutables. Los enlaces seguros siguen siendo acciones explícitas.
  «Código MD» muestra la fuente escapada; alternar no repite la petición. «Copiar MD» copia la
  fuente, incluso desde la vista renderizada. La vista previa conserva 2 MiB; si se corta, un aviso
  indica que la copia corresponde al fragmento y remite a descargar el archivo completo.
- Las lecturas de texto tienen límite de 15 segundos y se cancelan al abandonar o cambiar página.
  Vacío y error tienen estados explícitos; el error permite reintento. El portapapeles se usa solo
  tras pulsar Copiar. Si falta permiso o contexto seguro, se ofrece un campo de solo lectura con
  el texto seleccionado para copia manual; no se simula éxito ni se envía contenido a terceros.
- La descarga utiliza `disposition=attachment` del contrato existente. PDF e imágenes admitidos
  también ofrecen apertura directa en otra pestaña con `noopener noreferrer`.
- Las lecturas de metadatos conservan el límite de 15 segundos y cancelación del transporte
  documental. Página y versión no vuelven a consultar metadatos del mismo archivo.
- El zoom es estado visual local e inicia en 75 % al abrir o cambiar de representación.
  El render convierte puntos PDF (72 por pulgada) a píxeles CSS (96 por pulgada) una sola vez:
  escala de render = zoom × 96/72. El porcentaje de los controles y la rueda usa la conversión
  inversa, también al salir del ajuste al ancho. El DPR solo define la resolución del canvas;
  no cambia el porcentaje de zoom. Geometría, canvas y capa de texto comparten dimensiones
  ajustadas a pasos de 1/DPR; el ajuste es menor que un píxel físico. El transform de render
  se calcula desde los tamaños reales asignados al canvas y a CSS, sin estirar un bitmap de
  tamaño redondeado sobre una dimensión CSS arbitraria. El centrado usa el mismo paso.
  Cambiar densidad por zoom del navegador o pantalla actualiza la geometría y el render;
  los listeners de densidad y tamaño se retiran al desmontar.
  Selector, botones y `Ctrl`/`Cmd` + rueda comparten una escala
  manual entre 25 % y 500 %. Ajustar al ancho conserva su cálculo independiente. La rueda
  normal desplaza el documento. Se normalizan deltas de píxeles, líneas y páginas, incluidos
  deltas pequeños de trackpad. La captura no pasiva se limita a la superficie PDF y se retira
  al desmontar el lector; fuera de ella no se intercepta el zoom del navegador.
- Al cambiar escala se conserva el punto bajo el cursor; los controles usan el centro visible.
  Se aplica el desplazamiento tras actualizar dimensiones y antes de renderizar. Los bordes
  pueden limitar esa conservación. La navegación explícita a otra hoja descarta el ancla anterior;
  el scroll conserva su posición.
- No se añade Pinia ni se duplican las respuestas en un store.

## Flujo y componentes

1. `pages/documentos/[documento]/archivos/[archivo].vue` coordina IDs, metadatos, URL y estados.
   El enlace «Ficha» abre `/documentos/{documento}` para consultar descripción y metadatos,
   incluso al entrar directamente al visor; no retrocede por el historial del navegador.
2. `utils/selection.ts` valida parámetros y decide disponibilidad y formato desde el manifiesto.
3. `PdfTools.vue` presenta los controles de página y zoom sin conocer transporte ni rutas.
4. `PdfReader.client.vue` posee carga PDF, worker, ventana de render y navegación del scroll;
   `PdfPage.client.vue` posee el render cancelable y capa de texto por hoja. Reciben URL o PDF
   validados, sin conocer permisos, NFS ni catálogos. `utils/pages.ts` calcula geometría y rango;
   `utils/raster.ts` centraliza alineación, densidad y presupuesto del canvas.
5. `TextArtifact.client.vue` coordina lectura acotada, fuente/renderizado y copia. El servicio
   `textArtifact.ts` posee transporte y selección incremental; `utils/markdown.ts` concentra
   parser y sanitización. `JsonCode.client.vue` adapta CodeMirror de solo lectura. `TextTools.vue`
   presenta navegación, alternancia y copia en el slot existente de herramientas del coordinador.
6. `layouts/viewer.vue` aporta el marco sin footer y slots de herramientas y acciones; diseño y densidad
   viven en [diseno.md](../../../../docs/diseno.md); organización en
   [frontend.md](../../../../docs/frontend.md).

## Validación y límites

Pruebas unitarias cubren parámetros, pertenencia, confianza, selección y formatos incrustables.
Las pruebas de navegador renderizan PDF sintéticos de dos y veinte páginas y cubren scroll
continuo, render cercano, alineación, densidad de hojas visibles, barra única, zoom, historial,
artefactos, descarga, errores, teclado y reflujo. Las pruebas de texto cubren página JSON única,
URL e historial, descarga completa, copia automática y manual, Markdown renderizado/fuente,
sanitización y ausencia de cargas remotas. Las unitarias comprueban estructura OCR sintética,
cancelación temprana, UTF-8, límites y contenido malicioso. Interceptan todas las lecturas públicas.

No se acredita integración real PostgreSQL/NFS, lectores de pantalla, zoom nativo, documentos
grandes ni rangos HTTP. La entrega optimizada mediante Nginx y su aceptación productiva siguen
pendientes. Los comandos viven en [procedimientos.md](../../../../docs/procedimientos.md).
