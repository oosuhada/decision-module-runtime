import { ArrowRight, Check, X } from 'lucide-react';
import type { WorkspaceDocument } from '../schemas/workspace';

const steps = [
  { moduleType: 'text-evidence', title: 'Replace the reference evidence', body: 'Start in Decision brief or use IMPORT INPUTS. Input packs preserve the inputs of whichever registered modules exist in this graph.' },
  { moduleType: null, title: 'Change the module composition', body: 'Open MODULE CATALOG to add registered modules or change dependencies. Every edge is cycle-checked and the graph recomputes deterministically after a valid edit.' },
  { moduleId: 'recommendation', title: 'Inspect computed reasoning', body: 'Recommendation logic is deterministic and auditable. Use provenance to inspect formula, dependencies, and the exact run that produced it.' },
  { moduleId: 'decision', title: 'Keep the final choice human-owned', body: 'The human decision gate records your choice and rationale separately from the system recommendation. Snapshot before changing important inputs.' },
];

type Props = {
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
  onFocus: (moduleId: string) => void;
  workspace: WorkspaceDocument;
};

export function RuntimeGuide({ step, onStep, onClose, onFocus, workspace }: Props) {
  const complete = step >= steps.length;
  const current = steps[Math.min(step, steps.length - 1)];
  const go = (next: number) => {
    onStep(next);
    const target = steps[next];
    const moduleId = target && 'moduleType' in target && target.moduleType
      ? workspace.modules.find((module) => module.type === target.moduleType)?.id
      : target && 'moduleId' in target ? target.moduleId : null;
    if (moduleId) onFocus(moduleId);
  };
  return <aside className="runtime-guide">
    <div className="runtime-guide-head"><span>GUIDED WORKING GRAPH</span><button onClick={onClose} aria-label="Close guide"><X size={14} /></button></div>
    {complete ? <div className="runtime-guide-done"><Check size={18} /><div><strong>The reference graph is now yours to replace.</strong><p>Keep the module contracts and provenance, swap every synthetic input for your decision data, and export an input pack when you want a lightweight reusable decision template.</p></div></div> : <>
      <div className="runtime-guide-step"><b>{step + 1}</b><span>/ {steps.length}</span><em>{'moduleId' in current ? current.moduleId : current.moduleType ?? 'graph'}</em></div>
      <h3>{current.title}</h3><p>{current.body}</p>
      <div className="runtime-guide-actions">{step > 0 ? <button onClick={() => go(step - 1)}>Back</button> : <span />}<button className="primary" onClick={() => go(step + 1)}>{step === steps.length - 1 ? 'Finish' : 'Next'}<ArrowRight size={13} /></button></div>
    </>}
  </aside>;
}
