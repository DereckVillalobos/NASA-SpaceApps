# Fuentes científicas y método de fase 2

## NASA POWER

Documentación oficial: [metodología y fuentes meteorológicas](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/), [API diaria](https://power.larc.nasa.gov/docs/services/api/temporal/daily/). Consulta real del 2 de noviembre de 2026 para 10.19°N, 84.39°O y 1–3 de enero de 2025: API v2.10.1, `sources=[MERRA2,IMERG]`, `time_standard=UTC`, `fill_value=-999`. La respuesta entregó T2M en °C, PRECTOTCORR e IMERG_PRECTOT en `mm/day`. El hash SHA-256 de la respuesta cruda fue `e7407b733bf052f8c6bdac5dd57ee4513455f4183fdbef91ab0fc9f52bb96d5e`. Los valores IMERG fueron 19.75, 5.97 y 27.53 mm/día; los MERRA corregidos, 1.02, 0.38 y 0.74 mm/día. Son productos diferentes y no se promedian.

| Parámetro | Origen de POWER | Resolución espacial documentada | Uso |
|---|---|---|---|
| `T2M` | MERRA-2, reanálisis | 0.5° lat. × 0.625° lon. | Temperatura diaria a 2 m, °C |
| `PRECTOTCORR` | MERRA-2, precipitación corregida | 0.5° lat. × 0.625° lon. | Total diario comunicado como mm/día |
| `IMERG_PRECTOT` | GPM IMERG, estimación multisatélite | 0.1° × 0.1° | Total diario comunicado como mm/día |

POWER documenta IMERG desde junio de 1998. El programa limita la selección a años completos desde 1999. La documentación distingue corridas IMERG con latencia distinta; el análisis no interpreta una serie reciente como definitiva. El encabezado POWER conserva la versión de la API, **no** la versión exacta del producto IMERG empleado; ese dato queda desconocido. La resolución espacial de cada producto no equivale a precisión de parcela, y lluvia en topografía compleja puede diferir de pluviómetros locales.

El método usa fechas diarias UTC inclusivas. Una etapa que cruza diciembre–enero asigna el final al año siguiente al inicio. Cada variable se considera completa sólo si todos los días esperados tienen valor válido, sin interpolación. Suma las cifras diarias de precipitación y calcula la media aritmética de T2M. Mediana y percentiles empíricos usan interpolación lineal en índice `(n−1)·p`; se publican sólo con cinco o más años completos. Un 29 de febrero inexistente excluye ese año para esa ventana. Los resultados describen historia regional y no predicen clima de fechas futuras.

## Agronomía

- [INTA, Manual del cultivo de papa en Costa Rica (2017)](https://www.mag.go.cr/bibliotecavirtual/f01-10931.pdf), sección de suelos: cita pH 5–7 y suelo permeable/profundo. El manual menciona Zarcero como zona productora, sin establecer calibración por parcela. Regla `soil-ph-potato`: sólo una muestra de laboratorio vigente con profundidad y método, PASS dentro del intervalo y WARNING fuera, referidos únicamente a esta condición.
- [INTA, Guía técnica: Cebolla](https://www.mag.go.cr/bibliotecavirtual/F01-9825.pdf), sección «Clima y suelos», p. 10: pH preferido 6.0–6.5; identifica Zarcero entre las zonas de cultivo. Regla `soil-ph-onion` con las mismas condiciones de evidencia. Fuera del intervalo produce WARNING, pues «preferiblemente» no define prohibición.
- [FAO, Crop Evapotranspiration, Paper 56](https://www.fao.org/land-water/land/land-governance-and-planning/land-resources-planning-toolbox/detail/crop-evapotranspiration-%28crop-et0%29/en) y [FAO, Crop Water Needs](https://www.fao.org/4/S2022E/s2022e07.htm): la necesidad hídrica depende de evapotranspiración y etapas. La lluvia acumulada NASA no se compara directamente con un requerimiento para declarar suficiencia de agua.
- [INTA, estudio de rotación cebolla/zanahoria y Globodera en Tierra Blanca, Cartago](https://revista.inta.go.cr/index.php/alcances_tecnologicos/article/view/181): evidencia de un ensayo específico; no se activa como regla universal para Zarcero.

No se activan reglas de pH de zanahoria ni de fertilidad, patógenos o sucesión sin fuente local, método analítico y condiciones de aplicación defendibles. La familia botánica del catálogo es descriptiva, no una conclusión de compatibilidad agronómica.
