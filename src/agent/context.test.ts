import { describe, expect, it } from 'vitest';
import { createEmptyWorkspace } from '../schemas/workspace';
import { createAgentCanvasContext } from './context';

describe('agent context minimization', () => {
  it('does not expose human rationale, snapshots, audit detail or raw source locators', () => {
    const workspace = createEmptyWorkspace('privacy-test', 'Compare vendors');
    workspace.decision.rationale = 'private human rationale';
    workspace.audit.push({
      id: crypto.randomUUID(), workspaceId: workspace.id, actor: 'human', kind: 'secret-note', detail: 'sensitive detail', at: new Date().toISOString(), runId: null, moduleId: null, sequence: null,
    });
    const context = createAgentCanvasContext(workspace);
    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain('private human rationale');
    expect(serialized).not.toContain('sensitive detail');
    expect(serialized).not.toContain('snapshots');
  });
});
