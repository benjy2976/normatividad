# 0001. Catálogos públicos y relación tipo–proceso

- Estado: aceptada e implementada.
- Fecha: 2026-10-30.

## Contexto

El dominio existente denomina `siglas` a los registros de
`regulations_tipos_siglas`; ese término es conocido por usuarios e integraciones. La tabla
`regulations_tipos_processes` fue prevista para restringir combinaciones, pero no se usa ni
contiene relaciones vigentes.

## Decisión

- Conservar `siglas` como nombre público.
- Publicar tipos, siglas y procesos como catálogos de lectura.
- No mapear ni consultar la relación muchos-a-muchos tipo–proceso.
- Devolver procesos activos independientemente del tipo.
- Considerar cualquier restricción futura como rediseño funcional y de datos.

## Consecuencias

La API no ofrece un filtro de procesos por tipo. Las referencias directas de una sigla a tipo y
proceso se conservan porque sí existen en el modelo actual.
