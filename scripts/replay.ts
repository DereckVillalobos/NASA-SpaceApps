import { readFileSync } from "node:fs";
import { evaluate, canonical, type EvaluationContext } from "../src/modules/rules/engine";
import { evaluateV2 } from "../src/modules/rules/engine-v2";
import { sha256 } from "../src/modules/climate/power";
import { analyzeHistorical } from "../src/modules/climate/historical";
import { normalizeExtendedPower } from "../src/modules/climate/power-extended";
import type { HistoricalRecord } from "../src/server/historical-service";
const path=process.argv[2];
if(!path)throw new Error("Uso: npm run replay -- ruta/evidencia.json");
const evidence=JSON.parse(readFileSync(path,"utf8")) as {context:EvaluationContext;historical?:HistoricalRecord;result:ReturnType<typeof evaluate>&{historical?:HistoricalRecord["analysis"]}};
if(evidence.historical){
  for(const record of evidence.historical.sourceRecords){
    if(sha256(record.raw)!==record.rawSha256)throw new Error("Hash de respuesta NASA alterado");
    if(canonical(normalizeExtendedPower(JSON.parse(record.raw),record.query))!==canonical(record.data))throw new Error("Normalización NASA alterada");
  }
  const {parcel,scenarios}=evidence.context;
  const recomputed=analyzeHistorical({parcelId:parcel.id,startYear:evidence.historical.analysis.period.startYear,endYear:evidence.historical.analysis.period.endYear,scenarios},evidence.historical.sourceRecords);
  if(canonical(recomputed)!==canonical(evidence.historical.analysis))throw new Error("Análisis histórico alterado");
}
const actual=evidence.result.engineVersion==="2.0.0"?evaluateV2(evidence.context,evidence.historical):evaluate(evidence.context);
if(canonical(actual)!==canonical(evidence.result))throw new Error("La evidencia no coincide con el motor/versiones actuales");
console.log("Evaluación reproducida. Hash de resultado:",actual.resultHash);
