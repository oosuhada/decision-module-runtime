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

const evidence = [
  { id: 'req-1', source: 'Decision request', note: 'Compare hypothetical AI vendors using synthetic reference inputs.' },
  { id: 'bench-1', source: 'Synthetic benchmark fixture', note: 'Accuracy metrics are deterministic reference inputs, not observed vendor measurements.' },
  { id: 'sec-1', source: 'Synthetic security fixture', note: 'Security scores are normalized reference values, not claims about real vendors.' },
];

const sources = [
  { id: 'source-01', label: 'Synthetic security review', locator: 'synthetic://vendor-security-v1' },
  { id: 'source-02', label: 'Synthetic accuracy benchmark', locator: 'synthetic://accuracy-benchmark-v1' },
  { id: 'source-03', label: 'Synthetic adoption interviews', locator: 'synthetic://field-adoption-v1' },
];

function item(id: string, type: ModuleType, title: string, purpose: string, x: number, y: number, dependencies: string[], input: Record<string, unknown>): PlanItem {
  return { id, type, title, purpose, position: { x, y }, dependencies, input };
}

function planItems(request: string): PlanItem[] {
  return [
    item('evidence', 'text-evidence', 'Decision brief', 'Anchor the request and evidence scope.', 40, 60, [], { request, evidence }),
    item('weights', 'criteria-weights', 'Criteria weights', 'Expose human-editable priorities.', 390, 45, ['evidence'], { weights: { cost: 24, security: 31, accuracy: 27, adoption: 18 } }),
    item('cost', 'cost-model', 'Cost model', 'Apply an explicit budget constraint.', 390, 350, ['evidence'], { budgetIndex: 72 }),
    item('vendors', 'vendor-matrix', 'Vendor matrix', 'Compute the deterministic ranking.', 770, 55, ['weights', 'cost'], { vendors }),
    item('risk', 'risk-matrix', 'Risk matrix', 'Separate risk from recommendation score.', 770, 340, ['vendors'], {}),
    item('scenario', 'scenario-comparison', 'Scenario comparison', 'Compare the two strongest scenarios.', 1110, 55, ['vendors'], {}),
    item('chart', 'chart', 'Score chart', 'Make the ranking visually scannable.', 1110, 330, ['vendors'], {}),
    item('recommendation', 'recommendation-logic', 'Recommendation logic', 'Produce a deterministic recommendation.', 670, 635, ['vendors', 'risk', 'cost'], {}),
    item('counter', 'counter-case', 'Counter-case', 'Surface the strongest plausible reversal.', 1020, 630, ['recommendation', 'weights'], { threshold: 34 }),
    item('ledger', 'source-ledger', 'Source ledger', 'Keep evidence provenance inspectable.', 40, 360, ['evidence'], { sources }),
    item('decision', 'human-decision-gate', 'Human decision gate', 'Keep final choice explicitly human-owned.', 850, 900, ['recommendation', 'counter'], {}),
  ];
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
    return {
      id: crypto.randomUUID(),
      request,
      createdAt: new Date().toISOString(),
      status: 'draft',
      items: planItems(request),
      missingInputs: ['Production pricing evidence', 'Observed field adoption time'],
      assumptions: ['All built-in vendor scores are synthetic 0–100 reference values.', 'Budget index is a constraint, not a currency amount.'],
      computeNotes: ['All scoring and risk calculations run in deterministic registry modules.', 'Only downstream modules recompute after input changes.'],
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
