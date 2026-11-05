import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { logAudit } from '../services/auditService';
import { loadDemoDataset, clearDemoDataset, VILLAGES } from '../services/demoDataService';
import type { UserProfile, Guideline, AuditLog, Patient, UserRole } from '../types';
import {
  Sliders,
  Users,
  ShieldCheck,
  FileText,
  BarChart3,
  Database,
  Lock,
  Edit2,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Sparkles,
  KeyRound,
  Loader2,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { userProfile, promptReauth } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'users' | 'guidelines' | 'audit' | 'stats' | 'demo'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Guidelines editing state
  const [editingGuideline, setEditingGuideline] = useState<Guideline | null>(null);

  // Demo data state
  const [loadingDemoAction, setLoadingDemoAction] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Audit verified status (requires reauth)
  const [auditUnlocked, setAuditUnlocked] = useState(false);

  useEffect(() => {
    setLoading(true);

    // 1. Users Listener
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile));
        setUsers(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    // 2. Guidelines Listener
    const unsubGuidelines = onSnapshot(
      collection(db, 'guidelines'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Guideline));
        setGuidelines(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'guidelines')
    );

    // 3. Patients (anonymised stats)
    const unsubPatients = onSnapshot(
      collection(db, 'patients'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
        setPatients(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'patients')
    );

    return () => {
      unsubUsers();
      unsubGuidelines();
      unsubPatients();
    };
  }, []);

  // Unlock audit logs with reauth
  const handleRequestAuditAccess = () => {
    promptReauth('Accessing the tamper-evident audit log requires identity confirmation.', () => {
      setAuditUnlocked(true);
      // Fetch audit logs
      const auditQ = query(collection(db, 'auditLogs'), limit(50));
      getDocs(auditQ).then((snap) => {
        const logs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AuditLog))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(logs);
      });
    });
  };

  // Change user role and village assignment with re-authentication step
  const handleUpdateUserRole = (targetUser: UserProfile, newRole: UserRole, villages: string[]) => {
    promptReauth(`Confirm role update for ${targetUser.name} to ${newRole}.`, async () => {
      try {
        await updateDoc(doc(db, 'users', targetUser.id), {
          role: newRole,
          status: 'active',
          assignedVillages: villages,
          updatedAt: new Date().toISOString(),
        });

        await logAudit({
          userId: userProfile?.id || 'admin',
          userName: userProfile?.name || 'Admin',
          userRole: 'admin',
          action: 'role_change',
          resource: 'user',
          resourceId: targetUser.id,
          details: `Admin assigned role ${newRole} and villages [${villages.join(', ')}] to ${targetUser.email}`,
        });

        setFeedback(`Updated role for ${targetUser.name} to ${newRole}.`);
        setTimeout(() => setFeedback(null), 3000);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.id}`);
      }
    });
  };

  // Update Guideline
  const handleSaveGuideline = async () => {
    if (!editingGuideline) return;

    try {
      await updateDoc(doc(db, 'guidelines', editingGuideline.id), {
        targetMin: Number(editingGuideline.targetMin),
        targetMax: Number(editingGuideline.targetMax),
        source: editingGuideline.source,
        note: editingGuideline.note,
        updatedAt: new Date().toISOString(),
      });

      await logAudit({
        userId: userProfile?.id || 'admin',
        userName: userProfile?.name || 'Admin',
        userRole: 'admin',
        action: 'update_guideline',
        resource: 'guideline',
        resourceId: editingGuideline.id,
        details: `Updated target range for ${editingGuideline.parameter} to [${editingGuideline.targetMin} - ${editingGuideline.targetMax} ${editingGuideline.unit}].`,
      });

      setEditingGuideline(null);
      setFeedback('Guideline updated successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guidelines/${editingGuideline.id}`);
    }
  };

  // Demo data handlers
  const handleLoadDemo = async () => {
    if (!userProfile) return;
    setLoadingDemoAction(true);
    try {
      await loadDemoDataset({ id: userProfile.id, name: userProfile.name, role: userProfile.role });
      setFeedback('Loaded 30 synthetic demo patients across Kasmar, Petarwar, and Gola (isDemo: true).');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to load demo data:', err);
      setFeedback('Error loading demo data.');
    } finally {
      setLoadingDemoAction(false);
    }
  };

  const handleClearDemo = async () => {
    if (!userProfile) return;
    if (confirm('Clear all synthetic demonstration records (flagged isDemo: true)? Genuine patient records will not be affected.')) {
      setLoadingDemoAction(true);
      try {
        await clearDemoDataset({ id: userProfile.id, name: userProfile.name, role: userProfile.role });
        setFeedback('Cleared all synthetic demo records. Database is now in clean state.');
        setTimeout(() => setFeedback(null), 4000);
      } catch (err: any) {
        console.error('Failed to clear demo data:', err);
        setFeedback('Error clearing demo data.');
      } finally {
        setLoadingDemoAction(false);
      }
    }
  };

  // Anonymised stats: Initials only
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0] + '.')
      .join('');
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-600" />
            <span>Health System Administration</span>
          </h2>
          <p className="text-xs text-slate-500">
            Staff access control, clinical guidelines governance & audit logs
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto scrollbar-none">
          {[
            { key: 'users', label: 'Staff Roles' },
            { key: 'guidelines', label: 'Guidelines' },
            { key: 'audit', label: 'Audit Log' },
            { key: 'stats', label: 'Village Stats' },
            { key: 'demo', label: 'Demo Data' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. USERS & ROLES TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Staff Accounts & Village Assignments ({users.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Requires security re-authentication for role modification
              </span>
            </div>

            <div className="space-y-2">
              {users.map((u) => {
                const isPending = u.status === 'pending' || u.role === 'pending';
                return (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPending
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">{u.name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'doctor'
                              ? 'bg-blue-100 text-blue-800'
                              : u.role === 'healthWorker'
                              ? 'bg-teal-100 text-teal-800'
                              : u.role === 'patient'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {u.role}
                        </span>
                        {isPending && (
                          <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                            Awaiting Approval
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{u.email}</p>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Assigned Villages: {u.assignedVillages?.join(', ') || 'None assigned'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        defaultValue={u.role}
                        onChange={(e) => {
                          const newR = e.target.value as UserRole;
                          handleUpdateUserRole(u, newR, u.assignedVillages || ['Kasmar']);
                        }}
                        className="text-xs p-1.5 rounded-xl border border-slate-300 bg-white font-bold cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="doctor">Doctor</option>
                        <option value="healthWorker">Health Worker</option>
                        <option value="admin">Administrator</option>
                        <option value="patient">Patient</option>
                      </select>

                      <button
                        onClick={() => {
                          const vStr = prompt('Enter assigned villages comma-separated (e.g. Kasmar, Petarwar or all):', u.assignedVillages?.join(', ') || 'all');
                          if (vStr !== null) {
                            const vList = vStr.split(',').map((s) => s.trim()).filter(Boolean);
                            handleUpdateUserRole(u, u.role, vList);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                      >
                        Villages
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. GUIDELINES TAB */}
      {activeTab === 'guidelines' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Clinical Threshold Notice</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Demo values, replace with guideline-reviewed ranges. Every risk flag in Progression Watch calculates its slope and alerts directly against these active ranges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {guidelines.map((guide) => (
              <div
                key={guide.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-sm text-slate-900 uppercase">
                      {guide.parameter}
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {guide.condition}
                    </span>
                  </div>

                  <div className="py-2 space-y-1">
                    <p className="text-xs text-slate-500">Target Range:</p>
                    <p className="text-lg font-black text-teal-800">
                      {guide.targetMin} - {guide.targetMax} {guide.unit}
                    </p>
                    <p className="text-[11px] text-slate-600 italic">{guide.source}</p>
                    <p className="text-xs text-slate-600 mt-1">{guide.note}</p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingGuideline(guide)}
                  className="w-full py-2 px-3 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Target Range</span>
                </button>
              </div>
            ))}
          </div>

          {/* Edit Modal */}
          {editingGuideline && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-5 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Guideline Range: {editingGuideline.parameter}
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Min ({editingGuideline.unit})</label>
                    <input
                      type="number"
                      value={editingGuideline.targetMin}
                      onChange={(e) => setEditingGuideline({ ...editingGuideline, targetMin: Number(e.target.value) })}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Max ({editingGuideline.unit})</label>
                    <input
                      type="number"
                      value={editingGuideline.targetMax}
                      onChange={(e) => setEditingGuideline({ ...editingGuideline, targetMax: Number(e.target.value) })}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Guideline Source</label>
                  <input
                    type="text"
                    value={editingGuideline.source}
                    onChange={(e) => setEditingGuideline({ ...editingGuideline, source: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setEditingGuideline(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGuideline}
                    className="flex-1 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. AUDIT LOG TAB (SECURITY GATED) */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          {!auditUnlocked ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-3">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Security Gate: Audit Log Locked</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Viewing the full medical audit trail requires administrative re-authentication under security protocols.
              </p>
              <button
                onClick={handleRequestAuditAccess}
                className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Verify & Unlock Audit Log</span>
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Tamper-Evident Access Log ({auditLogs.length} events)
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  Verified Session
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-2">Timestamp</th>
                      <th className="p-2">User</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Resource</th>
                      <th className="p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          {log.timestamp.split('T')[0]} {log.timestamp.split('T')[1]?.substring(0, 5)}
                        </td>
                        <td className="p-2 font-bold text-slate-900 whitespace-nowrap">
                          {log.userName}
                          <span className="text-[9px] text-slate-400 block uppercase font-normal">({log.userRole})</span>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600 font-mono text-[10px] uppercase">
                          {log.resource}
                        </td>
                        <td className="p-2 text-slate-600 text-[11px] max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ANONYMISED VILLAGE STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Privacy Guard Active: Patient names are anonymized as initials only for administrators.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VILLAGES.map((v) => {
              const vPatients = patients.filter((p) => p.village === v);
              const worseCount = vPatients.filter((p) => p.riskStatus === 'Worsening').length;
              const watchCount = vPatients.filter((p) => p.riskStatus === 'Watch').length;
              const stableCount = vPatients.filter((p) => p.riskStatus === 'Stable').length;

              return (
                <div key={v} className="p-4 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-sm text-slate-900">{v} Village</h4>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                      {vPatients.length} Patients
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-rose-700 font-semibold">Worsening:</span>
                      <span className="font-bold text-rose-800">{worseCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-700 font-semibold">Watch:</span>
                      <span className="font-bold text-amber-800">{watchCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700 font-semibold">Stable:</span>
                      <span className="font-bold text-emerald-800">{stableCount}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Anonymised Roster (Initials Only):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {vPatients.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic">No patients</span>
                      ) : (
                        vPatients.map((p) => (
                          <span
                            key={p.id}
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              p.riskStatus === 'Worsening'
                                ? 'bg-rose-100 text-rose-800'
                                : p.riskStatus === 'Watch'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {getInitials(p.name)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. DEMO DATA TAB */}
      {activeTab === 'demo' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Synthetic Demo Dataset Controls</h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            As mandated by hackathon guidelines, SwasthaSetu starts with an <strong>EMPTY</strong> database.
            Only system administrators can populate or purge synthetic demonstration records.
            Every synthetic patient, visit, and reading is flagged with <code>isDemo: true</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleLoadDemo}
              disabled={loadingDemoAction}
              className="py-3 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loadingDemoAction ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Load Synthetic Demo Dataset</span>
                </>
              )}
            </button>

            <button
              onClick={handleClearDemo}
              disabled={loadingDemoAction}
              className="py-3 px-4 rounded-2xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Demo Data (isDemo: true)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
