import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from '@xyflow/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { create } from 'zustand';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Boxes,
  Braces,
  Check,
  CircleDollarSign,
  Command,
  Cpu,
  Database,
  Focus,
  Gauge,
  Grip,
  LockKeyhole,
  Minus,
  Network,
  Play,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';
import { vendorEvidence } from './lib/mock-ai';
import { createCanvasEvent, createSurfacePlan, describeCanvasEvent, getAffectedBlocks, type SurfaceBlockId } from './lib/generative-protocol';

type Criterion = 'cost' | 'security' | 'accuracy' | 'adoption';
type BlockType = SurfaceBlockId;

type SurfaceStore = {
  weights: Record<Criterion, number>;
  budget: number;
  focus: Criterion | null;
  setWeight: (criterion: Criterion, value: number) => void;
  setBudget: (value: number) => void;
  setFocus: (criterion: Criterion | null) => void;
};

const useSurfaceStore = create<SurfaceStore>((set) => ({
  weights: { cost: 24, security: 31, accuracy: 27, adoption: 18 },
  budget: 72,
  focus: null,
  setWeight: (criterion, value) => set((state) => ({ weights: { ...state.weights, [criterion]: value } })),
  setBudget: (budget) => set({ budget }),
  setFocus: (focus) => set({ focus }),
}));

const vendors = [
  { name: 'Helix', cost: 76, security: 94, accuracy: 91, adoption: 67 },
  { name: 'Northstar', cost: 91, security: 84, accuracy: 88, adoption: 93 },
  { name: 'Veridian', cost: 58, security: 91, accuracy: 96, adoption: 62 },
];

const blockDefinitions: Array<{ type: BlockType; title: string; position: { x: number; y: number } }> = [
  { type: 'brief', title: 'Decision brief', position: { x: 40, y: 70 } },
  { type: 'weights', title: 'Criteria weights', position: { x: 385, y: 45 } },
  { type: 'vendors', title: 'Vendor matrix', position: { x: 770, y: 65 } },
  { type: 'cost', title: 'Budget constraint', position: { x: 225, y: 390 } },
  { type: 'risk', title: 'Risk vector', position: { x: 560, y: 385 } },
  { type: 'rationale', title: 'Recommendation logic', position: { x: 930, y: 390 } },
  { type: 'counter', title: 'Counter-case', position: { x: 420, y: 685 } },
  { type: 'decision', title: 'Decision gate', position: { x: 800, y: 690 } },
];

const relatedToSecurity: BlockType[] = ['weights', 'vendors', 'risk', 'rationale', 'counter'];

function scoreVendor(vendor: (typeof vendors)[number], weights: Record<Criterion, number>, budget: number) {
  const costFit = Math.max(20, 100 - Math.abs(vendor.cost - budget) * 1.5);
  const weighted = costFit * weights.cost + vendor.security * weights.security + vendor.accuracy * weights.accuracy + vendor.adoption * weights.adoption;
  return Math.round(weighted / Object.values(weights).reduce((sum, value) => sum + value, 0));
}

function InstrumentShell({ title, code, children, emphasis = false }: { title: string; code: string; children: React.ReactNode; emphasis?: boolean }) {
  return (
    <section className={`instrument-shell ${emphasis ? 'instrument-emphasis' : ''}`}>
      <div className="instrument-head"><span>{code}</span><b>{title}</b><Grip size={12} /></div>
      <div className="instrument-body">{children}</div>
    </section>
  );
}

