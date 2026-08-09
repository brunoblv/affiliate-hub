export { calculateProductScore } from "./calculate-score";
export type { ScoreInput, ScoreBreakdown } from "./calculate-score";
export { DEFAULT_SCORE_WEIGHTS } from "./weights";
export type { ScoreWeights } from "./weights";
export { determineOpportunities, MIN_OPPORTUNITY_SCORE } from "./opportunities";
export type { OpportunityCandidate, OpportunityInput } from "./opportunities";
export { runScoringPipeline } from "./pipeline";
export type { RunScoringPipelineOptions, RunScoringPipelineResult } from "./pipeline";
