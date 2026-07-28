import { ArrowRight, Check, X } from 'lucide-react';

const steps = [
  { moduleId: 'evidence', title: 'Replace the reference evidence', body: 'Start in Decision brief. Edit or add evidence records so the graph reflects a real decision instead of the synthetic fixture.' },
  { moduleId: 'vendors', title: 'Replace the reference options', body: 'Open Vendor matrix and change option names plus cost, security, accuracy, and adoption values. Downstream modules recompute automatically.' },
  { moduleId: 'recommendation', title: 'Inspect computed reasoning', body: 'Recommendation logic is deterministic and auditable. Use provenance to inspect formula, dependencies, and the exact run that produced it.' },
  { moduleId: 'decision', title: 'Keep the final choice human-owned', body: 'The human decision gate records your choice and rationale separately from the system recommendation. Snapshot before changing important inputs.' },
];

type Props = {
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
  onFocus: (moduleId: string) => void;
};

export function RuntimeGuide({ step, onStep, onClose, onFocus }: Props) {
  const complete = step >= steps.length;
  const current = steps[Math.min(step, steps.length - 1)];
  const go = (next: number) => {
    onStep(next);
    const moduleId = steps[next]?.moduleId;
    if (moduleId) onFocus(moduleId);
  };
  return <aside className="runtime-guide">
    <div className="runtime-guide-head"><span>GUIDED WORKING GRAPH</span><button onClick={onClose} aria-label="Close guide"><X size={14} /></button></div>
    {complete ? <div className="runtime-guide-done"><Check size={18} /><div><strong>The reference graph is now yours to replace.</strong><p>Keep the module contracts and provenance, but swap every synthetic input for evidence from the decision you actually need to make.</p></div></div> : <>
      <div className="runtime-guide-step"><b>{step + 1}</b><span>/ {steps.length}</span><em>{current.moduleId}</em></div>
      <h3>{current.title}</h3><p>{current.body}</p>
      <div className="runtime-guide-actions">{step > 0 ? <button onClick={() => go(step - 1)}>Back</button> : <span />}<button className="primary" onClick={() => go(step + 1)}>{step === steps.length - 1 ? 'Finish' : 'Next'}<ArrowRight size={13} /></button></div>
    </>}
  </aside>;
}
