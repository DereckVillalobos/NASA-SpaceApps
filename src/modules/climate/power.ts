import { z } from "zod";
import { createHash } from "node:crypto";
import { coordinatesSchema, date } from "../provenance/schema";

export const POWER_VERSION = "1.0.0";
export const POWER_DOCS = "https://power.larc.nasa.gov/docs/services/api/temporal/daily/";
export const climateQuerySchema = coordinatesSchema.extend({ start: date, end: date }).strict().refine(q=>q.start<=q.end,"Intervalo invertido").refine(q=>q.start>="1981-01-01","POWER diario comienza en 1981").refine(q=>(Date.parse(q.end)-Date.parse(q.start))/86400000<366,"Máximo 366 días por consulta en este prototipo");
export type ClimateQuery = z.infer<typeof climateQuerySchema>;
const series = z.record(z.string().regex(/^\d{8}$/),z.number().finite().nullable());
export const powerResponseSchema = z.object({
  type:z.literal("Feature"), geometry:z.object({type:z.literal("Point"),coordinates:z.array(z.number().finite()).min(2)}),
  properties:z.object({parameter:z.object({T2M:series.optional(),PRECTOTCORR:series.optional()})}),
  header:z.object({title:z.string(),api:z.object({version:z.string(),name:z.string()}),sources:z.array(z.string()),fill_value:z.number().finite(),time_standard:z.literal("UTC"),start:z.string(),end:z.string()}),
  parameters:z.object({T2M:z.object({units:z.literal("C"),longname:z.string()}).optional(),PRECTOTCORR:z.object({units:z.literal("mm/day"),longname:z.string()}).optional()}),
  messages:z.array(z.string()),
});
export class PowerError extends Error { constructor(message:string,readonly status=502){super(message);} }
export function sha256(value:string) {return createHash("sha256").update(value).digest("hex");}
export function days(start:string,end:string) { const result:string[]=[]; for(let d=Date.parse(start);d<=Date.parse(end);d+=86400000) result.push(new Date(d).toISOString().slice(0,10)); return result; }
export function powerUrl(query: ClimateQuery) {
  const q=climateQuerySchema.parse(query);
  const params=new URLSearchParams({parameters:"T2M,PRECTOTCORR",community:"AG",longitude:String(q.longitude),latitude:String(q.latitude),start:q.start.replaceAll("-",""),end:q.end.replaceAll("-",""),format:"JSON","time-standard":"UTC"});
  return `https://power.larc.nasa.gov/api/temporal/daily/point?${params}`;
}
export function normalizePower(raw:unknown,query:ClimateQuery) {
  const parsed=powerResponseSchema.safeParse(raw);
  if(!parsed.success) throw new PowerError("Respuesta POWER incompatible: estructura, metadatos o unidades no reconocidos");
  const r=parsed.data;
  if(r.header.start!==query.start.replaceAll("-","") || r.header.end!==query.end.replaceAll("-", "")) throw new PowerError("POWER devolvió un intervalo diferente");
  if(Math.abs(r.geometry.coordinates[0]-query.longitude)>0.001 || Math.abs(r.geometry.coordinates[1]-query.latitude)>0.001) throw new PowerError("POWER devolvió coordenadas diferentes");
  const normalize=(parameter:"T2M"|"PRECTOTCORR")=>{
    if(r.properties.parameter[parameter] && !r.parameters[parameter]) throw new PowerError(`Faltan unidades de ${parameter}`);
    const values=days(query.start,query.end).map(date=>{
      const v=r.properties.parameter[parameter]?.[date.replaceAll("-","")];
      return {date,value: v == null || v===r.header.fill_value || (parameter==="PRECTOTCORR" && v<0) ? null : v};
    });
    return { unit: r.parameters[parameter]?.units ?? null, values, missingDays:values.filter(v=>v.value===null).length, available:values.some(v=>v.value!==null) };
  };
  return {
    T2M:normalize("T2M"), PRECTOTCORR:normalize("PRECTOTCORR"), header:r.header, geometry:r.geometry, messages:r.messages,
    resolution:r.header.sources.some(source=>source.toUpperCase().includes("MERRA2"))?"0.5° latitud × 0.625° longitud para meteorología MERRA-2; regional":"Resolución no verificada para las fuentes devueltas; consultar documentación del proveedor",
    resolutionReference:"https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/",
    kind:"ESTIMATED" as const, method:"Reanálisis histórico distribuido por NASA POWER; normalización de faltantes a null", hypothetical:false,
    limitations:["No es pronóstico ni medición de la parcela.","El punto y la elevación de la respuesta no delimitan la finca ni describen su suelo.","No se corrige el relieve ni se infieren propiedades locales.","La disponibilidad reciente depende del proveedor."],
  };
}
export type ClimateRecord = {
  key:string; query:ClimateQuery; url:string; retrievedAt:string; raw:string; rawSha256:string;
  responseHeaders:Record<string,string|null>; adapterVersion:string; data:ReturnType<typeof normalizePower>;
};
export interface ClimateCache { get(key:string):ClimateRecord|null; put(record:ClimateRecord):void; }
export async function fetchPower(input:unknown,cache:ClimateCache,options:{fetcher?:typeof fetch;now?:Date}={}) {
  const q=climateQuerySchema.parse(input), now=options.now??new Date();
  if(q.end>=now.toISOString().slice(0,10)) throw new PowerError("Seleccione fechas históricas anteriores a hoy (UTC)",400);
  const url=powerUrl(q), key=sha256(url+POWER_VERSION), hit=cache.get(key);
  if(hit) return {...hit,cacheHit:true};
  let response:Response;
  try { response=await (options.fetcher??fetch)(url,{signal:AbortSignal.timeout(25000),headers:{Accept:"application/json"}}); }
  catch(error) { const timeout=error instanceof Error && ["TimeoutError","AbortError"].includes(error.name); throw new PowerError(timeout?"NASA POWER excedió el tiempo de espera":"No fue posible conectar con NASA POWER",timeout?504:502); }
  if(!response.ok) throw new PowerError(`NASA POWER respondió HTTP ${response.status}. No se generaron datos de reemplazo.`);
  let raw:string, json:unknown;
  try {raw=await response.text();json=JSON.parse(raw);} catch {throw new PowerError("NASA POWER no devolvió JSON válido");}
  const data=normalizePower(json,q);
  const record:ClimateRecord={key,query:q,url,retrievedAt:now.toISOString(),raw,rawSha256:sha256(raw),responseHeaders:{"content-type":response.headers.get("content-type"),etag:response.headers.get("etag"),"last-modified":response.headers.get("last-modified")},adapterVersion:POWER_VERSION,data};
  cache.put(record);
  return {...record,cacheHit:false};
}
