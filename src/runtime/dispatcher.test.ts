import { describe, expect, it } from 'vitest';
import { deterministicProvider } from '../agent/provider';
import { createEmptyWorkspace } from '../schemas/workspace';
import { dispatchProtocolAction } from './dispatcher';

describe('typed action dispatcher', () => {
  it('is idempotent and sequence aware', async () => {
    const plan = await deterministicProvider.plan('Compare vendors');
    const runId = crypto.randomUUID();
    let workspace = createEmptyWorkspace('dispatcher-test', plan.request);
    workspace.run = { id: runId, provider: deterministicProvider.id, status: 'assembling', startedAt: new Date().toISOString(), finishedAt: null, sequence: 0, error: null };
    const iterator = deterministicProvider.stream(plan, runId);
    const first = (await iterator.next()).value;
    expect(first).toBeTruthy();
    const accepted = dispatchProtocolAction(workspace, first);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    workspace = accepted.workspace;
    const duplicate = dispatchProtocolAction(workspace, first);
    expect(duplicate.ok && duplicate.duplicate).toBe(true);
    const outOfOrder = { ...first, actionId: crypto.randomUUID(), sequence: 8 };
    const rejected = dispatchProtocolAction(workspace, outOfOrder);
    expect(rejected.ok).toBe(false);
    expect(rejected.workspace.modules).toHaveLength(1);
  });

  it('rejects a malformed partial failure without mutating the graph', () => {
    const workspace = createEmptyWorkspace('malformed-test', 'Compare vendors');
    const result = dispatchProtocolAction(workspace, { protocol: '1.0', type: 'add_module', payload: { module: { type: 'shell-command' } } });
    expect(result.ok).toBe(false);
    expect(result.workspace.modules).toEqual([]);
  });
});
