import { describe, expect, it } from 'vitest';
import { createEmptyWorkspace } from '../schemas/workspace';
import { workspaceExportPayload } from './export';

describe('workspace export', () => {
  it('preserves schema version and human decision state', () => {
    const workspace = createEmptyWorkspace('export-test', 'Choose vendor');
    workspace.decision.humanChoice = 'Helix';
    const payload = workspaceExportPayload(workspace);
    expect(payload.format).toBe('generative-decision-workspace/1.0');
    expect(payload.workspace.decision.humanChoice).toBe('Helix');
  });
});
