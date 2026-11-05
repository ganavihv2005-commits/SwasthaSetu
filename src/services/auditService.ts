import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { AuditLog } from '../types';

export async function logAudit(params: {
  userId: string;
  userName: string;
  userRole: string;
  action: AuditLog['action'];
  resource: AuditLog['resource'];
  resourceId?: string;
  details: string;
}): Promise<AuditLog> {
  const logId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const log: AuditLog = {
    id: logId,
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId || '',
    details: params.details,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'auditLogs', logId), log);
  } catch (err) {
    // Audit log should not break user operations if offline or permission denied
    console.warn('[AuditLog] Failed to record audit log:', err);
  }
  return log;
}
