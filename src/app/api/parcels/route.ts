import { z } from "zod";
import { repository } from "../../../server/service";
import { body, handle } from "../../../server/http";
export const runtime="nodejs";
export async function GET(req:Request){return handle(()=>repository().parcels(z.uuid().parse(new URL(req.url).searchParams.get("farmId"))));}
export async function POST(req:Request){return handle(async()=>repository().createParcel(await body(req)),201);}
