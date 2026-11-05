import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Patient, RiskStatus } from '../types';
import { VILLAGES } from '../db/seedData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { RiskBadge } from '../components/RiskBadge';
import {
  Users,
  Search,
  UserPlus,
  MapPin,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { EmptyOnboardingView } from '../components/EmptyOnboardingView';

export const PatientsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, canRegisterPatient, isHealthWorker } = useAuth();
  const { t } = useLanguage();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [villageFilter, setVillageFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'patients'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        let all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));

        // Filter by assigned villages if health worker
        if (isHealthWorker && currentUser?.assignedVillages && currentUser.assignedVillages.length > 0) {
          all = all.filter((p) => currentUser.assignedVillages?.includes(p.village));
        }

        setPatients(all);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load patients list:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isHealthWorker, currentUser?.assignedVillages]);

  const filteredPatients = patients.filter((p) => {
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.conditions.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    const matchVillage = villageFilter === 'all' || p.village === villageFilter;
    const matchRisk = riskFilter === 'all' || p.riskStatus === riskFilter;
    return matchSearch && matchVillage && matchRisk;
  });

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-4 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>{t.patients} Directory ({patients.length})</span>
          </h2>
          <p className="text-xs text-slate-500">
            Longitudinal electronic registry across Kasmar, Petarwar & Gola
          </p>
        </div>

        {canRegisterPatient && (
          <Link
            to="/new-patient"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors min-h-[36px]"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden xs:inline">{t.newPatient}</span>
          </Link>
        )}
      </div>

      {/* Content */}
      {!loading && patients.length === 0 ? (
        <EmptyOnboardingView onDataLoaded={() => {}} />
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient name, condition (hypertension, diabetes)..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-teal-600"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1 text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </div>

              <select
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium cursor-pointer"
              >
                <option value="all">All Villages</option>
                {VILLAGES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium cursor-pointer"
              >
                <option value="all">All Risk Statuses</option>
                <option value="Worsening">Worsening</option>
                <option value="Watch">Watch</option>
                <option value="Stable">Stable</option>
                <option value="Insufficient Data">Insufficient Data</option>
              </select>

              <span className="text-[11px] text-slate-400 ml-auto">
                Showing {filteredPatients.length} of {patients.length}
              </span>
            </div>
          </div>

          {/* Roster list */}
          <div className="space-y-2">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                Loading registry...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                No patients found matching the criteria.
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => navigate(`/patient/${patient.id}`)}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs hover:border-teal-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{patient.name}</h4>
                      <span className="text-xs text-slate-500 font-medium">
                        {patient.age}y • {patient.sex}
                      </span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {patient.village}
                      </span>
                      {patient.isDemo && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200">
                          Demo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {patient.conditions.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] uppercase font-bold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded"
                        >
                          {c === 'hypertension' ? 'Hypertension' : 'Diabetes'}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Last visit: {patient.lastVisitDate ? patient.lastVisitDate : 'Never visited'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <RiskBadge status={patient.riskStatus} reason={patient.riskReason} size="sm" showWhyButton={false} />
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
