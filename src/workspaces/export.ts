import type { WorkspaceDocument } from '../schemas/workspace';
import { createRemoteShare } from '../api/client';

export function workspaceExportPayload(workspace: WorkspaceDocument) {
  return {
    exportedAt: new Date().toISOString(),
    format: 'generative-decision-workspace/1.0',
    workspace,
  };
}

export function downloadWorkspaceExport(workspace: WorkspaceDocument) {
  const payload = workspaceExportPayload(workspace);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${workspace.id}-${new Date().toISOString().slice(0, 10)}.decision.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function copyReadonlyShareUrl(workspace: WorkspaceDocument) {
  const remote = await createRemoteShare(workspace.id);
  const url = remote ?? `${window.location.origin}/w/${encodeURIComponent(workspace.id)}?mode=readonly`;
  await navigator.clipboard.writeText(url);
  return url;
}
