import { z } from "zod";
import { date, provenanceSchema, text, type Stored } from "../provenance/schema";
export const areaSchema = z.object({ value: z.number().finite().positive().max(1e12), unit: z.enum(["ha", "m2"]) }).strict();
export function toSquareMeters(area: z.infer<typeof areaSchema>) { const a = areaSchema.parse(area); return a.value * (a.unit === "ha" ? 10000 : 1); }
export const historySchema = z.object({ crop: text, start: date.nullable(), end: date.nullable(), notes: text.nullable() }).strict().refine(v => !v.start || !v.end || v.start <= v.end, "Las fechas del antecedente están invertidas");
export const parcelSchema = z.object({ farmId: z.uuid(), name: text, area: areaSchema, history: z.array(historySchema).max(100).nullable(), provenance: provenanceSchema }).strict();
export type ParcelInput = z.infer<typeof parcelSchema>;
export type Parcel = Stored<ParcelInput> & { areaM2: number; areaMethod: string; revision?: number };

