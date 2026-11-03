# Auditoría de fase 2 · 2 de noviembre de 2026

## Estado inicial y respaldo

Se auditó el proyecto Next.js existente, sus esquemas Zod, repositorios SQLite, adaptador POWER, motor v1, interfaz, documentación y pruebas antes de modificar componentes críticos. La línea base ejecutó 52 pruebas unitarias, `typecheck`, `build`, dos pruebas Playwright, `verify:nasa` y reproducción de `test-results/evidence.json`. Todos pasaron en esa línea base. La implementación v1 guardaba finca, parcela, suelos, tres escenarios, una consulta POWER diaria y evidencia reproducible; no tenía IMERG, estadísticas de ventanas históricas, reglas agronómicas activas ni correcciones de suelo enlazadas.

La copia previa está en `.phase2-baseline/` y su manifiesto contiene hashes SHA-256. Se excluye de Git porque contiene una base SQLite. El 2 de noviembre se recalcularon ambos hashes y coincidieron; `integrity_check` de la copia y de la base de trabajo devolvió `ok`. Ambas bases tenían esquema v1 y los mismos conteos: 0 fincas, 0 parcelas, 0 muestras de suelo, 0 escenarios, 1 entrada de caché climática y 0 evaluaciones. La migración v1→v2 se prueba con una finca sintética persistida antes de migrar.

## Cambios y límites técnicos

- Adaptador POWER v2 aislado del v1: T2M, PRECTOTCORR e IMERG_PRECTOT, con respuesta cruda, hash, URL, hora de recuperación, metadatos de API, fuentes, unidades y resolución por variable. El adaptador v1 y la reproducción de evidencia antigua siguen presentes.
- Análisis por años de inicio de ventana: permite cinco a diez años entre 1999 y 2024, incluida una ventana diciembre–enero. Para cada variable exige todos los días UTC válidos; un año incompleto queda fuera de sus estadísticas. No interpola ni sustituye faltantes por cero. Publica suma de precipitación, media de T2M, mediana, p10/p90, mínimo, máximo, media y número de años completos. Sólo calcula estadísticos si hay al menos cinco años completos.
- Las dos precipitaciones se mantienen separadas. La diferencia entre MERRA-2 e IMERG no cuantifica el error en la parcela.
- SQLite v2 agrega `historical_analyses` sin alterar registros v1. Cada análisis conserva las respuestas NASA completas; cada evaluación v2 guarda una instantánea, hashes y versiones de escenarios. Se rechaza adjuntar un análisis de otra parcela, coordenada o versión de escenarios.
- Suelos: `LABORATORY`, `FARMER` y `CARTOGRAPHIC` se distinguen por procedencia. Una corrección crea un registro nuevo con `supersedesId`; la evaluación usa versiones vigentes, mientras las evaluaciones anteriores conservan su instantánea. No se imputan propiedades desconocidas.
- El motor v1 queda intacto para evidencia anterior. El motor v2 agrega reglas estrechas de pH respaldadas por guías INTA; la aptitud global del suelo y clima sigue `UNKNOWN`.
- La interfaz denomina las ranuras «Rotación actual», «Alternativa A» y «Alternativa B». El análisis histórico se presenta como descripción, sin porcentaje de éxito ni pronóstico.

## Riesgos identificados

La resolución POWER es regional; una coordenada no representa heterogeneidad edáfica de una parcela. La precipitación diaria `mm/day` de la respuesta POWER se suma por día UTC como total de la ventana, pero la ventana agrícola declarada puede seguir días civiles locales; la diferencia de límite UTC/LST puede cambiar eventos de lluvia cercanos a medianoche. No se calculan demanda hídrica, evapotranspiración, riego suficiente ni rendimiento. El producto IMERG exacto subyacente no aparece en la respuesta POWER y no se le atribuye una versión no verificable. Los rangos de pH son orientaciones de guía, no una validación local por cultivar. Muestras simultáneas de pH sin comparabilidad se informan como `UNKNOWN`.

## Contrafactual y sensibilidad inicial

La API `/api/counterfactual` y la interfaz de evidencia permiten cambiar una variable a la vez: inicio de etapa, cultivo, requisito de riego o pH conocido. La respuesta es hipotética, presenta antes/después de reglas aplicables y recalcula indicadores históricos cuando cambia una ventana o cultivo. No altera la evaluación guardada. La primera versión recalcula internamente el motor completo; la evaluación incremental por regla es un trabajo pendiente. El GET de la misma API devuelve preguntas deterministas para dependencias aún desconocidas. Sin intervalo medido defendible no simula probabilidades, impactos económicos ni rangos de resultado.

## Pendientes de investigación e implementación

No existen aún reglas validadas para pH de zanahoria, fósforo, materia orgánica, textura, duración de ciclo, patógenos ni suficiencia hídrica. El contrafactual y la sensibilidad carecen de intervalos locales defendibles y no asignan probabilidades. Se requiere validar en campo y con especialistas de Zarcero antes de convertir advertencias descriptivas en recomendaciones.

Las pruebas ejecutadas **después** de los cambios y sus resultados finales se registran en `docs/VERIFICACION_FASE2.md`.
