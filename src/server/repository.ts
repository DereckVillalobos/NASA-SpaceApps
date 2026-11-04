import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { farmSchema, type Farm } from "../modules/farms/schema";
import { parcelSchema, toSquareMeters, type Parcel } from "../modules/parcels/schema";
import { type ProvenanceInput, type Provenance } from "../modules/provenance/schema";

export class NotFound extends Error {}
export class RevisionConflict extends Error {}
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
      const farm: Farm = { ...parsed, revision: 1, id: randomUUID(), createdAt: new Date().toISOString(), provenance: this.provenance(parsed.provenance) };
      this.db.prepare("INSERT INTO farms VALUES (?, ?, ?)").run(farm.id, farm.provenance.id, JSON.stringify(farm));
      this.db.prepare("INSERT INTO farm_revisions VALUES (?, ?, ?)").run(farm.id, 1, JSON.stringify(farm));
      return farm;
    });
  }
  parcels(farmId: string): Parcel[] { this.farm(farmId); return this.db.prepare("SELECT payload FROM parcels WHERE farm_id=? ORDER BY rowid").all(farmId).map(r=>JSON.parse(r.payload as string)); }
  parcel(id: string): Parcel { const row = this.db.prepare("SELECT payload FROM parcels WHERE id=?").get(id); if (!row) throw new NotFound("Parcela no encontrada"); return JSON.parse(row.payload as string); }
  createParcel(input: unknown): Parcel {
    const parsed = parcelSchema.parse(input); this.farm(parsed.farmId);
    return this.transaction(() => {
      const parcel: Parcel = { ...parsed, revision: 1, id: randomUUID(), createdAt: new Date().toISOString(), provenance: this.provenance(parsed.provenance), areaM2: toSquareMeters(parsed.area), areaMethod: "Conversión de unidad: 1 ha = 10 000 m²; no es medición de superficie." };
      this.db.prepare("INSERT INTO parcels VALUES (?, ?, ?, ?)").run(parcel.id, parcel.farmId, parcel.provenance.id, JSON.stringify(parcel));
      this.db.prepare("INSERT INTO parcel_revisions VALUES (?, ?, ?)").run(parcel.id, 1, JSON.stringify(parcel));
      return parcel;
    });
  }
  farmHistory(id: string): Farm[] {
    this.farm(id);
    return this.db.prepare("SELECT payload FROM farm_revisions WHERE entity_id=? ORDER BY revision").all(id).map(r=>JSON.parse(r.payload as string));
  }
  parcelHistory(id: string): Parcel[] {
    this.parcel(id);
    return this.db.prepare("SELECT payload FROM parcel_revisions WHERE entity_id=? ORDER BY revision").all(id).map(r=>JSON.parse(r.payload as string));
  }
  reviseFarm(id: string, expectedRevision: number, input: unknown): Farm {
    const parsed = farmSchema.parse(input);
    return this.transaction(() => {
      const previous = this.farm(id);
      if (expectedRevision !== (previous.revision ?? 1)) throw new RevisionConflict("La finca cambió; recargue antes de corregirla.");
      const next: Farm = { ...parsed, id, createdAt: previous.createdAt, revision: (previous.revision ?? 1) + 1, provenance: this.provenance(parsed.provenance) };
      this.db.prepare("INSERT INTO farm_revisions VALUES (?, ?, ?)").run(id, next.revision!, JSON.stringify(next));
      this.db.prepare("UPDATE farms SET provenance_id=?, payload=? WHERE id=?").run(next.provenance.id, JSON.stringify(next), id);
      return next;
    });
  }
  reviseParcel(id: string, expectedRevision: number, input: unknown): Parcel {
    const parsed = parcelSchema.parse(input);
    return this.transaction(() => {
      const previous = this.parcel(id);
      if (parsed.farmId !== previous.farmId) throw new RevisionConflict("No se puede trasladar una parcela a otra finca.");
      if (expectedRevision !== (previous.revision ?? 1)) throw new RevisionConflict("La parcela cambió; recargue antes de corregirla.");
      const next: Parcel = { ...parsed, id, createdAt: previous.createdAt, revision: (previous.revision ?? 1) + 1, provenance: this.provenance(parsed.provenance), areaM2: toSquareMeters(parsed.area), areaMethod: previous.areaMethod };
      this.db.prepare("INSERT INTO parcel_revisions VALUES (?, ?, ?)").run(id, next.revision!, JSON.stringify(next));
      this.db.prepare("UPDATE parcels SET provenance_id=?, payload=? WHERE id=?").run(next.provenance.id, JSON.stringify(next), id);
      return next;
    });
  }
}

