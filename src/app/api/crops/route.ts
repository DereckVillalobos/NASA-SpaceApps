import { crops, catalogEvidence } from "../../../modules/crops/catalog";
export function GET(){return Response.json({crops,evidence:catalogEvidence});}
