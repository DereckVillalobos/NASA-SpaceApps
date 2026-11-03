import { z } from "zod";
import { date, provenanceSchema, text } from "../provenance/schema";
export const cropIdSchema = z.enum(["potato", "onion", "carrot"]);
export const scenarioSchema = z.object({
  parcelId: z.uuid(), slot: z.number().int().min(1).max(3), name: text,
  steps: z.array(z.object({cropId:cropIdSchema,start:date,end:date}).strict().refine(s=>s.end>=s.start,"Fin anterior al inicio")).min(2,"Una rotación requiere al menos dos etapas").max(12),
  constraints: z.object({ irrigationRequired: z.boolean().nullable(), availableUntil: date.nullable(), notes: text.nullable() }).strict(),
  provenance: provenanceSchema,
}).strict();
export type ScenarioInput = z.infer<typeof scenarioSchema>;
export type Scenario = ScenarioInput & { id: string; version: number; savedAt: string };
