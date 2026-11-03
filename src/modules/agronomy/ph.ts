import type { Scenario } from "../rotations/schema";
import type { SoilSample } from "../soil/schema";
import type { Result, Rule, Status } from "../rules/engine";

export const PH_RULE_VERSION="1.0.0";
const guidelines={
  potato:{min:5,max:7,source:"https://www.mag.go.cr/bibliotecavirtual/f01-10931.pdf",sourceDate:"2017",reference:"INTA Costa Rica, Manual del cultivo de papa en Costa Rica, sección Suelos, p. 37",scope:"Guía nacional costarricense; no validación específica por variedad ni por parcela en Zarcero."},
  onion:{min:6,max:6.5,source:"https://www.mag.go.cr/bibliotecavirtual/F01-9825.pdf",sourceDate:"2022",reference:"INTA Costa Rica, Guía técnica: Cebolla, sección Clima y suelos, p. 10",scope:"Guía costarricense que incluye Zarcero entre zonas productoras; intervalo preferido, no límite de supervivencia."},
} as const;
export function evaluateSoilPh(scenario:Scenario,soils:SoilSample[],evaluatedAt:string):Result[]{
  return (["potato","onion"] as const).filter(crop=>scenario.steps.some(s=>s.cropId===crop)).map(crop=>{
    const guide=guidelines[crop],samples=soils.filter(s=>s.properties.ph.value!==null);
    const rule:Rule={id:`soil-ph-${crop}`,dimension:`pH del suelo · ${crop==="potato"?"papa":"cebolla"}`,version:PH_RULE_VERSION,source:guide.source,reference:guide.reference,sourceDate:guide.sourceDate,crops:[crop],dataRequirements:["Una muestra vigente de laboratorio", "pH, profundidad y método analítico registrados", "Procedencia OBSERVED"],exclusions:["Sin medición", "Fuentes solamente declaradas o cartográficas", "Múltiples muestras activas sin comparación técnica"],expected:`PASS si pH entre ${guide.min} y ${guide.max}; WARNING si fuera; UNKNOWN cuando la evidencia no permite comparación.`,context:guide.scope,limitations:["El intervalo citado no demuestra aptitud global ni rendimiento.","La guía no reemplaza análisis de fertilidad, estructura, drenaje ni asesoría local.","Sólo se evalúa una muestra de laboratorio vigente, con profundidad y método; resultados múltiples requieren revisión."],method:`Comparación inclusiva de pH medido contra intervalo ${guide.min}–${guide.max} citado en ${guide.reference}. Fuera del intervalo → WARNING; dentro → PASS para esta condición únicamente.`};
    let status:Status="UNKNOWN",explanation="No existe una única medición de laboratorio comparable de pH para esta parcela.";
    if(samples.length>1)explanation="Existen varias fuentes o muestras de pH activas; se requiere conciliar fecha, profundidad y método antes de compararlas.";
    else if(samples.length===1){const sample=samples[0];if(sample.origin!=="LABORATORY"||sample.provenance.kind!=="OBSERVED"||!sample.depth||!sample.properties.ph.method)explanation="El pH disponible no es una medición de laboratorio con profundidad y método registrados.";else {const value=sample.properties.ph.value!;status=value>=guide.min&&value<=guide.max?"PASS":"WARNING";explanation=status==="PASS"?`El pH medido (${value}) está dentro del intervalo ${guide.min}–${guide.max} citado para ${crop==="potato"?"papa":"cebolla"}; esto no establece aptitud integral.`:`El pH medido (${value}) está fuera del intervalo ${guide.min}–${guide.max} citado para ${crop==="potato"?"papa":"cebolla"}; revisar con profesional local.`;}}
    return {rule,status,explanation,dataUsed:{crop,reference:guide.reference,range:{min:guide.min,max:guide.max,unit:"pH"},samples:samples.map(s=>({id:s.id,supersedesId:s.supersedesId??null,value:s.properties.ph.value,method:s.properties.ph.method,depth:s.depth,origin:s.origin,provenance:s.provenance}))},date:evaluatedAt,resolution:samples.length===1?`${samples[0].depth?.top??"?"}–${samples[0].depth?.bottom??"?"} cm`:null,assumptions:[]};
  });
}
