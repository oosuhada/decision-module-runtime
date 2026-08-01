import { Network, PackagePlus, Play, ShieldCheck, WandSparkles } from 'lucide-react';

const story = [
  ['BEFORE', 'Generative UI demos often let a model invent both presentation and trusted execution logic.'],
  ['PROBLEM', 'A convincing interface can hide invented formulas, invalid dependencies, or untraceable state changes.'],
  ['INSIGHT', 'Give AI composition authority, not execution authority. Trusted behavior must come from reviewed capabilities.'],
  ['ARCHITECTURE', 'Structured plan → human approval → closed registry → DAG validation → deterministic recompute → audit.'],
  ['INTERACTION', 'Change the request, inspect the proposed graph, edit dependencies, reject cycles, and watch only downstream modules recompute.'],
  ['RESULT', 'The workspace can be generative in shape while remaining constrained, explainable, and human-governed.'],
];

export function PortfolioNarrative({ onPlan, onDemo, onCatalog, disabled }: { onPlan: () => void; onDemo: () => void; onCatalog: () => void; disabled: boolean }) {
  return (
    <div className="runtime-portfolio">
      <section className="runtime-case-hero">
        <div>
          <span className="runtime-thesis">INSPECTABLE AI SYSTEMS · GENERATIVE UI / 03 OF 04</span>
          <span className="runtime-kicker"><ShieldCheck size={12} /> KILLER INTERACTION / CONSTRAINED GENERATION</span>
          <h1>AI can compose the workspace. It cannot invent trusted executable logic.</h1>
          <p>Choose a decision type above, generate a plan, approve it, then edit the resulting registered-module DAG. Every graph mutation is schema-validated, cycle-checked, auditable, and deterministically recomputed.</p>
          <div className="blank-actions"><button className="primary" disabled={disabled} onClick={onPlan}><WandSparkles size={13} /> PLAN CURRENT REQUEST</button><button disabled={disabled} onClick={onDemo}><Play size={13} fill="currentColor" /> GUIDED BUILD / BUY</button><button disabled={disabled} onClick={onCatalog}><PackagePlus size={13} /> MODULE CATALOG</button></div>
        </div>
        <div className="runtime-boundary">
          <div className="boundary-heading"><span>TRUST BOUNDARY / WHAT MAY CHANGE</span><Network size={16} /></div>
          <div className="boundary-flow">
            <span className="untrusted">AI PLANNER<small>structured proposal</small></span>
            <span className="human">HUMAN APPROVAL<small>explicit gate</small></span>
            <span className="trusted">CLOSED REGISTRY<small>known schemas + formulas</small></span>
            <span className="trusted">VALIDATED DAG<small>cycle rejection</small></span>
            <span className="trusted">DETERMINISTIC COMPUTE<small>downstream only</small></span>
            <span className="human">HUMAN DECISION<small>separate from recommendation</small></span>
          </div>
          <div className="authority-note"><b>AI MAY</b><span>choose registered capabilities + propose topology</span><b>AI MAY NOT</b><span>author trusted React/calculation code or bypass validation</span></div>
        </div>
      </section>

      <section className="runtime-compare"><article><span>COMMON GENERATIVE UI</span><strong>Prompt → model-authored UI/code → execute</strong><p>The same model can quietly become planner, renderer, calculator, and authority.</p></article><i>VS</i><article><span>THIS RUNTIME</span><strong>Prompt → structured plan → approved registered capabilities</strong><p>The workspace shape may change while the trusted execution boundary stays fixed.</p></article></section>

      <section className="runtime-story">{story.map(([label, body], index) => <article key={label}><span>{String(index + 1).padStart(2, '0')} / {label}</span><p>{body}</p></article>)}</section>
    </div>
  );
}
