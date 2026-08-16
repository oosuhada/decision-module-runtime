import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Boxes,
  CircleStop,
  Download,
  Eye,
  History,
  ListTree,
  Network,
  PanelRightOpen,
  Play,
  Redo2,
  RotateCw,
  Save,
  Share2,
  Undo2,
  WandSparkles,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { deterministicProvider } from '../agent/provider';
import { PlanApproval } from '../agent/PlanApproval';
import { AccessibleDecisionTree } from '../canvas/AccessibleDecisionTree';
import { DecisionCanvas } from '../canvas/DecisionCanvas';
import { MobileWorkspace } from '../canvas/MobileWorkspace';
import { Inspector } from '../provenance/Inspector';
import { branchWorkspaceUrl, ensureWorkspaceUrl, resolveWorkspaceRoute } from '../routes/workspaceRoute';
import { createEmptyWorkspace, workspaceDocumentSchema } from '../schemas/workspace';
import { copyReadonlyShareUrl, downloadWorkspaceExport } from '../workspaces/export';
import { useWorkspaceStore } from '../workspaces/store';

const DEFAULT_REQUEST = 'Compare three AI solution vendors by cost, security, accuracy, and field adoption difficulty.';

function useLowPower() {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const extended = navigator as Navigator & { deviceMemory?: number };
    return (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) || Boolean(extended.deviceMemory && extended.deviceMemory <= 4);
  }, []);
}

