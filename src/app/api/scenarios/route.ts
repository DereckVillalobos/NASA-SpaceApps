import { z } from "zod";
import { repository } from "../../../server/service";
import { body, handle } from "../../../server/http";
export const runtime="nodejs";
export async function GET(req:Request){return handle(()=>repository().scenarios(z.uuid().parse(new URL(req.url).searchParams.get("parcelId"))));}
export async function PUT(req:Request){return handle(async()=>repository().saveScenario(await body(req)));}
