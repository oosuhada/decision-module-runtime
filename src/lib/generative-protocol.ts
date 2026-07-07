export type SurfaceBlockId = 'brief' | 'weights' | 'vendors' | 'cost' | 'risk' | 'rationale' | 'counter' | 'decision';

export type SurfacePlanItem = {
  id: SurfaceBlockId;
  title: string;
  code: string;
  position: { x: number; y: number };
  width: number;
  inputs: SurfaceBlockId[];
};

export type CanvasEvent = {
  type: 'node-mounted' | 'node-moved' | 'node-removed' | 'input-changed' | 'focus-changed';
  nodeId?: SurfaceBlockId;
  detail: string;
  timestamp: number;
};

const dependencyGraph: Partial<Record<SurfaceBlockId, SurfaceBlockId[]>> = {
  weights: ['brief'],
  vendors: ['weights'],
  cost: ['brief'],
  risk: ['vendors'],
  rationale: ['vendors', 'risk', 'cost'],
  counter: ['weights', 'rationale'],
  decision: ['rationale', 'counter'],
};

export function createSurfacePlan(definitions: Array<{ type: SurfaceBlockId; title: string; position: { x: number; y: number } }>): SurfacePlanItem[] {
  return definitions.map((definition, index) => ({
    id: definition.type,
    title: definition.title,
    code: `M-${String(index + 1).padStart(2, '0')}`,
    position: definition.position,
    width: definition.type === 'vendors' ? 330 : definition.type === 'rationale' ? 300 : 280,
    inputs: dependencyGraph[definition.type] ?? [],
  }));
}

export function createCanvasEvent(event: Omit<CanvasEvent, 'timestamp'>): CanvasEvent {
  return { ...event, timestamp: Date.now() };
}

export function getAffectedBlocks(source: SurfaceBlockId): SurfaceBlockId[] {
  const affected = new Set<SurfaceBlockId>();
  const queue: SurfaceBlockId[] = [source];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    for (const [target, inputs] of Object.entries(dependencyGraph) as Array<[SurfaceBlockId, SurfaceBlockId[]]>) {
      if (inputs.includes(current) && !affected.has(target)) {
        affected.add(target);
        queue.push(target);
      }
    }
  }
  return [...affected];
}

export function describeCanvasEvent(event: CanvasEvent) {
  const node = event.nodeId ? ` ${event.nodeId}` : '';
  return `${event.type}${node} / ${event.detail}`;
}
