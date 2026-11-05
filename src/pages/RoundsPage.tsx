import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { VILLAGES } from '../services/demoDataService';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { useLanguage } from '../i18n/LanguageContext';
import { RiskBadge } from '../components/RiskBadge';
import { logAudit } from '../services/auditService';
import { EmptyOnboardingView } from '../components/EmptyOnboardingView';
import type { Patient, Alert, Reading } from '../types';
import {
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  UserPlus,
  Check,
  ChevronRight,
  Radio,
  RadioTower,
  Activity,
  Heart,
} from 'lucide-react';

export const RoundsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, isDoctor, canRegisterPatient, assignedVillages } = useAuth();
  const { pendingSyncCount, syncNow, isSyncing, syncStatus } = useNetwork();
  const { t } = useLanguage();

  const effectiveVillages =
    assignedVillages.length > 0 && !assignedVillages.includes('all')
      ? assignedVillages
      : VILLAGES;

  const [selectedVillage, setSelectedVillage] = useState<string>(effectiveVillages[0] || 'Kasmar');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  const initialReadingsLoadedRef = useRef(false);

  useEffect(() => {
    setLoading(true);

    // 1. Live Patients Listener for village
    const patientsQ = query(
      collection(db, 'patients'),
      where('village', '==', selectedVillage)
    );

    const unsubPatients = onSnapshot(
      patientsQ,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
        setPatients(list);
        setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'patients')
    );

    // 2. Live Alerts Listener for village
    const alertsQ = query(
      collection(db, 'alerts'),
      where('village', '==', selectedVillage),
      where('status', '==', 'open')
    );

    const unsubAlerts = onSnapshot(
      alertsQ,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
        setAlerts(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'alerts')
    );

    // 3. Live Readings feed for instant toast notification when ASHA or Patient logs a reading
    const readingsQ = query(
      collection(db, 'readings'),
      where('village', '==', selectedVillage),
      limit(1)
    );

    const unsubReadings = onSnapshot(
      readingsQ,
      (snap) => {
        if (!initialReadingsLoadedRef.current) {
          initialReadingsLoadedRef.current = true;
          return;
        }

        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const r = change.doc.data() as Reading;
            // Get patient name or initials
            const target = patients.find((p) => p.id === r.patientId);
            const initials = target
              ? target.name
                  .split(' ')
                  .map((w) => w[0] + '.')
                  .join('')
              : 'patient';

            const sourceLabel = r.source === 'patient' ? 'Patient' : 'ASHA';
            setLiveToast(`New ${r.type} reading (${r.value}) logged by ${sourceLabel} for ${initials}`);
            setTimeout(() => setLiveToast(null), 4500);
          }
        });
      },
      (err) => {
        console.warn('[Rounds] Readings live feed listener:', err);
      }
    );

    return () => {
      unsubPatients();
      unsubAlerts();
      unsubReadings();
    };
  }, [selectedVillage]);

  // Overdue patient IDs
  const overduePatientIds = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const set = new Set<string>();
    alerts.forEach((a) => {
      if (a.dueDate < todayStr || a.type === 'overdue' || a.type === 'deterioration') {
        set.add(a.patientId);
      }
    });
    return set;
  }, [alerts]);

  // Filter and Rank patients for the selected village
  // Ranking: Worsening trend first, then overdue follow-ups, then longest since last visit
  const rankedVillagePatients = useMemo(() => {
    const filtered = patients.filter((p) => {
      const matchQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.conditions.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchQuery;
    });

    const getScore = (p: Patient) => {
      let score = 0;
      if (p.riskStatus === 'Worsening' && !p.riskDismissed) score += 1000;
      else if (p.riskStatus === 'Watch' && !p.riskDismissed) score += 500;

      if (overduePatientIds.has(p.id)) score += 300;

      if (p.lastVisitDate) {
        const diffDays = Math.floor(
          (new Date(selectedDate).getTime() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        score += Math.max(0, diffDays);
      } else {
        score += 200;
      }
      return score;
    };

    return [...filtered].sort((a, b) => getScore(b) - getScore(a));
  }, [patients, searchQuery, overduePatientIds, selectedDate]);

  // Village summary counts
  const villageStats = useMemo(() => {
    const worseningCount = patients.filter((p) => p.riskStatus === 'Worsening' && !p.riskDismissed).length;
    const overdueCount = patients.filter((p) => overduePatientIds.has(p.id)).length;
    return {
      total: patients.length,
      worsening: worseningCount,
      overdue: overdueCount,
    };
  }, [patients, overduePatientIds]);

  const handleMarkSeenToday = async (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    const today = new Date().toISOString().split('T')[0];

    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        lastVisitDate: today,
        updatedAt: new Date().toISOString(),
      });

      await logAudit({
        userId: userProfile?.id || 'doc',
        userName: userProfile?.name || 'Dr. Ravi Kumar',
        userRole: userProfile?.role || 'doctor',
        action: 'edit',
        resource: 'patient',
        resourceId: patient.id,
        details: `${userProfile?.name} marked ${patient.name} as evaluated during ${selectedVillage} rounds today (${today}).`,
      });

      setActionFeedback(`${patient.name} marked as seen today.`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `patients/${patient.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 space-y-4">
      {/* Live Toast Feed for incoming readings */}
      {liveToast && (
        <div className="rounded-2xl bg-teal-700 text-white p-3.5 text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-fadeIn border border-teal-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{liveToast}</span>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            className="text-teal-200 hover:text-white font-mono text-sm p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Village & Live Status Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1 sm:w-48">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t.village}
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full font-bold text-slate-900 text-sm bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
            >
              {effectiveVillages.map((v) => (
                <option key={v} value={v}>
                  {v} Village
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t.live}</span>
            <span className="text-[10px] text-teal-700 font-medium">({lastUpdatedTime})</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-slate-900 border-0 p-0 bg-transparent focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Top Clinical Triaging Metrics Card */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800">{t.worseningPatients}</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900 mt-2">{villageStats.worsening}</p>
          <span className="text-[10px] text-rose-700 font-medium">Progression Watch</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800">{t.overdueFollowups}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{villageStats.overdue}</p>
          <span className="text-[10px] text-amber-700 font-medium">Missed Clinic Visits</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">Sync Status</span>
            <RefreshCw className={`w-4 h-4 ${pendingSyncCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{pendingSyncCount}</p>
          <button
            onClick={syncNow}
            disabled={isSyncing}
            className="text-[10px] text-teal-700 font-bold hover:underline text-left cursor-pointer"
          >
            {pendingSyncCount > 0 ? `${pendingSyncCount} ${t.pendingChanges}` : t.syncedWithCloud}
          </button>
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="rounded-xl bg-emerald-600 text-white p-2.5 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Action and Search Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${selectedVillage} patients...`}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-teal-600"
          />
        </div>

        {canRegisterPatient && (
          <button
            onClick={() => navigate('/new-patient')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[36px]"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden xs:inline">{t.newPatient}</span>
          </button>
        )}
      </div>

      {/* Empty Database State or Active Village Rounds */}
      {!loading && patients.length === 0 ? (
        <EmptyOnboardingView villageName={selectedVillage} />
      ) : (
        <>
          {/* Patient List Heading */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Ranked Patient List ({rankedVillagePatients.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Ranked: Worsening → Overdue → Longest Unseen
            </span>
          </div>

          {/* Patient Cards List */}
          <div className="space-y-2.5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                Loading village roster...
              </div>
            ) : rankedVillagePatients.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">No patients found</p>
                <p className="text-xs text-slate-500">
                  No registered patients match this query in {selectedVillage}.
                </p>
              </div>
            ) : (
              rankedVillagePatients.map((patient) => {
                const isOverdue = overduePatientIds.has(patient.id);
                const isHero = patient.id === 'pat_hero_rameshwar';

                return (
                  <div
                    key={patient.id}
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    className={`rounded-2xl border bg-white p-3.5 sm:p-4 shadow-xs transition-all hover:shadow-md cursor-pointer relative ${
                      patient.riskStatus === 'Worsening'
                        ? 'border-rose-300 ring-1 ring-rose-200/50'
                        : isOverdue
                        ? 'border-amber-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isHero && (
                      <span className="absolute -top-2.5 right-4 bg-teal-700 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs tracking-wider">
                        Hero Demo Case
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {patient.name}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {patient.age}y • {patient.sex}
                          </span>
                          {patient.linkCode && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              Code: {patient.linkCode}
                            </span>
                          )}
                        </div>

                        {/* Chronic conditions chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {patient.conditions.map((cond) => (
                            <span
                              key={cond}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {cond === 'hypertension' ? 'Hypertension (BP)' : 'Type 2 Diabetes'}
                            </span>
                          ))}

                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Overdue</span>
                            </span>
                          )}

                          {patient.isDemo && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                              Demo Data
                            </span>
                          )}
                        </div>

                        {/* Risk Badge and one-line progression reason */}
                        <div className="pt-1 space-y-1">
                          <RiskBadge status={patient.riskStatus} reason={patient.riskReason} size="sm" showWhyButton={false} />
                          <p className="text-xs text-slate-700 font-medium line-clamp-2">
                            {patient.riskReason || 'Vitals stable on current regimen.'}
                          </p>
                        </div>

                        {/* Last visit date */}
                        <p className="text-[11px] text-slate-500 pt-0.5">
                          Last visit:{' '}
                          <span className="font-semibold text-slate-700">
                            {patient.lastVisitDate ? patient.lastVisitDate : 'Never seen'}
                          </span>
                        </p>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex flex-col items-end justify-between gap-2 self-stretch shrink-0">
                        {isDoctor && (
                          <button
                            onClick={(e) => handleMarkSeenToday(e, patient)}
                            title="Quick mark as evaluated today"
                            className="px-2.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold flex items-center gap-1 transition-colors min-h-[36px]"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">{t.markSeenToday}</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="text-[11px] font-semibold text-teal-700 hidden sm:inline">Details</span>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