function SurfaceNode({ data, id }: { data: { type: BlockType; title: string; code: string; status?: 'planned' | 'mounted' }; id: string }) {
  const weights = useSurfaceStore((state) => state.weights);
  const budget = useSurfaceStore((state) => state.budget);
  const focus = useSurfaceStore((state) => state.focus);
  const setWeight = useSurfaceStore((state) => state.setWeight);
  const setBudget = useSurfaceStore((state) => state.setBudget);
  const scores = vendors.map((vendor) => ({ ...vendor, score: scoreVendor(vendor, weights, budget) })).sort((a, b) => b.score - a.score);
  const winner = scores[0];
  const emphasized = focus === 'security' && relatedToSecurity.includes(data.type);
  const emitInputChange = (source: BlockType, detail: string) => {
    window.dispatchEvent(new CustomEvent('surface:input', { detail: { source, detail } }));
  };

  if (data.status === 'planned') {
    return (
      <div className="planned-slot" aria-label={`${data.title} planned slot`}>
        <Handle type="target" position={Position.Left} className="data-handle" />
        <span>{data.code}</span>
        <strong>{data.title}</strong>
        <small>AWAITING INSTRUMENT</small>
        <Handle type="source" position={Position.Right} className="data-handle" />
      </div>
    );
  }

  const body = (() => {
    switch (data.type) {
      case 'brief':
        return <div className="brief-copy"><span>INPUT / 001</span><p>Compare three AI solution vendors by cost, security, accuracy, and field adoption difficulty.</p><div><Braces size={12} /> 4 criteria · 3 vendors · 1 recommendation</div></div>;
      case 'weights':
        return (
          <div className="weight-stack nodrag nowheel">
            {(Object.keys(weights) as Criterion[]).map((criterion) => (
              <label key={criterion}><span>{criterion}</span><input type="range" min="5" max="60" value={weights[criterion]} onChange={(event) => { const value = Number(event.target.value); setWeight(criterion, value); emitInputChange('weights', `${criterion}=${value}`); }} /><b>{weights[criterion]}</b></label>
            ))}
          </div>
        );
      case 'vendors':
        return (
          <div className="vendor-matrix">
            <div className="matrix-row matrix-head"><span>vendor</span><span>sec.</span><span>acc.</span><span>fit</span></div>
            {scores.map((vendor, index) => <div className={`matrix-row ${index === 0 ? 'matrix-best' : ''}`} key={vendor.name}><span title={vendorEvidence[vendor.name as keyof typeof vendorEvidence].join(' · ')}>{vendor.name}{index === 0 ? <Check size={10} /> : null}</span><b>{vendor.security}</b><b>{vendor.accuracy}</b><strong>{vendor.score}</strong></div>)}
          </div>
        );
      case 'cost':
        return <div className="cost-control nodrag nowheel"><div><CircleDollarSign size={17} /><span>MAX INTEGRATION INDEX</span><strong>{budget}</strong></div><input type="range" min="45" max="95" value={budget} onChange={(event) => { const value = Number(event.target.value); setBudget(value); emitInputChange('cost', `budget=${value}`); }} /><small>Changing this constraint recalculates only dependent blocks.</small></div>;
      case 'risk':
        return (
          <div className="risk-bars">
            {scores.map((vendor) => { const risk = Math.round((100 - vendor.security) * .55 + (100 - vendor.adoption) * .45); return <div key={vendor.name}><span>{vendor.name}</span><i><b style={{ width: `${risk}%` }} /></i><strong>{risk}</strong></div>; })}
          </div>
        );
      case 'rationale':
        return <div className="logic-output"><span>RECOMMEND / {winner.name}</span><h3>{winner.score}<small>/100</small></h3><p>{winner.name} currently wins because the active weighting values security and benchmark accuracy more heavily than deployment speed.</p><code>score = Σ(criteria × weight)</code></div>;
      case 'counter':
        return <div className="counter-output"><Minus size={14} /><p>If field adoption weight rises above <b>34</b>, Northstar overtakes {winner.name}. Security remains the largest sensitivity in the current model.</p></div>;
      case 'decision':
        return <div className="decision-gate"><span>READY FOR HUMAN DECISION</span><strong>{winner.name}</strong><button className="nodrag">Select recommendation <ArrowRight size={13} /></button></div>;
      default:
        return null;
    }
  })();

  return (
    <>
      <Handle type="target" position={Position.Left} className="data-handle" />
      <InstrumentShell title={data.title} code={data.code} emphasis={emphasized}>{body}</InstrumentShell>
      <button className="node-delete nodrag" aria-label={`Delete ${data.title}`} onClick={() => window.dispatchEvent(new CustomEvent('surface:delete', { detail: id }))}><X size={11} /></button>
      <Handle type="source" position={Position.Right} className="data-handle" />
    </>
  );
}

const nodeTypes = { instrument: SurfaceNode };

