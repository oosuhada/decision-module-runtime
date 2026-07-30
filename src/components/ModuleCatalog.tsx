import { useMemo, useState } from 'react';
import { Cable, Plus, Trash2, X } from 'lucide-react';
import { moduleCatalog } from '../modules/registry';
import type { ModuleType, WorkspaceDocument } from '../schemas/workspace';

type Props = {
  workspace: WorkspaceDocument;
  open: boolean;
  onClose: () => void;
  onAdd: (type: ModuleType) => void;
  onConnect: (source: string, target: string) => { ok: boolean; reason?: string };
  onDisconnect: (id: string) => void;
};

export function ModuleCatalog({ workspace, open, onClose, onAdd, onConnect, onDisconnect }: Props) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const readonly = workspace.mode === 'readonly';
  const counts = useMemo(() => new Map(moduleCatalog.map((entry) => [entry.type, workspace.modules.filter((module) => module.type === entry.type).length])), [workspace.modules]);

  if (!open) return null;

  const connect = () => {
    const result = onConnect(source, target);
    setMessage(result.ok ? 'Dependency connected and graph recomputed.' : result.reason ?? 'Dependency rejected.');
  };

  return <aside className="module-catalog" aria-label="Registered module catalog">
    <header><div><span>CLOSED REGISTRY / MODULE CATALOG</span><h2>Add & rewire validated modules</h2><p>Only these registered contracts can enter the graph. Dependency changes are cycle-checked before deterministic recompute.</p></div><button type="button" onClick={onClose} aria-label="Close module catalog"><X size={15} /></button></header>

    <section className="catalog-list">
      {moduleCatalog.map((entry) => <article key={entry.type}>
        <div><span>{entry.type}</span><strong>{entry.title}</strong><p>{entry.purpose}</p><small>{counts.get(entry.type) ?? 0} mounted</small></div>
        <button type="button" disabled={readonly} onClick={() => onAdd(entry.type)}><Plus size={11} /> Add</button>
      </article>)}
    </section>

    <section className="dependency-editor">
      <div className="catalog-section-heading"><Cable size={13} /><div><span>DEPENDENCY EDITOR</span><strong>Change the DAG directly</strong></div></div>
      <label>Upstream module<select disabled={readonly} value={source} onChange={(event) => setSource(event.target.value)}><option value="">Select source</option>{workspace.modules.map((module) => <option key={module.id} value={module.id}>{module.title} · {module.type}</option>)}</select></label>
      <label>Downstream module<select disabled={readonly} value={target} onChange={(event) => setTarget(event.target.value)}><option value="">Select target</option>{workspace.modules.map((module) => <option key={module.id} value={module.id}>{module.title} · {module.type}</option>)}</select></label>
      <button className="connect-button" type="button" disabled={readonly || !source || !target} onClick={connect}><Cable size={11} /> Validate + connect</button>
      {message ? <p className="catalog-message">{message}</p> : null}
      <div className="edge-list"><span>ACTIVE EDGES / {workspace.edges.length}</span>{workspace.edges.length ? workspace.edges.map((edge) => {
        const sourceModule = workspace.modules.find((module) => module.id === edge.source);
        const targetModule = workspace.modules.find((module) => module.id === edge.target);
        return <div key={edge.id}><p><b>{sourceModule?.title ?? edge.source}</b><i>→</i><b>{targetModule?.title ?? edge.target}</b></p><button type="button" disabled={readonly} onClick={() => onDisconnect(edge.id)} aria-label={`Disconnect ${edge.source} from ${edge.target}`}><Trash2 size={10} /></button></div>;
      }) : <p>No dependencies yet.</p>}</div>
    </section>
  </aside>;
}
