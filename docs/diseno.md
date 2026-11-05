# Lineamientos de diseño de Normatividad

## Propósito, autoridad y estado

Fuente única de criterios visuales, densidad, componentes y patrones de pantalla para el portal
público y la futura administración. Todo agente debe leerla antes de diseñar o cambiar una vista.
La organización de archivos pertenece a [frontend.md](frontend.md); las reglas funcionales
pertenecen al `context.md` del módulo. Esta guía no decide permisos ni contratos HTTP.

Fecha de la línea base: 2026-10-30. El responsable solicita uniformidad visual, mayor uso del
espacio en listados y marcos distintos para consulta pública y administración.

| Decisión | Estado | Aplicación |
| --- | --- | --- |
| Nuxt 4, Vue 3 y TypeScript | Implementado | Se conserva el stack de aplicación |
| Nuxt UI 4 y Tailwind CSS 4 | Implementado | Biblioteca común; estilos semánticos locales y selects nativos donde conviene |
| Densidad del buscador público | Implementada el 2026-11-02 | Encabezado breve, panel único y resultados a ancho fluido |
| Layout público y tabla reutilizable | Implementados | Buscador y ficha comparten marco; visor público y muestra administrativa implementados |
| Componentes reutilizables locales | Implementados; adopción incremental | Listado, tabla, paginación y selector de tema; sin paquetes `@cambio-peru` |
| Claro por defecto y oscuro opcional | Implementado, autorizado el 2026-11-02 | Preferencia compartida y recordada entre visitas |
| Identidad gráfica oficial | Pendiente de insumos institucionales | La paleta y la marca tipográfica actuales son una base de trabajo |

Los estados anteriores distinguen capacidades implementadas y futuras. Las medidas siguientes
definen el criterio compartido; su validación no sustituye la aceptación visual del responsable.
Conservar el kit adoptado y los tokens comunes. No escoger una biblioteca, una paleta o un marco
nuevo para cada pantalla.

## Dirección visual

Producto institucional para localizar, leer y gestionar documentos. Priorizar información,
legibilidad y operaciones reconocibles.

- Los listados usan el ancho disponible y una jerarquía compacta. El título identifica la tarea;
  no ocupa una sección de portada con texto promocional.
- Una superficie agrupa la tabla. Evitar una tarjeta, borde redondeado y sombra por fila.
  Reservar tarjetas para bloques independientes o resúmenes que realmente lo requieran.
- Un acento principal, neutrales y colores semánticos de estado. No asignar colores arbitrarios
  a cada módulo ni usar el color como única señal.
- Portal y administración comparten identidad, tipografía y controles. Cambian navegación,
  densidad y acciones según la tarea.
- Sin gradientes decorativos, ilustraciones de relleno, sombras grandes ni animaciones de entrada
  en pantallas operativas. Respetar la preferencia de movimiento reducido.

## Kit de componentes

Nuxt es el framework de aplicación; Vue construye los componentes. Nuxt UI 4, basado en Reka UI
y Tailwind CSS 4, es la biblioteca visual adoptada. El kit reutilizable es **local a Normatividad**,
con tokens y variantes compartidas, sin convertirlo en un paquete para otros servicios.
Los selects de catálogos, años, orden y tamaño conservan interacción nativa y consumen los mismos
tokens; botones, búsqueda y tabla utilizan Nuxt UI. No introducir otro kit por módulo.

La referencia de Voice aporta las ideas de composición, consistencia y reutilización; no su
implementación ni sus dependencias. No incorporar `@cambio-peru/ui`, creado para ese ecosistema,
ni `@cambio-peru/vue-table`. La tabla se adapta a Nuxt y al contrato de Normatividad.

La adopción fue autorizada después de evaluar el alcance completo. `app.config.ts` centraliza
variantes de Nuxt UI y `app/assets/main.css` contiene tokens y comportamiento responsive.
Un cambio futuro de kit requiere decisión explícita, evaluación de compatibilidad y actualización
de esta guía. La biblioteca no cambia el formato ESLint ni sustituye la revisión de accesibilidad.

Reglas del kit local:

- Reutilizar componente y variante existentes. Una necesidad compartida puede crear una variante
  central; evitar sobrescrituras por página que produzcan otro estilo de botón.
- Las piezas genéricas desconocen rutas, documentos y permisos. La apertura de un archivo y su
  disponibilidad siguen perteneciendo al módulo documental.
- Crear wrappers cuando añadan una política real de densidad, estado, texto o accesibilidad;
  no envolver automáticamente todos los componentes de una biblioteca.
- Layouts sin consultas de documentos ni conocimiento de PostgreSQL o NFS.
- La tabla conserva paginación, orden y filtros del contrato y la URL. No ordenar solo la página
  cargada como si se estuviera ordenando toda la colección.
