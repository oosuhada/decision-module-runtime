import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyWorkspace } from '../schemas/workspace';
import { deleteWorkspaceLocal, loadWorkspaceLocal, saveWorkspaceLocal } from './indexedDb';

describe('IndexedDB persistence', () => {
  const id = 'persistence-test';
  beforeEach(async () => deleteWorkspaceLocal(id));

  it('restores an exact schema-validated workspace after refresh-equivalent read', async () => {
    const workspace = createEmptyWorkspace(id, 'Persist this decision');
    workspace.name = 'Persistence fixture';
    await saveWorkspaceLocal(workspace);
    const restored = await loadWorkspaceLocal(id);
    expect(restored).toEqual(workspace);
  });
});
