import { describe, expect, it } from 'vitest';
import { deterministicProvider } from '../agent/provider';
import type { ModuleInstance, WorkspaceEdge } from '../schemas/workspace';
import { GraphCycleError, affectedModuleIds, assertAcyclic, markDependentsStale, recomputeGraph } from './graph';

async function fixtureGraph() {
  const plan = await deterministicProvider.plan('Compare vendors');
  const runId = crypto.randomUUID();
  const modules: ModuleInstance[] = [];
  const edges: WorkspaceEdge[] = [];
  for await (const action of deterministicProvider.stream(plan, runId)) {
    if (action.type === 'add_module') modules.push(action.payload.module);
    if (action.type === 'connect') edges.push(action.payload);
  }
  return { modules, edges };
}

describe('deterministic graph runtime', () => {
  it('detects graph cycles before they can enter state', async () => {
    const { modules, edges } = await fixtureGraph();
    const cycle = [...edges, { id: 'cycle', source: 'decision', target: 'evidence' }];
    expect(() => assertAcyclic(modules, cycle)).toThrow(GraphCycleError);
  });

  it('computes registered modules deterministically', async () => {
    const { modules, edges } = await fixtureGraph();
    const first = recomputeGraph(modules, edges);
    const second = recomputeGraph(modules, edges);
    expect(first.failed).toEqual([]);
    expect(first.modules.map((module) => module.output)).toEqual(second.modules.map((module) => module.output));
    expect(first.modules.find((module) => module.id === 'recommendation')?.output.recommendation).toBeTruthy();
  });

  it('marks and recomputes only affected descendants', async () => {
    const { modules, edges } = await fixtureGraph();
    const computed = recomputeGraph(modules, edges).modules;
    const affected = affectedModuleIds('cost', edges);
    expect(affected).toContain('recommendation');
    const stale = markDependentsStale(computed, edges, 'cost');
    expect(stale.find((module) => module.id === 'recommendation')?.status).toBe('stale');
    const rerun = recomputeGraph(stale, edges, ['cost']);
    expect(rerun.computed).toContain('recommendation');
    expect(rerun.computed).not.toContain('weights');
  });
});
