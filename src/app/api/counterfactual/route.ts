import { z } from "zod";
import { body, handle } from "../../../server/http";
import { repository } from "../../../server/service";
import { NotFound } from "../../../server/repository";
import { counterfactual, missingInformation } from "../../../modules/rules/counterfactual";
import type { EvaluationContext } from "../../../modules/rules/engine";
import type { HistoricalRecord } from "../../../server/historical-service";
export const runtime="nodejs";
const requestSchema=z.object({evaluationId:z.uuid(),change:z.unknown()}).strict();
function evidence(id:string){const row=repository().db.prepare("SELECT payload FROM evaluations WHERE id=?").get(id);if(!row)throw new NotFound("Evaluación no encontrada");return JSON.parse(row.payload as string) as {context:EvaluationContext;historical?:HistoricalRecord};}
export async function POST(req:Request){return handle(async()=>{const input=requestSchema.parse(await body(req)),record=evidence(input.evaluationId);return counterfactual(record.context,input.change,record.historical);});}
export async function GET(req:Request){return handle(()=>{const id=z.uuid().parse(new URL(req.url).searchParams.get("evaluationId"));return missingInformation(evidence(id).context);});}