- Fuentes del sistema e iconos incluidos en el proyecto. No introducir peticiones a servicios de
  fuentes o iconos desde el navegador sin necesidad y decisión explícitas.

### Tabla reutilizable local

`AppDataTable` adapta `UTable`: recibe filas, columnas, clave estable y estados por propiedades;
ofrece slots de celda y emite cambios de orden o página. No consulta la API ni conoce documentos,
manifiestos o permisos. `DocumentResults` conserva el adaptador documental.
En escritorio utiliza columnas semánticas. Por debajo de 640 px las mismas filas y celdas se
reorganizan en bloques compactos; no se duplica el árbol de adjuntos ni se detecta el viewport
con JavaScript. Las cabeceras siguen accesibles y se revelan si reciben foco en móvil.

- Todas las instancias de `AppDataTable` alternan fondos de filas y delimitan cada registro
  con un borde horizontal de 1 px más visible. El componente posee estas reglas; no repetirlas
  en módulos ni activar selección o clic de fila para conseguir un efecto visual.
- La alternancia comienza con la superficie común y continúa con `--app-table-row-alt-bg`:
  `#f0f5f5` en claro y `#20343d` en oscuro. El separador usa `--app-table-row-border`,
  `#a7bcbc` y `#526b74`, respectivamente. No se modifica el padding ni la altura de las filas.
- Una fila con un enlace o control enfocado usa `--app-table-row-hover-bg`: `#dfeee9` en claro
  y `#294750` en oscuro. El puntero produce el mismo resaltado solo si admite hover. Se conserva
  el contorno visible del elemento enfocado; la fila completa no adquiere otra acción.
- Fondos y separadores también delimitan los bloques móviles. La cabecera conserva su propio
  fondo y el tema se resuelve mediante tokens, sin duplicar el árbol de filas.
- Paginación remota según `pagina`, `porPagina` y los metadatos existentes; no trasladar el
  contrato `limit/offset` de Voice ni añadir otra API para satisfacer una tabla.
- Orden remoto conservado en URL. No ordenar o filtrar la página recibida aparentando operar
  sobre todo el conjunto. Cualquier filtro exclusivamente local se rotula con su alcance.
- Cabeceras y asociaciones semánticas, nombre accesible, clave por ID y foco estable durante
  carga. El sort anunciará su dirección y las acciones se podrán operar con teclado.
- Estados de carga, vacío y error explícitos; conservar los controles de orden y tamaño de
  página ya aceptados. La forma móvil mantiene la información esencial y sus acciones.
- Las celdas documentales y la resolución de cada adjunto siguen dentro de `modules/documents`;
  las variantes genéricas no reciben reglas de publicación ni direcciones de almacenamiento.

No extraer componentes solo por repetir etiquetas HTML: la reutilización debe concentrar una
política real de presentación, interacción o accesibilidad.

## Layouts y patrones de vista

Un **layout** posee el marco persistente: navegación y zonas de pantalla. Un **patrón de vista**
organiza la tarea dentro del marco: listado, ficha o formulario. No crear un layout por entidad.

| Marco | Composición | Uso del espacio |
| --- | --- | --- |
| Público | Header compacto, contenido y footer discreto al final | Listado fluido sin sidebar |
| Administración | Barra superior global, sidebar izquierdo y área de trabajo | Listados y trabajo operativo a ancho fluido |
| Visor | Barra de herramientas y superficie documental | Alto y ancho de ventana; panel auxiliar cuando aporte valor |

