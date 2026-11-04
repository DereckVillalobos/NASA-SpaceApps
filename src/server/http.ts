import { ZodError } from "zod";
import { NotFound, RevisionConflict } from "./repository";
import { PowerError } from "../modules/climate/power";
export class InputError extends Error {}
export async function body(request:Request) {
  const origin=request.headers.get("origin");
  // Next may construct request.url from an internal hostname while the browser
  // sends the public Host. Compare against Host, which is fixed by the target URL.
  const publicHost=request.headers.get("host")??new URL(request.url).host;
  const publicOrigin=`${new URL(request.url).protocol}//${publicHost}`;
  if(origin && origin!==publicOrigin) throw new InputError("Origen de solicitud no permitido");
  const raw=await request.text();
  if(raw.length>150000) throw new InputError("Solicitud demasiado grande");
  try{return JSON.parse(raw);}catch{throw new InputError("JSON inválido");}
}
export async function handle(fn:()=>unknown|Promise<unknown>,status=200) {
  try{return Response.json(await fn(),{status,headers:{"Cache-Control":"no-store"}});}
  catch(error){
    if(error instanceof ZodError) return Response.json({error:"Revise los campos",issues:error.issues.map(i=>({field:i.path.join("."),message:i.message}))},{status:400});
    if(error instanceof RevisionConflict) return Response.json({error:error.message},{status:409});
    if(error instanceof NotFound) return Response.json({error:error.message},{status:404});
    if(error instanceof InputError) return Response.json({error:error.message},{status:400});
    if(error instanceof PowerError) return Response.json({error:error.message},{status:error.status});
    console.error("SueloRuta:",error instanceof Error?error.message:"Error inesperado");
    return Response.json({error:"No se pudo completar la operación. Revise el registro del servidor."},{status:500});
  }
}

