import { workspaceDocumentSchema, type WorkspaceDocument } from '../schemas/workspace';

export type ApiStatus = 'connected' | 'offline' | 'error';

export async function fetchRemoteWorkspace(id: string, signal?: AbortSignal): Promise<WorkspaceDocument | null> {
  try {
    const response = await fetch(`/api/workspaces/${encodeURIComponent(id)}`, { signal, headers: { accept: 'application/json' } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Workspace API read failed: ${response.status}`);
    return workspaceDocumentSchema.parse(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return null;
  }
}

export async function fetchRemoteShare(token: string, signal?: AbortSignal): Promise<WorkspaceDocument | null> {
  try {
    const response = await fetch(`/api/shares/${encodeURIComponent(token)}`, { signal, headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const workspace = workspaceDocumentSchema.parse(await response.json());
    workspace.mode = 'readonly';
    return workspace;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return null;
  }
}

export async function saveRemoteWorkspace(workspace: WorkspaceDocument): Promise<ApiStatus> {
  try {
    const response = await fetch(`/api/workspaces/${encodeURIComponent(workspace.id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(workspace),
    });
    return response.ok ? 'connected' : 'error';
  } catch {
    return 'offline';
  }
}

export async function healthcheckApi(): Promise<ApiStatus> {
  try {
    const response = await fetch('/api/health');
    return response.ok ? 'connected' : 'error';
  } catch {
    return 'offline';
  }
}

export async function createRemoteShare(workspaceId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/shares`, { method: 'POST' });
    if (!response.ok) return null;
    const payload = await response.json() as { url?: unknown };
    return typeof payload.url === 'string' ? payload.url : null;
  } catch {
    return null;
  }
}