### Público

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: identidad y navegación pública                       │
├─────────────────────────────────────────────────────────────┤
│ Título breve · tipos frecuentes · filtros                    │
│ Filtros activos · resultados · orden · tamaño de página       │
│ ┌ Documento y descripción ──────┬ Fecha ──┬ Archivos ───────┐ │
│ │ Filas de resultados          │        │ Iconos por ID   │ │
│ └──────────────────────────────┴────────┴─────────────────┘ │
│ Paginación                                                  │
└─────────────────────────────────────────────────────────────┘
```

El marco público usa `UContainer` centrado con máximo de 1600 px. Una superficie con borde y
radio de 8 px agrupa título, filtros y resultados. Su padding interior es de 16 px en escritorio
y 8 px en móvil, separado del gutter exterior; conservar la densidad vertical y evitar otro
padding de contenedor adicional. Header y footer comparten el ancho exterior.
El header termina con un borde primario de 2 px, distinguible también en tema claro. No añadir
margen superior ni padding superior al contenedor público: el título del listado aporta 4 px
superiores, además del borde de 1 px de la superficie. Evitar sumar varios espacios entre
header y título. La altura mínima de la barra y los controles se conserva.

El header público permanece visible arriba al desplazar el buscador o la ficha. Usa posición
`sticky`, superficie opaca y una capa superior al contenido, por debajo del enlace para saltar
al contenido. Conserva su espacio en el flujo sin añadir un separador vacío. El layout mide su
altura real, también si crece con texto o zoom; el scroll reserva esa altura más 8 px para que
los destinos de enlaces y el foco no queden ocultos. No fijar también el panel de filtros.

El inicio es una herramienta de consulta. No incluye hero, párrafos de bienvenida ni espacio
reservado para promociones. La identificación institucional vive en el header. El footer sigue
al contenido sin un margen artificial grande y nunca reduce el espacio del visor.

### Administración

```text
┌─────────────────────────────────────────────────────────────┐
│ Barra superior: identidad, navegación global y usuario       │
├──────────────┬──────────────────────────────────────────────┤
│ Sidebar      │ Ubicación · título · acciones de la vista    │
│ Navegación   │ Filtros o encabezado del formulario           │
│ del área     │ Tabla, ficha o formulario                    │
│              │ Paginación o acciones de cierre              │
└──────────────┴──────────────────────────────────────────────┘
```

La barra superior concentra navegación global, contexto institucional y sesión. El sidebar
concentra secciones del área activa. No duplicar el menú completo en ambos. La vista central
posee título, ubicación cuando resulte útil y acciones de su tarea.

En escritorio el sidebar está a la izquierda y puede contraerse con nombres accesibles. En
pantallas menores se convierte en panel temporal que cierra con Escape y restaura el foco al
disparador. No debe obligar a desplazar horizontalmente toda la página.

El marco está implementado con una muestra exclusiva de desarrollo, autorizada el 2026-11-03.
La muestra presenta contenido sintético y no incorpora sesión ni operaciones administrativas.
El marco no concede permisos ni sustituye la protección del backend.

### Visor público implementado

Utiliza toda la altura disponible con `100dvh`: una sola barra de herramientas y documento.
Ficha, archivo, página, zoom, versión, descarga, apertura y tema comparten esa barra flexible.
El visor omite la marca institucional para priorizar la herramienta; portal y administración
conservan su identidad. No añadir filas independientes de marca, metadatos o controles. Los grupos
solo envuelven cuando falta ancho; no hay footer ni tarjeta exterior. Todos los controles usan
36 px de alto en escritorio y 44 px por debajo de 1024 px o con puntero táctil. Acciones de icono
y tema son cuadrados de esa medida, con iconos de 16 px, borde, radio y centrado comunes.
Los grupos se separan discretamente en escritorio; versión, descarga, apertura y tema envuelven
juntos para evitar un botón aislado en otra fila. Nombre y tomo identifican el archivo; el tomo
precede al título documental para conservarse al truncar el contexto. El enlace «Ficha» tiene
icono de documento, texto visible y destino explícito a descripción y metadatos del documento;
no representa navegación por historial. Las acciones con icono tienen nombre accesible y ayuda.
El campo de página navega con Enter, sin otro botón «Ir».

Las hojas se presentan consecutivamente, con 16 px de margen y separación. Solo las próximas
al área visible mantienen canvas y texto; las restantes conservan su lugar como hojas de espera.
Desplazar actualiza el indicador de página sin recargar el PDF. Navegar por número o historial
lleva a la hoja correspondiente. La barra permanece fuera del scroll documental.

El selector enumera únicamente versiones del manifiesto confiable. La elección inicial sigue
siendo original o PDF con texto; no se descargan anticipadamente todas las versiones.

JSONL muestra una sola página OCR con sangría de dos espacios, números de línea, colores por
propiedades, cadenas, números y literales, plegado de objetos y selección. CodeMirror funciona
como lector, sin edición, y usa los tokens locales `--app-code-*`: azul, verde, violeta y ámbar,
con variantes de contraste en ambos temas. Las líneas largas envuelven; el scroll pertenece al
lector. Navegación, número de página y «Copiar JSON» comparten la barra existente. Copiar toma
solo el objeto de la página; Descargar conserva el artefacto completo. No imprimir todas las
páginas ni los metadatos raíz en la vista. Los límites de lectura y formatos viven en `viewer`.

Markdown inicia renderizado, con ancho de lectura de 85 caracteres como máximo, títulos,
listas, tablas, saltos y bloques de código. El contenido usa superficie y texto del tema;
los bloques de código y citas usan superficie suave y las tablas tienen bordes visibles.
«Renderizado» y «Código MD» son botones con estado pulsado accesible en la misma barra; la
fuente conserva el texto escapado y seleccionable. «Copiar MD» toma la fuente en ambas vistas.
No mostrar HTML crudo como contenido activo ni cargar imágenes o recursos remotos. Los límites
de vista previa tienen aviso explícito; la copia de un Markdown truncado se identifica como tal.
La copia exitosa se anuncia; si se deniega el portapapeles, un campo de solo lectura permite
copiar manualmente. Conservar foco visible, reflujo móvil y los tamaños comunes del visor.

El PDF conserva la hoja blanca en ambos temas, sin invertir su contenido. La superficie usa
`--app-viewer-bg`: `#4b5563` en claro y `#202830` en oscuro, con contraste de al menos 7:1 frente
al blanco. Un contorno de 1 px usa `--app-viewer-page-border` (`#202a35` y `#71808c`) además de
la sombra; la delimitación no depende de una diferencia tenue ni solo de la sombra. Los estados
sobre esa superficie usan `--app-viewer-text` (`#f8fafc`) y el foco, `--app-viewer-focus` (`#fbbf24`).
El tema se aplica al marco; la capa de texto permite seleccionar el contenido. El zoom inicial es
75 % en todos los anchos y al cambiar de versión; ajustar al ancho es una opción manual.
El porcentaje usa la escala convencional de PDF a CSS; no representa píxeles del canvas. El
desbordamiento desplaza únicamente la superficie documental. En móvil no se duplica
el lector ni se reservan paneles laterales vacíos. Las imágenes se ajustan al ancho disponible.
El zoom tiene controles −/+, selector de escala y un porcentaje sincronizado al usar rueda.
`Ctrl` + rueda, o el gesto de trackpad equivalente, amplía el documento dentro de su superficie,
conservando el punto bajo el cursor hasta donde permitan los bordes. El selector y los botones
conservan el centro de lectura. La rueda normal desplaza el PDF y los controles de zoom del
navegador fuera de esa superficie mantienen su comportamiento. El grupo de zoom comparte las
medidas de la barra y envuelve junto con la navegación, sin alterar los controles del portal.
El tamaño de la hoja, canvas y texto se alinea a la cuadrícula de píxeles de la pantalla, con
un ajuste inferior a un píxel físico y sin alterar el porcentaje elegido. El centrado comparte
ese paso para evitar posiciones intermedias innecesarias. Las hojas visibles solicitan mayor
resolución interna; las vecinas mantienen un render más económico hasta entrar en pantalla.
No se usa `image-rendering: pixelated` ni filtros de enfoque que alteren el documento. El zoom
inicia en 75 %. Los límites de píxeles y la política de densidad se documentan
en el contexto de `viewer`, junto con disponibilidad, formatos y errores.

