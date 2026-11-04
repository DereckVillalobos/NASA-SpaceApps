import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setup, scenarioInput } from "./fixtures";
import { openDatabase } from "../src/server/db";
import { ScienceRepository } from "../src/server/science-repository";
import { RevisionConflict } from "../src/server/repository";
import { createEvaluation } from "../src/server/service";
import { evaluateV2 } from "../src/modules/rules/engine-v2";
import { handle } from "../src/server/http";
function farmData(f: ReturnType<typeof setup>["farm"]) { const {id,createdAt,revision,...input}=f; const {id:pid,version,recordedAt,...provenance}=input.provenance; return {...input,provenance}; }
function parcelData(p: ReturnType<typeof setup>["parcel"]) { const {id,createdAt,revision,areaM2,areaMethod,...input}=p; const {id:pid,version,recordedAt,...provenance}=input.provenance; return {...input,provenance}; }
describe("Correcciones versionadas de fincas y parcelas",()=>{
  it("conserva fuente, desconocidos y revisión original; bloquea sobrescrituras obsoletas",async()=>{
    const s=setup();try{
      const next=s.repo.reviseFarm(s.farm.id,1,{...farmData(s.farm),canton:"Zarcero",district:null,name:"Nombre corregido"});
      expect(next.revision).toBe(2);expect(next.district).toBeNull();expect(next.resources.irrigation).toBeNull();
      expect(s.repo.farmHistory(s.farm.id)).toEqual([s.farm,next]);expect(next.provenance.id).not.toBe(s.farm.provenance.id);
      expect(()=>s.repo.reviseFarm(s.farm.id,1,farmData(s.farm))).toThrow(RevisionConflict);
      expect(s.repo.farmHistory(s.farm.id)).toHaveLength(2);
      expect((await handle(()=>{throw new RevisionConflict("Conflicto");})).status).toBe(409);
    }finally{s.db.close();}
  });
  it("corrige superficie y antecedentes sin trasladar parcela ni cambiar datos de otra parcela",()=>{
    const s=setup();try{
      const other=s.repo.createParcel({...parcelData(s.parcel),name:"Otra"});
      const next=s.repo.reviseParcel(s.parcel.id,1,{...parcelData(s.parcel),area:{value:2,unit:"ha"},history:[{crop:"papa",start:null,end:null,notes:null}]});
      expect(next.areaM2).toBe(20000);expect(s.repo.parcelHistory(s.parcel.id)).toEqual([s.parcel,next]);expect(s.repo.parcel(other.id)).toEqual(other);
      const anotherFarm=s.repo.createFarm(farmData(s.farm));
      expect(()=>s.repo.reviseParcel(s.parcel.id,2,{...parcelData(next),farmId:anotherFarm.id})).toThrow("trasladar");
      expect(()=>s.repo.reviseParcel(s.parcel.id,1,parcelData(next))).toThrow(RevisionConflict);
      expect(s.repo.parcelHistory(s.parcel.id)).toHaveLength(2);
    }finally{s.db.close();}
  });
  it("conserva y reproduce evaluaciones previas después de corregir finca y parcela",()=>{
    const s=setup();try{
      for(const slot of [1,2,3])s.repo.saveScenario(scenarioInput(s.parcel.id,slot));
      const before=createEvaluation({parcelId:s.parcel.id,climateKey:null},s.repo);
      const saved=s.db.prepare("SELECT payload FROM evaluations WHERE id=?").get(before.id)?.payload;
      s.repo.reviseFarm(s.farm.id,1,{...farmData(s.farm),name:"Revisada",resources:{...s.farm.resources,irrigation:true}});
      s.repo.reviseParcel(s.parcel.id,1,{...parcelData(s.parcel),name:"Parcela revisada"});
      const after=createEvaluation({parcelId:s.parcel.id,climateKey:null},s.repo);
      expect(after.context.farm.revision).toBe(2);expect(after.context.parcel.revision).toBe(2);
      expect(s.db.prepare("SELECT payload FROM evaluations WHERE id=?").get(before.id)?.payload).toBe(saved);
      expect(evaluateV2(before.context)).toEqual(before.result);
      expect(after.result.inputHash).not.toBe(before.result.inputHash);
    }finally{s.db.close();}
  });
  it("migra v2 sin reescribir payloads y persiste historial tras reabrir",()=>{
    const dir=mkdtempSync(join(tmpdir(),"sueloruta-v3-")),path=join(dir,"test.sqlite");
    try{
      const initial=openDatabase(path),r=new ScienceRepository(initial),s=setup();
      const f=r.createFarm(farmData(s.farm)),p=r.createParcel({...parcelData(s.parcel),farmId:f.id});s.db.close();
      const {revision:_,...legacyFarm}=f;const {revision:__,...legacyParcel}=p;
      initial.prepare("UPDATE farms SET payload=? WHERE id=?").run(JSON.stringify(legacyFarm),f.id);
      initial.prepare("UPDATE parcels SET payload=? WHERE id=?").run(JSON.stringify(legacyParcel),p.id);
      initial.exec("DROP TABLE farm_revisions; DROP TABLE parcel_revisions; PRAGMA user_version=2;");initial.close();
      const db=openDatabase(path),repo=new ScienceRepository(db);
      expect(repo.farm(f.id)).toEqual(legacyFarm);expect(repo.farmHistory(f.id)).toEqual([legacyFarm]);expect(repo.parcelHistory(p.id)).toEqual([legacyParcel]);
      repo.reviseFarm(f.id,1,{...farmData(f),canton:null,district:null});db.close();
      const reopened=openDatabase(path);expect(new ScienceRepository(reopened).farmHistory(f.id)).toHaveLength(2);
      expect(reopened.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe("ok");reopened.close();
    }finally{rmSync(dir,{recursive:true,force:true});}
  });
  it("rechaza entradas inválidas sin agregar procedencia ni historial",()=>{
    const s=setup();try{
      const count=s.db.prepare("SELECT count(*) AS n FROM provenance").get()?.n;
      expect(()=>s.repo.reviseFarm(s.farm.id,1,{...farmData(s.farm),coordinates:{latitude:NaN,longitude:0}})).toThrow();
      expect(s.db.prepare("SELECT count(*) AS n FROM provenance").get()?.n).toBe(count);
      expect(s.repo.farmHistory(s.farm.id)).toEqual([s.farm]);
    }finally{s.db.close();}
  });
});
