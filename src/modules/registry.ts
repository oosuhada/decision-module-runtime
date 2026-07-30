import { z, type ZodType } from 'zod';
import type { ModuleInstance, ModuleType } from '../schemas/workspace';

export type ComputeContext = {
  module: ModuleInstance;
  dependencyOutputs: Record<string, Record<string, unknown>>;
};

export type ModuleContract = {
  type: ModuleType;
  version: string;
  inputSchema: ZodType<Record<string, unknown>>;
  outputSchema: ZodType<Record<string, unknown>>;
  renderer: ModuleType;
  deterministicCompute: (context: ComputeContext) => Record<string, unknown>;
  accessibilitySummary: (output: Record<string, unknown>) => string;
  formula: string | null;
};

const numberRecord = z.record(z.number().finite());
const vendorSchema = z.object({
  name: z.string(),
  cost: z.number().min(0).max(100),
  security: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
  adoption: z.number().min(0).max(100),
});

const defaultWeights = { cost: 24, security: 31, accuracy: 27, adoption: 18 };

const buildBuyOptionSchema = z.object({
  name: z.string(),
  strategicFit: z.number().min(0).max(100),
  control: z.number().min(0).max(100),
  threeYearCost: z.number().min(0).max(100),
  timeToValue: z.number().min(0).max(100),
});

const launchOptionSchema = z.object({
  name: z.string(),
  reach: z.number().min(0).max(100),
  learning: z.number().min(0).max(100),
  readiness: z.number().min(0).max(100),
  downside: z.number().min(0).max(100),
});

const rolloutOptionSchema = z.object({
  name: z.string(),
  coverage: z.number().min(0).max(100),
  reversibility: z.number().min(0).max(100),
  speed: z.number().min(0).max(100),
  changeLoad: z.number().min(0).max(100),
});