### Patrones dentro de los marcos

| Patrón | Composición | Regla de espacio |
| --- | --- | --- |
| Listado | Encabezado compacto, filtros, toolbar, tabla y paginación | Ancho fluido; la tabla es la zona principal |
| Ficha documental | Título, metadatos y secciones de lectura | Texto con ancho legible; sin estirar párrafos a toda la ventana |
| Formulario | Título, campos por grupos y acciones claras | Ancho moderado; columnas para campos cortos relacionados |
| Visor | Herramientas, documento y panel auxiliar opcional | Sin intro, tarjetas exteriores ni footer que consuma altura |

Una ficha pública comparte el marco público; limitar su lectura no exige otro layout. Los
formularios largos usan una página; los diálogos se reservan para tareas breves. Las reglas de
disponibilidad y entrega de archivos siguen en el contexto documental.

### Archivos en la ficha pública

La ficha conserva su marco y muestra «Archivos disponibles» después de los metadatos y antes
de la descripción. Reutiliza `AppDataTable` con columnas «Archivo y detalles» y «Acceso», sin
orden ni paginación visual. Hereda cabecera verde, borde exterior, separadores, alternancia y
resaltado por hover o foco; no reproducir esos estilos en el módulo. El conteo comparte línea
con el título. Cada fila presenta tomo, nombre completo y metadatos del original; la acción
«Ver PDF» o «Abrir archivo» queda a la derecha y avisa de nueva pestaña en su nombre accesible.

La ficha usa 8 px de separación exterior vertical y bajo el enlace de regreso. El panel tiene
16 px de padding en escritorio y 12 px en móvil. La etiqueta de tipo se separa 4 px del título;
los metadatos usan 8 px de padding vertical y 8 px entre filas, con 2 px entre etiqueta y valor.
Conservan tres columnas en escritorio y dos en móvil, sin ocultar campos ni reducir tipografía.
Las secciones se separan 12 px; los encabezados de lectura, 8 px de su contenido. No sumar los
márgenes generales de secciones extensas a esta ficha operativa.

Nombres largos parten sin recortarse. En móvil la información ocupa todo el ancho y la acción
pasa debajo, conservando al menos 44 px de alto. Se reutilizan tokens PDF, foco y estados del listado.
Los archivos no disponibles
siguen identificados con texto sin enlace; carga, error recuperable y vacío tienen texto explícito.
El conteo incluye archivos asociados, también los no disponibles; no implica que todos puedan abrirse.

