import { z } from "zod";
import { repository } from "../../../server/service";
import { handle } from "../../../server/http";
import { NotFound } from "../../../server/repository";
export const runtime="nodejs";
export async function GET(req:Request){return handle(()=>{const id=z.uuid().parse(new URL(req.url).searchParams.get("id"));const row=repository().db.prepare("SELECT payload FROM evaluations WHERE id=?").get(id);if(!row)throw new NotFound("Evaluación no encontrada");return JSON.parse(row.payload as string);});}
