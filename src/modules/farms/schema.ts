import { z } from "zod";
import { coordinatesSchema, provenanceSchema, text, type Stored } from "../provenance/schema";
export const farmSchema = z.object({
  name: text, coordinates: coordinatesSchema,
  canton: text.nullable().optional(), district: text.nullable().optional(),
  resources: z.object({ irrigation: z.boolean().nullable(), labor: text.nullable(), equipment: text.nullable(), budget: text.nullable() }).strict(),
  priorities: z.array(text).max(10), provenance: provenanceSchema,
}).strict();
export type FarmInput = z.infer<typeof farmSchema>;
export type Farm = Stored<FarmInput> & { revision?: number };

