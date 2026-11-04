import { z } from "zod";
import { repository } from "../../../server/service";
import { body, handle } from "../../../server/http";
export const runtime="nodejs";
export async function GET(req:Request){return handle(()=>{const id=new URL(req.url).searchParams.get("historyId");return id?repository().farmHistory(z.uuid().parse(id)):repository().farms();});}
export async function POST(req:Request){return handle(async()=>repository().createFarm(await body(req)),201);}


const revisionRequest=z.object({id:z.uuid(),expectedRevision:z.number().int().positive(),data:z.unknown()}).strict();
export async function PUT(req:Request){return handle(async()=>{const input=revisionRequest.parse(await body(req));return repository().reviseFarm(input.id,input.expectedRevision,input.data);});}
