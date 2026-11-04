import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

export function openDatabase(filename = process.env.SUELORUTA_DB || "data/sueloruta.sqlite") {
  if (filename !== ":memory:") mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
  const version = (db.prepare("PRAGMA user_version").get() as {user_version:number}).user_version;
  if (version > 3) throw new Error("Versión de base de datos no compatible");
  if (version === 0) db.exec(`
    BEGIN;
    CREATE TABLE provenance (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE farms (id TEXT PRIMARY KEY, provenance_id TEXT NOT NULL REFERENCES provenance(id), payload TEXT NOT NULL);
    CREATE TABLE parcels (id TEXT PRIMARY KEY, farm_id TEXT NOT NULL REFERENCES farms(id), provenance_id TEXT NOT NULL REFERENCES provenance(id), payload TEXT NOT NULL);
    CREATE INDEX parcels_farm ON parcels(farm_id);
    CREATE TABLE soil_samples (id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL REFERENCES parcels(id), provenance_id TEXT NOT NULL REFERENCES provenance(id), payload TEXT NOT NULL);
    CREATE INDEX soil_parcel ON soil_samples(parcel_id);
    CREATE TABLE scenarios (id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL REFERENCES parcels(id), slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3), payload TEXT NOT NULL, UNIQUE(parcel_id, slot));
    CREATE TABLE climate_cache (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE evaluations (id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL REFERENCES parcels(id), payload TEXT NOT NULL);
    PRAGMA user_version=1;
    COMMIT;
  `);
  if (version < 2) db.exec(`
    BEGIN;
    CREATE TABLE historical_analyses (id TEXT PRIMARY KEY, parcel_id TEXT NOT NULL REFERENCES parcels(id), payload TEXT NOT NULL);
    CREATE INDEX historical_parcel ON historical_analyses(parcel_id);
    PRAGMA user_version=2;
    COMMIT;
  `);
  if (version < 3) db.exec(`
    BEGIN;
    CREATE TABLE farm_revisions (entity_id TEXT NOT NULL REFERENCES farms(id), revision INTEGER NOT NULL CHECK(revision > 0), payload TEXT NOT NULL, PRIMARY KEY(entity_id, revision));
    CREATE TABLE parcel_revisions (entity_id TEXT NOT NULL REFERENCES parcels(id), revision INTEGER NOT NULL CHECK(revision > 0), payload TEXT NOT NULL, PRIMARY KEY(entity_id, revision));
    INSERT INTO farm_revisions SELECT id, 1, payload FROM farms;
    INSERT INTO parcel_revisions SELECT id, 1, payload FROM parcels;
    PRAGMA user_version=3;
    COMMIT;
  `);
  return db;
}
let shared: DatabaseSync | undefined;
export function database() { return shared ??= openDatabase(); }

