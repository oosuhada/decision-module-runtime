import { useMemo, useState } from 'react';
import { Check, CircleDollarSign, Minus, ShieldCheck } from 'lucide-react';
import type { ModuleInstance } from '../schemas/workspace';

type RendererProps = {
  module: ModuleInstance;
  readonly?: boolean;
  onInput: (input: Record<string, unknown>) => void;
  onDecision: (choice: string, rationale: string) => void;
};

function records(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function CriteriaWeights({ module, readonly, onInput }: RendererProps) {
  const weights = (module.input.weights && typeof module.input.weights === 'object' ? module.input.weights : {}) as Record<string, number>;
  return (
    <div className="weight-stack nodrag nowheel">
      {Object.entries(weights).map(([criterion, value]) => (
        <label key={criterion}>
          <span>{criterion}</span>
          <input aria-label={`${criterion} weight`} disabled={readonly} type="range" min="5" max="60" value={value} onChange={(event) => onInput({ weights: { ...weights, [criterion]: Number(event.target.value) } })} />
          <b>{value}</b>
        </label>
      ))}
    </div>
  );
}

function HumanDecisionGate({ module, readonly, onDecision }: RendererProps) {
  const [choice, setChoice] = useState(String(module.output.recommendation ?? ''));
  const [rationale, setRationale] = useState('');
  return (
    <div className="decision-gate nodrag nowheel">
      <span>READY FOR HUMAN DECISION</span>
      <strong>{String(module.output.recommendation ?? 'Awaiting recommendation')}</strong>
      <label>
        <span>Human choice</span>
        <input disabled={readonly} value={choice} onChange={(event) => setChoice(event.target.value)} placeholder="Your decision" />
      </label>
      <label>
        <span>Rationale</span>
        <textarea disabled={readonly} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Why this choice?" />
      </label>
      <button disabled={readonly || !choice.trim()} onClick={() => onDecision(choice.trim(), rationale.trim())}>Record human decision</button>
    </div>
  );
}

export function ModuleRenderer(props: RendererProps) {
  const { module, readonly, onInput } = props;
  const ranking = useMemo(() => records(module.output.ranking), [module.output.ranking]);

  switch (module.type) {
    case 'text-evidence':
      return <div className="brief-copy"><span>REQUEST / EVIDENCE</span><p>{String(module.output.request ?? module.input.request ?? '')}</p><div>{String(module.output.evidenceCount ?? 0)} evidence records in scope</div></div>;
    case 'criteria-weights':
      return <CriteriaWeights {...props} />;
    case 'vendor-matrix':
      return (
        <div className="vendor-matrix">
          <div className="matrix-row matrix-head"><span>vendor</span><span>sec.</span><span>acc.</span><span>fit</span></div>
          {ranking.map((vendor, index) => <div className={`matrix-row ${index === 0 ? 'matrix-best' : ''}`} key={String(vendor.name)}><span>{String(vendor.name)}{index === 0 ? <Check size={11} /> : null}</span><b>{String(vendor.security)}</b><b>{String(vendor.accuracy)}</b><strong>{String(vendor.score)}</strong></div>)}
        </div>
      );
    case 'cost-model': {
      const budgetIndex = Number(module.input.budgetIndex ?? 72);
      return <div className="cost-control nodrag nowheel"><div><CircleDollarSign size={17} /><span>MAX INTEGRATION INDEX</span><strong>{budgetIndex}</strong></div><input aria-label="Budget index" disabled={readonly} type="range" min="45" max="95" value={budgetIndex} onChange={(event) => onInput({ budgetIndex: Number(event.target.value) })} /><small>{String(module.output.constraint ?? 'Changing this value recomputes downstream modules.')}</small></div>;
    }
    case 'risk-matrix':
      return <div className="risk-bars">{records(module.output.risks).map((risk) => <div key={String(risk.name)}><span>{String(risk.name)}</span><i><b style={{ width: `${Math.max(0, Math.min(100, Number(risk.risk ?? 0)))}%` }} /></i><strong>{String(risk.risk)}</strong></div>)}</div>;
    case 'scenario-comparison':
      return <div className="scenario-list">{records(module.output.scenarios).map((scenario) => <div key={String(scenario.label)}><span>{String(scenario.label)}</span><strong>{String(scenario.vendor)}</strong><b>{String(scenario.score)}</b></div>)}</div>;
    case 'chart':
      return <div className="score-chart" role="img" aria-label={module.accessibilitySummary}>{records(module.output.series).map((bar) => <div key={String(bar.label)}><span>{String(bar.label)}</span><i><b style={{ width: `${Math.max(0, Math.min(100, Number(bar.value ?? 0)))}%` }} /></i><strong>{String(bar.value)}</strong></div>)}</div>;
    case 'recommendation-logic':
      return <div className="logic-output"><span>RECOMMEND / {String(module.output.recommendation ?? '—')}</span><h3>{String(module.output.score ?? '—')}<small>/100</small></h3><p>{String(module.output.rationale ?? '')}</p><code>argmax(weighted score)</code></div>;
    case 'counter-case':
      return <div className="counter-output"><Minus size={14} /><div><p>{String(module.output.counterCase ?? '')}</p><small>{String(module.output.uncertainty ?? '')}</small></div></div>;
    case 'source-ledger':
      return <div className="source-ledger">{records(module.output.sources).map((source) => <div key={String(source.id)}><ShieldCheck size={12} /><span><strong>{String(source.label)}</strong><small>{String(source.locator)}</small></span></div>)}</div>;
    case 'human-decision-gate':
      return <HumanDecisionGate {...props} />;
  }
}
