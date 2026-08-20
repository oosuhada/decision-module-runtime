import { ChevronLeft, ChevronRight, Network, Rows3, Route, Target } from 'lucide-react';
import type { WorkspaceDocument } from '../schemas/workspace';
import { ModuleRenderer } from '../modules/ModuleRenderer';

type Mode = 'stack' | 'focused' | 'dependencies' | 'summary';

function ancestors(workspace: WorkspaceDocument, id: string) {
  const seen = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const target = queue.shift();
    if (!target) break;
    for (const edge of workspace.edges.filter((candidate) => candidate.target === target)) {
      if (!seen.has(edge.source)) {
        seen.add(edge.source);
        queue.push(edge.source);
      }
    }
  }
  return workspace.modules.filter((module) => seen.has(module.id));
}

export function MobileWorkspace({ workspace, mode, focusedId, onMode, onFocus, onInput, onDecision }: { workspace: WorkspaceDocument; mode: Mode; focusedId: string | null; onMode: (mode: Mode) => void; onFocus: (id: string) => void; onInput: (id: string, input: Record<string, unknown>) => void; onDecision: (choice: string, rationale: string) => void }) {
  const focusedIndex = Math.max(0, workspace.modules.findIndex((module) => module.id === focusedId));
  const focused = workspace.modules[focusedIndex] ?? workspace.modules[0] ?? null;
  const focusAt = (index: number) => workspace.modules[index] && onFocus(workspace.modules[index].id);
  return (
    <section className="mobile-workspace">
      <nav className="mobile-mode-tabs" aria-label="Mobile workspace modes">
        <button className={mode === 'stack' ? 'active' : ''} onClick={() => onMode('stack')}><Rows3 size={15} />STACK</button>
        <button className={mode === 'focused' ? 'active' : ''} onClick={() => onMode('focused')}><Target size={15} />FOCUS</button>
        <button className={mode === 'dependencies' ? 'active' : ''} onClick={() => onMode('dependencies')}><Route size={15} />PATH</button>
        <button className={mode === 'summary' ? 'active' : ''} onClick={() => onMode('summary')}><Network size={15} />DECIDE</button>
      </nav>
      {mode === 'stack' ? <div className="module-stack">{workspace.modules.map((module) => <article key={module.id} className={focused?.id === module.id ? 'expanded' : ''}><button className="stack-summary" onClick={() => onFocus(module.id)}><span><small>{module.type}</small><strong>{module.title}</strong></span><b>{module.status}</b></button>{focused?.id === module.id ? <div className="stack-body"><p className="dependency-breadcrumb">{module.dependencies.length ? `${module.dependencies.join(' / ')} / ${module.id}` : module.id}</p><ModuleRenderer module={module} readonly={workspace.mode === 'readonly'} onInput={(input) => onInput(module.id, input)} onDecision={onDecision} /></div> : null}</article>)}</div> : null}
      {mode === 'focused' && focused ? <div className="mobile-focused"><p className="dependency-breadcrumb">{focused.dependencies.length ? `${focused.dependencies.join(' / ')} / ${focused.id}` : focused.id}</p><header><button disabled={focusedIndex <= 0} onClick={() => focusAt(focusedIndex - 1)}><ChevronLeft size={17} />Previous</button><span>{focusedIndex + 1} / {workspace.modules.length}</span><button disabled={focusedIndex >= workspace.modules.length - 1} onClick={() => focusAt(focusedIndex + 1)}>Next<ChevronRight size={17} /></button></header><article><div className="mobile-module-head"><span>{focused.type}</span><h2>{focused.title}</h2><small>{focused.status} · v{focused.version}</small></div><ModuleRenderer module={focused} readonly={workspace.mode === 'readonly'} onInput={(input) => onInput(focused.id, input)} onDecision={onDecision} /></article></div> : null}
      {mode === 'dependencies' && focused ? <div className="dependency-path"><header><span>DEPENDENCY PATH</span><h2>{focused.title}</h2></header>{[...ancestors(workspace, focused.id), focused].map((module, index, all) => <button key={module.id} onClick={() => onFocus(module.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{module.title}</strong><small>{module.status}</small>{index < all.length - 1 ? <ChevronRight size={14} /> : null}</button>)}</div> : null}
      {mode === 'summary' ? <div className="decision-summary"><span>DECISION SUMMARY</span><h2>{workspace.decision.humanChoice ?? workspace.decision.recommendation ?? 'No decision recorded'}</h2><dl><div><dt>system recommendation</dt><dd>{workspace.decision.recommendation ?? '—'}</dd></div><div><dt>counter-case</dt><dd>{workspace.decision.counterCase ?? '—'}</dd></div><div><dt>uncertainty</dt><dd>{workspace.decision.uncertainty ?? '—'}</dd></div><div><dt>human rationale</dt><dd>{workspace.decision.rationale ?? 'Not recorded'}</dd></div></dl></div> : null}
    </section>
  );
}