const architectureOptionSchema = z.object({
  name: z.string(),
  scalability: z.number().min(0).max(100),
  operability: z.number().min(0).max(100),
  migration: z.number().min(0).max(100),
  lockIn: z.number().min(0).max(100),
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstDependency(context: ComputeContext, predicate: (value: Record<string, unknown>) => boolean) {
  return Object.values(context.dependencyOutputs).find(predicate) ?? {};
}

function scoreVendors(context: ComputeContext) {
  const input = context.module.input;
  const vendorResult = z.array(vendorSchema).safeParse(input.vendors);
  const vendors = vendorResult.success ? vendorResult.data : [];
  const weightOutput = firstDependency(context, (value) => 'weights' in value);
  const costOutput = firstDependency(context, (value) => 'budgetIndex' in value);
  const weights = numberRecord.safeParse(weightOutput.weights).success
    ? numberRecord.parse(weightOutput.weights)
    : defaultWeights;
  const budgetIndex = typeof costOutput.budgetIndex === 'number'
    ? costOutput.budgetIndex
    : typeof input.budgetIndex === 'number' ? input.budgetIndex : 72;
  const denominator = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
  return vendors.map((vendor) => {
    const costFit = Math.max(20, 100 - Math.abs(vendor.cost - budgetIndex) * 1.5);
    const score = Math.round((costFit * (weights.cost ?? 0)
      + vendor.security * (weights.security ?? 0)
      + vendor.accuracy * (weights.accuracy ?? 0)
      + vendor.adoption * (weights.adoption ?? 0)) / denominator);
    return { ...vendor, costFit: Math.round(costFit), score };
  }).sort((a, b) => b.score - a.score);
}

type ScoreSpec = { field: string; direction: 'maximize' | 'minimize'; defaultWeight: number };

function scoreStructuredOptions(
  context: ComputeContext,
  schema: ZodType<Record<string, unknown>>,
  specs: ScoreSpec[],
): Array<Record<string, unknown> & { name: string; score: number }> {
  const inputRows = Array.isArray(context.module.input.options) ? context.module.input.options : [];
  const parsed = z.array(schema).safeParse(inputRows);
  const options: Record<string, unknown>[] = parsed.success ? parsed.data : [];
  const weightOutput = firstDependency(context, (value) => 'weights' in value);
  const dependencyWeights = numberRecord.safeParse(weightOutput.weights).success ? numberRecord.parse(weightOutput.weights) : {};
  const denominator = specs.reduce((sum, spec) => sum + Math.max(0, dependencyWeights[spec.field] ?? spec.defaultWeight), 0) || 1;
  return options.map((option) => {
    const score = specs.reduce((sum, spec) => {
      const raw = Number(option[spec.field] ?? 0);
      const utility = spec.direction === 'maximize' ? raw : 100 - raw;
      return sum + utility * Math.max(0, dependencyWeights[spec.field] ?? spec.defaultWeight);
    }, 0) / denominator;
    return { ...option, name: String(option.name ?? ''), score: Math.round(score) };
  }).sort((a, b) => Number(b.score) - Number(a.score));
}

const rankedOutputSchema = z.object({
  ranking: z.array(z.object({ name: z.string(), score: z.number() }).passthrough()),
  winner: z.string().nullable(),
}).passthrough();

const registryEntries: ModuleContract[] = [
  {
    type: 'text-evidence',
    version: '1.0.0',
    inputSchema: z.object({ request: z.string(), evidence: z.array(z.object({ id: z.string(), source: z.string(), note: z.string() })) }).passthrough(),
    outputSchema: z.object({ request: z.string(), evidenceCount: z.number(), evidence: z.array(z.unknown()) }).passthrough(),
    renderer: 'text-evidence',
    deterministicCompute: ({ module }) => {
      const evidence = Array.isArray(module.input.evidence) ? module.input.evidence : [];
      return { request: String(module.input.request ?? ''), evidenceCount: evidence.length, evidence };
    },
    accessibilitySummary: (output) => `${String(output.evidenceCount ?? 0)} evidence records define the decision brief.`,
    formula: null,
  },
  {
    type: 'criteria-weights',
    version: '1.0.0',
    inputSchema: z.object({ weights: numberRecord }).passthrough(),
    outputSchema: z.object({ weights: numberRecord, total: z.number() }).passthrough(),
    renderer: 'criteria-weights',
    deterministicCompute: ({ module }) => {
      const weights = numberRecord.parse(module.input.weights ?? defaultWeights);
      return { weights, total: Object.values(weights).reduce((sum, value) => sum + value, 0) };
    },
    accessibilitySummary: (output) => `Criteria weights total ${String(output.total ?? 0)}.`,
    formula: 'normalized score = Σ(criterion × weight) / Σ(weights)',
  },
  {
    type: 'cost-model',
    version: '1.0.0',
    inputSchema: z.object({ budgetIndex: z.number().min(0).max(100) }).passthrough(),
    outputSchema: z.object({ budgetIndex: z.number(), constraint: z.string() }).passthrough(),
    renderer: 'cost-model',
    deterministicCompute: ({ module }) => ({
      budgetIndex: Number(module.input.budgetIndex ?? 72),
      constraint: `integration index ≤ ${String(module.input.budgetIndex ?? 72)}`,
    }),
    accessibilitySummary: (output) => `Maximum integration budget index is ${String(output.budgetIndex ?? 'unknown')}.`,
    formula: 'cost fit = max(20, 100 - |vendor cost - budget| × 1.5)',
  },
  {
    type: 'vendor-matrix',
    version: '1.0.0',
    inputSchema: z.object({ vendors: z.array(vendorSchema), budgetIndex: z.number().optional() }).passthrough(),
    outputSchema: z.object({ ranking: z.array(z.object({ name: z.string(), score: z.number() }).passthrough()), winner: z.string().nullable() }).passthrough(),
    renderer: 'vendor-matrix',
    deterministicCompute: (context) => {
      const ranking = scoreVendors(context);
      return { ranking, winner: ranking[0]?.name ?? null };
    },
    accessibilitySummary: (output) => `Vendor ranking is led by ${String(output.winner ?? 'no vendor')}.`,
    formula: 'weighted score with budget-adjusted cost fit',
  },
  {
    type: 'build-buy-economics',
    version: '1.0.0',
    inputSchema: z.object({ options: z.array(buildBuyOptionSchema) }).passthrough(),
    outputSchema: rankedOutputSchema,
    renderer: 'build-buy-economics',
    deterministicCompute: (context) => {
      const ranking = scoreStructuredOptions(context, buildBuyOptionSchema, [
        { field: 'strategicFit', direction: 'maximize', defaultWeight: 30 },
        { field: 'control', direction: 'maximize', defaultWeight: 25 },
        { field: 'threeYearCost', direction: 'minimize', defaultWeight: 25 },
        { field: 'timeToValue', direction: 'minimize', defaultWeight: 20 },
      ]);
      return { ranking, winner: String(ranking[0]?.name ?? '') || null };
    },
    accessibilitySummary: (output) => `Build-versus-buy economics are led by ${String(output.winner ?? 'no option')}.`,
    formula: 'weighted utility = strategic fit + control + inverse 3-year cost + inverse time-to-value',
  },
  {
    type: 'launch-readiness',
    version: '1.0.0',
    inputSchema: z.object({ options: z.array(launchOptionSchema) }).passthrough(),
    outputSchema: rankedOutputSchema,
    renderer: 'launch-readiness',
    deterministicCompute: (context) => {
      const ranking = scoreStructuredOptions(context, launchOptionSchema, [
        { field: 'reach', direction: 'maximize', defaultWeight: 24 },
        { field: 'learning', direction: 'maximize', defaultWeight: 28 },
        { field: 'readiness', direction: 'maximize', defaultWeight: 28 },
        { field: 'downside', direction: 'minimize', defaultWeight: 20 },
      ]);
      return { ranking, winner: String(ranking[0]?.name ?? '') || null };
    },
    accessibilitySummary: (output) => `Launch readiness is led by ${String(output.winner ?? 'no option')}.`,
    formula: 'weighted utility = reach + learning + readiness + inverse downside exposure',
  },
  {
    type: 'rollout-sequencer',
    version: '1.0.0',
    inputSchema: z.object({ options: z.array(rolloutOptionSchema) }).passthrough(),
    outputSchema: rankedOutputSchema,
    renderer: 'rollout-sequencer',
    deterministicCompute: (context) => {
      const ranking = scoreStructuredOptions(context, rolloutOptionSchema, [
        { field: 'coverage', direction: 'maximize', defaultWeight: 23 },
        { field: 'reversibility', direction: 'maximize', defaultWeight: 29 },
        { field: 'speed', direction: 'maximize', defaultWeight: 18 },
        { field: 'changeLoad', direction: 'minimize', defaultWeight: 30 },
      ]);
      return { ranking, winner: String(ranking[0]?.name ?? '') || null };
    },
    accessibilitySummary: (output) => `Rollout sequence is led by ${String(output.winner ?? 'no option')}.`,
    formula: 'weighted utility = coverage + reversibility + speed + inverse organizational change load',
  },
  {
    type: 'architecture-fit',
    version: '1.0.0',
    inputSchema: z.object({ options: z.array(architectureOptionSchema) }).passthrough(),
    outputSchema: rankedOutputSchema,
    renderer: 'architecture-fit',
    deterministicCompute: (context) => {
      const ranking = scoreStructuredOptions(context, architectureOptionSchema, [
        { field: 'scalability', direction: 'maximize', defaultWeight: 30 },
        { field: 'operability', direction: 'maximize', defaultWeight: 30 },
        { field: 'migration', direction: 'minimize', defaultWeight: 20 },
        { field: 'lockIn', direction: 'minimize', defaultWeight: 20 },
      ]);
      return { ranking, winner: String(ranking[0]?.name ?? '') || null };
    },
    accessibilitySummary: (output) => `Architecture fit is led by ${String(output.winner ?? 'no option')}.`,
    formula: 'weighted utility = scalability + operability + inverse migration burden + inverse lock-in',
  },
  {
    type: 'risk-matrix',
    version: '1.0.0',
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ risks: z.array(z.object({ name: z.string(), risk: z.number() })), highestRisk: z.string().nullable() }).passthrough(),
    renderer: 'risk-matrix',
    deterministicCompute: (context) => {
      const matrix = firstDependency(context, (value) => Array.isArray(value.ranking));
      const ranking = Array.isArray(matrix.ranking) ? matrix.ranking.map(asRecord) : [];
      const risks = ranking.map((vendor) => ({
        name: String(vendor.name ?? 'Unknown'),
        risk: Math.round((100 - Number(vendor.security ?? 0)) * 0.55 + (100 - Number(vendor.adoption ?? 0)) * 0.45),
      })).sort((a, b) => b.risk - a.risk);
      return { risks, highestRisk: risks[0]?.name ?? null };
    },
    accessibilitySummary: (output) => `Risk matrix contains ${Array.isArray(output.risks) ? output.risks.length : 0} vendors.`,
    formula: 'risk = (100-security) × .55 + (100-adoption) × .45',
  },
  {
    type: 'scenario-comparison',
    version: '1.0.0',
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ scenarios: z.array(z.unknown()) }).passthrough(),
    renderer: 'scenario-comparison',
    deterministicCompute: (context) => {
      const matrix = firstDependency(context, (value) => Array.isArray(value.ranking));
      const ranking = Array.isArray(matrix.ranking) ? matrix.ranking.map(asRecord) : [];
      const top = ranking.slice(0, 2);
      return {
        scenarios: top.map((option, index) => ({
          label: index === 0 ? 'base case' : 'adoption-first',
          option: String(option.name ?? ''),
          score: Number(option.score ?? 0),
        })),
      };
    },
    accessibilitySummary: (output) => `${Array.isArray(output.scenarios) ? output.scenarios.length : 0} decision scenarios compared.`,
    formula: 'scenario comparison reuses the upstream deterministic option ranking',
  },
  {
    type: 'chart',
    version: '1.0.0',
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ series: z.array(z.unknown()) }).passthrough(),
    renderer: 'chart',
    deterministicCompute: (context) => {
      const matrix = firstDependency(context, (value) => Array.isArray(value.ranking));
      const ranking = Array.isArray(matrix.ranking) ? matrix.ranking.map(asRecord) : [];
      return { series: ranking.map((option) => ({ label: String(option.name ?? ''), value: Number(option.score ?? 0) })) };
    },
    accessibilitySummary: (output) => `Score chart contains ${Array.isArray(output.series) ? output.series.length : 0} bars.`,
    formula: null,
  },
  {
    type: 'recommendation-logic',
    version: '1.0.0',
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ recommendation: z.string().nullable(), score: z.number().nullable(), runnerUp: z.string().nullable(), runnerUpScore: z.number().nullable(), rationale: z.string() }).passthrough(),
    renderer: 'recommendation-logic',
    deterministicCompute: (context) => {
      const matrix = firstDependency(context, (value) => Array.isArray(value.ranking));
      const ranking = Array.isArray(matrix.ranking) ? matrix.ranking.map(asRecord) : [];
      const winner = ranking[0];
      const recommendation = winner ? String(winner.name ?? '') : null;
      const score = winner ? Number(winner.score ?? 0) : null;
      const runnerUp = ranking[1];
      return {
        recommendation,
        score,
        runnerUp: runnerUp ? String(runnerUp.name ?? '') : null,
        runnerUpScore: runnerUp ? Number(runnerUp.score ?? 0) : null,
        rationale: recommendation ? `${recommendation} has the highest deterministic weighted score under the current registered module inputs.` : 'More evidence is required.',
      };
    },
    accessibilitySummary: (output) => `System recommendation is ${String(output.recommendation ?? 'not available')}.`,
    formula: 'argmax(upstream registered-module weighted score)',
  },
  {
    type: 'counter-case',
    version: '1.0.0',
    inputSchema: z.object({ threshold: z.number().default(34) }).passthrough(),
    outputSchema: z.object({ counterCase: z.string(), uncertainty: z.string() }).passthrough(),
    renderer: 'counter-case',
    deterministicCompute: (context) => {
      const recommendation = firstDependency(context, (value) => 'recommendation' in value);
      const current = String(recommendation.recommendation ?? 'the current leader');
      const runnerUp = String(recommendation.runnerUp ?? 'the next-ranked option');
      const score = Number(recommendation.score ?? 0);
      const runnerUpScore = Number(recommendation.runnerUpScore ?? 0);
      const margin = Math.max(0, score - runnerUpScore);
      return {
        counterCase: `${runnerUp} is the nearest modeled alternative to ${current}; a change larger than the current ${margin}-point score margin in material inputs can reverse the ranking.`,
        uncertainty: 'The ranking is conditional on the explicit module inputs and registered formulas; it is not a forecast of real-world outcomes.',
      };
    },
    accessibilitySummary: (output) => `Counter-case: ${String(output.counterCase ?? '')}`,
    formula: 'sensitivity narrative derived from current winner and threshold input',
  },
  {
    type: 'source-ledger',
    version: '1.0.0',
    inputSchema: z.object({ sources: z.array(z.object({ id: z.string(), label: z.string(), locator: z.string() })) }).passthrough(),
    outputSchema: z.object({ sources: z.array(z.unknown()), count: z.number() }).passthrough(),
    renderer: 'source-ledger',
    deterministicCompute: ({ module }) => {
      const sources = Array.isArray(module.input.sources) ? module.input.sources : [];
      return { sources, count: sources.length };
    },
    accessibilitySummary: (output) => `Source ledger contains ${String(output.count ?? 0)} provenance records.`,
    formula: null,
  },
  {
    type: 'human-decision-gate',
    version: '1.0.0',
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ recommendation: z.string().nullable(), ready: z.boolean() }).passthrough(),
    renderer: 'human-decision-gate',
    deterministicCompute: (context) => {
      const recommendation = firstDependency(context, (value) => 'recommendation' in value);
      return { recommendation: recommendation.recommendation ? String(recommendation.recommendation) : null, ready: Boolean(recommendation.recommendation) };
    },
    accessibilitySummary: (output) => output.ready ? `Decision gate ready for human choice on ${String(output.recommendation)}.` : 'Decision gate is not ready.',
    formula: null,
  },
];

