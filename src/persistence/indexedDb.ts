import { workspaceDocumentSchema, type WorkspaceDocument } from '../schemas/workspace';

const DB_NAME = 'generative-decision-workspace';
const DB_VERSION = 1;
const STORE = 'workspaces';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
  });
}

export async function saveWorkspaceLocal(workspace: WorkspaceDocument) {
  const validated = workspaceDocumentSchema.parse(workspace);
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(validated);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Workspace persistence failed'));
  });
  db.close();
}

export async function loadWorkspaceLocal(id: string): Promise<WorkspaceDocument | null> {
  const db = await openDatabase();
  const value = await new Promise<unknown>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error('Workspace read failed'));
  });
  db.close();
  if (!value) return null;
  const parsed = workspaceDocumentSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Stored workspace failed schema validation: ${parsed.error.message}`);
  return parsed.data;
}

export async function deleteWorkspaceLocal(id: string) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Workspace delete failed'));
  });
  db.close();
}
