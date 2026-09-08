import { getModuleContract, validateModuleInput, validateModuleOutput } from '../modules/registry';
import type { ModuleInstance, WorkspaceEdge } from '../schemas/workspace';

export class GraphCycleError extends Error {
  constructor(message = 'Dependency graph contains a cycle') {
    super(message);
    this.name = 'GraphCycleError';
  }
}

type GraphIndex = {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  indegree: Map<string, number>;
};

function buildGraphIndex(modules: ModuleInstance[], edges: WorkspaceEdge[]): GraphIndex {
  const ids = new Set(modules.map((module) => module.id));
  const outgoing = new Map([...ids].map((id) => [id, [] as string[]]));
  const incoming = new Map([...ids].map((id) => [id, [] as string[]]));
  const indegree = new Map([...ids].map((id) => [id, 0]));
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) throw new Error(`Edge references missing module: ${edge.id}`);
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  return { outgoing, incoming, indegree };
}

function topologicalOrderFromIndex(index: GraphIndex): string[] {
  const indegree = new Map(index.indegree);
  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  const order: string[] = [];
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++];
    order.push(current);
    for (const target of index.outgoing.get(current) ?? []) {
      const next = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }
  if (order.length !== indegree.size) throw new GraphCycleError();
  return order;
}

function descendantsFromOutgoing(sourceId: string, outgoing: Map<string, string[]>): string[] {
  const affected = new Set<string>();
  const queue = [sourceId];
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++];
    for (const target of outgoing.get(current) ?? []) {
      if (affected.has(target)) continue;
      affected.add(target);
      queue.push(target);
    }
  }
  return [...affected];
}

export function assertAcyclic(modules: ModuleInstance[], edges: WorkspaceEdge[]) {
  topologicalOrderFromIndex(buildGraphIndex(modules, edges));
}

export function topologicalOrder(modules: ModuleInstance[], edges: WorkspaceEdge[]): string[] {
  return topologicalOrderFromIndex(buildGraphIndex(modules, edges));
}

export function affectedModuleIds(sourceId: string, edges: WorkspaceEdge[]): string[] {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }
  return descendantsFromOutgoing(sourceId, outgoing);
}

export type RecomputeResult = { modules: ModuleInstance[]; computed: string[]; failed: string[] };

export function recomputeGraph(modules: ModuleInstance[], edges: WorkspaceEdge[], roots?: string[]): RecomputeResult {
  const index = buildGraphIndex(modules, edges);
  const order = topologicalOrderFromIndex(index);
  const requested = roots?.length
    ? new Set(roots.flatMap((root) => [root, ...descendantsFromOutgoing(root, index.outgoing)]))
    : new Set(order);
  const byId = new Map(modules.map((module) => [module.id, structuredClone(module)]));
  const computed: string[] = [];
  const failed: string[] = [];

  for (const id of order) {
    if (!requested.has(id)) continue;
    const module = byId.get(id);
    if (!module) continue;
    const contract = getModuleContract(module.type);
    const inputValidation = validateModuleInput(module.type, module.input);
    if (!inputValidation.success) {
      module.status = 'error';
      module.error = inputValidation.error.issues.map((issue) => issue.message).join('; ');
      failed.push(id);
      continue;
    }
    const dependencyIds = index.incoming.get(id) ?? [];
    const dependencyOutputs = Object.fromEntries(dependencyIds.map((dependencyId) => [dependencyId, byId.get(dependencyId)?.output ?? {}]));
    try {
      const output = contract.deterministicCompute({ module, dependencyOutputs });
      const outputValidation = validateModuleOutput(module.type, output);
      if (!outputValidation.success) throw new Error(outputValidation.error.issues.map((issue) => issue.message).join('; '));
      const now = new Date().toISOString();
      module.output = outputValidation.data;
      module.status = 'ready';
      module.error = null;
      module.provenance = { ...module.provenance, formula: contract.formula, updatedAt: now, lastRecomputeAt: now };
      module.accessibilitySummary = contract.accessibilitySummary(outputValidation.data);
      byId.set(id, module);
      computed.push(id);
    } catch (error) {
      module.status = 'error';
      module.error = error instanceof Error ? error.message : 'Unknown compute error';
      failed.push(id);
    }
  }
  return { modules: modules.map((module) => byId.get(module.id) ?? module), computed, failed };
}

export function markDependentsStale(modules: ModuleInstance[], edges: WorkspaceEdge[], sourceId: string) {
  const stale = new Set(affectedModuleIds(sourceId, edges));
  return modules.map((module) => stale.has(module.id) ? { ...module, status: 'stale' as const } : module);
}
