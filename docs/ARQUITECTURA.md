# SueloRuta · contrato de la entrega 0.1

Prototipo local para horticultura de altura en Zarcero. El nombre del desafío y la participación en NASA Space Apps 2026 provienen del encargo; no implican afiliación ni validación por NASA. No hay datos de fincas precargados.

## Decisiones

Monolito Next.js / TypeScript, validación Zod en el servidor, SQLite con claves foráneas, Leaflet, Vitest y Playwright. SQLite usa `node:sqlite` de Node >=22.13 (API experimental en Node 22); se evita depender de compilación nativa adicional. Requiere un proceso Node y disco persistente. El hosting de Sites usa Workers, por lo que no es el destino de este repositorio con SQLite local. Esta entrega se verifica localmente. No hay autenticación: escuchar solamente en loopback. Un despliegue compartido necesita autenticación, aislamiento de usuarios y copias de seguridad.

## Estructura y dirección de dependencias

`src/modules/{provenance,farms,parcels,soil,crops,climate,rotations,rules}` contiene contratos y lógica. El motor no depende de Next, SQLite, red ni modelos generativos. `src/server` implementa repositorios y servicios; `src/app/api` los expone y `src/components` presenta formularios. `tests` y `e2e` verifican los contratos y recorridos.

## Contratos y aceptación antes de implementar

| Módulo | Entradas → salidas | Dependencias | Límite científico | Aceptación |
|---|---|---|---|---|
| Procedencia | tipo, fuente, método, fecha, resolución, supuestos, marca hipotética → registro inmutable versionado | Zod | clase de evidencia no equivale a calidad validada | exigir fuente, conservar null e hipotético |
| Fincas | nombre, lat/lon WGS84, recursos, prioridades, procedencia → finca UUID | procedencia, SQLite | ubicación declarada; no agronomía inferida | límites geográficos, números finitos, recursos desconocidos, persistencia |
| Parcelas | finca, nombre, superficie m²/ha, antecedentes con fechas, procedencia → parcela y superficie derivada m² | fincas | punto de finca no es polígono de parcela | FK, superficie positiva, conversión exacta, historia incompleta explícita |
| Suelo | parcela, fecha, profundidad cm, propiedades/unidades/métodos, procedencia → análisis inmutable | parcelas | muestreo no representa automáticamente toda la parcela; mapas separados del laboratorio | perfiles distintos, fechas válidas, unidades, desconocidos y orden taxonómico sin inferencias |
| Cultivos | catálogo tipado versionado → papa, cebolla, zanahoria y referencias | fuentes botánicas | taxonomía no establece requerimientos ni aptitud | identificadores válidos; requisitos sin fuente permanecen pendientes |
| Clima | coordenadas y período pasado → respuesta POWER real cacheada y series normalizadas | API oficial, SQLite | reanálisis regional, no observación parcelaria ni pronóstico | contrato JSON, unidades, fechas, faltantes, timeout, HTTP fallido, caché y separación de suelo |
| Rotaciones | parcela, ranura 1–3, cultivos y fechas, restricciones declaradas → escenario versionado | catálogo, parcelas | fechas son propuestas del productor; no duración recomendada | tres alternativas, fechas reales, solapamiento detectable, restricciones opcionales |
| Reglas | instantánea validada + fecha de evaluación explícita → resultados por dimensión y hash | contratos anteriores | verificaciones estructurales; aptitud agronómica UNKNOWN sin reglas validadas | cinco estados, reproducibilidad, ausencia de evidencia nunca PASS |

## Persistencia

Tablas `provenance`, `farms`, `parcels`, `soil_samples`, `scenarios`, `climate_cache`, `evaluations`. IDs UUID, relaciones FK y documentos JSON validados para conservar unidades y metadatos originales. Escenarios únicos por (parcela, ranura); cada guardado incrementa versión. Evaluaciones append-only conservan entrada completa, salida, versiones y SHA-256. Respuestas NASA se almacenan como texto original, hash, URL, cabeceras seleccionadas y fecha de recuperación. Migración inicial con `PRAGMA user_version=1`; no se reescribe una BD de versión desconocida.

## API inicial

GET/POST `/api/farms`; GET/POST `/api/parcels?farmId=…`; GET/POST `/api/soil?parcelId=…`; GET `/api/crops`; GET/PUT `/api/scenarios?parcelId=…`; POST `/api/climate`; GET/POST `/api/evaluations?parcelId=…`; GET `/api/evidence?id=…`. JSON estricto, errores 400 de entrada, 404 de relaciones, 502/504 de proveedor, 500 de persistencia. Las escrituras del navegador requieren origen coincidente con el Host público si se envía Origin. El API es local y no constituye control de acceso.

## Pendientes científicos

- Requerimientos por cultivo, cultivar y etapa: pH según método, textura, nutrientes, profundidad, temperaturas, agua y duración. No existen umbrales de aptitud habilitados.
- Reglas locales de rotación: patógenos, intervalos, familias, manejo y validación por especialistas MAG/INTA u otras fuentes pertinentes. Familias distintas no implican beneficio demostrado.
- Protocolos del laboratorio, representatividad espacial, incertidumbre y vigencia del muestreo. No se declara caducidad arbitraria de análisis.
- Disponibilidad estacional real de agua, trabajo y presupuesto; prioridades no se convierten en pesos de una puntuación.
- Cartografía, escala, fecha y validación local. El orden taxonómico no rellena química.
- Validación local del reanálisis POWER en relieve de Zarcero y manejo documentado de sesgos. No se calcula balance hídrico, erosión, rendimiento ni recuperación del suelo.

## Plan de pruebas

Vitest: inválidos, null, m²/ha, profundidad, reproducibilidad, cambio de fechas, ausencia de fuente, perfiles de suelo, contratos POWER sintéticos etiquetados, faltantes, conexión fallida, HTTP, caché, integridad SQLite y aislamiento NASA/suelo. Playwright: crear finca/parcela, recargar, registrar suelo, construir tres escenarios, comparar/exportar evidencia, errores y diseño móvil. Consulta real a POWER separada de pruebas offline para no confundir un mock con verificación de conectividad.
