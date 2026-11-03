import { z } from "zod";
import { body, handle } from "../../../server/http";
import { repository } from "../../../server/service";
import { createHistoricalAnalysis } from "../../../server/historical-service";
export const runtime="nodejs";
export async function POST(req:Request){return handle(async()=>{const {sourceRecords:_raw,...summary}=await createHistoricalAnalysis(await body(req));return summary;},201);}
export async function GET(req:Request){return handle(()=>{const id=z.uuid().parse(new URL(req.url).searchParams.get("id"));const row=repository().db.prepare("SELECT payload FROM historical_analyses WHERE id=?").get(id);if(!row)return null;const {sourceRecords:_raw,...summary}=JSON.parse(row.payload as string);return summary;});}
