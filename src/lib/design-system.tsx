import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export function PointerLight() {
  const [position, setPosition] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      setPosition({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div
      className="pointer-light"
      aria-hidden="true"
      style={{ '--pointer-x': `${position.x}%`, '--pointer-y': `${position.y}%` } as React.CSSProperties}
    />
  );
}

export function AmbientBackdrop({ accent = '176 255 236' }: { accent?: string }) {
  return (
    <div className="ambient-backdrop" style={{ '--accent-rgb': accent } as React.CSSProperties} aria-hidden="true">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      <div className="grain-layer" />
    </div>
  );
}

type GlassCardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  intensity?: 'clear' | 'soft' | 'uncertain' | 'contradictory';
};

export function GlassCard({ children, className = '', intensity = 'soft', ...props }: GlassCardProps) {
  return (
    <div className={`glass-card glass-${intensity} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function GlowButton({ children, className = '', ...props }: PropsWithChildren<HTMLMotionProps<'button'>>) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={`glow-button ${className}`}
      {...props}
    >
      <span>{children}</span>
      <ArrowUpRight size={15} aria-hidden="true" />
    </motion.button>
  );
}

export function Eyebrow({ children }: PropsWithChildren) {
  return (
    <div className="eyebrow">
      <Sparkles size={12} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function StatusPill({ status, children }: { status: 'ready' | 'loading' | 'offline' | 'complete'; children: ReactNode }) {
  return (
    <span className={`status-pill status-${status}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

export function MetricBar({ label, value, suffix = '%', hint }: { label: string; value: number; suffix?: string; hint?: string }) {
  return (
    <div className="metric-bar">
      <div className="metric-row">
        <span>{label}</span>
        <strong>{value}{suffix}</strong>
      </div>
      <div className="metric-track" aria-hidden="true">
        <motion.div className="metric-fill" animate={{ width: `${Math.max(4, Math.min(100, value))}%` }} transition={{ type: 'spring', damping: 28 }} />
      </div>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
