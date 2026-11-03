import { repository } from "../../../server/service";
import { body, handle } from "../../../server/http";
import { fetchPower } from "../../../modules/climate/power";
export const runtime="nodejs";
export async function POST(req:Request){return handle(async()=>fetchPower(await body(req),repository().climateCache()));}
