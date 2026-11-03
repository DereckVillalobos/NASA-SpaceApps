import { randomUUID } from "node:crypto";
import { Repository } from "./repository";
import { soilSchema, type SoilSample } from "../modules/soil/schema";
import { scenarioSchema, type Scenario } from "../modules/rotations/schema";
import type { ClimateRecord, ClimateCache } from "../modules/climate/power";
export class ScienceRepository extends Repository {
  soils(parcelId:string):SoilSample[] {this.parcel(parcelId);return this.db.prepare("SELECT payload FROM soil_samples WHERE parcel_id=? ORDER BY rowid").all(parcelId).map(r=>JSON.parse(r.payload as string));}
  activeSoils(parcelId:string):SoilSample[] {const all=this.soils(parcelId),replaced=new Set(all.flatMap(s=>s.supersedesId?[s.supersedesId]:[]));return all.filter(s=>!replaced.has(s.id));}
  createSoil(input:unknown):SoilSample {
    const p=soilSchema.parse(input);this.parcel(p.parcelId);
    if(p.sampledAt>new Date().toISOString().slice(0,10)) throw new Error("Un muestreo no puede tener fecha futura");
    if(p.supersedesId){const all=this.soils(p.parcelId),old=all.find(s=>s.id===p.supersedesId);if(!old)throw new Error("El registro corregido no pertenece a esta parcela");if(all.some(s=>s.supersedesId===old.id))throw new Error("Este registro ya fue corregido; seleccione la versión vigente");}
    return this.transaction(()=>{const s:SoilSample={...p,id:randomUUID(),createdAt:new Date().toISOString(),provenance:this.provenance(p.provenance)};this.db.prepare("INSERT INTO soil_samples VALUES (?,?,?,?)").run(s.id,s.parcelId,s.provenance.id,JSON.stringify(s));return s;});
  }
  scenarios(parcelId:string):Scenario[] {this.parcel(parcelId);return this.db.prepare("SELECT payload FROM scenarios WHERE parcel_id=? ORDER BY slot").all(parcelId).map(r=>JSON.parse(r.payload as string));}
  saveScenario(input:unknown):Scenario {
    const p=scenarioSchema.parse(input);this.parcel(p.parcelId);
    return this.transaction(()=>{const old=this.scenarios(p.parcelId).find(s=>s.slot===p.slot);const s:Scenario={...p,id:old?.id??randomUUID(),version:(old?.version??0)+1,savedAt:new Date().toISOString()};this.db.prepare("INSERT INTO scenarios VALUES (?,?,?,?) ON CONFLICT(parcel_id,slot) DO UPDATE SET payload=excluded.payload").run(s.id,s.parcelId,s.slot,JSON.stringify(s));return s;});
  }
  climateCache():ClimateCache {return {
    get:(key:string)=>{const row=this.db.prepare("SELECT payload FROM climate_cache WHERE cache_key=?").get(key);return row?JSON.parse(row.payload as string) as ClimateRecord:null;},
    put:(record:ClimateRecord)=>{this.db.prepare("INSERT INTO climate_cache VALUES (?,?) ON CONFLICT(cache_key) DO NOTHING").run(record.key,JSON.stringify(record));},
  };}
}
