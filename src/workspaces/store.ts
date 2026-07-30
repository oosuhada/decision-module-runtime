import { create } from 'zustand';
import { fetchRemoteShare, fetchRemoteWorkspace, saveRemoteWorkspace, type ApiStatus } from '../api/client';
import { saveWorkspaceLocal, loadWorkspaceLocal } from '../persistence/indexedDb';
import { agentPlanSchema, auditEventSchema, createEmptyWorkspace, snapshotSchema, workspaceDocumentSchema, type AgentPlan, type HumanDecision, type ModuleInstance, type ModulePosition, type ModuleType, type WorkspaceDocument, type WorkspaceSnapshot } from '../schemas/workspace';
import { dispatchProtocolAction } from '../runtime/dispatcher';
import { assertAcyclic, markDependentsStale, recomputeGraph } from '../runtime/graph';
import { getModuleContract, moduleCatalog, validateModuleInput } from '../modules/registry';

type HistoryFrame = Pick<WorkspaceDocument, 'modules' | 'edges' | 'decision'>;
type MobileMode = 'stack' | 'focused' | 'dependencies' | 'summary';

type WorkspaceState = {
  workspace: WorkspaceDocument | null;
  hydrated: boolean;
  persistenceStatus: 'loading' | 'saved' | 'saving' | 'error';
  apiStatus: ApiStatus;
  past: HistoryFrame[];
  future: HistoryFrame[];
  focusedModuleId: string | null;
  mobileMode: MobileMode;
  inspectorOpen: boolean;
  compareSnapshotId: string | null;
  initialize: (id: string, request: string, readonly?: boolean, shareToken?: string | null) => Promise<void>;
  setPlan: (plan: AgentPlan) => void;
  removePlanItem: (id: string) => void;
  approvePlan: () => void;
  beginRun: (runId: string, provider: string) => void;
  dispatch: (raw: unknown) => { ok: boolean; reason?: string; duplicate?: boolean };
  cancelRun: () => void;
  failRun: (reason: string) => void;
  resetForRetry: (runId: string) => void;
  setInput: (id: string, input: Record<string, unknown>) => void;
  moveModule: (id: string, position: ModulePosition) => void;
  removeModule: (id: string) => void;
  addRegisteredModule: (type: ModuleType) => void;
  connectModules: (source: string, target: string) => { ok: boolean; reason?: string };
  disconnectEdge: (id: string) => void;
  undo: () => void;
  redo: () => void;
  createSnapshot: (name: string) => WorkspaceSnapshot | null;
  restoreSnapshot: (id: string) => void;
  setCompareSnapshot: (id: string | null) => void;
  recordDecision: (choice: string, rationale: string) => void;
  focusModule: (id: string | null) => void;
  setMobileMode: (mode: MobileMode) => void;
  setInspectorOpen: (open: boolean) => void;
  replaceWorkspace: (workspace: WorkspaceDocument) => void;
};

const defaultRequest = 'Compare three AI solution vendors by cost, security, accuracy, and field adoption difficulty.';

function syncComputedDecision(workspace: WorkspaceDocument) {
  const recommendation = workspace.modules.find((candidate) => candidate.type === 'recommendation-logic')?.output.recommendation;
  const counter = workspace.modules.find((candidate) => candidate.type === 'counter-case')?.output;
  workspace.decision.recommendation = typeof recommendation === 'string' ? recommendation : null;
  workspace.decision.counterCase = typeof counter?.counterCase === 'string' ? counter.counterCase : null;
  workspace.decision.uncertainty = typeof counter?.uncertainty === 'string' ? counter.uncertainty : null;
  if (workspace.decision.humanChoice) {
    workspace.decision.humanChoice = null;
    workspace.decision.rationale = null;
    workspace.decision.decidedAt = null;
  }
}

function frame(workspace: WorkspaceDocument): HistoryFrame {
  return structuredClone({ modules: workspace.modules, edges: workspace.edges, decision: workspace.decision });
}

function withHumanAudit(workspace: WorkspaceDocument, kind: string, detail: string, moduleId: string | null = null) {
  workspace.audit.push(auditEventSchema.parse({
    id: crypto.randomUUID(), workspaceId: workspace.id, actor: 'human', kind, detail, at: new Date().toISOString(), runId: null, moduleId, sequence: null,
  }));
}