## Escala, densidad y ancho

Valores comunes para las implementaciones. El buscador centraliza altura de control, gutter y
padding del panel en `app/assets/main.css`; las demás capacidades se aplican incrementalmente:

| Elemento | Valor objetivo | Regla |
| --- | --- | --- |
| Unidad de separación | 4 px | Escala: 4, 8, 12, 16, 24, 32 y 48 px |
| Gutter exterior público | 24 px escritorio; 16 px móvil | Una sola aplicación en `UContainer` |
| Ancho público | Hasta 1600 px, centrado | Header, contenido y footer comparten contenedor; listado ocupa su ancho interior |
| Ancho de lectura | Hasta 80 caracteres por línea aproximadamente | Aplicar al texto, no al marco de la aplicación |
| Ancho de formularios | Hasta 960 px, salvo necesidad acreditada | Campos cortos con tamaño proporcional |
| Barra superior | Mínimo 56 px | Puede crecer con zoom o contenido; no recortar controles |
| Sidebar administrativo | 240 px; contraído 64 px | Panel temporal por debajo de 1024 px |
| Controles de escritorio | 30 px de alto como base | Variantes compactas compartidas |
| Tipos frecuentes y filtros activos | 28 px y 24 px en todos los anchos | Alturas propias; no heredar la altura del formulario |
| Controles táctiles principales | Al menos 44 × 44 px | Campos y acciones; etiquetas compactas según la excepción registrada |
| Celda de tabla | 8 px vertical; 12 px horizontal | Altura por contenido; no recortar líneas con alturas fijas |
| Separación de bloques | 12–16 px en listados | 24 px entre grupos de formulario o secciones de lectura |
| Radio | 6 px controles; 8 px paneles | Píldoras para etiquetas y accesos de selección |
| Iconos | 16–20 px | Una sola familia de trazo; área activa independiente |

Breakpoints de referencia: móvil menor de 640 px, intermedio entre 640 y 1023 px, escritorio
desde 1024 px. Reorganizar antes si el contenido deja de caber; no comprimir campos hasta
hacerlos ilegibles solo para mantener columnas.

En móvil las filas pueden transformarse en bloques compactos con la misma información esencial.
Si una tabla administrativa necesita varias columnas simultáneas, su scroll horizontal pertenece
al contenedor de tabla, no a toda la página. Evitar dos scrolls verticales sin necesidad del visor
o de navegación persistente.

### Tipografía

- Fuente base: pila del sistema ya usada por el proyecto, sin descargas decorativas.
- Texto y formularios: 14 px; tabla: 13–14 px; metadatos secundarios: mínimo 12 px.
- Título de listado: 20–24 px; título de ficha: 24–28 px; sección: 16–18 px.
- Interlineado aproximado: 1.45. Mayúsculas solo en etiquetas breves.
- Sin títulos de 40–48 px ni márgenes ampliados para llenar una pantalla de consulta.
- Nombres largos pueden partirse; cifras y fechas mantienen una alineación estable.

## Color y tema

Temas implementados: claro por defecto y oscuro opcional. El selector del header cambia una
preferencia única gestionada por el módulo de color de Nuxt UI. Se recuerda durante un año
en la cookie funcional `normatividad-theme`, sin identidad ni datos documentales. El sistema
operativo no cambia el valor predeterminado; una elección guardada tiene prioridad.

Tokens implementados bajo el prefijo `--app-`; su mapeo también alimenta los tokens de Nuxt UI.
No constituyen un manual de marca institucional:

| Token semántico | Referencia clara | Uso |
| --- | --- | --- |
| `background` | `#f5f7f8` | Fondo de aplicación |
| `surface` | `#ffffff` | Tabla, panel y controles |
| `text` | `#182d37` | Texto principal |
| `text-muted` | `#536872` | Texto secundario |
| `primary` | `#08736b` | Acción principal y selección |
| `on-primary` | `#ffffff` | Contenido sobre acción principal |
| `border` | `#d9e3e5` | Separación decorativa |
| `border-control` | `#7b8b94` | Delimitación necesaria para reconocer un control |
| `focus` | `#a16207` | Foco, contrastado con el fondo adyacente |
| `danger` | `#b91c1c` | Error y acción destructiva |

No usar el borde decorativo tenue como única delimitación de un campo. El cálculo local de
referencia sobre blanco da 14.29:1 para texto principal, 5.85:1 para secundario, 5.71:1 para blanco
sobre primario y 3.52:1 para borde de control. Estos pares no certifican toda la interfaz: hover,
selección, disabled, foco y superficies tintadas requieren revisión en contexto.

