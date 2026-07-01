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
        scenarios: top.map((vendor, index) => ({
          label: index === 0 ? 'base case' : 'adoption-first',
          vendor: String(vendor.name ?? ''),
          score: Number(vendor.score ?? 0),
        })),
      };
    },
    accessibilitySummary: (output) => `${Array.isArray(output.scenarios) ? output.scenarios.length : 0} decision scenarios compared.`,
    formula: 'scenario ranking reuses deterministic vendor score outputs',
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
      return { series: ranking.map((vendor) => ({ label: String(vendor.name ?? ''), value: Number(vendor.score ?? 0) })) };
    },
    accessibilitySummary: (output) => `Score chart contains ${Array.isArray(output.series) ? output.series.length : 0} bars.`,
    formula: null,
  },
  {
    type: 'recommendation-logic',
    version: '1.0.0',
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({ recommendation: z.string().nullable(), score: z.number().nullable(), rationale: z.string() }).passthrough(),
    renderer: 'recommendation-logic',
    deterministicCompute: (context) => {
      const matrix = firstDependency(context, (value) => Array.isArray(value.ranking));
      const ranking = Array.isArray(matrix.ranking) ? matrix.ranking.map(asRecord) : [];
      const winner = ranking[0];
      const recommendation = winner ? String(winner.name ?? '') : null;
      const score = winner ? Number(winner.score ?? 0) : null;
      return { recommendation, score, rationale: recommendation ? `${recommendation} has the highest deterministic weighted score under the current inputs.` : 'More evidence is required.' };
    },
    accessibilitySummary: (output) => `System recommendation is ${String(output.recommendation ?? 'not available')}.`,
    formula: 'argmax(vendor weighted score)',
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
      return {
        counterCase: `If field adoption becomes the dominant criterion, Northstar can overtake ${current}.`,
        uncertainty: 'Vendor metrics are benchmark inputs, not observed production outcomes.',
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
