import { evaluate, canonical, type EvaluationContext } from "./engine";
import { evaluateSoilPh } from "../agronomy/ph";
import { sha256 } from "../climate/power";
import type { HistoricalAnalysis } from "../climate/historical";

export const ENGINE_V2_VERSION="2.0.0";
export function evaluateV2(context:EvaluationContext,historical?:{id:string;analysis:HistoricalAnalysis}){
  const base=evaluate(context);
  const comparisons=base.comparisons.map(comparison=>({
    ...comparison,
    results:[...comparison.results,...evaluateSoilPh(context.scenarios.find(s=>s.id===comparison.scenarioId)!,context.soils,context.evaluatedAt)],
  }));
  const payload={engineVersion:ENGINE_V2_VERSION,catalogVersion:base.catalogVersion,evaluatedAt:base.evaluatedAt,hypothetical:base.hypothetical,comparisons,...(historical?{historical:historical.analysis}:{}),inputHash:sha256(canonical({context,historicalId:historical?.id??null,historicalHash:historical?.analysis.resultHash??null}))};
  return {...payload,resultHash:sha256(canonical(payload))};
}
