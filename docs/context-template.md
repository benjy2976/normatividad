# Contexto del módulo: nombre funcional

Esta plantilla se copia únicamente al crear un módulo con comportamiento real. El archivo se
ubica en la raíz del módulo y se indexa en `docs/guia_IA.md`.

## Propósito y límites

Explicar qué capacidad posee el módulo, qué queda fuera y qué otros módulos puede consultar.

## Glosario

Relacionar términos funcionales en español con nombres técnicos en inglés.

## Actores y permisos

Documentar quién puede leer o mutar cada recurso y qué política ejecutable lo comprueba.

## Estados e invariantes

Describir estados válidos, transiciones, precondiciones y situaciones que nunca deben ocurrir.

## Flujos

Explicar los casos de uso principales y enlazar acciones, rutas, contratos y pruebas.

## Datos y relaciones

Enlazar `docs/modelo-datos.md` cuando su umbral exista. No duplicar campos ni constraints.

## Integraciones y fallos

Registrar dependencias externas, reintentos, idempotencia y comportamiento ante indisponibilidad.

## Evidencia y validación

Listar las pruebas y procedimientos que demuestran las reglas anteriores.

## Pendientes explícitos

Cada pendiente debe expresar la pregunta, el riesgo y el momento antes del cual debe resolverse.
