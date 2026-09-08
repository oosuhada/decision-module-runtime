import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { affectedModuleIds } from '../dist-lib/index.js';

function legacyAffectedModuleIds(sourceId, edges) {
  const affected = new Set();
  const queue = [sourceId];
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of edges) {
      if (edge.source === current && !affected.has(edge.target)) {
        affected.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return [...affected];
}

function makeDag(nodes, fanout) {
  const edges = [];
  for (let source = 0; source < nodes; source += 1) {
    for (let step = 1; step <= fanout && source + step < nodes; step += 1) {
      edges.push({ id: `e-${source}-${source + step}`, source: `n-${source}`, target: `n-${source + step}` });
    }
  }
  return edges;
}

function timeMs(fn) {
  const start = performance.now();
  const result = fn();
  return { ms: performance.now() - start, count: result.length };
}

function summarize(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const percentile = (p) => ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * p))];
  return {
    median_ms: Number(percentile(0.5).toFixed(4)),
    p95_ms: Number(percentile(0.95).toFixed(4)),
    mean_ms: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)),
  };
}

const nodes = 2500;
const fanout = 4;
const repeats = 8;
const edges = makeDag(nodes, fanout);
const legacy = [];
const indexed = [];

for (let run = 0; run < repeats; run += 1) {
  const oldRun = timeMs(() => legacyAffectedModuleIds('n-0', edges));
  const newRun = timeMs(() => affectedModuleIds('n-0', edges));
  if (oldRun.count !== nodes - 1 || newRun.count !== oldRun.count) throw new Error('benchmark traversal mismatch');
  legacy.push(oldRun.ms);
  indexed.push(newRun.ms);
}

const before = summarize(legacy);
const after = summarize(indexed);
const result = {
  experiment: 'decision-runtime-descendant-index-v1',
  git_sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  generated_at: new Date().toISOString(),
  fixture: { nodes, edges: edges.length, fanout, repeats, source: 'n-0' },
  baseline: { algorithm: 'scan every edge for every visited node', complexity: 'O(VE)', ...before },
  candidate: { algorithm: 'build outgoing adjacency once, then BFS', complexity: 'O(V+E)', ...after },
  median_improvement_percent: Number((((before.median_ms - after.median_ms) / before.median_ms) * 100).toFixed(2)),
  limitations: [
    'Synthetic DAG isolates descendant traversal; it is not end-to-end UI latency.',
    'The full recompute path also validates schemas and executes module formulas, which can dominate small production graphs.',
    'The runtime now reuses the same adjacency/incoming index within a recompute call, but the index is not persisted across separate graph mutations.',
  ],
};

mkdirSync('benchmarks/results', { recursive: true });
writeFileSync('benchmarks/results/descendant-index-v1.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
