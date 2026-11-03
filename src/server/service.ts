import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "./db";
import { ScienceRepository } from "./science-repository";
import { InputError } from "./http";
import { NotFound } from "./repository";
import { type EvaluationContext } from "../modules/rules/engine";
import { evaluateV2 } from "../modules/rules/engine-v2";
import type { HistoricalRecord } from "./historical-service";
export function repository(){return new ScienceRepository(database());}
export const evaluationRequest=z.object({parcelId:z.uuid(),climateKey:z.string().regex(/^[a-f0-9]{64}$/).nullable(),historicalId:z.uuid().nullable().optional()}).strict();
export function createEvaluation(input:unknown,repo=repository()) {
  const request=evaluationRequest.parse(input),parcel=repo.parcel(request.parcelId),farm=repo.farm(parcel.farmId);
  const scenarios=repo.scenarios(parcel.id);
  if(scenarios.length!==3) throw new InputError("Guarde tres escenarios antes de comparar");
  const climate=request.climateKey?repo.climateCache().get(request.climateKey):null;
  if(request.climateKey && !climate) throw new NotFound("Consulta climática no encontrada");
  if(climate && (climate.query.latitude!==farm.coordinates.latitude || climate.query.longitude!==farm.coordinates.longitude)) throw new InputError("El clima consultado corresponde a otra ubicación");
  const context:EvaluationContext={farm,parcel,soils:repo.activeSoils(parcel.id),scenarios,climate,evaluatedAt:new Date().toISOString()};
  const row=request.historicalId?repo.db.prepare("SELECT payload FROM historical_analyses WHERE id=? AND parcel_id=?").get(request.historicalId,parcel.id):null;
  if(request.historicalId&&!row)throw new NotFound("Análisis histórico no encontrado para esta parcela");
  const historical=row?JSON.parse(row.payload as string) as HistoricalRecord:null;
  if(historical && (historical.farmCoordinates.latitude!==farm.coordinates.latitude||historical.farmCoordinates.longitude!==farm.coordinates.longitude||historical.scenarioVersions.some(v=>!scenarios.some(s=>s.id===v.id&&s.version===v.version))))throw new InputError("El análisis histórico corresponde a otra versión de las rotaciones o ubicación");
  const result=evaluateV2(context,historical??undefined);
  const record={id:randomUUID(),context,...(historical?{historical}:{}),result};
  repo.db.prepare("INSERT INTO evaluations VALUES (?,?,?)").run(record.id,parcel.id,JSON.stringify(record));return record;
}
export type EvaluationRecord=ReturnType<typeof createEvaluation>;
