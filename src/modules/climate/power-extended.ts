import { z } from "zod";
import { climateQuerySchema, days, PowerError, sha256, type ClimateCache } from "./power";

export const EXTENDED_POWER_VERSION = "2.0.0";
const variable = z.record(z.string().regex(/^\d{8}$/), z.number().finite().nullable());
const responseSchema = z.object({
  type:z.literal("Feature"),
  geometry:z.object({type:z.literal("Point"),coordinates:z.array(z.number().finite()).min(2)}),
  properties:z.object({parameter:z.object({T2M:variable.optional(),PRECTOTCORR:variable.optional(),IMERG_PRECTOT:variable.optional()})}),
  header:z.object({title:z.string(),api:z.object({version:z.string(),name:z.string()}),sources:z.array(z.string()),fill_value:z.number().finite(),time_standard:z.literal("UTC"),start:z.string(),end:z.string()}),
  parameters:z.object({T2M:z.object({units:z.literal("C"),longname:z.string()}).optional(),PRECTOTCORR:z.object({units:z.literal("mm/day"),longname:z.string()}).optional(),IMERG_PRECTOT:z.object({units:z.literal("mm/day"),longname:z.string()}).optional()}),
  messages:z.array(z.string()),
});
export type ExtendedQuery = z.infer<typeof climateQuerySchema>;
export const variables = ["T2M","PRECTOTCORR","IMERG_PRECTOT"] as const;
export type ClimateVariable = typeof variables[number];
export const variableMetadata = {
  T2M:{source:"MERRA-2 vía NASA POWER",resolution:"0.5° latitud × 0.625° longitud",reference:"https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/"},
  PRECTOTCORR:{source:"MERRA-2, precipitación corregida vía NASA POWER",resolution:"0.5° latitud × 0.625° longitud",reference:"https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/"},
  IMERG_PRECTOT:{source:"GPM IMERG multisatélite vía NASA POWER",resolution:"0.1° latitud × 0.1° longitud",reference:"https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/"},
} as const;
export function extendedPowerUrl(query:ExtendedQuery){
  const q=climateQuerySchema.parse(query);
  const p=new URLSearchParams({parameters:variables.join(","),community:"AG",longitude:String(q.longitude),latitude:String(q.latitude),start:q.start.replaceAll("-",""),end:q.end.replaceAll("-",""),format:"JSON","time-standard":"UTC"});
  return `https://power.larc.nasa.gov/api/temporal/daily/point?${p}`;
}
export function normalizeExtendedPower(raw:unknown,query:ExtendedQuery){
  const parsed=responseSchema.safeParse(raw);
  if(!parsed.success) throw new PowerError("Respuesta POWER incompatible: estructura, metadatos o unidades no reconocidos");
  const r=parsed.data;
  if(r.header.start!==query.start.replaceAll("-","") || r.header.end!==query.end.replaceAll("-",""))throw new PowerError("POWER devolvió otro intervalo");
  if(Math.abs(r.geometry.coordinates[0]-query.longitude)>0.001 || Math.abs(r.geometry.coordinates[1]-query.latitude)>0.001)throw new PowerError("POWER devolvió otras coordenadas");
  const output={} as Record<ClimateVariable,{unit:string|null;values:{date:string;value:number|null}[];missingDays:number;available:boolean;source:string;resolution:string;reference:string}>;
  for(const key of variables){
    const input=r.properties.parameter[key], unit=r.parameters[key]?.units;
    if(input && !unit)throw new PowerError(`Faltan unidades de ${key}`);
    if(input && !r.header.sources.some(s=>s.toUpperCase().includes(key==="IMERG_PRECTOT"?"IMERG":"MERRA")))throw new PowerError(`La fuente de ${key} no coincide con los metadatos`);
    const values=days(query.start,query.end).map(date=>{const value=input?.[date.replaceAll("-","")];return {date,value:value==null||value===r.header.fill_value||(key!=="T2M"&&value<0)?null:value};});
    output[key]={unit:unit??null,values,missingDays:values.filter(v=>v.value===null).length,available:values.some(v=>v.value!==null),...variableMetadata[key]};
  }
  return {...output,header:r.header,geometry:r.geometry,messages:r.messages,kind:"ESTIMATED" as const,method:"Serie diaria UTC de NASA POWER; faltantes como null, sin interpolación",limitations:["Análisis regional histórico; no pronóstico ni medición parcelaria.","MERRA-2 e IMERG son productos diferentes y no se promedian entre sí.","La versión exacta del producto IMERG subyacente no figura en esta respuesta POWER; se conserva la versión de API."]};
}
export type ExtendedClimateRecord={key:string;query:ExtendedQuery;url:string;retrievedAt:string;raw:string;rawSha256:string;responseHeaders:Record<string,string|null>;adapterVersion:string;data:ReturnType<typeof normalizeExtendedPower>};
export async function fetchExtendedPower(input:unknown,cache:ClimateCache,options:{fetcher?:typeof fetch;now?:Date}={}){
  const query=climateQuerySchema.parse(input),now=options.now??new Date();
  if(query.end>=now.toISOString().slice(0,10))throw new PowerError("Seleccione fechas anteriores a hoy (UTC)",400);
  const url=extendedPowerUrl(query),key=sha256(url+EXTENDED_POWER_VERSION),hit=cache.get(key) as ExtendedClimateRecord|null;
  if(hit)return {...hit,cacheHit:true};
  let response:Response;
  try{response=await (options.fetcher??fetch)(url,{signal:AbortSignal.timeout(25000),headers:{Accept:"application/json"}});}catch(error){const timeout=error instanceof Error&&["TimeoutError","AbortError"].includes(error.name);throw new PowerError(timeout?"NASA POWER excedió el tiempo de espera":"No fue posible conectar con NASA POWER",timeout?504:502);}
  if(!response.ok)throw new PowerError(`NASA POWER respondió HTTP ${response.status}. No se generaron datos de reemplazo.`);
  let raw:string,json:unknown;
  try{raw=await response.text();json=JSON.parse(raw);}catch{throw new PowerError("NASA POWER no devolvió JSON válido");}
  const data=normalizeExtendedPower(json,query);
  const record:ExtendedClimateRecord={key,query,url,retrievedAt:now.toISOString(),raw,rawSha256:sha256(raw),responseHeaders:{"content-type":response.headers.get("content-type"),etag:response.headers.get("etag"),"last-modified":response.headers.get("last-modified")},adapterVersion:EXTENDED_POWER_VERSION,data};
  cache.put(record as never);
  return {...record,cacheHit:false};
}
