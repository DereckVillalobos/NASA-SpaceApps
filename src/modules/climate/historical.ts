import { z } from "zod";
import { date } from "../provenance/schema";
import { days, sha256 } from "./power";
import { type ExtendedClimateRecord, type ClimateVariable, variables, variableMetadata } from "./power-extended";
import { canonical } from "../rules/engine";

export const HISTORICAL_VERSION="1.0.0";
export const historicalRequestSchema=z.object({parcelId:z.uuid(),startYear:z.number().int().min(1999),endYear:z.number().int().max(2024)}).strict().refine(v=>v.endYear>=v.startYear&&v.endYear-v.startYear>=4&&v.endYear-v.startYear<=9,"Seleccione entre 5 y 10 años completos");
export type HistoricalRequest=z.infer<typeof historicalRequestSchema>;
export type Window={cropId:string;start:string;end:string};
export type VariableSummary={source:string;resolution:string;unit:string|null;completeYears:number;incompleteYears:number;median:number|null;p10:number|null;p90:number|null;min:number|null;max:number|null;mean:number|null};
export function percentile(values:number[],q:number){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*q,lower=Math.floor(index),upper=Math.ceil(index);return sorted[lower]+(sorted[upper]-sorted[lower])*(index-lower);}
export function mappedWindow(window:Window,year:number){
  date.parse(window.start);date.parse(window.end);
  if(window.end<window.start)throw new Error("Ventana invertida");
  const duration=days(window.start,window.end).length;
  if(duration>366)throw new Error("Una etapa agrícola no puede superar 366 días en el análisis histórico");
  const crosses=new Date(`${window.start}T00:00:00Z`).getUTCFullYear()!==new Date(`${window.end}T00:00:00Z`).getUTCFullYear();
  const start=`${year}-${window.start.slice(5)}`,end=`${year+(crosses?1:0)}-${window.end.slice(5)}`;
  if(!date.safeParse(start).success||!date.safeParse(end).success)return null;
  return {start,end,dates:days(start,end)};
}
export function analyzeWindow(window:Window,startYear:number,endYear:number,records:ExtendedClimateRecord[]){
  const byDate=new Map<string,Record<ClimateVariable,number|null>>();
  for(const record of records){for(const key of variables){for(const item of record.data[key].values){const current=byDate.get(item.date)??{T2M:null,PRECTOTCORR:null,IMERG_PRECTOT:null};current[key]=item.value;byDate.set(item.date,current);}}}
  const years=Array.from({length:endYear-startYear+1},(_,i)=>{const year=startYear+i,mapped=mappedWindow(window,year);const series={} as Record<ClimateVariable,{value:number|null;missingDays:number;complete:boolean}>;
    for(const key of variables){const values=mapped?.dates.map(d=>byDate.get(d)?.[key]??null)??[];const missingDays=mapped?values.filter(v=>v===null).length:0;const complete=!!mapped&&missingDays===0;const total=values.reduce<number>((a,b)=>a+(b??0),0);series[key]={value:complete?(key==="T2M"?total/values.length:total):null,missingDays,complete};}
    return {year,start:mapped?.start??null,end:mapped?.end??null,expectedDays:mapped?.dates.length??null,reason:mapped?null:"Fecha de ventana inexistente en este año (por ejemplo, 29 de febrero)",series};});
  const summary={} as Record<ClimateVariable,VariableSummary>;
  for(const key of variables){const values=years.flatMap(y=>y.series[key].value===null?[]:[y.series[key].value]);const n=values.length,meta=variableMetadata[key];summary[key]={source:meta.source,resolution:meta.resolution,unit:records.find(r=>r.data[key].unit)?.data[key].unit??null,completeYears:n,incompleteYears:years.length-n,median:n>=5?percentile(values,.5):null,p10:n>=5?percentile(values,.1):null,p90:n>=5?percentile(values,.9):null,min:n>=5?Math.min(...values):null,max:n>=5?Math.max(...values):null,mean:n>=5?values.reduce((a,b)=>a+b,0)/n:null};}
  return {window,years,summary};
}
export function analyzeHistorical(input:{parcelId:string;startYear:number;endYear:number;scenarios:{id:string;slot:number;name:string;steps:Window[]}[]},records:ExtendedClimateRecord[]){
  historicalRequestSchema.parse({parcelId:input.parcelId,startYear:input.startYear,endYear:input.endYear});
  const comparisons=input.scenarios.map(s=>({scenarioId:s.id,slot:s.slot,name:s.name,steps:s.steps.map(step=>analyzeWindow(step,input.startYear,input.endYear,records))}));
  const payload={version:HISTORICAL_VERSION,kind:"HISTORICAL_DESCRIPTION" as const,period:{startYear:input.startYear,endYear:input.endYear,yearDefinition:"Año de inicio de cada ventana; diciembre–enero usa el año siguiente para la fecha final"},method:"Se trasladan mes y día de cada etapa a cada año de inicio. Suma de precipitación diaria (mm/día como total de cada día UTC) y media aritmética de T2M. Cada variable exige 100 % de días válidos por año; no se imputa. Estadísticos sólo con al menos cinco años completos. Percentiles empíricos por interpolación lineal de rango (n−1)·p.",comparisons,recordRefs:records.map(r=>({key:r.key,query:r.query,url:r.url,rawSha256:r.rawSha256,adapterVersion:r.adapterVersion,apiVersion:r.data.header.api.version,sources:r.data.header.sources})),limitations:["No son pronósticos de las fechas propuestas ni observaciones de la parcela.","MERRA-2 e IMERG se presentan por separado; sus diferencias no miden error local sin validación de campo.","No se infiere rendimiento, aptitud ni disponibilidad de agua para cultivos."]};
  return {...payload,resultHash:sha256(canonical(payload))};
}
export type HistoricalAnalysis=ReturnType<typeof analyzeHistorical>;
