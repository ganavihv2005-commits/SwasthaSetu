/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Navigation } from './components/Navigation';
import { ReauthModal } from './components/ReauthModal';
import { ensureDefaultGuidelines } from './services/demoDataService';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RoundsPage } from './pages/RoundsPage';
import { HealthWorkerDashboard } from './pages/HealthWorkerDashboard';
import { PatientPortalPage } from './pages/PatientPortalPage';
import { PatientsListPage } from './pages/PatientsListPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { NewPatientPage } from './pages/NewPatientPage';
import { NewVisitPage } from './pages/NewVisitPage';
import { AddReadingPage } from './pages/AddReadingPage';
import { AlertsPage } from './pages/AlertsPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header />
      <main className="flex-1 pb-20">{children}</main>
      <Footer />
      <Navigation />
      <ReauthModal />
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const {
    currentUser,
    authLoading,
    isDoctor,
    isHealthWorker,
    isPatient,
    isAdmin,
    canRegisterPatient,
    canAddClinicalVisit,
    canAddReading,
  } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700 gap-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Connecting to SwasthaSetu secure cloud...</p>
      </div>
    );
  }

  // Not signed in -> login screen
  if (!currentUser) {
    return <LoginPage />;
  }

  // Pending account -> pending approval notice
  if (currentUser.status === 'pending') {
    return <PendingApprovalPage />;
  }

  // Determine home screen by role
  const getDefaultHome = () => {
    if (isPatient) return '/patient-portal';
    if (isHealthWorker) return '/health-worker';
    if (isAdmin) return '/admin';
    return '/rounds';
  };

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to={getDefaultHome()} replace />} />
        <Route path="/login" element={<Navigate to={getDefaultHome()} replace />} />

        {/* Doctor & Health Worker Views */}
        <Route
          path="/rounds"
          element={isDoctor || isAdmin ? <RoundsPage /> : <AccessDeniedPage requiredRole="Doctor or Administrator" />}
        />
        <Route
          path="/health-worker"
          element={isHealthWorker || isAdmin ? <HealthWorkerDashboard /> : <AccessDeniedPage requiredRole="ASHA Health Worker" />}
        />

        {/* Patient Portal */}
        <Route
          path="/patient-portal"
          element={isPatient || isAdmin ? <PatientPortalPage /> : <AccessDeniedPage requiredRole="Patient" />}
        />

        {/* Shared Clinical Records */}
        <Route
          path="/patients"
          element={!isPatient ? <PatientsListPage /> : <Navigate to="/patient-portal" replace />}
        />
        <Route
          path="/patient/:id"
          element={<PatientDetailPage />}
        />
        <Route
          path="/new-patient"
          element={canRegisterPatient ? <NewPatientPage /> : <AccessDeniedPage requiredRole="Doctor or Health Worker" />}
        />
        <Route
          path="/new-visit"
          element={canAddClinicalVisit ? <NewVisitPage /> : <AccessDeniedPage requiredRole="Doctor" />}
        />
        <Route
          path="/add-reading"
          element={canAddReading ? <AddReadingPage /> : <AccessDeniedPage requiredRole="Doctor, Health Worker, or Patient" />}
        />
        <Route
          path="/alerts"
          element={!isPatient ? <AlertsPage /> : <Navigate to="/patient-portal" replace />}
        />

        {/* Administration & Governance */}
        <Route
          path="/admin"
          element={isAdmin ? <AdminPage /> : <AccessDeniedPage requiredRole="Administrator" />}
        />

        {/* Common utility screens */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={getDefaultHome()} replace />} />
      </Routes>
    </AppLayout>
  );
};

export default function App() {
  useEffect(() => {
    // Ensure baseline guidelines exist in Firestore (idempotent, won't duplicate)
    ensureDefaultGuidelines();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <NetworkProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </NetworkProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
