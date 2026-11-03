import { fetchExtendedPower } from "../src/modules/climate/power-extended";
import type { ClimateCache, ClimateRecord } from "../src/modules/climate/power";

const records=new Map<string,ClimateRecord>();
const cache:ClimateCache={get:key=>records.get(key)??null,put:record=>{records.set(record.key,record);}};
const query={latitude:10.19,longitude:-84.39,start:"2025-01-01",end:"2025-01-03"};
async function main(){
  const result=await fetchExtendedPower(query,cache);
  const again=await fetchExtendedPower(query,cache);
  if(!result.data.header.sources.some(s=>s.toUpperCase().includes("IMERG")))throw new Error("NASA no identificó IMERG como fuente");
  if(!result.data.IMERG_PRECTOT.available)throw new Error("IMERG no entregó valores para la muestra");
  if(!again.cacheHit)throw new Error("La segunda consulta no usó caché");
  console.log(JSON.stringify({query,url:result.url,retrievedAt:result.retrievedAt,rawSha256:result.rawSha256,api:result.data.header.api.version,sources:result.data.header.sources,timeStandard:result.data.header.time_standard,variables:Object.fromEntries(["T2M","PRECTOTCORR","IMERG_PRECTOT"].map(key=>{const v=result.data[key as keyof Pick<typeof result.data,"T2M"|"PRECTOTCORR"|"IMERG_PRECTOT">];return [key,{unit:v.unit,resolution:v.resolution,source:v.source,values:v.values,missingDays:v.missingDays}]})),cacheHit:again.cacheHit},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
