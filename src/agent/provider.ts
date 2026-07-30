import type { AgentPlan, ModuleInstance, ModuleType, PlanItem } from '../schemas/workspace';
import { getModuleContract } from '../modules/registry';
import type { ProtocolAction } from '../protocol/actions';

export type AgentProvider = {
  id: string;
  plan(request: string, signal?: AbortSignal): Promise<AgentPlan>;
  stream(plan: AgentPlan, runId: string, signal?: AbortSignal): AsyncGenerator<ProtocolAction>;
};

const vendors = [
  { name: 'Vendor A', cost: 76, security: 94, accuracy: 91, adoption: 67 },
  { name: 'Vendor B', cost: 91, security: 84, accuracy: 88, adoption: 93 },
  { name: 'Vendor C', cost: 58, security: 91, accuracy: 96, adoption: 62 },
];

type DecisionTemplate = 'vendor-selection' | 'build-vs-buy' | 'product-launch' | 'rollout-strategy' | 'architecture-choice';

const templateEvidence: Record<DecisionTemplate, Array<{ id: string; source: string; note: string }>> = {
  'vendor-selection': [
    { id: 'vendor-req', source: 'Decision request', note: 'Compare provider options with explicit commercial, security, quality, and adoption inputs.' },
    { id: 'vendor-bench', source: 'Synthetic benchmark fixture', note: 'Reference values are editable 0–100 inputs and are not claims about real vendors.' },
  ],
  'build-vs-buy': [
    { id: 'bb-req', source: 'Decision request', note: 'Compare build, buy, and hybrid paths using strategic fit, control, cost, and time-to-value.' },
    { id: 'bb-fixture', source: 'Synthetic economics fixture', note: 'Cost and time are normalized reference indexes; replace them with reviewed internal estimates.' },
  ],
  'product-launch': [
    { id: 'launch-req', source: 'Decision request', note: 'Compare launch scopes using reach, learning, operational readiness, and downside exposure.' },
    { id: 'launch-fixture', source: 'Synthetic launch-readiness fixture', note: 'Reference values demonstrate the registered formula and are not market forecasts.' },
  ],
  'rollout-strategy': [
    { id: 'rollout-req', source: 'Decision request', note: 'Compare rollout sequences using coverage, reversibility, speed, and organizational change load.' },
    { id: 'rollout-fixture', source: 'Synthetic change-management fixture', note: 'Reference values exist only to make the deterministic workflow immediately inspectable.' },
  ],
  'architecture-choice': [
    { id: 'arch-req', source: 'Decision request', note: 'Compare architecture options using scalability, operability, migration burden, and lock-in.' },
    { id: 'arch-fixture', source: 'Synthetic architecture review fixture', note: 'Reference indexes must be replaced with evidence from the actual system and constraints.' },
  ],
};

const templateSources: Record<DecisionTemplate, Array<{ id: string; label: string; locator: string }>> = {
  'vendor-selection': [
    { id: 'source-vendor-01', label: 'Synthetic commercial review', locator: 'synthetic://vendor-commercial-v1' },
    { id: 'source-vendor-02', label: 'Synthetic technical benchmark', locator: 'synthetic://vendor-benchmark-v1' },
  ],
  'build-vs-buy': [
    { id: 'source-bb-01', label: 'Synthetic internal capacity review', locator: 'synthetic://build-capacity-v1' },
    { id: 'source-bb-02', label: 'Synthetic market option review', locator: 'synthetic://buy-market-v1' },
  ],
  'product-launch': [
    { id: 'source-launch-01', label: 'Synthetic readiness review', locator: 'synthetic://launch-readiness-v1' },
    { id: 'source-launch-02', label: 'Synthetic market learning plan', locator: 'synthetic://launch-learning-v1' },
  ],
  'rollout-strategy': [
    { id: 'source-rollout-01', label: 'Synthetic rollout dependency map', locator: 'synthetic://rollout-dependencies-v1' },
    { id: 'source-rollout-02', label: 'Synthetic change capacity review', locator: 'synthetic://change-capacity-v1' },
  ],
  'architecture-choice': [
    { id: 'source-arch-01', label: 'Synthetic system constraints', locator: 'synthetic://architecture-constraints-v1' },
    { id: 'source-arch-02', label: 'Synthetic operations review', locator: 'synthetic://architecture-operations-v1' },
  ],
};