El tema oscuro usa fondo `#111b22`, superficie `#192830`, texto `#edf4f5`, secundario `#b4c8ce`
y primario `#64d8c6` con texto `#102b2b`. Los bordes funcionales y el foco tienen variantes propias.
No invertir colores con filtros CSS ni aplicar hexadecimales por pantalla. La preferencia
es transversal y su arranque usa el mecanismo de Nuxt para aplicar el tema antes de pintar.

La preferencia de tema tiene una sola fuente compartida y se inicia de forma compatible con
SSR. El patrón de Voice orienta persistencia y cambio global; no copiar inicializaciones que
acceden a `document`, `window` o `localStorage` durante el render del servidor. Los componentes
consumen tokens semánticos y no mantienen preferencias independientes. `ThemeToggle` reutiliza
el control de Nuxt UI, con etiqueta en español y protección de la hidratación inicial.

Éxito, advertencia, información y error incluyen texto o icono además de color. Los avisos y
errores actuales consumen tokens de ambos temas; nuevas variantes se configuran centralmente.

## Componentes operativos

### Filtros, tablas y adjuntos

- Buscador público: tipo, año y búsqueda única. Tipos frecuentes en una franja compacta.
  Orden y tamaño de página en la toolbar de resultados.
- Una sola superficie agrupa tipos frecuentes y formulario, con padding de 8 px. La franja de
  tipos mantiene una fila con desplazamiento horizontal y foco visible; no apilar todos los tipos
  en móvil. Tipo y año comparten fila, y búsqueda y acciones comparten la siguiente.
- Usar un título breve de 20–24 px sin texto de portada. El total permanece junto al encabezado
  de resultados; el resumen de rango se conserva para lectores de pantalla sin otra fila visual.
  La ayuda de búsqueda sigue asociada al campo con `aria-describedby`; el ejemplo es visible
  en el placeholder y las etiquetas de los campos permanecen visibles.
- Tipos frecuentes de 28 px y filtros activos de 24 px en todos los anchos, con texto de 12 px y
  padding vertical de 2 px. Filtros activos, encabezado y total de resultados, orden y tamaño
  comparten una franja flexible, separada 4 px del panel y de la tabla. Solo pasan a otra línea
  cuando falta ancho; las etiquetas pueden envolver sin scroll horizontal global. No reservar
  una fila para cada grupo ni aumentar las etiquetas hasta la altura del formulario.
  Cada filtro participa del reflujo: el año puede compartir línea con el total aunque el tipo
  ocupe la anterior. En móvil se omite el rótulo redundante «Filtros activos», conservando el
  nombre accesible del grupo y los nombres de cada acción.
  No agrandarlos por breakpoint o puntero táctil. Campos, Buscar y Limpiar conservan 44 px
  en pantallas menores de 1024 px o con puntero táctil.
- Campos y acciones de escritorio de 30 px, padding vertical de 3 px y separación de 2 px
  respecto de su etiqueta visible. El botón de limpiar ajusta su padding al icono, sin imponer
  una altura mayor. En táctil se conservan los 44 px y el orden de navegación del DOM.
- Filtros activos visibles y removibles. Limpiar no modifica datos ni publicación.
- Tabla pública: documento y descripción, fecha y archivos. La celda empieza por el título;
  no reservar una fila superior para el tipo ni repetir número, año y sigla en otra línea.
  Al final, tipo y proceso se presentan como etiquetas en una sola franja junto al enlace
  de consulta; solo envuelven si falta ancho. El tipo se muestra al listar todos los tipos;
  con uno seleccionado se omite. El proceso se muestra únicamente si el documento lo tiene.
- Descripción de hasta dos líneas, con acceso a ficha completa. Acciones y datos esenciales
  no dependen solo de hover o tooltip.
- Una acción por ID de archivo, nombre accesible y aviso de nueva pestaña. En grupos numerosos,
  un control de expansión puede limitar la altura, manteniendo acceso a todos los archivos.
  No deduplicar por tomo, nombre o apariencia.
- Accesos a archivos en una línea de 44 px de alto. Con un archivo se muestra icono y formato;
  con varios, icono y tomo («T. 0», «T. 1»...), sustituyendo el texto del formato, sin separador
  ni otra línea. El tomo cero se conserva. Nombre y tomo completos siguen en la ayuda y el
  nombre accesible. La columna de archivos mide 195 px en escritorio para alojar dos accesos
  habituales sin restar ancho innecesario a la descripción; en móvil conserva ancho fluido.