export function DecisionWorkspace() {
  const reducedMotion = Boolean(useReducedMotion());
  const lowPower = useLowPower();
  const quietMotion = reducedMotion || lowPower;
  const route = useMemo(() => resolveWorkspaceRoute(), []);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const hydrated = useWorkspaceStore((state) => state.hydrated);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const apiStatus = useWorkspaceStore((state) => state.apiStatus);
  const past = useWorkspaceStore((state) => state.past);
  const future = useWorkspaceStore((state) => state.future);
  const focusedModuleId = useWorkspaceStore((state) => state.focusedModuleId);
  const mobileMode = useWorkspaceStore((state) => state.mobileMode);
  const inspectorOpen = useWorkspaceStore((state) => state.inspectorOpen);
  const compareSnapshotId = useWorkspaceStore((state) => state.compareSnapshotId);
  const initialize = useWorkspaceStore((state) => state.initialize);
  const setPlan = useWorkspaceStore((state) => state.setPlan);
  const removePlanItem = useWorkspaceStore((state) => state.removePlanItem);
  const approvePlan = useWorkspaceStore((state) => state.approvePlan);
  const beginRun = useWorkspaceStore((state) => state.beginRun);
  const dispatch = useWorkspaceStore((state) => state.dispatch);
  const cancelRun = useWorkspaceStore((state) => state.cancelRun);
  const failRun = useWorkspaceStore((state) => state.failRun);
  const resetForRetry = useWorkspaceStore((state) => state.resetForRetry);
  const setInput = useWorkspaceStore((state) => state.setInput);
  const moveModule = useWorkspaceStore((state) => state.moveModule);
  const removeModule = useWorkspaceStore((state) => state.removeModule);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const createSnapshot = useWorkspaceStore((state) => state.createSnapshot);
  const restoreSnapshot = useWorkspaceStore((state) => state.restoreSnapshot);
  const setCompareSnapshot = useWorkspaceStore((state) => state.setCompareSnapshot);
  const recordDecision = useWorkspaceStore((state) => state.recordDecision);
  const focusModule = useWorkspaceStore((state) => state.focusModule);
  const setMobileMode = useWorkspaceStore((state) => state.setMobileMode);
  const setInspectorOpen = useWorkspaceStore((state) => state.setInspectorOpen);
  const replaceWorkspace = useWorkspaceStore((state) => state.replaceWorkspace);

  const [requestDraft, setRequestDraft] = useState(DEFAULT_REQUEST);
  const [planning, setPlanning] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'tree'>('canvas');
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [shareState, setShareState] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!route.shareToken) ensureWorkspaceUrl(route.workspaceId, route.readonly);
    void initialize(route.workspaceId, DEFAULT_REQUEST, route.readonly, route.shareToken);
  }, [initialize, route.readonly, route.shareToken, route.workspaceId]);

  useEffect(() => {
    if (workspace?.request) setRequestDraft(workspace.request);
  }, [workspace?.request]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const focusedModule = workspace?.modules.find((module) => module.id === focusedModuleId) ?? null;
  const latestLog = workspace ? [...workspace.audit].reverse().slice(0, 8) : [];

  const createPlan = async () => {
    if (!workspace || workspace.mode === 'readonly' || planning) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPlanning(true);
    setStatusMessage('Planning safe module graph…');
    try {
      const plan = await deterministicProvider.plan(requestDraft.trim() || DEFAULT_REQUEST, controller.signal);
      const next = structuredClone(workspace);
      next.request = requestDraft.trim() || DEFAULT_REQUEST;
      replaceWorkspace(workspaceDocumentSchema.parse(next));
      setPlan(plan);
      setStatusMessage('Plan ready for human approval');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') setStatusMessage('Planning cancelled');
      else setStatusMessage(error instanceof Error ? error.message : 'Planning failed');
    } finally {
      setPlanning(false);
    }
  };

  const assemble = async (retry = false) => {
    const current = useWorkspaceStore.getState().workspace;
    const plan = current?.plan;
    if (!current || !plan || current.mode === 'readonly') return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = crypto.randomUUID();
    if (retry) resetForRetry(runId);
    else beginRun(runId, deterministicProvider.id);
    setStatusMessage('Assembling validated modules…');
    try {
      for await (const action of deterministicProvider.stream({ ...plan, status: 'approved' }, runId, controller.signal)) {
        const result = dispatch(action);
        if (!result.ok) throw new Error(result.reason ?? 'Protocol action rejected');
      }
      setStatusMessage('Graph assembled · deterministic compute complete');
      const state = useWorkspaceStore.getState().workspace;
      if (state && !state.snapshots.length) createSnapshot('Generated baseline');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        cancelRun();
        setStatusMessage('Generation cancelled · partial state preserved');
      } else {
        const reason = error instanceof Error ? error.message : 'Generation failed';
        failRun(reason);
        setStatusMessage(reason);
      }
    }
  };

  const approveAndAssemble = () => {
    approvePlan();
    void assemble(false);
  };

  const rejectPlan = () => {
    if (!workspace) return;
    const next = structuredClone(workspace);
    next.plan = null;
    next.run.status = 'idle';
    replaceWorkspace(next);
    setStatusMessage('Plan rejected · request remains editable');
  };

  const cancel = () => abortRef.current?.abort();

  const branchFromSnapshot = (snapshotId: string) => {
    if (!workspace) return;
    const snapshot = workspace.snapshots.find((candidate) => candidate.id === snapshotId);
    if (!snapshot) return;
    const id = `${workspace.id}-branch-${Date.now().toString(36)}`;
    const branched = createEmptyWorkspace(id, workspace.request);
    branched.name = `${workspace.name} · branch`;
    branched.modules = structuredClone(snapshot.modules);
    branched.edges = structuredClone(snapshot.edges);
    branched.decision = structuredClone(snapshot.decision);
    branched.snapshots = [structuredClone(snapshot)];
    branched.plan = workspace.plan ? structuredClone(workspace.plan) : null;
    branched.run = { ...workspace.run, id: crypto.randomUUID(), status: 'complete', sequence: 0, startedAt: null, finishedAt: new Date().toISOString(), error: null };
    branchWorkspaceUrl(id);
    replaceWorkspace(workspaceDocumentSchema.parse(branched));
    setStatusMessage(`Branched from snapshot ${snapshot.name}`);
  };

  const share = async () => {
    if (!workspace) return;
    try {
      const url = await copyReadonlyShareUrl(workspace);
      setShareState(`Copied ${url}`);
    } catch {
      setShareState('Clipboard unavailable; use the read-only URL in the address bar after adding ?mode=readonly.');
    }
  };

  if (!hydrated || !workspace) {
    return <main className="loading-workspace"><Activity size={18} /><span>RESTORING WORKSPACE</span></main>;
  }

  const isRunning = workspace.run.status === 'assembling' || planning;
  const isReadonly = workspace.mode === 'readonly';

  return (
    <main className={`surface-shell ${lowPower ? 'low-power' : ''}`}>
      <header className="workbench-header">
        <div className="surface-brand"><Boxes size={16} /><b>GENERATIVE DECISION WORKSPACE</b><span>/ safe module runtime</span></div>
        <nav aria-label="Workspace views">
          <button className={viewMode === 'canvas' ? 'active' : ''} onClick={() => setViewMode('canvas')}>CANVAS</button>
          <button className={viewMode === 'tree' ? 'active' : ''} onClick={() => setViewMode('tree')}><ListTree size={12} /> LIST/TREE</button>
        </nav>
        <div className="runtime-state"><i className={workspace.run.status === 'complete' ? 'complete' : isRunning ? 'running' : ''} /><span>{workspace.run.status.toUpperCase()}</span><b>{persistenceStatus}</b><em>{apiStatus === 'connected' ? 'API' : 'LOCAL'}</em></div>
      </header>

      <aside className="command-rail" aria-label="Workspace commands">
        <div className="rail-mark">GD<br /><span>01</span></div>
        <button disabled={isReadonly || isRunning} onClick={() => void createPlan()} title="Plan modules"><WandSparkles size={17} /></button>
        <button disabled={isReadonly || !past.length} onClick={undo} title="Undo"><Undo2 size={17} /></button>
        <button disabled={isReadonly || !future.length} onClick={redo} title="Redo"><Redo2 size={17} /></button>
        <button onClick={() => setInspectorOpen(true)} title="Inspector"><PanelRightOpen size={17} /></button>
        <span />
        <button onClick={() => createSnapshot('Manual checkpoint')} disabled={isReadonly || !workspace.modules.length} title="Snapshot"><Save size={17} /></button>
        <button onClick={() => downloadWorkspaceExport(workspace)} title="Export"><Download size={17} /></button>
      </aside>

      <section className="query-strip">
        <div className="query-index">REQUEST<br /><b>{workspace.id}</b></div>
        <textarea aria-label="Decision request" disabled={isReadonly} value={requestDraft} onChange={(event) => setRequestDraft(event.target.value)} />
        <div className="query-actions">
          {isRunning ? <button className="danger" onClick={cancel}><CircleStop size={13} /> CANCEL</button> : null}
          {!isRunning && workspace.run.status === 'error' && workspace.plan ? <button onClick={() => void assemble(true)}><RotateCw size={13} /> RETRY</button> : null}
          {!isRunning ? <button disabled={isReadonly} onClick={() => void createPlan()}><Play size={13} fill="currentColor" /> PLAN REQUEST</button> : null}
        </div>
      </section>

      <section className="workspace-frame">
        {workspace.plan?.status === 'draft' ? <PlanApproval plan={workspace.plan} onRemove={removePlanItem} onApprove={approveAndAssemble} onReject={rejectPlan} /> : null}
        {!workspace.modules.length && !workspace.plan ? (
          <div className="blank-workspace">
            <div className="origin-cross"><i /><i /><span>0,0</span></div>
            <div className="blank-message"><Network size={25} /><span>NO EXECUTABLE GRAPH</span><h1>The agent plans first. You approve before anything assembles.</h1><p>Only registered modules can enter the main application. Their inputs and outputs are validated, computation stays deterministic, and every human edit is undoable and saved.</p><button disabled={isReadonly} onClick={() => void createPlan()}>PLAN THIS DECISION</button></div>
          </div>
        ) : null}
        {workspace.modules.length && viewMode === 'canvas' ? <DecisionCanvas workspace={workspace} quietMotion={quietMotion} onMove={moveModule} actions={{ setInput, removeModule, recordDecision, focusModule: (id) => { focusModule(id); setInspectorOpen(true); } }} /> : null}
        {workspace.modules.length && viewMode === 'tree' ? <AccessibleDecisionTree workspace={workspace} onInput={setInput} onDecision={recordDecision} onRemove={removeModule} onFocus={(id) => { focusModule(id); setInspectorOpen(true); }} /> : null}
        {isRunning ? <div className="assembly-trace" role="status" aria-live="polite"><span><Activity size={11} /> VALIDATED ASSEMBLY</span><div>{statusMessage}<i /></div></div> : null}
        <MobileWorkspace workspace={workspace} mode={mobileMode} focusedId={focusedModuleId} onMode={setMobileMode} onFocus={focusModule} onInput={setInput} onDecision={recordDecision} />
      </section>

      <aside className="compute-log">
        <div className="compute-title"><Activity size={12} /> RUNTIME LOG</div>
        <div className="winner-readout"><span>SYSTEM RECOMMENDATION</span><strong>{workspace.decision.recommendation ?? '—'}</strong><b>{workspace.decision.humanChoice ? 'HUMAN ✓' : 'OPEN'}</b></div>
        <div className="dependency-list">
          <span>DECISION STATE</span>
          <div><Eye size={11} /><span>missing evidence</span><b>{workspace.plan?.missingInputs.length ?? 0}</b></div>
          <div><History size={11} /><span>snapshots</span><b>{workspace.snapshots.length}</b></div>
          <div><Share2 size={11} /><span>mode</span><b>{workspace.mode}</b></div>
        </div>
        <div className="agent-readback"><Network size={11} /><span>{statusMessage}</span></div>
        <div className="log-lines">{latestLog.length ? latestLog.map((event, index) => <p key={event.id}><span>{String(index + 1).padStart(2, '0')}</span><b>{event.actor}</b>{event.kind} / {event.detail}</p>) : <p><span>00</span>awaiting plan</p>}</div>
        <div className="share-export"><button onClick={() => void share()}><Share2 size={12} /> READ-ONLY SHARE</button><button onClick={() => downloadWorkspaceExport(workspace)}><Download size={12} /> EXPORT JSON</button>{shareState ? <p>{shareState}</p> : null}</div>
      </aside>

      <Inspector
        workspace={workspace}
        module={focusedModule}
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        onSnapshot={(name) => createSnapshot(name)}
        onRestore={restoreSnapshot}
        onCompare={setCompareSnapshot}
        compareSnapshotId={compareSnapshotId}
        onBranch={branchFromSnapshot}
      />

      <footer className="surface-footer"><span>SCHEMA-VALIDATED MODULES · DETERMINISTIC COMPUTE · HUMAN DECISION</span><span>{isReadonly ? 'READ-ONLY SHARE' : `UNDO ${past.length} · REDO ${future.length}`} · {quietMotion ? 'QUIET MOTION' : 'FULL MOTION'}</span></footer>
    </main>
  );
}
