import { z } from "zod";

export const text = z.string().trim().min(1).max(2000);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Fecha inexistente");
export const provenanceSchema = z.object({
  kind: z.enum(["OBSERVED", "DECLARED", "ESTIMATED", "DERIVED"]),
  source: text,
  method: text,
  date,
  resolution: text.nullable(),
  assumptions: z.array(text).max(20),
  hypothetical: z.boolean(),
}).strict();
export type ProvenanceInput = z.infer<typeof provenanceSchema>;
export type Provenance = ProvenanceInput & { id: string; version: "1.0.0"; recordedAt: string };
export type Stored<T> = Omit<T, "provenance"> & { id: string; createdAt: string; provenance: Provenance };
export const coordinatesSchema = z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).strict();
