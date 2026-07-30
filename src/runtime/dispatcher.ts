import { getModuleContract } from '../modules/registry';
import { parseProtocolAction, type ProtocolAction } from '../protocol/actions';
import { auditEventSchema, type WorkspaceDocument } from '../schemas/workspace';
import { assertAcyclic, recomputeGraph } from './graph';

export type DispatchResult =
  | { ok: true; workspace: WorkspaceDocument; duplicate: boolean }
  | { ok: false; workspace: WorkspaceDocument; reason: string };

function auditFor(workspace: WorkspaceDocument, action: ProtocolAction, detail: string) {
  return auditEventSchema.parse({
    id: action.actionId,
    workspaceId: workspace.id,
    actor: action.actor,
    kind: action.type,
    detail,
    at: new Date().toISOString(),
    runId: action.runId,
    moduleId: 'id' in action.payload && typeof action.payload.id === 'string' ? action.payload.id : null,
    sequence: action.sequence,
  });
}

export function dispatchProtocolAction(workspace: WorkspaceDocument, raw: unknown): DispatchResult {
  const parsed = parseProtocolAction(raw);
  if (!parsed.ok) return { ok: false, workspace, reason: `Malformed action rejected: ${parsed.reason}` };
  const action = parsed.action;
  if (workspace.audit.some((event) => event.id === action.actionId)) {
    return { ok: true, workspace, duplicate: true };
  }
  if (action.runId !== workspace.run.id) return { ok: false, workspace, reason: 'Action runId does not match active run' };
  if (action.sequence !== workspace.run.sequence) {
    return { ok: false, workspace, reason: `Out-of-order action: expected ${workspace.run.sequence}, received ${action.sequence}` };
  }

  const next = structuredClone(workspace);
  next.updatedAt = new Date().toISOString();
  next.run.sequence = action.sequence + 1;

  try {
    switch (action.type) {
      case 'add_module': {
        if (next.modules.some((module) => module.id === action.payload.module.id)) throw new Error(`Module already exists: ${action.payload.module.id}`);
        getModuleContract(action.payload.module.type);
        next.modules.push(action.payload.module);
        next.audit.push(auditFor(next, action, `Mounted ${action.payload.module.title}`));
        break;
      }
      case 'connect': {
        if (next.edges.some((edge) => edge.id === action.payload.id)) throw new Error(`Edge already exists: ${action.payload.id}`);
        next.edges.push(action.payload);
        assertAcyclic(next.modules, next.edges);
        const target = next.modules.find((module) => module.id === action.payload.target);
        if (target && !target.dependencies.includes(action.payload.source)) target.dependencies.push(action.payload.source);
        next.audit.push(auditFor(next, action, `Connected ${action.payload.source} → ${action.payload.target}`));
        break;
      }
      case 'disconnect': {
        const removed = next.edges.find((edge) => edge.id === action.payload.id);
        next.edges = next.edges.filter((edge) => edge.id !== action.payload.id);
        if (removed) {
          const target = next.modules.find((module) => module.id === removed.target);
          if (target) target.dependencies = target.dependencies.filter((dependency) => dependency !== removed.source);
        }
        next.audit.push(auditFor(next, action, `Disconnected ${action.payload.id}`));
        break;
      }
      case 'remove_module': {
        next.modules = next.modules.filter((module) => module.id !== action.payload.id);
        next.edges = next.edges.filter((edge) => edge.source !== action.payload.id && edge.target !== action.payload.id);
        next.modules.forEach((module) => { module.dependencies = module.dependencies.filter((dependency) => dependency !== action.payload.id); });
        next.audit.push(auditFor(next, action, `Removed ${action.payload.id}`));
        break;
      }
      case 'move_module': {
        const module = next.modules.find((candidate) => candidate.id === action.payload.id);
        if (!module) throw new Error(`Missing module: ${action.payload.id}`);
        module.position = action.payload.position;
        next.audit.push(auditFor(next, action, `Moved ${action.payload.id}`));
        break;
      }
      case 'set_input': {
        const module = next.modules.find((candidate) => candidate.id === action.payload.id);
        if (!module) throw new Error(`Missing module: ${action.payload.id}`);
        module.input = { ...module.input, ...action.payload.input };
        next.audit.push(auditFor(next, action, `Updated input for ${action.payload.id}`));
        break;
      }
      case 'update_module': {
        const index = next.modules.findIndex((candidate) => candidate.id === action.payload.id);
        if (index < 0) throw new Error(`Missing module: ${action.payload.id}`);
        next.modules[index] = { ...next.modules[index], ...action.payload.patch } as typeof next.modules[number];
        next.audit.push(auditFor(next, action, `Updated ${action.payload.id}`));
        break;
      }
      case 'plan_module':
        next.audit.push(auditFor(next, action, `Planned ${action.payload.title}`));
        break;
      case 'focus':
        next.audit.push(auditFor(next, action, action.payload.id ? `Focused ${action.payload.id}` : 'Cleared focus'));
        break;
      case 'explain':
        next.audit.push(auditFor(next, action, action.payload.message));
        break;
      case 'propose_decision':
        next.decision.recommendation = action.payload.recommendation;
        next.decision.uncertainty = action.payload.uncertainty;
        next.decision.counterCase = action.payload.counterCase;
        next.audit.push(auditFor(next, action, `Proposed ${action.payload.recommendation}`));
        break;
      case 'finish': {
        const result = recomputeGraph(next.modules, next.edges);
        next.modules = result.modules;
        next.run.status = result.failed.length ? 'error' : 'complete';
        next.run.finishedAt = new Date().toISOString();
        next.run.error = result.failed.length ? `Computation failed in: ${result.failed.join(', ')}` : null;
        const recommendation = next.modules.find((module) => module.type === 'recommendation-logic')?.output.recommendation;
        const counter = next.modules.find((module) => module.type === 'counter-case')?.output;
        next.decision.recommendation = typeof recommendation === 'string' ? recommendation : null;
        next.decision.counterCase = typeof counter?.counterCase === 'string' ? counter.counterCase : null;
        next.decision.uncertainty = typeof counter?.uncertainty === 'string' ? counter.uncertainty : null;
        next.audit.push(auditFor(next, action, `${action.payload.summary} Computed ${result.computed.length} modules.`));
        break;
      }
    }
    return { ok: true, workspace: next, duplicate: false };
  } catch (error) {
    return { ok: false, workspace, reason: error instanceof Error ? error.message : 'Action dispatch failed' };
  }
}
