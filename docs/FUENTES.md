# Fuentes y decisiones científicas

Consultadas el 2 de noviembre de 2026. Las referencias botánicas documentan identidad; no se usan como umbrales agronómicos.

## NASA POWER

- [Daily API, documentación oficial](https://power.larc.nasa.gov/docs/services/api/temporal/daily/): formato JSON, punto geográfico, comunidad AG, estándar UTC explícito; disponibilidad meteorológica diaria desde 1981 hasta datos recientes. La disponibilidad efectiva se comprueba en cada respuesta; nunca se solicitan fechas futuras como pronóstico.
- [Tutorial oficial de solicitudes API](https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/): resolución meteorológica 0,5° × 0,625°. La cuadrícula de salida de otros endpoints no debe confundirse con resolución nativa. Una consulta puntual no produce precisión parcelaria.
- [Consulta real verificada](https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M%2CPRECTOTCORR&community=AG&longitude=-84.39&latitude=10.19&start=20250101&end=20250103&format=JSON&time-standard=UTC): el 2026-11-02 respondió API v2.10.1, fuente MERRA2, T2M en `C`, PRECTOTCORR en `mm/day`, valor faltante `-999`, fechas y estándar UTC. La URL incluye un punto de comprobación, no una finca registrada. Su elevación es metadato regional y no se importa como elevación local.

El adaptador conserva la cadena JSON original y su SHA-256, URL y argumentos, fecha UTC de consulta, cabeceras HTTP seleccionadas, metadatos originales y versión del adaptador. Normaliza faltantes a null conservando el original. No rellena huecos ni aplica correcciones de sesgo. No calcula promedios parciales o acumulados que puedan confundirse con un período completo. Los ceros se conservan como valores válidos.

Se comprueban estructura, unidades, estándar temporal, coordenadas e intervalo. Variables ausentes se informan sin fabricar reemplazos. HTTP fallido, timeout, JSON inválido y contrato incompatible detienen la importación. No hay reintentos automáticos masivos. El límite local de 366 días es una decisión de ingeniería del prototipo, no un límite atribuido al proveedor.

La caché es persistente por consulta exacta y versión del adaptador. No expira automáticamente para favorecer reproducibilidad, por lo que tampoco garantiza incorporar futuras revisiones del proveedor. No se deduplican coordenadas distintas que pertenecen a una misma celda; evitar consultas masivas y desarrollar esa optimización antes de ampliar escala. Las consultas idénticas recuperan la misma instantánea.

## Catálogo botánico

- Papa, *Solanum tuberosum* L., Solanaceae: [Kew POWO](https://powo.science.kew.org/taxon/821337-1).
- Cebolla, *Allium cepa* L., Amaryllidaceae: [Kew MPNS / World Checklist of Vascular Plants](https://mpns.science.kew.org/mpns-portal/plantDetail?dbs=wcs&plantId=295261).
- Zanahoria cultivada, *Daucus carota* subsp. *sativus*, Apiaceae: [Kew](https://www.kew.org/plants/carrot).

Cultivar, requerimientos, duración y manejo permanecen pendientes. No se habilitaron reglas que favorezcan o penalicen familias botánicas.

## Fuentes locales aún necesarias

Análisis de laboratorio representativos con protocolos, profundidad y fecha; cartografía con escala y metadatos; guías locales MAG/INTA y literatura pertinente por cultivar/etapa; evidencia de patógenos y restricciones de rotación; disponibilidad de recursos y revisión agronómica local. Una fuente debe validarse para el uso concreto antes de incorporarla a una regla.
