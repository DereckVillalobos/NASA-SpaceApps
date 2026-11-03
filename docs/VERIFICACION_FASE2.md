# Verificación de fase 2 · 2–3 de noviembre de 2026 (Costa Rica)

## Línea base antes de cambios

Ejecutados y aprobados antes de modificar el motor: 52 pruebas Vitest, `npm run typecheck`, `npm run build`, 2 pruebas Playwright, `npm run verify:nasa` y `npm run replay -- test-results/evidence.json`. El ZIP y la copia SQLite de `.phase2-baseline/` se crearon antes de los cambios. SHA-256 recalculados y coincidentes con el manifiesto; ambas bases SQLite pasaron `PRAGMA integrity_check=ok` y conservaron conteos idénticos de las tablas v1.

## Pruebas de funcionalidades nuevas

`tests/phase2.test.ts` usa respuestas NASA **sintéticas** y marcadas como tales. Comprueba unidades, metadatos UTC y fuentes, resolución diferente para IMERG/MERRA, cruces de diciembre a enero, 29 de febrero, días faltantes, exclusión de años incompletos, percentiles, caché versionada, manejo de desconexión, tres comparaciones y hashes deterministas. También verifica migración v1→v2 con una finca persistida, correcciones inmutables de suelo, conflicto entre fuentes, reglas de pH y cambio de cultivo. La prueba de ablación conserva los estados de aptitud al incorporar NASA; sólo agrega indicadores históricos. Una evidencia v2 con respuestas crudas sintéticas se exporta y se reproduce con el script CLI.

La batería Vitest pasó con **65 pruebas en 5 archivos** después de incorporar contrafactuales y sensibilidad. `npm run typecheck` pasó. El build final con `SUELORUTA_DIST_DIR=.next-verify-20261103b` terminó con código 0. Las dos pruebas Playwright pasaron sobre ese build final en 42,2 s; el recorrido principal incluyó la interacción con el formulario contrafactual.

## Integración NASA en vivo

`npm run verify:imerg` pasó con acceso de red permitido. Consulta NASA POWER Daily API para 10.19°N, 84.39°O, del 1 al 3 de enero de 2025, `community=AG`, `time-standard=UTC`. La respuesta reportó API v2.10.1, fuentes MERRA2 e IMERG, T2M en °C y ambas lluvias en `mm/day`; hash crudo `e7407b733bf052f8c6bdac5dd57ee4513455f4183fdbef91ab0fc9f52bb96d5e`. La segunda consulta del script fue un acierto de caché. Véase `docs/FUENTES_FASE2.md` para origen y limitaciones. El primer intento sin permiso de red falló con error de conexión; no generó datos de reemplazo.

## Reproducción y extremo a extremo

`npm run replay -- test-results/evidence.json` pasó tanto para evidencia anterior v1 como para la evidencia v2 descargada por Playwright; la última dio hash `523fff3b1399c6f9e0b354b45747a7634e3d286cff43cd824031038780d84701`. Playwright pasó **2 de 2 pruebas** en la versión actual: registro, persistencia, comparación, exportación, reapertura, vista móvil, interacción contrafactual y error de conexión NASA. El primer intento de Playwright dentro del sandbox no pudo abrir `127.0.0.1:3100`; con permiso de red local pasó. Las pruebas Playwright existentes no cubren todavía el formulario de análisis histórico; esa lógica sí tiene pruebas de integración de servicio y reproducción CLI.

## Incidentes del build

OneDrive devolvió `EPERM` al reusar el directorio generado `.next` y después `.next-phase2`. No se borraron bases ni respaldos para resolverlo. Se añadió `SUELORUTA_DIST_DIR` para construir en un directorio nuevo, ignorado por Git, y utilizar la misma variable en el servidor de prueba. Los intentos fallidos no se declaran builds aprobados. `npm run build` con `.next-verify-20261103a` terminó con código 0 antes de añadir el módulo contrafactual; la repetición final con `.next-verify-20261103b` también pasó.

## Límites de validación

Los fixtures prueban cálculo y trazabilidad, no exactitud agronómica local. La consulta en vivo de tres días confirma formato y procedencia NASA, no sesgo ni error respecto de pluviómetros de Zarcero. Ninguna prueba valida rendimiento, suficiencia hídrica, efecto fitosanitario o recomendación de siembra. Los intervalos de pH proceden de guías INTA y sólo activan reglas estrechas de comparación; no sustituyen interpretación profesional de un análisis de suelo.
