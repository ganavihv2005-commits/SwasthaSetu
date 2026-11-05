import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Alert, RiskStatus } from '../types';

export async function scheduleOrUpdateFollowUp(
  patientId: string,
  village: string,
  currentStatus: RiskStatus,
  reasonDetail?: string
): Promise<Alert> {
  const now = new Date();
  let intervalDays = 30; // Stable default

  if (currentStatus === 'Worsening') {
    intervalDays = 7;
  } else if (currentStatus === 'Watch') {
    intervalDays = 14;
  }

  const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // Find existing open follow-up alert
    const q = query(
      collection(db, 'alerts'),
      where('patientId', '==', patientId),
      where('type', '==', 'follow_up'),
      where('status', '==', 'open')
    );
    const existingSnap = await getDocs(q);

    const reason =
      reasonDetail ||
      `Scheduled ${intervalDays}-day follow-up for chronic condition monitoring (${currentStatus} status).`;

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      await updateDoc(doc(db, 'alerts', existingDoc.id), {
        dueDate,
        reason,
      });
      return { ...(existingDoc.data() as Alert), dueDate, reason };
    }

    const alertId = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAlert: Alert = {
      id: alertId,
      patientId,
      village,
      type: 'follow_up',
      reason,
      dueDate,
      status: 'open',
      createdAt: now.toISOString(),
    };

    await setDoc(doc(db, 'alerts', alertId), newAlert);
    return newAlert;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'alerts');
  }
}

export async function checkAndCreateDeteriorationAlert(
  patientId: string,
  village: string,
  riskReason: string
): Promise<Alert | null> {
  try {
    const q = query(
      collection(db, 'alerts'),
      where('patientId', '==', patientId),
      where('type', '==', 'deterioration'),
      where('status', '==', 'open')
    );
    const existingSnap = await getDocs(q);

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      await updateDoc(doc(db, 'alerts', existingDoc.id), {
        reason: `Clinical deterioration warning: ${riskReason}`,
      });
      return existingDoc.data() as Alert;
    }

    const now = new Date();
    const alertId = `alt_det_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const alert: Alert = {
      id: alertId,
      patientId,
      village,
      type: 'deterioration',
      reason: `Clinical deterioration warning: ${riskReason}`,
      dueDate: now.toISOString().split('T')[0],
      status: 'open',
      createdAt: now.toISOString(),
    };

    await setDoc(doc(db, 'alerts', alertId), alert);
    return alert;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'alerts');
  }
}

export async function resolveAlert(alertId: string, action: 'done' | 'dismissed', resolvedBy: string) {
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'alerts', alertId), {
      status: action,
      resolvedAt: now,
      resolvedBy,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `alerts/${alertId}`);
  }
}
