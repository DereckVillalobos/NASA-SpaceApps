# Fase 3: auditoría y primer incremento de fincas y parcelas

Fecha: 3 de noviembre de 2026, Costa Rica. Estado: **borrador; fase 3 incompleta**.

## Base revisada y recuperación

Se recuperaron los 66 archivos del árbol de `main` en el commit `60a056b1d40ae776a60ef55141efda0f1b712c52` mediante el conector GitHub, fijando ese SHA en las lecturas. La clonación directa no completó en este entorno. La rama `phase3/farm-record-history` parte del commit real de GitHub; `main` no se modifica. Se conserva además un commit local de la instantánea anterior a los cambios. No se recibió una base SQLite real ni se accedió a la copia de Windows/OneDrive citada en documentación previa.

La migración es aditiva de v2 a v3 (v1 también sigue pasando por v2). Antes de aplicarla a una instalación con datos reales: detener el proceso y respaldar SQLite de manera consistente, incluidos los archivos WAL si aún existen. Para volver al programa anterior, restaurar conjuntamente código y base anteriores: el código v2 rechaza una base v3. No se ofrece un downgrade destructivo.

## Diagnóstico de las cinco propuestas

| Propuesta | Estado observado antes de este incremento | Reutilización y faltantes |
|---|---|---|
| Chatbot | No hay asistente generativo ni integración con un proveedor | Reutilizar consultas de repositorio, evaluaciones, reglas y fuentes. Faltan herramientas de lectura acotadas, interfaz, consentimiento para datos externos, configuración y pruebas contra invención. |
| APIs | POWER, IMERG vía POWER, caché de respuestas originales, estadísticas históricas y verificadores existen | Reutilizar adaptadores. No hay SMAP ni SoilGrids; no incorporarlos sin justificar su contribución y verificar acceso. Falta cobertura de navegador del análisis histórico. |
| Datos de finca | Fincas, parcelas, recursos, prioridades, antecedentes y suelos con procedencia; correcciones de suelo e instantáneas de evaluación | Faltaba corregir finca/parcela y registrar cantón/distrito. Este incremento resuelve esa parte. Siguen pendientes datos de manejo más específicos y drenaje documentado. |
| Sugerencias | Comparación de tres escenarios introducidos por el usuario, reglas estructurales, dos reglas estrechas de pH, faltantes y contrafactuales | No existe generador/selector determinista de alternativas agrícolas justificadas. Un comparador no equivale a un recomendador. |
| Alajuela/Zarcero | Catálogo papa/cebolla/zanahoria y ámbito piloto documentado; sin finca de demostración automática | Falta caso reproducible explícitamente hipotético, cobertura de las tres alternativas y revisión agronómica local. No hay validación productiva. |

Dependencias declaradas: Node >=22.13, Next 16.4.4, React 19, TypeScript, SQLite de Node, Zod, Leaflet, Vitest y Playwright. Se instaló el lockfile sin cambiar versiones; entorno de esta revisión: Node 24.22.1. No se certifica el rango completo de Node ni se realizó auditoría de vulnerabilidades.

## Plan de implementación por dependencias

1. **Auditoría y línea base:** contrastar contratos, persistencia, motor, UI y pruebas; conservar el SHA de origen. Línea base local: 65 pruebas, tipos y compilación aprobados.
2. **Fincas y parcelas:** primero correcciones versionadas, ubicación administrativa opcional, conflictos y conservación de evidencia (este incremento). Después incorporar manejo parcelario, cultivos actuales y fechas reales, antecedentes fitosanitarios y restricciones de trabajo como declaraciones identificadas, y drenaje con fuente. Determinar con agronomía qué campos puede consumir cada regla. No aplicar automáticamente el riego general de la finca como medición individual de cada parcela.
3. **APIs:** reutilizar POWER/IMERG, añadir cobertura UI histórica y fallos del proveedor; documentar versiones que el proveedor realmente comunique. SMAP sería contexto regional, SoilGrids cartografía estimada. Su acceso y aporte siguen por investigar; no son dependencias de la edición de fincas.
4. **Sugerencias:** definir candidatos reproducibles y reglas de exclusión con fuentes y alcance; evaluar con el motor existente. Mostrar escenarios pendientes si falta evidencia, sin ranking de éxito inventado. Depende de datos parcelarios y reglas documentadas, no del chatbot.
5. **Chatbot:** herramientas de lectura por finca/parcela/evaluación; explicar resultados del motor sin alterarlos. Validar configuración y consentimiento antes de enviar datos externos. Comparador operativo sin credenciales. Elegir proveedor tras investigar las opciones disponibles.
6. **Piloto:** crear demostración hipotética de Zarcero con tres escenarios y cambio de variable; distinguir fuentes NASA reales de declaraciones y suposiciones. No introducir semillas en bases de agricultores.
7. **Validación:** ejecutar regresión, reproducción de evidencia y navegador móvil; revisar alcance de fuentes con especialistas y agricultores. El software no valida rendimientos ni efectos de rotación.