function item(id: string, type: ModuleType, title: string, purpose: string, x: number, y: number, dependencies: string[], input: Record<string, unknown>): PlanItem {
  return { id, type, title, purpose, position: { x, y }, dependencies, input };
}

function classifyRequest(request: string): DecisionTemplate {
  const normalized = request.toLowerCase();
  if (/build\s*(vs\.?|versus|or)\s*buy|build.*buy|buy.*build|in[- ]house/.test(normalized)) return 'build-vs-buy';
  if (/launch|go[- ]to[- ]market|gtm|release strategy|release plan/.test(normalized)) return 'product-launch';
  if (/rollout|roll out|deployment strategy|deploy.*stage|pilot.*scale|phased deployment/.test(normalized)) return 'rollout-strategy';
  if (/architect|tech stack|platform choice|framework|database|monolith|microservice|serverless/.test(normalized)) return 'architecture-choice';
  if (/vendor|supplier|provider|procure|rfp/.test(normalized)) return 'vendor-selection';
  return 'architecture-choice';
}

const buildBuyOptions = [
  { name: 'Build in-house', strategicFit: 90, control: 96, threeYearCost: 84, timeToValue: 78 },
  { name: 'Buy platform', strategicFit: 70, control: 46, threeYearCost: 56, timeToValue: 28 },
  { name: 'Hybrid', strategicFit: 86, control: 74, threeYearCost: 67, timeToValue: 46 },
];

const launchOptions = [
  { name: 'Controlled beta', reach: 34, learning: 96, readiness: 93, downside: 22 },
  { name: 'Phased launch', reach: 72, learning: 84, readiness: 80, downside: 45 },
  { name: 'Broad launch', reach: 98, learning: 56, readiness: 61, downside: 84 },
];

const rolloutOptions = [
  { name: 'Pilot first', coverage: 30, reversibility: 96, speed: 56, changeLoad: 20 },
  { name: 'Staged rollout', coverage: 76, reversibility: 79, speed: 70, changeLoad: 50 },
  { name: 'Big bang', coverage: 100, reversibility: 24, speed: 96, changeLoad: 92 },
];

const architectureOptions = [
  { name: 'Modular monolith', scalability: 74, operability: 92, migration: 34, lockIn: 22 },
  { name: 'Service architecture', scalability: 94, operability: 64, migration: 76, lockIn: 26 },
  { name: 'Managed platform', scalability: 89, operability: 88, migration: 52, lockIn: 80 },
];

function sharedRoots(request: string, template: DecisionTemplate): PlanItem[] {
  return [
    item('evidence', 'text-evidence', 'Decision brief', 'Anchor the request and evidence scope.', 40, 70, [], { request, evidence: templateEvidence[template] }),
    item('ledger', 'source-ledger', 'Source ledger', 'Keep evidence provenance inspectable.', 40, 370, ['evidence'], { sources: templateSources[template] }),
  ];
}

