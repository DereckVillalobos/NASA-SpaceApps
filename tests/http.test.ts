import { describe, expect, it } from "vitest";
import { z } from "zod";
import { body, handle } from "../src/server/http";
import { NotFound } from "../src/server/repository";
import { PowerError } from "../src/modules/climate/power";
describe("Contratos HTTP",()=>{
  it("devuelve detalles de validación con 400",async()=>{const r=await handle(()=>z.number().parse("abc"));expect(r.status).toBe(400);expect((await r.json()).issues).toHaveLength(1);});
  it("rechaza JSON inválido y origen ajeno",async()=>{await expect(body(new Request("http://localhost/api/farms",{method:"POST",body:"{"}))).rejects.toThrow("JSON");await expect(body(new Request("http://localhost/api/farms",{method:"POST",body:"{}",headers:{Origin:"https://outside.example"}}))).rejects.toThrow("Origen");});
  it("acepta el origen del Host público cuando Next usa una URL interna",async()=>{const request=new Request("http://internal:3100/api/farms",{method:"POST",body:"{}",headers:{Host:"127.0.0.1:3100",Origin:"http://127.0.0.1:3100"}});expect(await body(request)).toEqual({});});
  it("devuelve 404 y 504 sin ocultar el estado",async()=>{expect((await handle(()=>{throw new NotFound("no");})).status).toBe(404);expect((await handle(()=>{throw new PowerError("timeout",504);})).status).toBe(504);});
});
