import { randomUUID } from "node:crypto";
import { repository } from "./service";
import { historicalRequestSchema, analyzeHistorical } from "../modules/climate/historical";
import { fetchExtendedPower } from "../modules/climate/power-extended";
import { InputError } from "./http";
import type { ScienceRepository } from "./science-repository";

export async function createHistoricalAnalysis(input:unknown,repo:ScienceRepository=repository(),options:{fetcher?:typeof fetch;now?:Date}={}){
  const request=historicalRequestSchema.parse(input),parcel=repo.parcel(request.parcelId),farm=repo.farm(parcel.farmId),scenarios=repo.scenarios(parcel.id);
  if(scenarios.length!==3)throw new InputError("Guarde las tres rotaciones antes de analizar ventanas");
  const crosses=scenarios.some(s=>s.steps.some(step=>step.start.slice(0,4)!==step.end.slice(0,4)));
  const lastCalendarYear=request.endYear+(crosses?1:0);
  if(lastCalendarYear>=Number((options.now??new Date()).toISOString().slice(0,4)))throw new InputError("El período histórico debe estar completamente terminado");
  const records=[];
  for(let year=request.startYear;year<=lastCalendarYear;year++){
    const query={...farm.coordinates,start:`${year}-01-01`,end:`${year}-12-31`};
    records.push(await fetchExtendedPower(query,repo.climateCache(),options));
  }
  const analysis=analyzeHistorical({...request,scenarios},records);
  const record={id:randomUUID(),parcelId:parcel.id,createdAt:new Date().toISOString(),scenarioVersions:scenarios.map(s=>({id:s.id,version:s.version})),farmCoordinates:farm.coordinates,sourceRecords:records,analysis};
  repo.db.prepare("INSERT INTO historical_analyses (id,parcel_id,payload) VALUES (?,?,?)").run(record.id,parcel.id,JSON.stringify(record));
  return record;
}
export type HistoricalRecord=Awaited<ReturnType<typeof createHistoricalAnalysis>>;
export type HistoricalSummary=Omit<HistoricalRecord,"sourceRecords">;
