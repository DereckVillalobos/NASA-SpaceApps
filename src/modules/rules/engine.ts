import { createHash } from "node:crypto";
import type { Farm } from "../farms/schema";
import type { Parcel } from "../parcels/schema";
import type { SoilSample } from "../soil/schema";
import { scenarioSchema, type Scenario } from "../rotations/schema";
import type { ClimateRecord } from "../climate/power";
import { CATALOG_VERSION } from "../crops/catalog";

export const ENGINE_VERSION="1.0.0";
export type Status="PASS"|"WARNING"|"FAIL"|"UNKNOWN"|"NOT_APPLICABLE";
export interface EvaluationContext { farm:Farm; parcel:Parcel; soils:SoilSample[]; scenarios:Scenario[]; climate:ClimateRecord|null; evaluatedAt:string; }
export interface Rule {id:string;dimension:string;version:string;source:string|null;context:string;limitations:string[];method:string;reference?:string;sourceDate?:string;crops?:string[];dataRequirements?:string[];exclusions?:string[];expected?:string;}
export interface Result {rule:Rule;status:Status;explanation:string;dataUsed:unknown;date:string;resolution:string|null;assumptions:string[];}
export function applyRule(rule:Rule, result:Omit<Result,"rule">):Result {
  if(!rule.source?.trim()) return {...result,rule,status:"UNKNOWN",explanation:"Regla sin evidencia documentada; no es posible concluir aptitud."};
  return {...result,rule};
}
// Canonical JSON makes key insertion order irrelevant; arrays retain semantic order.
export function canonical(value:unknown):string {
  if(Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if(value!==null && typeof value==="object") return `{${Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
const engineering=(id:string,dimension:string,method:string):Rule=>({id,dimension,version:"1.0.0",source:`docs/REGLAS.md#${id}`,context:"Comprobación de coherencia del escenario declarado; no es recomendación agronómica.",limitations:["PASS sólo confirma esta condición estructural.","Las declaraciones no se verifican en campo."],method});
export function evaluate(context:EvaluationContext) {
  if(!Number.isFinite(Date.parse(context.evaluatedAt))) throw new Error("Fecha explícita de evaluación inválida");
  if(context.parcel.farmId!==context.farm.id || context.scenarios.some(s=>s.parcelId!==context.parcel.id) || context.soils.some(s=>s.parcelId!==context.parcel.id)) throw new Error("La evidencia pertenece a otra finca o parcela");
  if(context.scenarios.length!==3 || new Set(context.scenarios.map(s=>s.slot)).size!==3) throw new Error("La comparación requiere las tres alternativas");
  const comparisons=[...context.scenarios].sort((a,b)=>a.slot-b.slot).map(s=>{
    const {id: _id,version: _version,savedAt: _savedAt,...input}=s;
    scenarioSchema.parse(input);
    const result=(rule:Rule,status:Status,explanation:string,dataUsed:unknown,resolution:string|null=null)=>applyRule(rule,{status,explanation,dataUsed,date:context.evaluatedAt,resolution,assumptions:s.provenance.assumptions});
    const ordered=[...s.steps].sort((a,b)=>a.start.localeCompare(b.start));
    const overlaps=ordered.slice(1).some((step,i)=>step.start<=ordered[i].end);
    const deadline=s.constraints.availableUntil;
    const irrigation=s.constraints.irrigationRequired;
    const available=context.farm.resources.irrigation;
    return {scenarioId:s.id,scenarioName:s.name,scenarioVersion:s.version,slot:s.slot,results:[
      result(engineering("calendar","Calendario","Ordenar intervalos inclusivos y detectar intersección en una misma parcela."),overlaps?"FAIL":"PASS",overlaps?"Hay cultivos con fechas superpuestas en la misma parcela.":"Los intervalos declarados no se superponen; las duraciones no han sido validadas agronómicamente.",s.steps),
      result(engineering("deadline","Disponibilidad de parcela","Comparar fin de cada etapa con la fecha límite declarada."),deadline===null?"NOT_APPLICABLE":s.steps.some(step=>step.end>deadline)?"FAIL":"PASS",deadline===null?"No se declaró una fecha límite; no se evalúa esta restricción.":"Comparación con la fecha límite indicada por el productor.",{deadline,ends:s.steps.map(step=>step.end)}),
      result(engineering("irrigation","Recursos","Comparar requisito de riego declarado con disponibilidad declarada."),irrigation===null?"UNKNOWN":irrigation===false?"NOT_APPLICABLE":available===null?"UNKNOWN":available?"PASS":"FAIL",irrigation===null?"No se declaró si este escenario requiere riego.":irrigation===false?"El productor no exige riego para este escenario; no implica suficiencia hídrica.":available===null?"Se requiere riego, pero su disponibilidad es desconocida.":available?"Se declaró disponibilidad de riego; no se conoce su capacidad ni suficiencia.":"El escenario exige riego y la finca declara que no dispone de él.",{required:irrigation,available,provenance:context.farm.provenance}),
      result(engineering("history","Antecedentes","Comprobar presencia de antecedentes declarados; no inferir efectos de rotación."),context.parcel.history?.length?"WARNING":"UNKNOWN",context.parcel.history?.length?"Hay antecedentes declarados; sus implicaciones sanitarias y de manejo requieren revisión especializada.":"No hay antecedentes documentados suficientes.",{history:context.parcel.history,provenance:context.parcel.provenance}),
      result({id:"soil-suitability",dimension:"Aptitud del suelo",version:"1.0.0",source:null,context:"Horticultura de altura; métodos y cultivar por validar.",limitations:["No existen umbrales locales validados en este catálogo.","No se deduce química de taxonomía."],method:"Sin regla agronómica habilitada"},"UNKNOWN","",{samples:context.soils,crops:s.steps.map(step=>step.cropId)}),
      result({id:"climate-suitability",dimension:"Aptitud climática",version:"1.0.0",source:null,context:"POWER histórico regional; no pronóstico de las fechas propuestas.",limitations:["Requiere validación local y umbrales documentados por cultivo y etapa."],method:"Sin regla agronómica habilitada"},"UNKNOWN","",context.climate?{key:context.climate.key,rawSha256:context.climate.rawSha256,query:context.climate.query,source:context.climate.url,header:context.climate.data.header}:null,context.climate?.data.resolution??null),
      result({id:"rotation-effects",dimension:"Efectos de rotación",version:"1.0.0",source:null,context:"Cultivos, recursos y prioridades declarados.",limitations:["Sin validación de patógenos, nutrientes, trabajo, costos ni resultados productivos."],method:"Sin regla agronómica habilitada"},"UNKNOWN","",{steps:s.steps,resources:context.farm.resources,priorities:context.farm.priorities,notes:s.constraints.notes}),
    ]};
  });
  const hypothetical=context.farm.provenance.hypothetical || context.parcel.provenance.hypothetical || context.soils.some(s=>s.provenance.hypothetical) || context.scenarios.some(s=>s.provenance.hypothetical);
  const payload={engineVersion:ENGINE_VERSION,catalogVersion:CATALOG_VERSION,evaluatedAt:context.evaluatedAt,hypothetical,comparisons};
  const inputHash=createHash("sha256").update(canonical(context)).digest("hex");
  return {...payload,inputHash,resultHash:createHash("sha256").update(canonical(payload)).digest("hex")};
}
