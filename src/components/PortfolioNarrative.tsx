import { Database, GitBranch, Network, PackagePlus, Play, ShieldCheck, WandSparkles } from 'lucide-react';
import type { WorkspaceDocument } from '../schemas/workspace';

const story = [
  ['BEFORE', 'Generative UI demos often let a model invent both presentation and trusted execution logic.'],
  ['PROBLEM', 'A convincing interface can hide invented formulas, invalid dependencies, or untraceable state changes.'],
  ['INSIGHT', 'Give AI composition authority, not execution authority. Trusted behavior must come from reviewed capabilities.'],
  ['ARCHITECTURE', 'Structured plan → human approval → closed registry → DAG validation → deterministic recompute → audit.'],
  ['INTERACTION', 'Change the request, inspect the proposed graph, edit dependencies, reject cycles, and watch only downstream modules recompute.'],
  ['RESULT', 'The workspace can be generative in shape while remaining constrained, explainable, and human-governed.'],
];

const series = [
  ['01', 'Research', 'https://signals.oosu.dev/'],
  ['02', 'Decisions', 'https://scenario.oosu.dev/'],
  ['03', 'Generative UI', 'https://decision.oosu.dev/'],
  ['04', 'Memory', 'https://memory.oosu.dev/'],
] as const;

export function PortfolioNarrative({ onPlan, onDemo, onCatalog, disabled }: { onPlan: () => void; onDemo: () => void; onCatalog: () => void; disabled: boolean }) {
  return (
    <div className="runtime-portfolio">
      <section className="runtime-case-hero">
        <div>
          <span className="runtime-thesis">INSPECTABLE AI SYSTEMS · GENERATIVE UI / 03 OF 04</span>
          <span className="runtime-kicker"><ShieldCheck size={12} /> KILLER INTERACTION / CONSTRAINED GENERATION</span>
          <h1>AI can compose the workspace. It cannot invent trusted executable logic.</h1>
          <p>Choose a decision type above, generate a real structured plan, approve it, then edit the registered-module DAG. The exact same runtime validates every mutation and recomputes downstream state.</p>
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

      <details className="runtime-engineering-case">
        <summary><span>ENGINEERING CASE STUDY</span><b>Why the runtime is constrained</b></summary>
        <div>
          <section className="runtime-compare"><article><span>COMMON GENERATIVE UI</span><strong>Prompt → model-authored UI/code → execute</strong><p>The same model can quietly become planner, renderer, calculator, and authority.</p></article><i>VS</i><article><span>THIS RUNTIME</span><strong>Prompt → structured plan → approved registered capabilities</strong><p>The workspace shape may change while the trusted execution boundary stays fixed.</p></article></section>
          <section className="runtime-system-map"><header><span>ARCHITECTURE / REAL EXECUTION PATH</span><h3>Generated intent crosses several independently enforced boundaries before it can affect trusted state.</h3></header><div>
            <article><WandSparkles size={14} /><span>PLANNING ADAPTER</span><b>Structured AgentPlan</b><small>request classification + registered module IDs only</small></article><i>→</i>
            <article><ShieldCheck size={14} /><span>PROTOCOL</span><b>Schema validation</b><small>version · sequence · idempotency · payload contracts</small></article><i>→</i>
            <article><GitBranch size={14} /><span>RUNTIME</span><b>DAG + recompute</b><small>cycle rejection · stale propagation · downstream compute</small></article>
            <article className="wide"><PackagePlus size={14} /><span>TRUSTED CAPABILITIES</span><b>Closed module registry</b><small>versioned input/output schemas · deterministic formulas · known renderers</small></article>
            <article className="wide"><Database size={14} /><span>STATE + AUDIT</span><b>IndexedDB + FastAPI</b><small>snapshots · branches · provenance · human decision invalidation</small></article>
          </div></section>
          <section className="runtime-story">{story.map(([label, body], index) => <article key={label}><span>{String(index + 1).padStart(2, '0')} / {label}</span><p>{body}</p></article>)}</section>
          <nav className="runtime-series-nav" aria-label="Inspectable AI Systems series">{series.map(([index, label, href]) => <a key={index} className={index === '03' ? 'active' : ''} href={href}><span>{index}</span><b>{label}</b></a>)}</nav>
        </div>
      </details>
    </div>
  );
}

export function RuntimeProofPanel({ workspace, message, onCycleProof, onRecomputeProof }: {
  workspace: WorkspaceDocument;
  message: string;
  onCycleProof: () => void;
  onRecomputeProof: () => void;
}) {
  const latestRecompute = [...workspace.audit].reverse().find((event) => event.kind === 'input-changed');
  return <section className="runtime-proof-panel" data-proof="live-runtime">
    <span>LIVE RUNTIME PROOF</span>
    <strong>{workspace.modules.length} registered modules · {workspace.edges.length} validated edges</strong>
    <p>{message || latestRecompute?.detail || 'Run a proof against the graph currently visible on the canvas.'}</p>
    <div><button type="button" onClick={onCycleProof}>TRY ILLEGAL CYCLE</button><button type="button" onClick={onRecomputeProof}>MUTATE UPSTREAM</button></div>
    <small>Both actions call the same store/runtime functions used by normal graph editing. Upstream mutation is undoable.</small>
  </section>;
}