## Implementación concreta de este incremento

- Tablas `farm_revisions` y `parcel_revisions` con clave por entidad/revisión. La migración copia el JSON anterior sin modificarlo.
- Nuevos registros comienzan en revisión 1. Una corrección conserva identidad y fecha de creación, crea procedencia nueva y agrega una instantánea completa antes de actualizar el registro vigente en la misma transacción.
- `PUT /api/farms` y `PUT /api/parcels` reciben `{id, expectedRevision, data}`. Revisiones obsoletas producen HTTP 409. Una parcela no puede trasladarse a otra finca mediante esta operación.
- `GET /api/farms?historyId=…` y `GET /api/parcels?historyId=…` devuelven versiones de la entidad solicitada.
- Formularios de corrección precargados y consulta de historial. Se conserva inicialmente la marca hipotética; se exige fuente para la corrección. La UI invalida la comparación visible al corregir datos, sin borrar evaluaciones guardadas.
- Cantón/distrito opcionales, con `null` para valores desconocidos. No se deducen química, clima ni aptitud de esos nombres. En JSON anteriores los campos pueden estar ausentes; no se normalizan retroactivamente para conservar hashes.

Archivos funcionales: `src/modules/farms/schema.ts`, `src/modules/parcels/schema.ts`, `src/server/db.ts`, `src/server/repository.ts`, `src/server/http.ts`, `src/app/api/farms/route.ts`, `src/app/api/parcels/route.ts`, `src/components/forms.tsx` y `src/components/Workspace.tsx`. Pruebas: `tests/revisions.test.ts`, `tests/phase2.test.ts` (fixture de migración actualizado a v3) y `e2e/workflow.spec.ts`. Documentación: este archivo y README.

## Evidencia de verificación

- `npm test`: **70/70**. Cinco casos nuevos prueban revisiones/procedencia/desconocidos, conflictos, aislamiento entre parcelas, prohibición de traslado, migración v2/reapertura/integridad y conservación/reproducción exacta de evaluaciones previas.
- `npm run typecheck` y `npm run build`: aprobados. El build genera las rutas existentes.
- `npm run test:e2e -- --grep 'API conserva'`: pasa la integración HTTP contra el servidor de producción; valida estados 201/200/409/400, historial, superficie e independencia entre fincas. Usa únicamente datos sintéticos.
- La batería completa de navegador **no pasa en este entorno**: los tres recorridos que requieren navegador no pueden iniciarse porque falta `/opt/microsoft/msedge/msedge`. La instalación alternativa de Chromium produjo descargas truncadas. No se declara verificación visual ni móvil aprobada. El nuevo recorrido de correcciones está escrito y pendiente de ejecución en un entorno con navegador.
- `npm run verify:imerg` tuvo un fallo de permisos al crear el canal IPC de `tsx`. El mismo script se ejecutó con `node --import tsx scripts/verify-imerg.ts` y consultó NASA realmente: recuperación `2026-11-04T03:19:07.957Z` (3 de noviembre en Costa Rica), API **v2.10.2**, fuentes MERRA2/IMERG, UTC, T2M en C y ambas precipitaciones en mm/day. SHA-256 crudo `38b44bf07c5442f483a4bdb98d4ad19fcda94d3f40fd57a846cd28b5253bab08`; repetición con acierto de caché. Punto 10.19, −84.39; 1–3 enero 2025. Esto confirma conexión y contrato, no precisión local ni aptitud agrícola.

## Riesgos y siguiente etapa

Este incremento no completa la etapa de fincas y parcelas: faltan los campos de manejo indicados en el plan y validación visual. No se añadieron reglas agronómicas, modelos de IA ni fuentes científicas nuevas. Continúan UNKNOWN la aptitud integral y los efectos de rotación. La revisión de una ubicación no convierte registros de suelos históricos en mediciones de otro sitio; su representatividad requiere revisión humana. La aplicación sigue siendo local, sin autenticación ni aislamiento entre usuarios; el aislamiento probado aquí es relacional entre entidades, no autorización multiusuario.

Mantener la solicitud de integración en borrador hasta ejecutar el recorrido de navegador, revisar la migración con una copia de la instalación objetivo y resolver observaciones del revisor. El siguiente trabajo es completar los datos de manejo parcelario y su validación, antes de avanzar al sistema de sugerencias.
