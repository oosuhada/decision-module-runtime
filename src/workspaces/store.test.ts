import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyWorkspace } from '../schemas/workspace';
import { useWorkspaceStore } from './store';

describe('workspace command history and snapshots', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
    useWorkspaceStore.setState({ workspace: createEmptyWorkspace('store-test', 'Choose vendor'), hydrated: true, past: [], future: [], persistenceStatus: 'saved' });
  });

  it('undoes and redoes a human decision', () => {
    useWorkspaceStore.getState().recordDecision('Helix', 'Best security fit');
    expect(useWorkspaceStore.getState().workspace?.decision.humanChoice).toBe('Helix');
    useWorkspaceStore.getState().undo();
    expect(useWorkspaceStore.getState().workspace?.decision.humanChoice).toBeNull();
    useWorkspaceStore.getState().redo();
    expect(useWorkspaceStore.getState().workspace?.decision.humanChoice).toBe('Helix');
  });

  it('restores a named snapshot', () => {
    useWorkspaceStore.getState().recordDecision('Helix', 'baseline');
    const snapshot = useWorkspaceStore.getState().createSnapshot('Baseline');
    expect(snapshot).toBeTruthy();
    useWorkspaceStore.getState().recordDecision('Northstar', 'changed');
    useWorkspaceStore.getState().restoreSnapshot(snapshot!.id);
    expect(useWorkspaceStore.getState().workspace?.decision.humanChoice).toBe('Helix');
  });

  it('cancels and retries generation with a fresh run id', () => {
    const firstRun = crypto.randomUUID();
    useWorkspaceStore.getState().beginRun(firstRun, 'deterministic-demo');
    useWorkspaceStore.getState().cancelRun();
    expect(useWorkspaceStore.getState().workspace?.run.status).toBe('cancelled');
    const retryRun = crypto.randomUUID();
    useWorkspaceStore.getState().resetForRetry(retryRun);
    expect(useWorkspaceStore.getState().workspace?.run).toMatchObject({ id: retryRun, status: 'assembling', sequence: 0 });
  });
});
