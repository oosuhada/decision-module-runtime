import { ArrowRight, Trash2 } from 'lucide-react';
import { topologicalOrder } from '../runtime/graph';
import type { WorkspaceDocument } from '../schemas/workspace';
import { ModuleRenderer } from '../modules/ModuleRenderer';

export function AccessibleDecisionTree({ workspace, onInput, onDecision, onRemove, onFocus }: { workspace: WorkspaceDocument; onInput: (id: string, input: Record<string, unknown>) => void; onDecision: (choice: string, rationale: string) => void; onRemove: (id: string) => void; onFocus: (id: string) => void }) {
  const order = topologicalOrder(workspace.modules, workspace.edges);
  const byId = new Map(workspace.modules.map((module) => [module.id, module]));
  return (
    <section className="accessible-tree" aria-label="Decision modules in dependency order">
      <header><span>LIST / TREE MODE</span><h2>Complete the decision without the spatial canvas.</h2><p>Modules are ordered by executable dependency sequence. Every edge is also summarized in text.</p></header>
      <ol>
        {order.map((id, index) => {
          const module = byId.get(id);
          if (!module) return null;
          const incoming = workspace.edges.filter((edge) => edge.target === id).map((edge) => edge.source);
          return <li key={id}>
            <div className="tree-index">{String(index + 1).padStart(2, '0')}</div>
            <article>
              <header><button onClick={() => onFocus(id)}>{module.title}</button><span>{module.status} · {module.type}</span>{workspace.mode === 'edit' ? <button aria-label={`Delete ${module.title}`} onClick={() => onRemove(id)}><Trash2 size={12} /></button> : null}</header>
              <p className="edge-summary">{incoming.length ? <>Depends on {incoming.join(', ')} <ArrowRight size={11} /> {id}</> : 'Root module; no incoming dependencies.'}</p>
              <ModuleRenderer module={module} readonly={workspace.mode === 'readonly'} onInput={(input) => onInput(id, input)} onDecision={onDecision} />
            </article>
          </li>;
        })}
      </ol>
    </section>
  );
}