let saveSequence = 0;
function persist(workspace: WorkspaceDocument, setStatus: (status: Partial<Pick<WorkspaceState, 'persistenceStatus' | 'apiStatus'>>) => void) {
  const sequence = ++saveSequence;
  setStatus({ persistenceStatus: 'saving' });
  void saveWorkspaceLocal(workspace)
    .then(async () => {
      const apiStatus = await saveRemoteWorkspace(workspace);
      if (sequence === saveSequence) setStatus({ persistenceStatus: 'saved', apiStatus });
    })
    .catch(() => {
      if (sequence === saveSequence) setStatus({ persistenceStatus: 'error' });
    });
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  const commit = (workspace: WorkspaceDocument, history = false) => {
    const current = get().workspace;
    workspace.updatedAt = new Date().toISOString();
    const validated = workspaceDocumentSchema.parse(workspace);
    set((state) => ({
      workspace: validated,
      past: history && current ? [...state.past, frame(current)].slice(-80) : state.past,
      future: history ? [] : state.future,
    }));
    persist(validated, (status) => set(status));
  };

  return {
    workspace: null,
    hydrated: false,
    persistenceStatus: 'loading',
    apiStatus: 'offline',
    past: [],
    future: [],
    focusedModuleId: null,
    mobileMode: 'stack',
    inspectorOpen: false,
    compareSnapshotId: null,
    async initialize(id, request = defaultRequest, readonly = false, shareToken = null) {
      set({ persistenceStatus: 'loading' });
      if (shareToken) {
        const shared = await fetchRemoteShare(shareToken);
        if (shared) {
          shared.mode = 'readonly';
          set({ workspace: shared, hydrated: true, persistenceStatus: 'saved', apiStatus: 'connected', past: [], future: [] });
          return;
        }
        const fallback = createEmptyWorkspace(id, request);
        fallback.mode = 'readonly';
        fallback.name = 'Unavailable shared workspace';
        set({ workspace: fallback, hydrated: true, persistenceStatus: 'error', apiStatus: 'error', past: [], future: [] });
        return;
      }
      let workspace = await loadWorkspaceLocal(id);
      if (!workspace) workspace = await fetchRemoteWorkspace(id);
      if (!workspace) workspace = createEmptyWorkspace(id, request);
      workspace.mode = readonly ? 'readonly' : 'edit';
      set({ workspace, hydrated: true, persistenceStatus: 'saved', past: [], future: [] });
      persist(workspace, (status) => set(status));
    },
    setPlan(plan) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const next = structuredClone(current);
      next.plan = agentPlanSchema.parse(plan);
      next.run.status = 'awaiting-approval';
      next.audit.push(auditEventSchema.parse({ id: crypto.randomUUID(), workspaceId: next.id, actor: 'agent', kind: 'plan-created', detail: `${plan.items.length} modules planned; approval required.`, at: new Date().toISOString(), runId: next.run.id, moduleId: null, sequence: null }));
      commit(next);
    },
    removePlanItem(id) {
      const current = get().workspace;
      if (!current?.plan || current.mode === 'readonly') return;
      const next = structuredClone(current);
      next.plan!.items = next.plan!.items.filter((item) => item.id !== id).map((item) => ({ ...item, dependencies: item.dependencies.filter((dependency) => dependency !== id) }));
      withHumanAudit(next, 'plan-edited', `Removed planned module ${id}`, id);
      commit(next, true);
    },
    approvePlan() {
      const current = get().workspace;
      if (!current?.plan || current.mode === 'readonly') return;
      const next = structuredClone(current);
      const plan = next.plan;
      if (!plan) return;
      plan.status = 'approved';
      next.run.status = 'assembling';
      withHumanAudit(next, 'plan-approved', `Approved ${plan.items.length} modules`);
      commit(next, true);
    },
    beginRun(runId, provider) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const next = structuredClone(current);
      next.modules = [];
      next.edges = [];
      next.run = { id: runId, provider, status: 'assembling', startedAt: new Date().toISOString(), finishedAt: null, sequence: 0, error: null };
      commit(next, true);
    },
    dispatch(raw) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return { ok: false, reason: 'Workspace is unavailable or read-only' };
      const result = dispatchProtocolAction(current, raw);
      if (!result.ok) {
        const next = structuredClone(current);
        next.audit.push(auditEventSchema.parse({ id: crypto.randomUUID(), workspaceId: next.id, actor: 'system', kind: 'action-rejected', detail: result.reason, at: new Date().toISOString(), runId: next.run.id, moduleId: null, sequence: next.run.sequence }));
        commit(next);
        return { ok: false, reason: result.reason };
      }
      if (!result.duplicate) commit(result.workspace);
      return { ok: true, duplicate: result.duplicate };
    },
    cancelRun() {
      const current = get().workspace;
      if (!current) return;
      const next = structuredClone(current);
      next.run.status = 'cancelled';
      next.run.finishedAt = new Date().toISOString();
      next.modules = next.modules.map((module) => module.status === 'loading' ? { ...module, status: 'cancelled' as const } : module);
      next.audit.push(auditEventSchema.parse({ id: crypto.randomUUID(), workspaceId: next.id, actor: 'human', kind: 'run-cancelled', detail: 'Generation cancelled by human.', at: new Date().toISOString(), runId: next.run.id, moduleId: null, sequence: null }));
      commit(next);
    },
    failRun(reason) {
      const current = get().workspace;
      if (!current) return;
      const next = structuredClone(current);
      next.run.status = 'error';
      next.run.error = reason;
      next.run.finishedAt = new Date().toISOString();
      next.audit.push(auditEventSchema.parse({ id: crypto.randomUUID(), workspaceId: next.id, actor: 'system', kind: 'run-error', detail: reason, at: new Date().toISOString(), runId: next.run.id, moduleId: null, sequence: null }));
      commit(next);
    },
    resetForRetry(runId) {
      const current = get().workspace;
      if (!current) return;
      const next = structuredClone(current);
      next.modules = [];
      next.edges = [];
      next.run = { ...next.run, id: runId, status: 'assembling', startedAt: new Date().toISOString(), finishedAt: null, sequence: 0, error: null };
      next.audit.push(auditEventSchema.parse({ id: crypto.randomUUID(), workspaceId: next.id, actor: 'human', kind: 'run-retry', detail: 'Retry requested from approved plan.', at: new Date().toISOString(), runId, moduleId: null, sequence: null }));
      commit(next, true);
    },
    setInput(id, input) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const next = structuredClone(current);
      const module = next.modules.find((candidate) => candidate.id === id);
      if (!module) return;
      module.input = { ...module.input, ...input };
      module.provenance.previousVersion = `${module.version}@${module.provenance.updatedAt}`;
      module.provenance.updatedAt = new Date().toISOString();
      next.modules = markDependentsStale(next.modules, next.edges, id);
      const computed = recomputeGraph(next.modules, next.edges, [id]);
      next.modules = computed.modules;
      syncComputedDecision(next);
      withHumanAudit(next, 'input-changed', `${id} recomputed ${computed.computed.join(' → ')}`, id);
      commit(next, true);
    },
    moveModule(id, position) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const next = structuredClone(current);
      const module = next.modules.find((candidate) => candidate.id === id);
      if (!module) return;
      module.position = position;
      withHumanAudit(next, 'module-moved', `${id} → ${Math.round(position.x)},${Math.round(position.y)}`, id);
      commit(next, true);
    },
    removeModule(id) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const next = structuredClone(current);
      next.modules = next.modules.filter((module) => module.id !== id);
      next.edges = next.edges.filter((edge) => edge.source !== id && edge.target !== id);
      next.modules.forEach((module) => { module.dependencies = module.dependencies.filter((dependency) => dependency !== id); });
      const computed = recomputeGraph(next.modules, next.edges);
      next.modules = computed.modules;
      syncComputedDecision(next);
      withHumanAudit(next, 'module-removed', `Removed ${id}; undo available`, id);
      commit(next, true);
    },
    addRegisteredModule(type) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const catalog = moduleCatalog.find((entry) => entry.type === type);
      if (!catalog) return;
      const contract = getModuleContract(type);
      const input = structuredClone(catalog.defaultInput);
      const validation = validateModuleInput(type, input);
      if (!validation.success) return;
      const next = structuredClone(current);
      const suffix = Math.random().toString(36).slice(2, 7);
      const id = `${type}-${suffix}`;
      const now = new Date().toISOString();
      const index = next.modules.length;
      const module: ModuleInstance = {
        id,
        type,
        version: contract.version,
        title: catalog.title,
        position: { x: 80 + (index % 4) * 350, y: 90 + Math.floor(index / 4) * 300 },
        input: validation.data,
        output: {},
        dependencies: [],
        status: 'loading',
        error: null,
        provenance: { createdBy: 'human', createdAt: now, updatedAt: now, sources: [], formula: contract.formula, lastRecomputeAt: null, previousVersion: null, runId: null },
        accessibilitySummary: `Human-added registered ${catalog.title} module.`,
      };
      next.modules.push(module);
      const computed = recomputeGraph(next.modules, next.edges, [id]);
      next.modules = computed.modules;
      syncComputedDecision(next);
      withHumanAudit(next, 'module-added', `Added registered ${type}`, id);
      commit(next, true);
      set({ focusedModuleId: id });
    },
    connectModules(source, target) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return { ok: false, reason: 'Workspace is read-only.' };
      if (source === target) return { ok: false, reason: 'A module cannot depend on itself.' };
      if (!current.modules.some((module) => module.id === source) || !current.modules.some((module) => module.id === target)) return { ok: false, reason: 'Select two existing modules.' };
      if (current.edges.some((edge) => edge.source === source && edge.target === target)) return { ok: false, reason: 'That dependency already exists.' };
      const next = structuredClone(current);
      next.edges.push({ id: `${source}->${target}-${Math.random().toString(36).slice(2, 6)}`, source, target });
      try { assertAcyclic(next.modules, next.edges); }
      catch (error) { return { ok: false, reason: error instanceof Error ? error.message : 'Dependency would create a cycle.' }; }
      const targetModule = next.modules.find((module) => module.id === target);
      if (targetModule && !targetModule.dependencies.includes(source)) targetModule.dependencies.push(source);
      const computed = recomputeGraph(next.modules, next.edges, [source]);
      next.modules = computed.modules;
      syncComputedDecision(next);
      withHumanAudit(next, 'dependency-connected', `${source} → ${target}`, target);
      commit(next, true);
      return { ok: true };
    },
    disconnectEdge(id) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const removed = current.edges.find((edge) => edge.id === id);
      if (!removed) return;
      const next = structuredClone(current);
      next.edges = next.edges.filter((edge) => edge.id !== id);
      const targetModule = next.modules.find((module) => module.id === removed.target);
      if (targetModule) targetModule.dependencies = targetModule.dependencies.filter((dependency) => dependency !== removed.source);
      const computed = recomputeGraph(next.modules, next.edges);
      next.modules = computed.modules;
      syncComputedDecision(next);
      withHumanAudit(next, 'dependency-disconnected', `${removed.source} → ${removed.target}`, removed.target);
      commit(next, true);
    },
    undo() {
      const current = get().workspace;
      const previous = get().past.at(-1);
      if (!current || !previous || current.mode === 'readonly') return;
      const next = structuredClone(current);
      const currentFrame = frame(current);
      next.modules = previous.modules;
      next.edges = previous.edges;
      next.decision = previous.decision;
      withHumanAudit(next, 'undo', 'Restored previous human-edit state');
      set((state) => ({ workspace: next, past: state.past.slice(0, -1), future: [currentFrame, ...state.future].slice(0, 80) }));
      persist(next, (status) => set(status));
    },
    redo() {
      const current = get().workspace;
      const nextFrame = get().future[0];
      if (!current || !nextFrame || current.mode === 'readonly') return;
      const next = structuredClone(current);
      const currentFrame = frame(current);
      next.modules = nextFrame.modules;
      next.edges = nextFrame.edges;
      next.decision = nextFrame.decision;
      withHumanAudit(next, 'redo', 'Reapplied human-edit state');
      set((state) => ({ workspace: next, past: [...state.past, currentFrame].slice(-80), future: state.future.slice(1) }));
      persist(next, (status) => set(status));
    },
    createSnapshot(name) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return null;
      const snapshot = snapshotSchema.parse({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), parentSnapshotId: current.snapshots.at(-1)?.id ?? null, modules: current.modules, edges: current.edges, decision: current.decision });
      const next = structuredClone(current);
      next.snapshots.push(snapshot);
      withHumanAudit(next, 'snapshot-created', `Created snapshot “${name}”`);
      commit(next, true);
      return snapshot;
    },
    restoreSnapshot(id) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const snapshot = current.snapshots.find((candidate) => candidate.id === id);
      if (!snapshot) return;
      const next = structuredClone(current);
      next.modules = structuredClone(snapshot.modules);
      next.edges = structuredClone(snapshot.edges);
      next.decision = structuredClone(snapshot.decision);
      withHumanAudit(next, 'snapshot-restored', `Restored snapshot “${snapshot.name}”`);
      commit(next, true);
    },
    setCompareSnapshot(compareSnapshotId) { set({ compareSnapshotId }); },
    recordDecision(choice, rationale) {
      const current = get().workspace;
      if (!current || current.mode === 'readonly') return;
      const next = structuredClone(current);
      const decision: HumanDecision = { ...next.decision, humanChoice: choice, rationale, decidedAt: new Date().toISOString(), missingEvidence: next.plan?.missingInputs ?? [] };
      next.decision = decision;
      withHumanAudit(next, 'human-decision', `Selected ${choice}`);
      commit(next, true);
    },
    focusModule(focusedModuleId) { set({ focusedModuleId, mobileMode: focusedModuleId ? 'focused' : get().mobileMode }); },
    setMobileMode(mobileMode) { set({ mobileMode }); },
    setInspectorOpen(inspectorOpen) { set({ inspectorOpen }); },
    replaceWorkspace(workspace) {
      const validated = workspaceDocumentSchema.parse(workspace);
      set({ workspace: validated, past: [], future: [] });
      persist(validated, (status) => set(status));
    },
  };
});
