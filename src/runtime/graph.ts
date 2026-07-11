import { getModuleContract, validateModuleInput, validateModuleOutput } from '../modules/registry';
import type { ModuleInstance, WorkspaceEdge } from '../schemas/workspace';

export class GraphCycleError extends Error {
  constructor(message = 'Dependency graph contains a cycle') {
    super(message);
    this.name = 'GraphCycleError';
  }
}

export function assertAcyclic(modules: ModuleInstance[], edges: WorkspaceEdge[]) {
  const ids = new Set(modules.map((module) => module.id));
  const indegree = new Map([...ids].map((id) => [id, 0]));
  const outgoing = new Map([...ids].map((id) => [id, [] as string[]]));
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) throw new Error(`Edge references missing module: ${edge.id}`);
    outgoing.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    visited += 1;
    for (const target of outgoing.get(current) ?? []) {
      const next = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }
  if (visited !== modules.length) throw new GraphCycleError();
}

export function topologicalOrder(modules: ModuleInstance[], edges: WorkspaceEdge[]): string[] {
  assertAcyclic(modules, edges);
  const incoming = new Map(modules.map((module) => [module.id, 0]));
  const outgoing = new Map(modules.map((module) => [module.id, [] as string[]]));
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }
  const queue = [...incoming.entries()].filter(([, count]) => count === 0).map(([id]) => id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift();
    if (!id) break;
    order.push(id);
    for (const target of outgoing.get(id) ?? []) {
      const next = (incoming.get(target) ?? 0) - 1;
      incoming.set(target, next);
      if (next === 0) queue.push(target);
    }
  }
  return order;
}

export function affectedModuleIds(sourceId: string, edges: WorkspaceEdge[]): string[] {
  const affected = new Set<string>();
  const queue = [sourceId];
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of edges) {
      if (edge.source === current && !affected.has(edge.target)) {
        affected.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return [...affected];
}

export type RecomputeResult = { modules: ModuleInstance[]; computed: string[]; failed: string[] };

export function recomputeGraph(modules: ModuleInstance[], edges: WorkspaceEdge[], roots?: string[]): RecomputeResult {
  const order = topologicalOrder(modules, edges);
  const requested = roots?.length
    ? new Set(roots.flatMap((root) => [root, ...affectedModuleIds(root, edges)]))
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
    const dependencyIds = edges.filter((edge) => edge.target === id).map((edge) => edge.source);
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
