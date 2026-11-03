# Verificación de la entrega 0.1

Ejecutada el 2 de noviembre de 2026 en Windows con Node.js 22.21.0. No hay datos de fincas de demostración precargados.

| Comprobación | Resultado observado | Alcance |
|---|---|---|
| `npm test` | 4 archivos, **52 pruebas aprobadas** | Fincas, parcelas, suelo, escenarios, motor, POWER con fixtures sintéticos y contratos HTTP. |
| `npm run typecheck` | **Aprobado** | Tipos de aplicación, rutas y pruebas. |
| `npm run build` | **Aprobado** | Compilación de producción Next.js con ocho rutas API. |
| `npm run test:e2e` | **2 recorridos aprobados** | Edge: registro, SQLite tras recarga, suelo, tres escenarios, comparación, archivo JSON, reapertura, diseño móvil, entrada inválida y error climático sin resultados sustitutos. |
| `npm run replay -- test-results/evidence.json` | **Aprobado** | Resultado reproducido con SHA-256 `77a078ab961965c064472d94fe81e85ad2b8067d3f078aed018609e65bfff100`. El archivo contiene datos de prueba hipotéticos, no datos de una finca real. |
| `npm run verify:nasa` | **Aprobado** | Respuesta real de NASA POWER para 2025-01-01 a 2025-01-03, punto de verificación 10.19, -84.39: API v2.10.1, MERRA2, T2M (C), PRECTOTCORR (mm/day), 0 faltantes en ambas series; SHA-256 original `6f6956f4bf4d2e24648c8d68270870fd318fbfe40b7ac0fbf175741df1d37250`. Guardada en caché SQLite. No corresponde a una parcela. |
| `npm audit` tras actualizar Vitest | **0 vulnerabilidades** | Auditoría del árbol npm instalado en esta ejecución. |

[Captura de comparación en escritorio](../test-results/comparison-desktop.png) y [captura móvil](../test-results/comparison-mobile.png) son artefactos de pruebas locales excluidos de Git. Las pruebas verificaron que el documento móvil no desborda el ancho de 390 px.

Durante la primera ejecución E2E, el registro de finca falló porque Next.js construía una URL interna con un host distinto del `Host` público; se corrigió la comparación del origen y se añadió una prueba de contrato. Una prueba también confundía el aviso de error con el anunciador de rutas de Next.js; se ajustó el selector. El segundo recorrido E2E aprobó después de esos cambios. En el aislamiento de archivos de este entorno, Vitest no pudo renombrar su caché temporal; usando `data/tmp` o ejecutándolo con acceso normal, las 52 pruebas finalizaron. La primera prueba E2E tampoco pudo alcanzar loopback en el aislamiento de red; la ejecución con acceso local completó ambos recorridos. No quedan errores de compilación o de pruebas conocidas al cierre.

## Límites de esta verificación

No existe validación agronómica local de umbrales, representatividad de análisis, disponibilidad de agua, presión de enfermedades ni resultados productivos. Las dimensiones de aptitud y efectos de rotación permanecen `UNKNOWN`. NASA POWER aporta contexto histórico regional, sin precisión parcelaria ni pronóstico. `node:sqlite` es experimental en Node 22. La aplicación funciona en un proceso local; faltan autenticación y aislamiento por usuario para un despliegue compartido.
