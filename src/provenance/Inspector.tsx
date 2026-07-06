import { useMemo, useState } from 'react';
import { GitBranch, History, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
import type { ModuleInstance, WorkspaceDocument } from '../schemas/workspace';

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
}

function diffCount(workspace: WorkspaceDocument, snapshotId: string | null) {
  if (!snapshotId) return null;
  const snapshot = workspace.snapshots.find((item) => item.id === snapshotId);
  if (!snapshot) return null;
  const current = new Map(workspace.modules.map((module) => [module.id, JSON.stringify({ input: module.input, output: module.output, position: module.position })]));
  const prior = new Map(snapshot.modules.map((module) => [module.id, JSON.stringify({ input: module.input, output: module.output, position: module.position })]));
  const ids = new Set([...current.keys(), ...prior.keys()]);
  return [...ids].filter((id) => current.get(id) !== prior.get(id)).length;
}

export function Inspector({
  workspace,
  module,
  open,
  onClose,
  onSnapshot,
  onRestore,
  onCompare,
  compareSnapshotId,
  onBranch,
}: {
  workspace: WorkspaceDocument;
  module: ModuleInstance | null;
  open: boolean;
  onClose: () => void;
  onSnapshot: (name: string) => void;
  onRestore: (id: string) => void;
  onCompare: (id: string | null) => void;
  compareSnapshotId: string | null;
  onBranch: (id: string) => void;
}) {
  const [tab, setTab] = useState<'provenance' | 'history' | 'audit'>('provenance');
  const [snapshotName, setSnapshotName] = useState('Decision checkpoint');
  const changed = useMemo(() => diffCount(workspace, compareSnapshotId), [workspace, compareSnapshotId]);
  return (
    <aside className={`inspector ${open ? 'open' : ''}`} aria-label="Workspace inspector">
      <header><div><span>INSPECTOR</span><strong>{module?.title ?? 'Workspace'}</strong></div><button className="icon-button" aria-label="Close inspector" onClick={onClose}><X size={15} /></button></header>
      <nav>
        <button className={tab === 'provenance' ? 'active' : ''} onClick={() => setTab('provenance')}>PROVENANCE</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>VERSIONS</button>
        <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>AUDIT</button>
      </nav>
      <div className="inspector-body">
        {tab === 'provenance' ? (
          module ? <div className="provenance-panel">
            <dl>
              <div><dt>created by</dt><dd>{module.provenance.createdBy}</dd></div>
              <div><dt>status</dt><dd>{module.status}</dd></div>
              <div><dt>formula</dt><dd>{module.provenance.formula ?? 'renderer-only'}</dd></div>
              <div><dt>last recompute</dt><dd>{formatTime(module.provenance.lastRecomputeAt)}</dd></div>
              <div><dt>previous version</dt><dd>{module.provenance.previousVersion ?? '—'}</dd></div>
              <div><dt>dependencies</dt><dd>{module.dependencies.join(', ') || 'root'}</dd></div>
            </dl>
            <section><span>ACCESSIBILITY SUMMARY</span><p>{module.accessibilitySummary}</p></section>
            <section><span>INPUT</span><pre>{JSON.stringify(module.input, null, 2)}</pre></section>
            <section><span>OUTPUT</span><pre>{JSON.stringify(module.output, null, 2)}</pre></section>
          </div> : <div className="empty-inspector"><ShieldCheck size={20} /><p>Select a module to inspect provenance, formula, dependencies and versions.</p></div>
        ) : null}
        {tab === 'history' ? (
          <div className="history-panel">
            {workspace.mode === 'edit' ? <div className="snapshot-form"><input value={snapshotName} onChange={(event) => setSnapshotName(event.target.value)} aria-label="Snapshot name" /><button onClick={() => onSnapshot(snapshotName.trim() || 'Checkpoint')}><Save size={12} /> SNAPSHOT</button></div> : null}
            {changed !== null ? <p className="compare-summary">Compare mode: {changed} module{changed === 1 ? '' : 's'} changed from selected snapshot.</p> : null}
            {[...workspace.snapshots].reverse().map((snapshot) => <article key={snapshot.id} className={compareSnapshotId === snapshot.id ? 'selected' : ''}>
              <div><History size={12} /><strong>{snapshot.name}</strong><small>{new Date(snapshot.createdAt).toLocaleString()}</small></div>
              <span>{snapshot.modules.length} modules · {snapshot.edges.length} edges</span>
              <div className="snapshot-actions">
                <button onClick={() => onCompare(compareSnapshotId === snapshot.id ? null : snapshot.id)}>COMPARE</button>
                {workspace.mode === 'edit' ? <button onClick={() => onRestore(snapshot.id)}><RotateCcw size={11} /> RESTORE</button> : null}
                {workspace.mode === 'edit' ? <button onClick={() => onBranch(snapshot.id)}><GitBranch size={11} /> BRANCH</button> : null}
              </div>
            </article>)}
            {!workspace.snapshots.length ? <p className="empty-copy">No snapshots yet. Capture a named version before a material decision change.</p> : null}
          </div>
        ) : null}
        {tab === 'audit' ? <div className="audit-panel">{[...workspace.audit].reverse().slice(0, 80).map((event) => <article key={event.id}><span>{event.actor}</span><div><strong>{event.kind}</strong><p>{event.detail}</p></div><time>{formatTime(event.at)}</time></article>)}</div> : null}
      </div>
    </aside>
  );
}
