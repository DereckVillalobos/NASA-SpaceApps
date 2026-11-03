import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { farmSchema, type Farm } from "../modules/farms/schema";
import { parcelSchema, toSquareMeters, type Parcel } from "../modules/parcels/schema";
import { type ProvenanceInput, type Provenance } from "../modules/provenance/schema";

export class NotFound extends Error {}
export class Repository {
  constructor(readonly db: DatabaseSync) {}
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  provenance(input: ProvenanceInput): Provenance {
    const p: Provenance = { ...input, id: randomUUID(), version: "1.0.0", recordedAt: new Date().toISOString() };
    this.db.prepare("INSERT INTO provenance VALUES (?, ?)").run(p.id, JSON.stringify(p));
    return p;
  }
  farms(): Farm[] { return this.db.prepare("SELECT payload FROM farms ORDER BY rowid").all().map(r => JSON.parse(r.payload as string)); }
  farm(id: string): Farm { const row = this.db.prepare("SELECT payload FROM farms WHERE id=?").get(id); if (!row) throw new NotFound("Finca no encontrada"); return JSON.parse(row.payload as string); }
  createFarm(input: unknown): Farm {
    const parsed = farmSchema.parse(input);
    return this.transaction(() => {
      const farm: Farm = { ...parsed, id: randomUUID(), createdAt: new Date().toISOString(), provenance: this.provenance(parsed.provenance) };
      this.db.prepare("INSERT INTO farms VALUES (?, ?, ?)").run(farm.id, farm.provenance.id, JSON.stringify(farm));
      return farm;
    });
  }
  parcels(farmId: string): Parcel[] { this.farm(farmId); return this.db.prepare("SELECT payload FROM parcels WHERE farm_id=? ORDER BY rowid").all(farmId).map(r=>JSON.parse(r.payload as string)); }
  parcel(id: string): Parcel { const row = this.db.prepare("SELECT payload FROM parcels WHERE id=?").get(id); if (!row) throw new NotFound("Parcela no encontrada"); return JSON.parse(row.payload as string); }
  createParcel(input: unknown): Parcel {
    const parsed = parcelSchema.parse(input); this.farm(parsed.farmId);
    return this.transaction(() => {
      const parcel: Parcel = { ...parsed, id: randomUUID(), createdAt: new Date().toISOString(), provenance: this.provenance(parsed.provenance), areaM2: toSquareMeters(parsed.area), areaMethod: "Conversión de unidad: 1 ha = 10 000 m²; no es medición de superficie." };
      this.db.prepare("INSERT INTO parcels VALUES (?, ?, ?, ?)").run(parcel.id, parcel.farmId, parcel.provenance.id, JSON.stringify(parcel));
      return parcel;
    });
  }
}
