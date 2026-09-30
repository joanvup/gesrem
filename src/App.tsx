/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Mail, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ReplacementHub } from './components/ReplacementHub';
import { DailyBoard } from './components/DailyBoard';
import { ScheduleViewer } from './components/ScheduleViewer';
import { FairnessAnalytics } from './components/FairnessAnalytics';
import { PdfLoader } from './components/PdfLoader';
import { PrintSlipModal } from './components/PrintSlipModal';
import { PrintSummaryModal } from './components/PrintSummaryModal';
import { AuditAndBackup } from './components/AuditAndBackup';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { EmailNotificationModal, EmailModalData } from './components/EmailNotificationModal';
import { Teacher, AbsenceRecord, ReplacementAssignment, DayOfWeek, AppUser, ScheduleVersionInfo } from './types';
import {
  loadTeachers,
  saveTeachers,
  loadAbsences,
  saveAbsences,
  loadReplacements,
  saveReplacements,
  loadScheduleVersion,
  saveScheduleVersion,
  fetchTeachersFromApi,
  fetchAbsencesFromApi,
  fetchReplacementsFromApi,
  fetchDatabaseStatus,
  syncAbsenceToApi,
  syncReplacementsToApi,
  deleteReplacementFromApi,
  toggleReplacementStatusInApi,
  syncTeachersToApi,
  getStoredAuthUser,
  checkAuthApi,
  logoutApi,
  sendReplacementEmailsApi
} from './utils/storage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(getStoredAuthUser);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<boolean>(false);
  const [emailToast, setEmailToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [emailModalData, setEmailModalData] = useState<EmailModalData | null>(null);

  const [teachers, setTeachers] = useState<Teacher[]>(loadTeachers);
  const [absences, setAbsences] = useState<AbsenceRecord[]>(loadAbsences);
  const [replacements, setReplacements] = useState<ReplacementAssignment[]>(loadReplacements);
  const [scheduleVersion, setScheduleVersion] = useState<ScheduleVersionInfo>(loadScheduleVersion);
  const [sqliteConnected, setSqliteConnected] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'hub' | 'board' | 'schedule' | 'analytics' | 'pdf' | 'audit'>('hub');
  
  // Default to today's date in local time
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [slipModalAssignment, setSlipModalAssignment] = useState<ReplacementAssignment | null>(null);
  const [summaryModalData, setSummaryModalData] = useState<{
    date: string;
    dayOfWeek: DayOfWeek;
    assignments: ReplacementAssignment[];
    title?: string;
  } | null>(null);

  const reloadAllFromDb = async () => {
    const status = await fetchDatabaseStatus();
    setSqliteConnected(!!status?.ok);

    const [dbTeachers, dbAbsences, dbReplacements] = await Promise.all([
      fetchTeachersFromApi(),
      fetchAbsencesFromApi(),
      fetchReplacementsFromApi()
    ]);

    if (dbTeachers.length > 0) setTeachers(dbTeachers);
    if (dbAbsences.length > 0) setAbsences(dbAbsences);
    setReplacements(dbReplacements);
  };

  // Initial load and session verification
  useEffect(() => {
    async function verifySession() {
      try {
        const verifiedUser = await checkAuthApi();
        setCurrentUser(verifiedUser);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    verifySession();
    reloadAllFromDb();
  }, []);

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
  };

  // Compute school DayOfWeek from selectedDate
  const selectedDay: DayOfWeek = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayIndex = d.getDay(); // 0 is Sun, 1 is Mon...
        switch (dayIndex) {
          case 1: return 'Monday';
          case 2: return 'Tuesday';
          case 3: return 'Wednesday';
          case 4: return 'Thursday';
          case 5: return 'Friday';
          default: return 'Monday'; // Default to Monday for weekend dates
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 'Monday';
  }, [selectedDate]);

  // Persist changes to local cache
  useEffect(() => {
    saveTeachers(teachers);
  }, [teachers]);

  useEffect(() => {
    saveAbsences(absences);
  }, [absences]);

  useEffect(() => {
    saveReplacements(replacements);
  }, [replacements]);

  useEffect(() => {
    saveScheduleVersion(scheduleVersion);
  }, [scheduleVersion]);

  const handleDispatchEmails = async (assignments: ReplacementAssignment[]) => {
    if (!assignments || assignments.length === 0) return;

    setEmailModalData({
      isOpen: true,
      sentCount: 0,
      skippedCount: 0,
      results: [],
      assignments,
      isLoading: true
    });

    try {
      const emailRes = await sendReplacementEmailsApi(assignments);
      if (emailRes.ok) {
        setEmailModalData({
          isOpen: true,
          sentCount: emailRes.sentCount || 0,
          skippedCount: emailRes.skippedCount || 0,
          reason: emailRes.reason,
          results: emailRes.results || [],
          assignments,
          isLoading: false
        });

        if (emailRes.sentCount && emailRes.sentCount > 0) {
          setEmailToast({
            type: 'success',
            message: `✉️ Se enviaron ${emailRes.sentCount} notificaciones por correo a los docentes suplentes.`
          });
          setTimeout(() => setEmailToast(null), 8000);
        }
      } else {
        setEmailModalData({
          isOpen: true,
          sentCount: 0,
          skippedCount: assignments.length,
          reason: emailRes.error || 'Error al conectar con el servicio de correo.',
          results: assignments.map(a => ({
            recipient: '(error)',
            teacherName: a.substituteTeacherName,
            success: false,
            error: emailRes.error
          })),
          assignments,
          isLoading: false
        });
      }
    } catch (err: any) {
      setEmailModalData({
        isOpen: true,
        sentCount: 0,
        skippedCount: assignments.length,
        reason: `Error de conexión: ${err.message}`,
        results: assignments.map(a => ({
          recipient: '(error)',
          teacherName: a.substituteTeacherName,
          success: false,
          error: err.message
        })),
        assignments,
        isLoading: false
      });
    }
  };

  const handleSaveAbsenceAndReplacements = async (
    newAbsence: AbsenceRecord,
    newAssignments: ReplacementAssignment[]
  ) => {
    // Optimistic UI update
    setAbsences(prev => [newAbsence, ...prev]);
    setReplacements(prev => [...newAssignments, ...prev]);

    // Persist to SQLite database file
    await syncAbsenceToApi(newAbsence);
    await syncReplacementsToApi(newAssignments);

    // Trigger automatic SMTP email notification with dedicated confirmation modal
    handleDispatchEmails(newAssignments);

    // Switch to daily board to view the generated replacements
    setActiveTab('board');
  };

  const handleDeleteReplacement = async (id: string) => {
    setReplacements(prev => prev.filter(r => r.id !== id));
    await deleteReplacementFromApi(id);
  };

  const handleToggleStatus = async (id: string) => {
    setReplacements(prev =>
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: r.status === 'confirmed' ? 'draft' : 'confirmed'
          };
        }
        return r;
      })
    );
    await toggleReplacementStatusInApi(id);
  };

  const handleUpdateTeachers = async (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    await syncTeachersToApi(newTeachers);
  };

  // Find absent and substitute teachers for the slip modal
  const absentTeacherForModal = useMemo(() => {
    if (!slipModalAssignment) return undefined;
    return teachers.find(t => t.id === slipModalAssignment.absentTeacherId);
  }, [teachers, slipModalAssignment]);

  const substituteTeacherForModal = useMemo(() => {
    if (!slipModalAssignment) return undefined;
    return teachers.find(t => t.id === slipModalAssignment.substituteTeacherId);
  }, [teachers, slipModalAssignment]);

  const todayReplacementsCount = replacements.filter(r => r.date === selectedDate).length;

  if (!currentUser && !isCheckingAuth) {
    return <LoginScreen onLoginSuccess={user => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-neutral-100/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased transition-colors duration-150">
      {/* Navigation Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedDay={selectedDay}
        onOpenNewAbsence={() => setActiveTab('hub')}
        activeReplacementsCount={todayReplacementsCount}
        sqliteConnected={sqliteConnected}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenChangePassword={() => setChangePasswordModalOpen(true)}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1">
        {activeTab === 'hub' && (
          <ReplacementHub
            teachers={teachers}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedDay={selectedDay}
            activeReplacements={replacements}
            allReplacementsHistory={replacements}
            onSaveAbsenceAndReplacements={handleSaveAbsenceAndReplacements}
            onOpenSlip={assignment => setSlipModalAssignment(assignment)}
            onOpenSummaryModal={data => setSummaryModalData(data)}
          />
        )}

        {activeTab === 'board' && (
          <DailyBoard
            replacements={replacements}
            teachers={teachers}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onOpenSlip={assignment => setSlipModalAssignment(assignment)}
            onDeleteReplacement={handleDeleteReplacement}
            onToggleStatus={handleToggleStatus}
            onNavigateToHub={() => setActiveTab('hub')}
            onOpenSummaryModal={data => setSummaryModalData(data)}
            onSendEmailNotification={rep => handleDispatchEmails([rep])}
            onSendBatchEmails={reps => handleDispatchEmails(reps)}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleViewer
            teachers={teachers}
            selectedDay={selectedDay}
            onSelectTeacherForAbsence={() => setActiveTab('hub')}
          />
        )}

        {activeTab === 'analytics' && (
          <FairnessAnalytics
            teachers={teachers}
            replacements={replacements}
          />
        )}

        {activeTab === 'pdf' && currentUser?.role === 'admin' && (
          <PdfLoader
            teachers={teachers}
            scheduleVersion={scheduleVersion}
            currentUser={currentUser}
            onUpdateTeachers={handleUpdateTeachers}
            onUpdateScheduleVersion={setScheduleVersion}
            onNavigateToHub={() => setActiveTab('hub')}
          />
        )}

        {activeTab === 'audit' && (
          <AuditAndBackup
            onDatabaseRestored={reloadAllFromDb}
            currentUser={currentUser}
            teachers={teachers}
            onUpdateTeachers={handleUpdateTeachers}
          />
        )}
      </main>

      {/* Floating Toast Notification for Emails & Dispatches */}
      {emailToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-3.5 rounded-xl shadow-lg border flex items-center justify-between gap-3 text-xs ${
              emailToast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700 shadow-emerald-950/20'
                : emailToast.type === 'error'
                ? 'bg-red-900 text-white border-red-700 shadow-red-950/20'
                : 'bg-blue-900 text-white border-blue-700 shadow-blue-950/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {emailToast.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : emailToast.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
              ) : (
                <Mail className="w-4 h-4 text-blue-300 shrink-0" />
              )}
              <span className="font-medium leading-relaxed">{emailToast.message}</span>
            </div>
            <button
              onClick={() => setEmailToast(null)}
              className="text-white/70 hover:text-white p-1 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Printable Replacement Slip Modal */}
      {slipModalAssignment && (
        <PrintSlipModal
          assignment={slipModalAssignment}
          absentTeacher={absentTeacherForModal}
          substituteTeacher={substituteTeacherForModal}
          onClose={() => setSlipModalAssignment(null)}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        userName={currentUser?.name || ''}
      />

      {/* Printable General Summary of All Replacements Modal */}
      {summaryModalData && (
        <PrintSummaryModal
          date={summaryModalData.date}
          dayOfWeek={summaryModalData.dayOfWeek}
          assignments={summaryModalData.assignments}
          teachers={teachers}
          title={summaryModalData.title}
          onClose={() => setSummaryModalData(null)}
        />
      )}

      {/* Email Notification Status & Confirmation Modal */}
      {emailModalData && (
        <EmailNotificationModal
          data={emailModalData}
          onClose={() => setEmailModalData(null)}
          onRetry={assignments => handleDispatchEmails(assignments)}
          onNavigateToSmtp={() => {
            setEmailModalData(null);
            setActiveTab('audit');
          }}
          onNavigateToTeachers={() => {
            setEmailModalData(null);
            setActiveTab('audit');
          }}
        />
      )}

      {/* Footer conforming to anti-slop rules (quiet institutional copyright and metadata, no fake telemetry) */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-5 mt-12 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Fundación Colegio Bilingüe de Valledupar</span>
            <span className="hidden sm:inline">·</span>
            <span>Sistema de Reemplazos Docentes 2026/2027</span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3 gap-y-1.5 text-[11px]">
            {/* Dynamic Active PDF Schedule Version */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              <span>
                Horario Activo:{' '}
                <strong className="font-semibold font-mono">
                  {scheduleVersion.fileName || scheduleVersion.versionName}
                </strong>
              </span>
              {scheduleVersion.source === 'uploaded_pdf' && scheduleVersion.uploadedAt && (
                <span className="text-blue-700 dark:text-blue-400 text-[10px]">
                  · Cargado: {scheduleVersion.uploadedAt} ({scheduleVersion.teachersCount || teachers.length} Docentes)
                </span>
              )}
              {scheduleVersion.source === 'official_default' && (
                <span className="text-blue-700 dark:text-blue-400 text-[10px]">
                  · Oficial ({scheduleVersion.teachersCount || 37} Docentes · aSc v1.8)
                </span>
              )}
            </div>

            <span className="hidden lg:inline text-neutral-300 dark:text-neutral-700">|</span>

            <span>
              Base de Datos: SQLite (<code className="font-mono text-[10px] text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">school_database.sqlite</code>)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
