import { repository } from "../../../server/service";
import { body, handle } from "../../../server/http";
export const runtime="nodejs";
export async function GET(){return handle(()=>repository().farms());}
export async function POST(req:Request){return handle(async()=>repository().createFarm(await body(req)),201);}