- PDF usa tokens `--app-pdf-*` propios del formato: texto `#b91c1c`, fondo `#fff1f2`, borde
  `#d45b67` y hover `#ffe4e6` en claro; texto `#fda4af`, fondo `#3b232b`, borde `#c56f7d` y
  hover `#4c2933` en oscuro. Los demás formatos mantienen la variante general y los archivos
  no disponibles, una variante neutral con texto explícito y sin enlace.
- Usar semántica de tabla cuando se representen columnas. Fecha y acciones con ancho acotado;
  descripción con el espacio restante. La fecha se centra verticalmente en escritorio; en móvil
  permanece en el flujo del bloque. No distribuir todas las columnas por igual.
- La cabecera utiliza tokens propios `--app-table-head-*`: verde petróleo con texto blanco
  en claro y una superficie verde diferenciada con texto claro en oscuro. Borde inferior de
  2 px y peso tipográfico reforzado. La acción de ordenar y su foco conservan contraste; no
  usar el color tenue de las etiquetas como fondo de la cabecera.
- Cabeceras fijas, si se usan, respetan la barra superior y el foco. No superponer varios
  encabezados que tapen el contenido.
- No incorporar edición, selección masiva ni menús de gestión al listado público.

### Acciones, formularios y estados

- Una acción primaria por tarea o grupo. Secundarias discretas; destructivas diferenciadas por
  texto, posición y color semántico.
- Etiqueta visible en cada campo. Placeholder como ejemplo, no como sustituto de la etiqueta.
- Error junto al campo y resumen cuando haga falta; conservar lo escrito tras fallos.
- Carga, vacío, error recuperable y no encontrado con texto y acción adecuada. No inventar
  registros ni presentar resultados anteriores como vigentes durante una nueva consulta.
- Skeletons para conservar geometría cuando ayuden. Carga sin bloquear controles independientes
  ni quitar el foco sin necesidad.
- Textos orientados a la tarea de la persona, sin exponer DTO, rutas internas o nombres de
  infraestructura. Revelar opciones avanzadas cuando sean necesarias, conservando visibles las
  acciones principales y los filtros activos; no ocultar errores o permisos detrás de tooltips.
- Diálogos con título, foco inicial, contención, restauración y cierre por teclado cuando
  corresponda. No sustituir páginas de lectura extensa por overlays.

## Accesibilidad y revisión visual

Objetivo: WCAG 2.2 AA, sujeto a evaluación real. Una biblioteca no demuestra cumplimiento.
Texto normal con contraste mínimo de 4.5:1; controles o indicadores necesarios, 3:1 respecto de
sus colores adyacentes. Foco visible y no oculto por headers, toolbars o paneles.

Antes de cerrar una implementación visual:

1. Elegir layout y patrón; identificar componentes, variantes y tokens que se reutilizan.
2. Revisar escritorio a 1366 × 768 y ancho grande a 1920 px, con zoom de 100%. El listado
   usa el contenedor público centrado de hasta 1600 px, sin volver a un ancho de 1120 px.
3. Objetivo inicial de densidad: primera fila antes de 400 px de altura sin chips y 440 px con
   una fila de filtros activos, sin avisos. Si el contenido real exige más, justificar con una
   captura; no reducir legibilidad para alcanzar una cifra.
4. Revisar 390 px y ancho mínimo de 320 px con nombres largos y varios archivos. Sin scroll
   horizontal global ni pérdida de acciones esenciales.
5. Revisar teclado, foco, zoom de 200% y lector de pantalla cuando esté disponible.
6. Datos sintéticos: vacío, un resultado, página completa, errores, títulos largos y varios
   archivos distintos, incluso con igual tomo o nombre.
7. Comparar capturas con otra pantalla aceptada del mismo patrón. Cambiar estilo requiere una
   razón de producto; no basta la preferencia de otro agente.
8. Ejecutar los controles de [procedimientos.md](procedimientos.md) al completar la unidad.
   Declarar por separado lo no evaluado y la aceptación humana pendiente.

### Comprobación de densidad previa a Nuxt UI

El checkpoint previo a la adopción del 2026-11-02 usa la misma norma y seis tipos sintéticos,
sin filtros activos ni
avisos. Alturas medidas desde el inicio del documento, sin desplazamiento vertical:

| Ventana | Inicio antes de compactar | Inicio después de compactar, antes de Nuxt UI |
| --- | --- | --- |
| 1366 × 768 | 604 px | 301 px |
| 390 × 844 | 1139 px | 450 px |
| 320 × 568 | 1189 px | 450 px |

El bloque de filtros pasa de 237 a 110 px en escritorio y de 686 a 200 px a 390 px de ancho.
La primera línea del título del primer resultado cabe también en la ventana de 320 × 568.
Se revisa además ancho de 1920 px y reflujo a 683 × 384, equivalente al área CSS de una ventana
1366 × 768 con zoom del 200%; no se presenta como prueba del zoom nativo del navegador.
Las pruebas de navegador mantienen controles de al menos 44 px de alto en pantallas menores
de 1024 px y dispositivos táctiles, y comprueban ausencia de scroll horizontal global y acceso
por foco al último tipo frecuente. Esto no certifica WCAG ni sustituye una prueba con lector de
pantalla o la aceptación visual del responsable.