function planItems(request: string, template = classifyRequest(request)): PlanItem[] {
  const roots = sharedRoots(request, template);
  if (template === 'vendor-selection') {
    return [
      ...roots,
      item('weights', 'criteria-weights', 'Vendor criteria', 'Expose human-owned vendor priorities.', 390, 45, ['evidence'], { weights: { cost: 24, security: 31, accuracy: 27, adoption: 18 } }),
      item('cost', 'cost-model', 'Integration constraint', 'Apply a normalized integration constraint.', 390, 340, ['evidence'], { budgetIndex: 72 }),
      item('vendors', 'vendor-matrix', 'Vendor matrix', 'Rank vendors with budget-adjusted cost fit.', 760, 55, ['weights', 'cost'], { vendors }),
      item('risk', 'risk-matrix', 'Vendor risk', 'Separate security/adoption risk from score.', 760, 360, ['vendors'], {}),
      item('recommendation', 'recommendation-logic', 'Recommendation logic', 'Select the highest ranked registered output.', 1120, 105, ['vendors', 'risk'], {}),
      item('counter', 'counter-case', 'Counter-case', 'Expose the nearest modeled reversal.', 1120, 390, ['recommendation'], { threshold: 34 }),
      item('decision', 'human-decision-gate', 'Human decision gate', 'Keep final choice explicitly human-owned.', 900, 720, ['recommendation', 'counter'], {}),
    ];
  }
  if (template === 'build-vs-buy') {
    return [
      ...roots,
      item('weights', 'criteria-weights', 'Build / buy priorities', 'Set the relative importance of strategic fit, control, cost, and speed.', 380, 45, ['evidence'], { weights: { strategicFit: 30, control: 25, threeYearCost: 25, timeToValue: 20 } }),
      item('economics', 'build-buy-economics', 'Build vs buy economics', 'Rank build, buy, and hybrid options with a dedicated registered formula.', 740, 70, ['weights'], { options: buildBuyOptions }),
      item('chart', 'chart', 'Economics chart', 'Render the economics ranking.', 1080, 70, ['economics'], {}),
      item('recommendation', 'recommendation-logic', 'Recommendation logic', 'Select the highest ranked path.', 760, 440, ['economics'], {}),
      item('counter', 'counter-case', 'Switch condition', 'Expose the nearest ranking reversal.', 1080, 440, ['recommendation'], { threshold: 24 }),
      item('decision', 'human-decision-gate', 'Human decision gate', 'Record a human-owned build/buy commitment.', 890, 720, ['recommendation', 'counter'], {}),
    ];
  }
  if (template === 'product-launch') {
    return [
      ...roots,
      item('weights', 'criteria-weights', 'Launch priorities', 'Set reach, learning, readiness, and downside priorities.', 380, 45, ['evidence'], { weights: { reach: 24, learning: 28, readiness: 28, downside: 20 } }),
      item('launch', 'launch-readiness', 'Launch readiness', 'Rank launch scopes with a dedicated launch formula.', 740, 60, ['weights'], { options: launchOptions }),
      item('scenarios', 'scenario-comparison', 'Launch comparison', 'Compare the two strongest launch scopes.', 1080, 60, ['launch'], {}),
      item('recommendation', 'recommendation-logic', 'Recommendation logic', 'Select the highest ranked launch scope.', 760, 430, ['launch', 'scenarios'], {}),
      item('decision', 'human-decision-gate', 'Human decision gate', 'Record the final launch scope separately from the model.', 920, 710, ['recommendation'], {}),
    ];
  }
  if (template === 'rollout-strategy') {
    return [
      ...roots,
      item('rollout', 'rollout-sequencer', 'Rollout sequencer', 'Rank rollout patterns with reversibility and change load explicitly modeled.', 460, 70, ['evidence'], { options: rolloutOptions }),
      item('chart', 'chart', 'Rollout chart', 'Render the rollout ranking.', 830, 70, ['rollout'], {}),
      item('recommendation', 'recommendation-logic', 'Recommendation logic', 'Select the highest ranked rollout pattern.', 650, 410, ['rollout'], {}),
      item('counter', 'counter-case', 'Rollout reversal', 'Expose the nearest competing rollout strategy.', 990, 410, ['recommendation'], { threshold: 20 }),
      item('decision', 'human-decision-gate', 'Human decision gate', 'Record the chosen rollout path and rationale.', 800, 700, ['recommendation', 'counter'], {}),
    ];
  }
  return [
    ...roots,
    item('weights', 'criteria-weights', 'Architecture priorities', 'Set scalability, operability, migration, and lock-in priorities.', 380, 45, ['evidence'], { weights: { scalability: 30, operability: 30, migration: 20, lockIn: 20 } }),
    item('architecture', 'architecture-fit', 'Architecture fit', 'Rank architecture options with a dedicated registered formula.', 740, 60, ['weights'], { options: architectureOptions }),
    item('chart', 'chart', 'Architecture chart', 'Render the architecture ranking.', 1080, 60, ['architecture'], {}),
    item('recommendation', 'recommendation-logic', 'Recommendation logic', 'Select the highest ranked architecture.', 760, 420, ['architecture'], {}),
    item('counter', 'counter-case', 'Architecture reversal', 'Expose the nearest modeled architecture reversal.', 1080, 420, ['recommendation'], { threshold: 22 }),
    item('decision', 'human-decision-gate', 'Human decision gate', 'Record the human architecture choice.', 900, 710, ['recommendation', 'counter'], {}),
  ];
}

