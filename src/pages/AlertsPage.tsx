import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Alert, Patient } from '../types';
import { resolveAlert } from '../services/alertService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  BellRing,
  AlertTriangle,
  Clock,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { currentUser, isAdmin, isHealthWorker } = useAuth();
  const { t } = useLanguage();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, Patient>>({});
  const [filterType, setFilterType] = useState<string>('all_open');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);

    const unsubPatients = onSnapshot(collection(db, 'patients'), (snap) => {
      const map: Record<string, Patient> = {};
      snap.docs.forEach((d) => {
        map[d.id] = { id: d.id, ...d.data() } as Patient;
      });
      setPatientsMap(map);
    });

    const unsubAlerts = onSnapshot(collection(db, 'alerts'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAlerts(list);
      setLoading(false);
    });

    return () => {
      unsubPatients();
      unsubAlerts();
    };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAlerts = alerts.filter((a) => {
    const p = patientsMap[a.patientId];
    // Filter by assigned village if health worker
    if (isHealthWorker && currentUser?.assignedVillages && p) {
      if (!currentUser.assignedVillages.includes(p.village)) return false;
    }

    if (filterType === 'all_open') return a.status === 'open';
    if (filterType === 'deterioration') return a.status === 'open' && a.type === 'deterioration';
    if (filterType === 'overdue') return a.status === 'open' && (a.dueDate < todayStr || a.type === 'overdue');
    if (filterType === 'follow_up') return a.status === 'open' && a.type === 'follow_up' && a.dueDate >= todayStr;
    if (filterType === 'resolved') return a.status === 'done' || a.status === 'dismissed';
    return true;
  });

  const handleMarkDone = async (alert: Alert) => {
    const p = patientsMap[alert.patientId];
    await resolveAlert(alert.id, 'done', currentUser?.name || 'Staff');

    if (currentUser) {
      await logAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'resolve_alert',
        resource: 'alert',
        resourceId: alert.id,
        details: `${currentUser.name} marked alert (${alert.type}) as resolved for ${p?.name || 'Patient'}.`,
      });
    }
  };

  const handleDismiss = async (alert: Alert) => {
    const p = patientsMap[alert.patientId];
    await resolveAlert(alert.id, 'dismissed', currentUser?.name || 'Staff');

    if (currentUser) {
      await logAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'resolve_alert',
        resource: 'alert',
        resourceId: alert.id,
        details: `${currentUser.name} dismissed alert (${alert.type}) for ${p?.name || 'Patient'}.`,
      });
    }
  };

  const getDisplayName = (p?: Patient) => {
    if (!p) return 'Unknown Patient';
    if (isAdmin) {
      const initials = p.name
        .split(' ')
        .map((n) => n[0] + '.')
        .join('');
      return `${initials} (${p.village})`;
    }
    return `${p.name} (${p.village})`;
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BellRing className="w-5 h-5 text-teal-600" />
            <span>Clinical Alerts & Overdue Watch</span>
          </h2>
          <p className="text-xs text-slate-500">
            Automated decision support follow-up and deterioration triggers
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all_open', label: 'All Open' },
          { key: 'deterioration', label: 'Deteriorations' },
          { key: 'overdue', label: 'Overdue Follow-ups' },
          { key: 'follow_up', label: 'Upcoming' },
          { key: 'resolved', label: 'Resolved' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[36px] ${
              filterType === tab.key
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
            Loading alerts...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
            <p className="text-sm font-bold text-slate-800">{t.noAlerts || 'No Active Alerts'}</p>
            <p className="text-xs text-slate-500">No alerts match the selected filter category.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const patient = patientsMap[alert.patientId];
            const isPastDue = alert.dueDate < todayStr && alert.status === 'open';

            const badgeConfig = {
              deterioration: {
                label: 'Deterioration',
                className: 'bg-rose-100 text-rose-800 border-rose-300',
                icon: AlertTriangle,
              },
              overdue: {
                label: 'Overdue Follow-up',
                className: 'bg-amber-100 text-amber-800 border-amber-300',
                icon: Clock,
              },
              follow_up: {
                label: 'Follow-up Due',
                className: 'bg-teal-100 text-teal-800 border-teal-300',
                icon: CalendarCheck,
              },
            }[alert.type] || {
              label: alert.type,
              className: 'bg-slate-100 text-slate-800 border-slate-300',
              icon: Clock,
            };

            const Icon = badgeConfig.icon;

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border bg-white p-4 shadow-xs space-y-3 transition-shadow ${
                  alert.type === 'deterioration'
                    ? 'border-rose-300 ring-1 ring-rose-200/50'
                    : isPastDue
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeConfig.className}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{badgeConfig.label}</span>
                    </span>

                    <Link
                      to={`/patient/${alert.patientId}`}
                      className="text-xs sm:text-sm font-bold text-slate-900 hover:text-teal-700 underline underline-offset-2 flex items-center gap-1"
                    >
                      <span>{getDisplayName(patient)}</span>
                    </Link>
                  </div>

                  <span
                    className={`text-xs font-semibold ${
                      isPastDue ? 'text-rose-600 font-bold' : 'text-slate-500'
                    }`}
                  >
                    Due: {alert.dueDate} {isPastDue && '(Past Due)'}
                  </span>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {alert.reason}
                </p>

                {/* Actions */}
                {alert.status === 'open' ? (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400">
                      Triggered: {alert.createdAt.split('T')[0]}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDismiss(alert)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
                      >
                        {t.dismiss || 'Dismiss'}
                      </button>
                      <button
                        onClick={() => handleMarkDone(alert)}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[36px]"
                      >
                        {t.markDone || 'Mark Done'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="font-semibold text-emerald-700">Status: {alert.status.toUpperCase()}</span>
                    <span>Resolved by {alert.resolvedBy || 'Clinician'} on {alert.resolvedAt?.split('T')[0]}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
