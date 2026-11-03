import { fetchPower } from "../src/modules/climate/power";
import { openDatabase } from "../src/server/db";
import { ScienceRepository } from "../src/server/science-repository";
async function main(){const db=openDatabase();try{const result=await fetchPower({latitude:10.19,longitude:-84.39,start:"2025-01-01",end:"2025-01-03"},new ScienceRepository(db).climateCache());console.log(JSON.stringify({url:result.url,cacheHit:result.cacheHit,retrievedAt:result.retrievedAt,api:result.data.header.api,parameters:{T2M:result.data.T2M,PRECTOTCORR:result.data.PRECTOTCORR},rawSha256:result.rawSha256,limitation:"Punto de consulta de verificación; no representa una finca registrada."},null,2));}finally{db.close();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