### Comprobación tras adoptar Nuxt UI

El mismo escenario sintético, sin filtros activos, se midió tras la adopción, antes de incorporar
el contenedor público centrado. Las pruebas posteriores del contenedor conservan los objetivos
de densidad y el ancho mínimo móvil:

| Ventana | Inicio de la primera fila | Altura del panel de filtros |
| --- | --- | --- |
| 1366 px, puntero de escritorio | 335 px | 131 px |
| 1920 px, puntero de escritorio | 335 px | 131 px |
| 390 px | 447 px | 221 px |
| 320 px | 447 px | 221 px |
| 1366 px, dispositivo táctil | 375 px | 147 px |

Se conservan los objetivos de primera fila antes de 400 px en escritorio y 440 px con una fila
activa, incluidos controles táctiles. En 320 × 568 la primera línea del título sigue visible.
Se comprueban ambos temas, una página de veinte registros con títulos extensos, orden remoto por
teclado con foco restaurado y ausencia de peticiones duplicadas de adjuntos al cambiar de ancho.
El árbol de accesibilidad de Chromium conserva tabla, cabeceras y filas en escritorio y móvil.
Esto no constituye una evaluación con lector de pantalla ni prueba de zoom nativo; se conserva
la cobertura de reflujo a 683 px y la aceptación humana pendiente.

## Aplicación incremental y decisiones abiertas

1. Reutilizar Nuxt UI y el kit local adoptado. Claro y oscuro comparten identidad y densidad.
2. Centralizar tokens y variantes antes de crear componentes nuevos por módulo.
3. Buscador y ficha usan el layout público, con filtros, URLs y entrega de archivos conservados.
4. El listado consume la tabla reutilizable mediante su adaptador documental; futuras tablas
   aportan columnas y slots sin reproducir estados y navegación.
5. Reutilizar el marco administrativo implementado al crear sus primeras vistas funcionales.
   Autenticación, permisos y alcance siguen siendo decisiones funcionales separadas.
6. El visor público ya aplica su marco; validar archivos grandes antes de la entrega productiva.

El catálogo visual autorizado vive bajo `/muestras`, exclusivamente en desarrollo. Sirve para
revisar componentes reales, estados, densidad y layouts con datos sintéticos. El menú de la
muestra administrativa navega a muestras existentes; no simular permisos o módulos de gestión.
No crear layouts vacíos ni publicar el catálogo en producción. Organización: `frontend.md`.

Los nombres de archivo se indexan en `frontend.md`. Un agente actualiza esta fuente si cambia
una decisión visual, sin copiar otra escala o paleta a un contexto de módulo. Una excepción
documenta motivo, pantalla afectada y alternativa reutilizable.

### Registro de excepciones visuales

Toda excepción requiere pantalla afectada, motivo verificable, alcance, alternativa reutilizable
evaluada y condición de revisión. Registrar aquí las excepciones al criterio común; los detalles
funcionales permanecen en el contexto del módulo. No justificar variantes por preferencia del
agente ni convertir una transición pendiente en una excepción permanente.

Excepción del buscador público: el responsable solicita que tipos frecuentes y filtros activos
conserven en móvil las alturas de 28 y 24 px de escritorio. El aumento previo a 44 px se retira
porque consume demasiado espacio vertical. Se conservan el botón completo como objetivo de
pulsación, su foco visible y la separación entre etiquetas. Los campos y las acciones principales
mantienen 44 px en táctil. Revisar esta decisión si la aceptación móvil detecta dificultad al
seleccionar o quitar filtros; evaluar primero separación o distribución, sin aumentar toda la fila.

La organización implementada se indexa en [frontend.md](frontend.md). Las vistas administrativas
funcionales siguen pendientes; su marco puede revisarse en la muestra de desarrollo.

## Fuentes de referencia

Consultadas el 2026-10-30 y contrastadas el 2026-11-02; orientan la implementación,
no sustituyen esta guía:

- [Nuxt UI, módulo oficial](https://nuxt.com/modules/ui).
- [Nuxt UI, repositorio y licencia](https://github.com/nuxt/ui/tree/v4).
- [Sidebar del dashboard, código oficial](https://github.com/nuxt/ui/blob/v4/src/runtime/components/DashboardSidebar.vue).
- [Layouts de Nuxt](https://nuxt.com/docs/4.x/directory-structure/app/layouts).
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- [Contraste mínimo, W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).
