# SueloRuta

Prototipo experimental de apoyo a la comparación de rotaciones para horticultura de altura en Zarcero, Costa Rica. Implementado como aplicación local Next.js + TypeScript, SQLite, Zod y Leaflet. No contiene modelos generativos ni reglas agronómicas inventadas.

## Ejecutar

Requiere Node.js **22.13 o posterior**; verificado inicialmente con 22.21.0. SQLite usa la API experimental `node:sqlite` de Node 22. En Windows, usar `npm.cmd` si PowerShell bloquea `npm.ps1`.

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. La aplicación empieza sin fincas de ejemplo. Los formularios permiten marcar explícitamente los registros hipotéticos. El mapa base requiere conexión a OpenStreetMap; los formularios y registros no dependen del mapa.

Para producción local:

```sh
npm run build
npm start
```

El servidor escucha en loopback. No dispone de autenticación ni separación por usuario; no exponerlo públicamente. La base se crea en `data/sueloruta.sqlite`, excluida de Git. `SUELORUTA_DB` permite otra ruta. Las pruebas de navegador usan una base independiente en `data/e2e-*.sqlite`. No hay un botón que borre datos ni semillas automáticas.

## Recorrido

1. Registrar finca, coordenadas WGS84, recursos conocidos y fuente.
2. Registrar parcelas, superficie en ha o m² y antecedentes (o desconocidos).
3. Incorporar análisis de laboratorio, declaraciones del agricultor o cartografía estimada, con método, unidad, fecha y profundidad cuando correspondan. Una corrección crea una nueva versión enlazada.
4. Guardar rotación actual, alternativa A y alternativa B con etapas, fechas y restricciones declaradas.
5. Consultar T2M y PRECTOTCORR en POWER o analizar cinco a diez años de las ventanas agrícolas con T2M, PRECTOTCORR e IMERG_PRECTOT separados. Los resultados son históricos y regionales.
6. Comparar dimensiones, reglas acotadas de pH y estadísticas climáticas, y descargar evidencia JSON. PASS confirma únicamente la condición especificada. Aptitud integral de suelo/clima y efectos de rotación siguen UNKNOWN.
7. En una evaluación v2, consultar qué información falta y explorar un cambio hipotético de fecha, cultivo, riego declarado o pH conocido. El cambio no se guarda y no es un pronóstico.

Los registros de fincas, parcelas y suelo se agregan, no se editan. Una corrección de suelo conserva el registro anterior. Las alternativas sí se pueden revisar; cada guardado incrementa su versión. Las evaluaciones conservan la instantánea anterior de todos sus datos.

## Verificación

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run verify:nasa
npm run verify:imerg
npm run replay -- ruta/a/evidencia.json
```

- Vitest: pruebas deterministas offline. Las respuestas API de prueba son **sintéticas** y están etiquetadas en `tests/fixtures.ts`.
- Playwright: requiere Microsoft Edge instalado (configuración `channel: msedge`). Recorre formularios, persistencia, comparación, exportación, respuesta de error y pantalla móvil. Ejecutar después de `build`. Para otro sistema, cambiar el canal y usar su navegador Playwright instalado.
- `verify:nasa`: consulta real de tres días en un punto de verificación, almacena la respuesta original, versión de API, URL, fecha y SHA-256. No crea una finca ni declara mediciones locales. Una repetición idéntica reutiliza caché.
- `verify:imerg`: consulta real de las tres variables, confirma unidades, fuentes, UTC, resolución por variable y caché. Requiere conexión a NASA POWER.
- `replay`: compara exactamente la salida y los hashes del archivo exportado con el motor de esta versión, usando la fecha de evaluación original.

En una carpeta sincronizada por OneDrive, un build repetido puede recibir `EPERM` al reutilizar archivos generados. Para verificar con una salida nueva sin tocar datos, establecer `SUELORUTA_DIST_DIR=.next-verify-nombre` tanto al ejecutar `build` como `test:e2e`. Los directorios `.next-verify-*` están excluidos de Git.

`.npmrc` evita un fallo del resolvedor de dependencias pares opcionales en npm 10.9.4; el lockfile conserva las versiones utilizadas. No es necesario instalar servicios externos ni una clave NASA.

## Documentación

- [Arquitectura, esquema, contratos y aceptación](docs/ARQUITECTURA.md)
- [Reglas estructurales y sus límites](docs/REGLAS.md)
- [Investigación NASA POWER y fuentes](docs/FUENTES.md)
- [Resultados reales de verificación](docs/VERIFICACION.md)
- [Auditoría de fase 2](docs/AUDITORIA_FASE2.md)
- [Fuentes y método de fase 2](docs/FUENTES_FASE2.md)
- [Verificación de fase 2](docs/VERIFICACION_FASE2.md)

El alcance es un comparador histórico y trazable. No valida rendimientos, fertilización, recuperación del suelo, erosión, balances hídricos ni una «mejor rotación». Las reglas de pH son comparaciones específicas basadas en guías costarricenses y requieren revisión agronómica local antes de recomendar intervenciones. El contrafactual v1 recalcula internamente toda la evaluación y muestra sólo los resultados modificados; la optimización incremental por regla queda pendiente.
