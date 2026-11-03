import { createEvaluation, repository } from "../../../server/service";
import { body, handle } from "../../../server/http";
import { z } from "zod";
export const runtime="nodejs";
export async function POST(req:Request){return handle(async()=>createEvaluation(await body(req)),201);}
export async function GET(req:Request){return handle(()=>{const parcelId=z.uuid().parse(new URL(req.url).searchParams.get("parcelId"));const repo=repository();repo.parcel(parcelId);return repo.db.prepare("SELECT payload FROM evaluations WHERE parcel_id=? ORDER BY rowid DESC").all(parcelId).map(row=>{const record=JSON.parse(row.payload as string) as ReturnType<typeof createEvaluation>;return {id:record.id,evaluatedAt:record.result.evaluatedAt,resultHash:record.result.resultHash,hypothetical:record.result.hypothetical,scenarios:record.result.comparisons.map(c=>c.scenarioName)};});});}
