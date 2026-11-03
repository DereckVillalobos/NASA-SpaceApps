import { z } from "zod";
import { repository } from "../../../server/service";
import { body, handle, InputError } from "../../../server/http";
export const runtime="nodejs";
export async function GET(req:Request){return handle(()=>repository().soils(z.uuid().parse(new URL(req.url).searchParams.get("parcelId"))));}
export async function POST(req:Request){return handle(async()=>{const input=await body(req);if(typeof input?.sampledAt==="string" && input.sampledAt>new Date().toISOString().slice(0,10))throw new InputError("El muestreo no puede tener fecha futura");return repository().createSoil(input);},201);}
