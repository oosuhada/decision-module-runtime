export type WorkspaceRoute = { workspaceId: string; readonly: boolean; shareToken: string | null };

export function resolveWorkspaceRoute(locationLike: Pick<Location, 'pathname' | 'search'> = window.location): WorkspaceRoute {
  const shareMatch = locationLike.pathname.match(/^\/share\/([a-zA-Z0-9_-]+)$/);
  if (shareMatch) return { workspaceId: `shared-${shareMatch[1]}`, readonly: true, shareToken: shareMatch[1] };
  const match = locationLike.pathname.match(/^\/w\/([a-zA-Z0-9_-]+)$/);
  const workspaceId = match?.[1] ?? 'vendor-evaluation';
  const readonly = new URLSearchParams(locationLike.search).get('mode') === 'readonly';
  return { workspaceId, readonly, shareToken: null };
}

export function ensureWorkspaceUrl(workspaceId: string, readonly = false) {
  const desired = `/w/${encodeURIComponent(workspaceId)}${readonly ? '?mode=readonly' : ''}`;
  if (`${window.location.pathname}${window.location.search}` !== desired) window.history.replaceState({}, '', desired);
}

export function branchWorkspaceUrl(workspaceId: string) {
  window.history.pushState({}, '', `/w/${encodeURIComponent(workspaceId)}`);
}
