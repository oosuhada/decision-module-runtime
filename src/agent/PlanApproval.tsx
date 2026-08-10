import { AlertTriangle, Check, Network, Trash2, X } from 'lucide-react';
import type { AgentPlan } from '../schemas/workspace';

export function PlanApproval({ plan, onRemove, onApprove, onReject }: { plan: AgentPlan; onRemove: (id: string) => void; onApprove: () => void; onReject: () => void }) {
  return (
    <section className="plan-approval" aria-labelledby="plan-title">
      <header>
        <div><span>AGENT PLAN / APPROVAL REQUIRED</span><h2 id="plan-title">Review the instrument graph before assembly.</h2></div>
        <button className="icon-button" aria-label="Reject plan" onClick={onReject}><X size={15} /></button>
      </header>
      <div className="plan-grid">
        <div className="plan-modules">
          <span className="section-label">MODULES · {plan.items.length}</span>
          {plan.items.map((item, index) => (
            <article key={item.id}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <div><strong>{item.title}</strong><small>{item.type} · {item.purpose}</small></div>
              <span>{item.dependencies.length ? item.dependencies.join(' → ') : 'root'}</span>
              <button aria-label={`Remove ${item.title} from plan`} onClick={() => onRemove(item.id)}><Trash2 size={12} /></button>
            </article>
          ))}
        </div>
        <aside className="plan-notes">
          <div><span><AlertTriangle size={12} /> MISSING INPUT</span>{plan.missingInputs.map((item) => <p key={item}>{item}</p>)}</div>
          <div><span><Network size={12} /> COMPUTE METHOD</span>{plan.computeNotes.map((item) => <p key={item}>{item}</p>)}</div>
          <div><span>ASSUMPTIONS</span>{plan.assumptions.map((item) => <p key={item}>{item}</p>)}</div>
        </aside>
      </div>
      <footer>
        <span>No module runs until you approve this plan.</span>
        <button className="approve-button" onClick={onApprove}><Check size={13} /> APPROVE & ASSEMBLE</button>
      </footer>
    </section>
  );
}