function planMetadata(template: DecisionTemplate) {
  if (template === 'vendor-selection') return {
    missingInputs: ['Reviewed commercial evidence', 'Observed adoption evidence'],
    assumptions: ['Built-in vendor values are synthetic reference inputs only.', 'Integration budget is a normalized constraint, not currency.'],
  };
  if (template === 'build-vs-buy') return {
    missingInputs: ['Reviewed three-year cost model', 'Internal delivery-capacity evidence'],
    assumptions: ['Cost and time-to-value are normalized 0–100 burden indexes until replaced.'],
  };
  if (template === 'product-launch') return {
    missingInputs: ['Observed launch-readiness evidence', 'Downside / rollback constraints'],
    assumptions: ['Reach and downside values are synthetic indexes, not market forecasts.'],
  };
  if (template === 'rollout-strategy') return {
    missingInputs: ['Change-capacity evidence', 'Rollback and dependency constraints'],
    assumptions: ['Change load and reversibility are explicit normalized planning inputs.'],
  };
  return {
    missingInputs: ['Measured workload constraints', 'Migration and operational evidence'],
    assumptions: ['Architecture inputs are synthetic normalized indexes until replaced by system evidence.'],
  };
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

function createModule(planItem: PlanItem, runId: string): ModuleInstance {
  const now = new Date().toISOString();
  const contract = getModuleContract(planItem.type);
  return {
    id: planItem.id,
    type: planItem.type,
    version: contract.version,
    title: planItem.title,
    position: planItem.position,
    input: planItem.input,
    output: {},
    dependencies: planItem.dependencies,
    status: 'loading',
    error: null,
    provenance: {
      createdBy: 'agent',
      createdAt: now,
      updatedAt: now,
      sources: planItem.dependencies,
      formula: contract.formula,
      lastRecomputeAt: null,
      previousVersion: null,
      runId,
    },
    accessibilitySummary: `Planned ${planItem.title} module.`,
  };
}

export const deterministicProvider: AgentProvider = {
  id: 'local-reference',
  async plan(request, signal) {
    await delay(120, signal);
    const template = classifyRequest(request);
    const metadata = planMetadata(template);
    return {
      id: crypto.randomUUID(),
      request,
      createdAt: new Date().toISOString(),
      status: 'draft',
      items: planItems(request, template),
      missingInputs: metadata.missingInputs,
      assumptions: metadata.assumptions,
      computeNotes: [`Request classified deterministically as ${template}; the template selects a closed registered-module composition.`, 'All calculations run inside registered deterministic modules; graph edits are schema validated before recompute.'],
    };
  },
  async *stream(plan, runId, signal) {
    let sequence = 0;
    for (const planItem of plan.items) {
      await delay(45, signal);
      yield {
        protocol: '1.0', actionId: crypto.randomUUID(), runId, sequence: sequence++, actor: 'agent', type: 'add_module',
        payload: { module: createModule(planItem, runId) },
      };
      for (const source of planItem.dependencies) {
        await delay(20, signal);
        yield {
          protocol: '1.0', actionId: crypto.randomUUID(), runId, sequence: sequence++, actor: 'agent', type: 'connect',
          payload: { id: `${source}->${planItem.id}`, source, target: planItem.id },
        };
      }
    }
    yield {
      protocol: '1.0', actionId: crypto.randomUUID(), runId, sequence: sequence++, actor: 'agent', type: 'finish',
      payload: { summary: 'Registry modules assembled. Deterministic graph computation may begin.' },
    };
  },
};

export type RemoteProviderOptions = { endpoint: string; token?: string; timeoutMs?: number };

function createProviderSignal(external: AbortSignal | undefined, timeoutMs: number) {
  const timeoutController = new AbortController();
  const timeout = window.setTimeout(() => timeoutController.abort(new DOMException('Provider timeout', 'TimeoutError')), timeoutMs);
  const controller = new AbortController();
  const abort = (source: AbortSignal) => controller.abort(source.reason);
  if (external?.aborted) abort(external);
  else external?.addEventListener('abort', () => abort(external), { once: true });
  timeoutController.signal.addEventListener('abort', () => abort(timeoutController.signal), { once: true });
  return { signal: controller.signal, dispose: () => window.clearTimeout(timeout) };
}

export function createRemoteProvider(options: RemoteProviderOptions): AgentProvider {
  return {
    id: 'remote-provider',
    async plan(request, signal) {
      const providerSignal = createProviderSignal(signal, options.timeoutMs ?? 15_000);
      try {
        const response = await fetch(`${options.endpoint}/plan`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
          body: JSON.stringify({ protocol: '1.0', request }),
          signal: providerSignal.signal,
        });
        if (!response.ok) throw new Error(`Provider planning failed: ${response.status}`);
        return await response.json() as AgentPlan;
      } finally {
        providerSignal.dispose();
      }
    },
    async *stream() {
      yield* [] as ProtocolAction[];
      throw new Error('Remote streaming is disabled until an authenticated server-side provider adapter is configured.');
    },
  };
}
