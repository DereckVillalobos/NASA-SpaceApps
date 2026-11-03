import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "../src/server/db";
import { Repository } from "../src/server/repository";
import { farmSchema } from "../src/modules/farms/schema";
import { parcelSchema, toSquareMeters } from "../src/modules/parcels/schema";
import { date } from "../src/modules/provenance/schema";
export const provenance = { kind: "DECLARED" as const, source: "Fixture sintético de prueba", method: "Prueba automatizada", date: "2025-01-01", resolution: null, assumptions: [], hypothetical: true };
export const farmInput = { name: "Finca de prueba", coordinates: { latitude: 10.19, longitude: -84.39 }, resources: { irrigation: null, labor: null, equipment: null, budget: null }, priorities: [], provenance };
const dbs: ReturnType<typeof openDatabase>[] = [];
afterEach(()=>{ for (const db of dbs.splice(0)) db.close(); });
function repo() { const db = openDatabase(":memory:"); dbs.push(db); return new Repository(db); }
describe("Fincas, parcelas y procedencia",()=>{
  it("persiste y recupera declaración, desconocidos e hipotéticos",()=>{ const r=repo(); const f=r.createFarm(farmInput); expect(r.farm(f.id)).toEqual(f); expect(f.resources.irrigation).toBeNull(); expect(f.provenance.kind).toBe("DECLARED"); expect(f.provenance.hypothetical).toBe(true); });
  it.each([91, -91, NaN, Infinity])("rechaza latitud %s", latitude=>expect(farmSchema.safeParse({...farmInput, coordinates:{latitude,longitude:0}}).success).toBe(false));
  it("rechaza longitud y fuente ausente",()=>{ expect(farmSchema.safeParse({...farmInput, coordinates:{latitude:0,longitude:181}}).success).toBe(false); expect(farmSchema.safeParse({...farmInput, provenance:{...provenance,source:""}}).success).toBe(false); });
  it("valida fechas de calendario",()=>{ expect(date.safeParse("2025-02-29").success).toBe(false); expect(date.parse("2024-02-29")).toBe("2024-02-29"); });
  it("convierte ha y conserva unidades originales",()=>{ const r=repo(); const f=r.createFarm(farmInput); const p=r.createParcel({farmId:f.id,name:"Norte",area:{value:1.25,unit:"ha"},history:null,provenance}); expect(p.areaM2).toBe(12500); expect(p.area.unit).toBe("ha"); expect(r.parcels(f.id)).toEqual([p]); expect(toSquareMeters({value:35,unit:"m2"})).toBe(35); });
  it.each([0,-1,NaN,Infinity])("rechaza superficie %s",value=>expect(()=>toSquareMeters({value,unit:"ha"})).toThrow());
  it("rechaza unidades no reconocidas y relaciones inexistentes",()=>{ const r=repo(); expect(()=>r.createParcel({farmId:crypto.randomUUID(),name:"A",area:{value:1,unit:"ha"},history:null,provenance})).toThrow("Finca no encontrada"); expect(parcelSchema.safeParse({farmId:crypto.randomUUID(),name:"A",area:{value:1,unit:"acre"},history:null,provenance}).success).toBe(false); });
  it("rechaza antecedentes con fechas invertidas",()=>expect(parcelSchema.safeParse({farmId:crypto.randomUUID(),name:"A",area:{value:1,unit:"ha"},history:[{crop:"papa",start:"2025-02-01",end:"2025-01-01",notes:null}],provenance}).success).toBe(false));
  it("revierte la transacción si falla la escritura",()=>{ const r=repo(); expect(()=>r.transaction(()=>{r.provenance(provenance);throw new Error("fallo");})).toThrow(); expect(r.db.prepare("SELECT count(*) AS n FROM provenance").get()?.n).toBe(0); });
});
