import { z } from "zod";
import { date } from "../provenance/schema";
import { cropIdSchema, scenarioSchema } from "../rotations/schema";
import { canonical, type EvaluationContext } from "./engine";
import { evaluateV2 } from "./engine-v2";
import { analyzeHistorical } from "../climate/historical";
import type { HistoricalRecord } from "../../server/historical-service";

const slot=z.number().int().min(1).max(3);
export const counterfactualChangeSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("sowingDate"),slot,stepIndex:z.number().int().nonnegative(),value:date}).strict(),
  z.object({type:z.literal("crop"),slot,stepIndex:z.number().int().nonnegative(),value:cropIdSchema}).strict(),
  z.object({type:z.literal("irrigationRequired"),slot,value:z.boolean().nullable()}).strict(),
  z.object({type:z.literal("soilPh"),sampleId:z.uuid(),value:z.number().finite()}).strict(),
]);
export type CounterfactualChange=z.infer<typeof counterfactualChangeSchema>;
export function counterfactual(context:EvaluationContext,changeInput:unknown,historical?:HistoricalRecord){
  const change=counterfactualChangeSchema.parse(changeInput),next:EvaluationContext=structuredClone(context);
  if(change.type==="soilPh"){
    const sample=next.soils.find(s=>s.id===change.sampleId);
    if(!sample||sample.properties.ph.value===null)throw new Error("Seleccione una propiedad de pH conocida en la evidencia original");
    sample.properties.ph.value=change.value;
    sample.provenance.hypothetical=true;
  }else{
    const scenario=next.scenarios.find(s=>s.slot===change.slot);
    if(!scenario)throw new Error("Rotación no encontrada");
    if(change.type==="irrigationRequired")scenario.constraints.irrigationRequired=change.value;
    else{
      const step=scenario.steps[change.stepIndex];
      if(!step)throw new Error("Etapa no encontrada");
      if(change.type==="sowingDate")step.start=change.value;
      else step.cropId=change.value;
    }
    const {id:_id,version:_version,savedAt:_savedAt,...input}=scenario;
    scenarioSchema.parse(input);
    scenario.provenance.hypothetical=true;
  }
  const before=evaluateV2(context,historical),updatedHistorical=historical&&["sowingDate","crop"].includes(change.type)?{...historical,analysis:analyzeHistorical({parcelId:next.parcel.id,startYear:historical.analysis.period.startYear,endYear:historical.analysis.period.endYear,scenarios:next.scenarios},historical.sourceRecords)}:historical;
  const after=evaluateV2(next,updatedHistorical);
  const deltas=after.comparisons.flatMap((comparison,i)=>{const prior=before.comparisons[i],ids=new Set([...prior.results.map(r=>r.rule.id),...comparison.results.map(r=>r.rule.id)]);return [...ids].flatMap(id=>{const original=prior.results.find(r=>r.rule.id===id)??null,result=comparison.results.find(r=>r.rule.id===id)??null;return original&&result&&canonical({status:original.status,dataUsed:original.dataUsed,explanation:original.explanation})===canonical({status:result.status,dataUsed:result.dataUsed,explanation:result.explanation})?[]:[{slot:comparison.slot,scenario:comparison.scenarioName,ruleId:id,before:original,after:result}];});});
  const climateDelta=updatedHistorical&&historical&&updatedHistorical.analysis.resultHash!==historical.analysis.resultHash?{beforeHash:historical.analysis.resultHash,afterHash:updatedHistorical.analysis.resultHash,analysis:updatedHistorical.analysis}:null;
  return {version:"1.0.0",hypothetical:true,change,explanation:change.type==="sowingDate"?"La fecha propuesta modifica la coherencia del calendario y, si hay series NASA, la ventana histórica descriptiva.":change.type==="crop"?"El cultivo propuesto modifica las reglas aplicables; las cifras climáticas de la misma ventana no predicen su rendimiento.":change.type==="irrigationRequired"?"Se modifica únicamente una restricción hídrica declarada, sin estimar demanda de agua.":"El pH modificado es hipotético; sólo se compara con intervalos documentados, sin modificar el registro de laboratorio.",beforeHash:before.resultHash,afterHash:after.resultHash,deltas,climateDelta,limitations:["No se guarda este cambio en la finca ni se interpreta como pronóstico.","La primera versión recalcula el motor completo de forma determinista y presenta sólo resultados modificados; cálculo incremental por regla pendiente."]};
}

export function missingInformation(context:EvaluationContext){
  const needs:{slot:number;ruleId:string;question:string;reason:string;intervalAnalysis:"NOT_POSSIBLE"}[]=[];
  for(const scenario of context.scenarios){
    if(scenario.constraints.irrigationRequired===null)needs.push({slot:scenario.slot,ruleId:"irrigation",question:"¿Este escenario exige riego?",reason:"La restricción no fue declarada; no se puede evaluar compatibilidad con recursos.",intervalAnalysis:"NOT_POSSIBLE"});
    else if(scenario.constraints.irrigationRequired&&context.farm.resources.irrigation===null)needs.push({slot:scenario.slot,ruleId:"irrigation",question:"¿La finca dispone de riego para este escenario?",reason:"El requisito es afirmativo y la disponibilidad es desconocida.",intervalAnalysis:"NOT_POSSIBLE"});
    if(scenario.steps.some(step=>step.cropId==="potato"||step.cropId==="onion")){
      const samples=context.soils.filter(s=>s.properties.ph.value!==null);
      if(samples.length!==1||samples[0].origin!=="LABORATORY"||samples[0].provenance.kind!=="OBSERVED"||!samples[0].depth||!samples[0].properties.ph.method)needs.push({slot:scenario.slot,ruleId:"soil-ph",question:"¿Cuál es el pH de una muestra de laboratorio vigente, con profundidad y método documentados?",reason:samples.length>1?"Hay resultados activos múltiples que requieren conciliación técnica.":"La evidencia de pH es ausente o no comparable para las reglas documentadas de papa y cebolla.",intervalAnalysis:"NOT_POSSIBLE"});
    }
  }
  return {version:"1.0.0",method:"Dependencias explícitas de reglas activas; no se asignan probabilidades ni un valor económico de la información.",items:needs,limitations:["Sin un intervalo medido y defendible de la propiedad desconocida no se simula un rango de resultados.","La lista no sustituye un plan local de muestreo o diagnóstico."]};
}
