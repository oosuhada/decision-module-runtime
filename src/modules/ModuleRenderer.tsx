import { useState } from 'react';
import { Check, CircleDollarSign, Minus, PencilLine, Plus, ShieldCheck, Trash2 } from 'lucide-react';
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

function EvidenceBrief({ module, readonly, onInput }: RendererProps) {
  const evidenceRecords = records(module.input.evidence);
  const update = (index: number, field: 'source' | 'note', value: string) => {
    const next = evidenceRecords.map((item) => ({ ...item }));
    if (!next[index]) return;
    next[index][field] = value;
    onInput({ evidence: next });
  };
  const remove = (index: number) => onInput({ evidence: evidenceRecords.filter((_, rowIndex) => rowIndex !== index) });
  const add = () => onInput({ evidence: [...evidenceRecords, { id: crypto.randomUUID(), source: 'New source', note: 'Describe the evidence and what it actually supports.' }] });

  return (
    <div className="brief-copy nodrag nowheel">
      <span>REQUEST / EVIDENCE</span>
      <p>{String(module.output.request ?? module.input.request ?? '')}</p>
      <div>{evidenceRecords.length} evidence records in scope</div>
      <div className="brief-evidence-list">
        {evidenceRecords.map((item, index) => (
          <article key={String(item.id ?? index)}>
            <input aria-label={`Evidence ${index + 1} source`} disabled={readonly} value={String(item.source ?? '')} onChange={(event) => update(index, 'source', event.target.value)} />
            <textarea aria-label={`Evidence ${index + 1} note`} disabled={readonly} rows={2} value={String(item.note ?? '')} onChange={(event) => update(index, 'note', event.target.value)} />
            {!readonly ? <button type="button" onClick={() => remove(index)} aria-label={`Remove evidence ${index + 1}`}><Trash2 size={11} /></button> : null}
          </article>
        ))}
        {!readonly ? <button type="button" className="add-reference-row" onClick={add}><Plus size={11} /> ADD EVIDENCE</button> : null}
      </div>
    </div>
  );
}

function SourceLedger({ module, readonly, onInput }: RendererProps) {
  const sources = records(module.input.sources);
  const update = (index: number, field: 'label' | 'locator', value: string) => {
    const next = sources.map((item) => ({ ...item }));
    if (!next[index]) return;
    next[index][field] = value;
    onInput({ sources: next });
  };
  const remove = (index: number) => onInput({ sources: sources.filter((_, rowIndex) => rowIndex !== index) });
  const add = () => onInput({ sources: [...sources, { id: crypto.randomUUID(), label: 'New source', locator: 'file:// or https:// source locator' }] });

  return (
    <div className="source-ledger source-ledger-editable nodrag nowheel">
      {sources.map((source, index) => (
        <div key={String(source.id ?? index)}>
          <ShieldCheck size={12} />
          <span><input aria-label={`Source ${index + 1} label`} disabled={readonly} value={String(source.label ?? '')} onChange={(event) => update(index, 'label', event.target.value)} /><input aria-label={`Source ${index + 1} locator`} disabled={readonly} value={String(source.locator ?? '')} onChange={(event) => update(index, 'locator', event.target.value)} /></span>
          {!readonly ? <button type="button" onClick={() => remove(index)} aria-label={`Remove source ${index + 1}`}><Trash2 size={11} /></button> : null}
        </div>
      ))}
      {!readonly ? <button type="button" className="add-reference-row" onClick={add}><Plus size={11} /> ADD SOURCE</button> : null}
    </div>
  );
}

function VendorMatrix({ module, readonly, onInput }: RendererProps) {
  const ranking = records(module.output.ranking);
  const inputVendors = records(module.input.vendors);

  const updateVendor = (index: number, field: 'name' | 'cost' | 'security' | 'accuracy' | 'adoption', value: string) => {
    const next = inputVendors.map((vendor) => ({ ...vendor }));
    if (!next[index]) return;
    next[index][field] = field === 'name' ? value : Math.max(0, Math.min(100, Number(value) || 0));
    onInput({ vendors: next });
  };

  return (
    <div className="vendor-matrix-shell nodrag nowheel">
      {!readonly ? (
        <div className="reference-input-note"><PencilLine size={11} /><span>REFERENCE INPUTS · replace every synthetic value with your own reviewed data</span></div>
      ) : null}
      <div className="vendor-input-grid">
        <div className="vendor-input-row vendor-input-head"><span>option</span><span>cost</span><span>security</span><span>accuracy</span><span>adoption</span></div>
        {inputVendors.map((vendor, index) => (
          <div className="vendor-input-row" key={`${String(vendor.name)}-${index}`}>
            <input aria-label={`Option ${index + 1} name`} disabled={readonly} value={String(vendor.name ?? '')} onChange={(event) => updateVendor(index, 'name', event.target.value)} />
            {(['cost', 'security', 'accuracy', 'adoption'] as const).map((field) => (
              <input key={field} aria-label={`${String(vendor.name ?? `Option ${index + 1}`)} ${field}`} disabled={readonly} type="number" min="0" max="100" value={Number(vendor[field] ?? 0)} onChange={(event) => updateVendor(index, field, event.target.value)} />
            ))}
          </div>
        ))}
      </div>
      <div className="vendor-matrix">
        <div className="matrix-row matrix-head"><span>ranked option</span><span>sec.</span><span>acc.</span><span>fit</span></div>
        {ranking.map((vendor, index) => <div className={`matrix-row ${index === 0 ? 'matrix-best' : ''}`} key={String(vendor.name)}><span>{String(vendor.name)}{index === 0 ? <Check size={11} /> : null}</span><b>{String(vendor.security)}</b><b>{String(vendor.accuracy)}</b><strong>{String(vendor.score)}</strong></div>)}
      </div>
    </div>
  );
}

export function ModuleRenderer(props: RendererProps) {
  const { module, readonly, onInput } = props;

  switch (module.type) {
    case 'text-evidence':
      return <EvidenceBrief {...props} />;
    case 'criteria-weights':
      return <CriteriaWeights {...props} />;
    case 'vendor-matrix':
      return <VendorMatrix {...props} />;
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
      return <SourceLedger {...props} />;
    case 'human-decision-gate':
      return <HumanDecisionGate {...props} />;
  }
}
