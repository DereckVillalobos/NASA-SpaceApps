# Reglas de coherencia · versión 1.0.0

Estas reglas son especificaciones del software, no evidencia agronómica. Una condición PASS no significa que una rotación sea recomendable. UNKNOWN nunca se agrega ni se promueve a PASS. No hay puntuación global.

## calendar
Contexto: un único cultivo ocupa la parcela completa durante cada intervalo inclusivo [inicio, fin]. Dos etapas que comparten un día se solapan. PASS: ninguna intersección; FAIL: intersección. No se valida duración, ventana de siembra ni policultivo. Fuente: este contrato de calendario de SueloRuta.

## deadline
Contexto: el productor declara la última fecha de disponibilidad de la parcela. FAIL si alguna etapa acaba después; PASS si todas acaban antes o ese día. NOT_APPLICABLE si no declaró límite. No equivale a disponibilidad de agua o recursos. Fuente: restricción registrada por el productor y este contrato.

## irrigation
Contexto: requisito de riego del escenario y disponibilidad declarada de la finca. Requisito desconocido → UNKNOWN; no requerido → NOT_APPLICABLE; requerido y disponibilidad desconocida → UNKNOWN; disponible → PASS; no disponible → FAIL. No se estima necesidad, caudal, agua útil ni suficiencia. Fuente: declaraciones del productor y este contrato de compatibilidad lógica.

## history
Contexto: antecedentes declarados de la parcela. Ausentes → UNKNOWN; presentes → WARNING para revisión especializada. No se interpreta que un historial vacío signifique ausencia real de cultivos. Fuente: este contrato de completitud, sin interpretación sanitaria.

## Reglas agronómicas pendientes
La aptitud integral de suelo y clima y los efectos de rotación no tienen umbrales ni fuentes suficientes. Estas dimensiones generales devuelven UNKNOWN incluso cuando hay mediciones. `applyRule` fuerza UNKNOWN si la fuente está ausente. Antes de habilitar otra regla se deben documentar referencia específica, alcance geográfico, cultivar/etapa, método analítico, unidades, supuestos, limitaciones y pruebas contrastadas. Una cita botánica no es evidencia de requerimientos agronómicos.

## Reglas agronómicas acotadas del motor 2.0.0

Estas reglas **no cambian** `soil-suitability`, que permanece `UNKNOWN`. `PASS` sólo indica que un pH medido cae dentro de un intervalo citado; no determina aptitud integral. Cada registro de resultado conserva fuente, edición, cultivo, condiciones de datos, exclusiones, método y versión.

### soil-ph-potato

Fuente: [INTA, *Manual del cultivo de papa en Costa Rica* (2017), sección Suelos, p. 37](https://www.mag.go.cr/bibliotecavirtual/f01-10931.pdf). El manual cita pH 5–7 para el suelo de cultivo. Ámbito: guía costarricense que menciona Zarcero como zona productora; sin calibración por cultivar o parcela. Entrada: una sola muestra de laboratorio vigente, con pH, método, profundidad y procedencia `OBSERVED`. PASS dentro de [5,7]; WARNING fuera; UNKNOWN si falta, es declarada/cartográfica o hay muestras activas múltiples sin conciliación. No se aplica a cebolla o zanahoria ni decide enmiendas o rendimiento. La fuente de la guía remite a literatura previa; el intervalo debe contrastarse localmente antes de utilizarlo para recomendaciones.

### soil-ph-onion

Fuente: [INTA, *Guía técnica: Producción de cebolla* (2022), «Clima y suelos», p. 10](https://www.mag.go.cr/bibliotecavirtual/F01-9825.pdf). Cita pH **preferido** 6.0–6.5 e incluye Zarcero entre zonas de cultivo. Entrada y exclusiones iguales a la regla de papa. PASS dentro de [6.0,6.5]; WARNING fuera; UNKNOWN con evidencia insuficiente o conflictiva. El intervalo preferido no constituye un límite de supervivencia ni una predicción de cosecha. No se aplica a papa o zanahoria.

### Sin regla activada para zanahoria, agua y sucesión

No se encontró en esta fase una fuente local suficientemente precisa para transformar pH de zanahoria, lluvia acumulada, familias botánicas o un ensayo de *Globodera* en una restricción automática defendible. FAO 56 exige evapotranspiración y coeficientes por etapa para estimar demanda hídrica; POWER sólo aporta la parte climática regional. Estas dimensiones siguen `UNKNOWN` hasta disponer de mediciones y validación apropiadas.
