import { z } from "zod";
import { date, provenanceSchema, text, type Stored } from "../provenance/schema";
const property = (unit: string, value: z.ZodNumber) => z.object({ value: value.nullable(), unit: z.literal(unit), method: text.nullable() }).strict().refine(p=>p.value === null || p.method !== null, "Un valor necesita método analítico");
export const soilSchema = z.object({
  parcelId: z.uuid(), sampledAt: date,
  depth: z.object({ top: z.number().finite().nonnegative(), bottom: z.number().finite().positive(), unit: z.literal("cm") }).strict().refine(d=>d.bottom>d.top,"La profundidad final debe superar la inicial").nullable(),
  origin: z.enum(["LABORATORY", "FARMER", "CARTOGRAPHIC"]),
  supersedesId: z.uuid().nullable().optional(),
  taxonomy: text.nullable(),
  properties: z.object({
    ph: property("pH", z.number().finite()),
    organicMatter: property("%", z.number().finite().min(0).max(100)),
    phosphorus: property("mg/kg", z.number().finite().nonnegative()),
    texture: text.nullable(),
  }).strict(),
  provenance: provenanceSchema,
}).strict().superRefine((s,ctx)=>{
  if(s.origin === "LABORATORY" && !s.depth) ctx.addIssue({code:"custom",path:["depth"],message:"Un análisis requiere profundidad de muestreo"});
  if(s.origin === "LABORATORY" && s.provenance.kind !== "OBSERVED") ctx.addIssue({code:"custom",path:["provenance","kind"],message:"Un resultado analítico se clasifica como observado"});
  if(s.origin === "CARTOGRAPHIC" && (!s.provenance.resolution || s.provenance.kind !== "ESTIMATED")) ctx.addIssue({code:"custom",path:["provenance"],message:"Cartografía requiere resolución y clasificación estimada"});
  if(s.origin === "FARMER" && s.provenance.kind !== "DECLARED") ctx.addIssue({code:"custom",path:["provenance","kind"],message:"El dato aportado por el agricultor se clasifica como declarado"});
});
export type SoilInput = z.infer<typeof soilSchema>;
export type SoilSample = Stored<SoilInput>;