function SurfaceWorkspace() {
  const reduced = Boolean(useReducedMotion());
  const lowPower = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const device = navigator as Navigator & { deviceMemory?: number };
    return (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4) || Boolean(device.deviceMemory && device.deviceMemory <= 4);
  }, []);
  const quietMotion = reduced || lowPower;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [phase, setPhase] = useState<'empty' | 'planning' | 'assembling' | 'complete'>('empty');
  const [log, setLog] = useState<string[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [agentReadback, setAgentReadback] = useState('canvas state not yet sampled');
  const focus = useSurfaceStore((state) => state.focus);
  const setFocus = useSurfaceStore((state) => state.setFocus);
  const weights = useSurfaceStore((state) => state.weights);
  const budget = useSurfaceStore((state) => state.budget);

  const scores = useMemo(() => vendors.map((vendor) => ({ ...vendor, score: scoreVendor(vendor, weights, budget) })).sort((a, b) => b.score - a.score), [weights, budget]);
  const surfacePlan = useMemo(() => createSurfacePlan(blockDefinitions), []);

  const recordCanvasEvent = useCallback((event: ReturnType<typeof createCanvasEvent>) => {
    const description = describeCanvasEvent(event);
    setLog((current) => [description, ...current].slice(0, 6));
    setAgentReadback(`agent readback · ${description}`);
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    recordCanvasEvent(createCanvasEvent({ type: 'node-removed', nodeId: id as BlockType, detail: 'human edited generated surface' }));
  }, [recordCanvasEvent, setEdges, setNodes]);

  useEffect(() => {
    const listener = (event: Event) => deleteNode((event as CustomEvent<string>).detail);
    window.addEventListener('surface:delete', listener);
    return () => window.removeEventListener('surface:delete', listener);
  }, [deleteNode]);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ source: BlockType; detail: string }>).detail;
      const affected = getAffectedBlocks(detail.source);
      recordCanvasEvent(createCanvasEvent({ type: 'input-changed', nodeId: detail.source, detail: `${detail.detail}; recompute ${affected.join(' → ')}` }));
    };
    window.addEventListener('surface:input', listener);
    return () => window.removeEventListener('surface:input', listener);
  }, [recordCanvasEvent]);

  const generateSurface = async () => {
    setNodes([]);
    setEdges([]);
    setLog(['parsed decision request', 'identified 4 evaluation criteria', 'planning instrument graph']);
    setPhase('planning');
    setNodes(surfacePlan.map((item) => ({
      id: item.id,
      type: 'instrument',
      position: item.position,
      data: { type: item.id, title: item.title, code: item.code, status: 'planned' },
      style: { width: item.width },
      draggable: false,
    })));
    setEdges(surfacePlan.flatMap((item) => item.inputs.map((source, edgeIndex) => ({
      id: `plan-${source}-${item.id}-${edgeIndex}`,
      source,
      target: item.id,
      className: 'plan-edge',
    }))));
    if (!quietMotion) await new Promise((resolve) => window.setTimeout(resolve, 430));
    setPhase('assembling');

    for (let index = 0; index < surfacePlan.length; index += 1) {
      if (!quietMotion) await new Promise((resolve) => window.setTimeout(resolve, 145));
      const block = surfacePlan[index];
      const node: Node = {
        id: block.id,
        type: 'instrument',
        position: block.position,
        data: { type: block.id, title: block.title, code: block.code, status: 'mounted' },
        style: { width: block.width },
      };
      setNodes((current) => current.map((currentNode) => currentNode.id === block.id ? node : currentNode));
      setEdges((current) => [
        ...current.filter((edge) => edge.target !== block.id),
        ...block.inputs.map((source, edgeIndex) => ({ id: `${source}-${block.id}-${edgeIndex}`, source, target: block.id, animated: !quietMotion, markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 }, className: 'data-edge' })),
      ]);
      recordCanvasEvent(createCanvasEvent({ type: 'node-mounted', nodeId: block.id, detail: `streamed instrument ${index + 1}/${surfacePlan.length}` }));
    }
    setPhase('complete');
    setLog((current) => ['surface ready / dependencies live', ...current].slice(0, 6));
  };

  const focusSecurity = () => {
    const nextFocus = focus === 'security' ? null : 'security';
    setFocus(nextFocus);
    setNodes((current) => current.map((node) => {
      const type = node.id as BlockType;
      if (!nextFocus) {
        const original = blockDefinitions.find((block) => block.type === type);
        return original ? { ...node, position: original.position } : node;
      }
      const order = relatedToSecurity.indexOf(type);
      if (order >= 0) return { ...node, position: { x: 280 + (order % 3) * 350, y: 130 + Math.floor(order / 3) * 350 } };
      return { ...node, position: { x: 1120 + (node.position.y % 280), y: 80 + node.position.y * .55 } };
    }));
    setLog((current) => [`${nextFocus ? 'focused' : 'released'} security dependency graph`, ...current].slice(0, 6));
    recordCanvasEvent(createCanvasEvent({ type: 'focus-changed', detail: nextFocus ? 'security dependency graph prioritized' : 'all dependencies restored' }));
  };

  return (
    <main className={`surface-shell ${lowPower ? 'low-power' : ''}`}>
      <header className="workbench-header">
        <div className="surface-brand"><Boxes size={16} /><b>DECISION SURFACE</b><span>/ generative interface runtime</span></div>
        <nav><button className="active">WORKSPACE</button><button>PROVENANCE</button><button>MODEL</button></nav>
        <div className="runtime-state"><i className={phase === 'complete' ? 'complete' : ''} />{phase === 'empty' ? 'IDLE' : phase.toUpperCase()}</div>
      </header>

      <aside className="command-rail">
        <div className="rail-mark">DS<br /><span>03</span></div>
        <button onClick={generateSurface} title="Generate Surface"><WandSparkles size={17} /></button>
        <button onClick={() => setCommandOpen((current) => !current)} className={commandOpen ? 'active' : ''} title="Commands"><Command size={17} /></button>
        <button onClick={focusSecurity} className={focus === 'security' ? 'active' : ''} title="Focus on Security"><Focus size={17} /></button>
        <span />
        <button title="Search"><Search size={17} /></button>
        <button title="System"><Cpu size={17} /></button>
      </aside>

      <section className="query-strip">
        <div className="query-index">REQUEST<br /><b>#001</b></div>
        <p>Compare three AI solution vendors by <u>cost</u>, <u>security</u>, <u>accuracy</u>, and <u>field adoption difficulty</u>.</p>
        <button onClick={generateSurface} disabled={phase === 'planning' || phase === 'assembling'}><Play size={13} fill="currentColor" /> {phase === 'empty' ? 'GENERATE SURFACE' : 'REASSEMBLE'}</button>
      </section>

      <section className="workspace-frame">
        {phase === 'empty' ? (
          <div className="blank-workspace">
            <div className="origin-cross"><i /><i /><span>0,0</span></div>
            <div className="blank-message"><Network size={25} /><span>NO INSTRUMENT GRAPH</span><h1>The interface will assemble around the decision.</h1><p>Run the request. The model will plan the minimum tools, connect their data dependencies, and keep only affected blocks live when inputs change.</p></div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeDragStop={(_, node) => recordCanvasEvent(createCanvasEvent({ type: 'node-moved', nodeId: node.id as BlockType, detail: `position ${Math.round(node.position.x)},${Math.round(node.position.y)}` }))}
            fitView
            fitViewOptions={{ padding: 0.12, duration: quietMotion ? 0 : 550 }}
            minZoom={0.45}
            maxZoom={1.4}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#c9ccd0" gap={20} size={1} />
            <Controls position="bottom-left" showInteractive={false} />
          </ReactFlow>
        )}

        {(phase === 'planning' || phase === 'assembling') ? (
          <div className="assembly-trace">
            <span><Activity size={11} /> LIVE ASSEMBLY</span>
            <div>{log[0] ?? 'planning graph'}<i /></div>
          </div>
        ) : null}

        <AnimatePresence>
          {commandOpen ? (
            <motion.div className="command-palette" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div><Command size={13} /><input autoFocus placeholder="Run a surface command…" /></div>
              <button onClick={focusSecurity}><ShieldCheck size={14} /><span>Focus on Security</span><kbd>↵</kbd></button>
              <button onClick={() => useSurfaceStore.getState().setWeight('accuracy', 42)}><Gauge size={14} /><span>Prioritize Accuracy</span><kbd>⌘2</kbd></button>
              <button onClick={generateSurface}><Sparkles size={14} /><span>Rebuild from request</span><kbd>⌘R</kbd></button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <aside className="compute-log">
        <div className="compute-title"><Database size={12} /> COMPUTATION LOG</div>
        <div className="winner-readout"><span>LIVE RECOMMENDATION</span><strong>{scores[0].name}</strong><b>{scores[0].score}</b></div>
        <div className="dependency-list">
          <span>DEPENDENCIES</span>
          <div><LockKeyhole size={11} /> security weight <b>{weights.security}</b></div>
          <div><CircleDollarSign size={11} /> budget index <b>{budget}</b></div>
          <div><ShieldCheck size={11} /> security focus <b>{focus ? 'ON' : 'OFF'}</b></div>
        </div>
        <div className="agent-readback"><Cpu size={11} /><span>{agentReadback}</span></div>
        <div className="log-lines">{log.length ? log.map((line, index) => <p key={`${line}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{line}</p>) : <p><span>00</span>awaiting generation</p>}</div>
      </aside>

      <footer className="surface-footer"><span><SlidersHorizontal size={11} /> LIVE INPUTS RECOMPUTE DEPENDENT NODES ONLY</span><span><ArrowDown size={11} /> DRAG MODULES · DELETE MODULES · PAN WORKSPACE</span></footer>
    </main>
  );
}

export function App() {
  return <ReactFlowProvider><SurfaceWorkspace /></ReactFlowProvider>;
}
