import { db, type PendingSyncItem } from '../db/database';
import { logAudit } from './auditService';

export async function queuePendingSync(params: {
  table: PendingSyncItem['table'];
  recordId: string;
  action: PendingSyncItem['action'];
  dataSummary: string;
}): Promise<PendingSyncItem> {
  const item: PendingSyncItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    table: params.table,
    recordId: params.recordId,
    action: params.action,
    dataSummary: params.dataSummary,
    createdAt: new Date().toISOString(),
  };

  await db.pendingSync.put(item);
  notifySyncCountListeners();
  return item;
}

export async function getPendingSyncCount(): Promise<number> {
  return await db.pendingSync.count();
}

export async function getPendingSyncItems(): Promise<PendingSyncItem[]> {
  return await db.pendingSync.toArray();
}

type SyncListener = (count: number) => void;
const listeners: Set<SyncListener> = new Set();

export function subscribeToSyncCount(callback: SyncListener): () => void {
  listeners.add(callback);
  getPendingSyncCount().then(callback);
  return () => {
    listeners.delete(callback);
  };
}

export async function notifySyncCountListeners() {
  const count = await getPendingSyncCount();
  listeners.forEach((fn) => fn(count));
}

export async function performSync(currentUser: { id: string; name: string; role: any }): Promise<{ success: boolean; syncedCount: number; message: string }> {
  const count = await db.pendingSync.count();
  if (count === 0) {
    return { success: true, syncedCount: 0, message: 'All local clinical records are up to date.' };
  }

  // Simulate network synchronization delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  await db.pendingSync.clear();
  await notifySyncCountListeners();

  await logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'sync',
    resource: 'system',
    details: `Synchronized ${count} pending offline clinical records with District Cloud Server.`,
  });

  return {
    success: true,
    syncedCount: count,
    message: `Successfully synchronized ${count} offline updates to district server.`,
  };
}
