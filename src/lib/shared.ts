export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const deterministicScore = (values: number[]) => {
  const weighted = values.reduce((total, value, index) => total + value * (index + 1), 0);
  return Math.round((weighted / values.reduce((total, _, index) => total + index + 1, 0)) * 10) / 10;
};

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const supportsWebGL = () => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};