export const moduleRegistry = new Map<ModuleType, ModuleContract>(registryEntries.map((entry) => [entry.type, entry]));

export type ModuleCatalogEntry = {
  type: ModuleType;
  title: string;
  purpose: string;
  defaultInput: Record<string, unknown>;
};

export const moduleCatalog: ModuleCatalogEntry[] = [
  { type: 'text-evidence', title: 'Decision brief', purpose: 'Anchor the request and editable evidence scope.', defaultInput: { request: 'Describe the decision request.', evidence: [] } },
  { type: 'source-ledger', title: 'Source ledger', purpose: 'Keep source locators and provenance explicit.', defaultInput: { sources: [] } },
  { type: 'criteria-weights', title: 'Criteria weights', purpose: 'Expose human-owned criterion priorities.', defaultInput: { weights: { value: 25, risk: 25, speed: 25, control: 25 } } },
  { type: 'cost-model', title: 'Constraint model', purpose: 'Apply a normalized resource or integration constraint.', defaultInput: { budgetIndex: 72 } },
  { type: 'vendor-matrix', title: 'Vendor matrix', purpose: 'Rank vendor options from cost, security, accuracy, and adoption.', defaultInput: { vendors: [{ name: 'Option A', cost: 65, security: 75, accuracy: 75, adoption: 70 }, { name: 'Option B', cost: 75, security: 80, accuracy: 82, adoption: 62 }] } },
  { type: 'build-buy-economics', title: 'Build vs buy economics', purpose: 'Compare strategic fit, control, cost, and time-to-value.', defaultInput: { options: [{ name: 'Build', strategicFit: 82, control: 92, threeYearCost: 78, timeToValue: 74 }, { name: 'Buy', strategicFit: 72, control: 48, threeYearCost: 58, timeToValue: 32 }, { name: 'Hybrid', strategicFit: 84, control: 72, threeYearCost: 66, timeToValue: 48 }] } },
  { type: 'launch-readiness', title: 'Launch readiness', purpose: 'Compare reach, learning, readiness, and downside exposure.', defaultInput: { options: [{ name: 'Controlled beta', reach: 36, learning: 94, readiness: 92, downside: 24 }, { name: 'Phased launch', reach: 70, learning: 82, readiness: 78, downside: 46 }, { name: 'Broad launch', reach: 96, learning: 58, readiness: 62, downside: 82 }] } },
  { type: 'rollout-sequencer', title: 'Rollout sequencer', purpose: 'Compare coverage, reversibility, speed, and change load.', defaultInput: { options: [{ name: 'Pilot', coverage: 28, reversibility: 96, speed: 58, changeLoad: 22 }, { name: 'Staged rollout', coverage: 74, reversibility: 78, speed: 72, changeLoad: 52 }, { name: 'Big bang', coverage: 100, reversibility: 28, speed: 94, changeLoad: 91 }] } },
  { type: 'architecture-fit', title: 'Architecture fit', purpose: 'Compare scalability, operability, migration burden, and lock-in.', defaultInput: { options: [{ name: 'Modular monolith', scalability: 72, operability: 90, migration: 38, lockIn: 24 }, { name: 'Service architecture', scalability: 92, operability: 66, migration: 72, lockIn: 28 }, { name: 'Managed platform', scalability: 88, operability: 86, migration: 54, lockIn: 78 }] } },
  { type: 'risk-matrix', title: 'Risk matrix', purpose: 'Separate risk signals from the primary score.', defaultInput: {} },
  { type: 'scenario-comparison', title: 'Scenario comparison', purpose: 'Compare the two strongest upstream ranked options.', defaultInput: {} },
  { type: 'chart', title: 'Score chart', purpose: 'Render an upstream ranking as an inspectable chart.', defaultInput: {} },
  { type: 'recommendation-logic', title: 'Recommendation logic', purpose: 'Select the highest-ranked option from a registered scorer.', defaultInput: {} },
  { type: 'counter-case', title: 'Counter-case', purpose: 'Expose the nearest modeled reversal and score margin.', defaultInput: { threshold: 34 } },
  { type: 'human-decision-gate', title: 'Human decision gate', purpose: 'Keep final commitment explicitly human-owned.', defaultInput: {} },
];

export function getModuleContract(type: ModuleType): ModuleContract {
  const contract = moduleRegistry.get(type);
  if (!contract) throw new Error(`Module type is not registered: ${type}`);
  return contract;
}

export function validateModuleInput(type: ModuleType, input: Record<string, unknown>) {
  return getModuleContract(type).inputSchema.safeParse(input);
}

export function validateModuleOutput(type: ModuleType, output: Record<string, unknown>) {
  return getModuleContract(type).outputSchema.safeParse(output);
}
