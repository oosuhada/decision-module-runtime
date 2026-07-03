import { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { create } from 'zustand';
import { ArrowLeft, Check, CircleDollarSign, Database, Grip, Layers3, LockKeyhole, Minus, Scale, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { AmbientBackdrop, Eyebrow, GlassCard, GlowButton, PointerLight, StatusPill } from './lib/design-system';
import { vendorEvidence } from './lib/mock-ai';

type Criterion = 'cost' | 'security' | 'accuracy' | 'adoption';
type BlockType = 'vendors' | 'weights' | 'cost' | 'risk' | 'rationale' | 'counter' | 'decision';

type SurfaceStore = {
  blocks: BlockType[];
  weights: Record<Criterion, number>;
  budget: number;
  focus: Criterion | null;
  removeBlock: (block: BlockType) => void;
  shiftBlock: (block: BlockType, direction: -1 | 1) => void;
  setWeight: (criterion: Criterion, value: number) => void;
  setBudget: (value: number) => void;
  setFocus: (criterion: Criterion | null) => void;
  setBlocks: (blocks: BlockType[]) => void;
};

const initialBlocks: BlockType[] = ['vendors', 'weights', 'cost', 'risk', 'rationale', 'counter', 'decision'];

const useSurface = create<SurfaceStore>((set) => ({
  blocks: [],
  weights: { cost: 72, security: 84, accuracy: 78, adoption: 64 },
  budget: 72,
  focus: null,
  removeBlock: (block) => set((state) => ({ blocks: state.blocks.filter((item) => item !== block) })),
  shiftBlock: (block, direction) => set((state) => {
    const index = state.blocks.indexOf(block);
    if (index < 0) return state;
    const target = Math.max(0, Math.min(state.blocks.length - 1, index + direction));
    const next = [...state.blocks];
    next.splice(index, 1);
    next.splice(target, 0, block);
    return { blocks: next };
  }),
  setWeight: (criterion, value) => set((state) => ({ weights: { ...state.weights, [criterion]: value } })),
  setBudget: (budget) => set({ budget }),
  setFocus: (focus) => set((state) => ({ focus, weights: focus === 'security' ? { ...state.weights, security: 100, cost: 48, accuracy: 72, adoption: 58 } : state.weights })),
  setBlocks: (blocks) => set({ blocks }),
}));

const vendors = [
  { name: 'Helix AI', key: 'Helix', price: 68, security: 94, accuracy: 91, adoption: 76, accent: 'mint' },
  { name: 'Northstar Vision', key: 'Northstar', price: 48, security: 82, accuracy: 88, adoption: 91, accent: 'amber' },
  { name: 'Veridian Systems', key: 'Veridian', price: 91, security: 90, accuracy: 96, adoption: 62, accent: 'violet' },
] as const;

const criteriaMeta: Record<Criterion, { label: string; icon: React.ReactNode }> = {
  cost: { label: 'Cost', icon: <CircleDollarSign size={13} /> },
  security: { label: 'Security', icon: <LockKeyhole size={13} /> },
  accuracy: { label: 'Accuracy', icon: <ShieldCheck size={13} /> },
  adoption: { label: 'Field adoption', icon: <Layers3 size={13} /> },
};

export function App() {
  const { blocks, weights, budget, focus, removeBlock, shiftBlock, setWeight, setBudget, setFocus, setBlocks } = useSurface();
  const [phase, setPhase] = useState<'empty' | 'generating' | 'complete'>('empty');
  const [assembling, setAssembling] = useState<BlockType | null>(null);

  const scored = useMemo(() => {
    return vendors.map((vendor) => {
      const costScore = Math.max(0, 100 - Math.abs(vendor.price - budget) * 1.3);
      const score = (
        costScore * weights.cost + vendor.security * weights.security + vendor.accuracy * weights.accuracy + vendor.adoption * weights.adoption
      ) / (weights.cost + weights.security + weights.accuracy + weights.adoption);
      return { ...vendor, score: Math.round(score * 10) / 10 };
    }).sort((a, b) => b.score - a.score);
  }, [budget, weights]);

  const generate = async () => {
    setBlocks([]);
    setPhase('generating');
    for (const block of initialBlocks) {
      setAssembling(block);
      await new Promise((resolve) => window.setTimeout(resolve, 310));
      setBlocks(useSurface.getState().blocks.concat(block));
    }
    setAssembling(null);
    setPhase('complete');
  };

  const renderBlock = (block: BlockType) => {
    const winner = scored[0];
    switch (block) {
      case 'vendors':
        return (
          <div className="vendor-grid">
            {scored.map((vendor, index) => (
              <motion.div layout key={vendor.name} className={`vendor-card vendor-${vendor.accent} ${index === 0 ? 'winner' : ''}`}>
                <div><span>{index === 0 ? 'Recommended' : `Option 0${index + 1}`}</span><strong>{vendor.score}</strong></div>
                <h3>{vendor.name}</h3>
                <div className="vendor-metrics"><span>${vendor.price}k</span><span>{vendor.security} sec</span><span>{vendor.accuracy}% acc</span></div>
              </motion.div>
            ))}
          </div>
        );
      case 'weights':
        return (
          <div className="weight-list">
            {(Object.keys(criteriaMeta) as Criterion[]).map((criterion) => (
              <label key={criterion} className={focus === criterion ? 'focused' : ''}>
                <span>{criteriaMeta[criterion].icon}{criteriaMeta[criterion].label}<b>{weights[criterion]}</b></span>
                <input type="range" min="20" max="100" value={weights[criterion]} onChange={(event) => setWeight(criterion, Number(event.target.value))} />
              </label>
            ))}
          </div>
        );
      case 'cost':
        return (
          <div className="budget-control">
            <div><span>Budget comfort ceiling</span><strong>${budget}k</strong></div>
            <input type="range" min="35" max="110" value={budget} onChange={(event) => setBudget(Number(event.target.value))} />
            <div className="budget-axis"><span>$35k</span><span>$110k</span></div>
            <p>Changing this reshapes cost-fit and can change the recommendation instantly.</p>
          </div>
        );
      case 'risk':
        return (
          <div className="risk-chart" aria-label="Vendor risk chart">
            {scored.map((vendor) => (
              <div key={vendor.name}><span>{vendor.name.split(' ')[0]}</span><div><motion.i layout animate={{ width: `${100 - (vendor.security * .62 + vendor.adoption * .38 - 12)}%` }} /></div><b>{Math.round(100 - (vendor.security * .62 + vendor.adoption * .38 - 12))}</b></div>
            ))}
            <small>Residual deployment risk · lower is better</small>
          </div>
        );
      case 'rationale':
        return (
          <div className="rationale-content">
            <span className="ai-label"><Sparkles size={12} /> Generated recommendation</span>
            <h3>{winner.name} best fits the current decision surface.</h3>
            <p>Its weighted score stays strongest under the active cost, security, accuracy, and adoption constraints. The recommendation is recalculated from controls above, not hard-coded copy.</p>
            <div className="evidence-chips">{vendorEvidence[winner.key].map((item) => <span key={item}><Database size={10} />{item}</span>)}</div>
          </div>
        );
      case 'counter':
        return (
          <div className="counter-content">
            <span><Scale size={13} /> Counterargument</span>
            <p>{winner.key === 'Helix' ? 'Northstar may create more realized value if training capacity is constrained, because its field adoption score offsets lower benchmark accuracy.' : winner.key === 'Northstar' ? 'Helix becomes preferable when security weighting passes 88 or regulated workloads move on-prem.' : 'Veridian’s accuracy edge only pays off when defect cost is high enough to justify its integration burden.'}</p>
          </div>
        );
      case 'decision':
        return (
          <div className="decision-actions">
            <div><span>Decision confidence</span><strong>{Math.round(winner.score)}%</strong></div>
            <button><Check size={15} /> Advance {winner.name} to pilot</button>
            <button className="secondary"><Minus size={15} /> Hold decision</button>
          </div>
        );
    }
  };

  return (
    <main className="surface-shell">
      <AmbientBackdrop accent="255 199 115" />
      <PointerLight />
      <header className="surface-header">
        <div className="surface-brand"><a href="http://localhost:3100" aria-label="Back to launcher"><ArrowLeft size={16} /></a><div><strong>Generative Decision Surface</strong><span>Interface assembled around the decision</span></div></div>
        <StatusPill status={phase === 'generating' ? 'loading' : phase === 'complete' ? 'complete' : 'ready'}>{phase === 'generating' ? 'Composing decision instruments' : phase === 'complete' ? 'Surface is live' : 'Prompt ready'}</StatusPill>
      </header>

      <section className="surface-intro">
        <div><Eyebrow>Not an answer · a decision environment</Eyebrow><h1>AI builds the interface <em>the decision needs.</em></h1></div>
        <GlassCard className="prompt-object" intensity="clear">
          <span>Decision request</span>
          <p>“Compare three AI solution vendors on cost, security, accuracy, and field adoption difficulty.”</p>
          <GlowButton onClick={generate} disabled={phase === 'generating'}>{phase === 'empty' ? 'Generate Surface' : 'Regenerate Surface'}</GlowButton>
        </GlassCard>
      </section>

      <div className="surface-toolbar">
        <div><SlidersHorizontal size={13} /><span>Decision lens</span></div>
        <button className={focus === 'security' ? 'active' : ''} onClick={() => setFocus(focus === 'security' ? null : 'security')}><LockKeyhole size={12} /> Focus on Security</button>
        <span className="toolbar-note">Drag blocks to reorder · remove what you don’t need</span>
      </div>

      {phase === 'empty' ? (
        <GlassCard className="surface-empty">
          <motion.div animate={{ rotate: [0, 6, -5, 0], scale: [1, 1.04, 1] }} transition={{ duration: 7, repeat: Infinity }}><WandSparkles size={38} /></motion.div>
          <h2>The surface is intentionally empty.</h2>
          <p>Generate once. The AI will stream in controls, comparisons, evidence, counterarguments, and a decision action as native interface blocks.</p>
          <GlowButton onClick={generate}>Generate Surface</GlowButton>
        </GlassCard>
      ) : (
        <LayoutGroup>
          <section className={`decision-canvas ${focus ? `focus-${focus}` : ''}`}>
            <AnimatePresence mode="popLayout">
              {blocks.map((block, index) => (
                <motion.article
                  layout
                  drag
                  dragSnapToOrigin
                  dragElastic={0.12}
                  onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.y) > 60 || Math.abs(info.offset.x) > 90) shiftBlock(block, info.offset.y + info.offset.x > 0 ? 1 : -1);
                  }}
                  initial={{ opacity: 0, scale: .92, y: 24 }}
                  animate={{ opacity: focus === 'security' && (block === 'risk' || block === 'weights' || block === 'vendors') ? 1 : focus === 'security' ? .52 : 1, scale: focus === 'security' && (block === 'risk' || block === 'weights' || block === 'vendors') ? 1.02 : 1, y: 0 }}
                  exit={{ opacity: 0, scale: .9 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                  key={block}
                  className={`surface-block block-${block} ${index === 0 ? 'block-first' : ''}`}
                >
                  <GlassCard className="block-glass" intensity={block === 'counter' ? 'contradictory' : block === 'rationale' ? 'clear' : 'soft'}>
                    <div className="block-head"><span><Grip size={12} />{blockLabel(block)}</span><button onClick={() => removeBlock(block)} aria-label={`Remove ${blockLabel(block)}`}><Trash2 size={12} /></button></div>
                    {renderBlock(block)}
                    <div className="provenance"><Database size={10} /><span>Built from: request · vendor evidence · active controls</span></div>
                  </GlassCard>
                </motion.article>
              ))}
            </AnimatePresence>
            {assembling ? (
              <motion.div className="assembly-cursor" initial={{ opacity:0, scale:.8 }} animate={{ opacity:1, scale:1 }}><WandSparkles size={14} /><span>assembling {blockLabel(assembling).toLowerCase()}…</span></motion.div>
            ) : null}
          </section>
        </LayoutGroup>
      )}
    </main>
  );
}

function blockLabel(block: BlockType) {
  return ({ vendors: 'Vendor comparison', weights: 'Evaluation criteria', cost: 'Cost control', risk: 'Risk profile', rationale: 'Recommendation rationale', counter: 'Challenge card', decision: 'Decision action' } as Record<BlockType, string>)[block];
}
