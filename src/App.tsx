/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { ReplacementHub } from './components/ReplacementHub';
import { DailyBoard } from './components/DailyBoard';
import { ScheduleViewer } from './components/ScheduleViewer';
import { FairnessAnalytics } from './components/FairnessAnalytics';
import { PdfLoader } from './components/PdfLoader';
import { PrintSlipModal } from './components/PrintSlipModal';
import { PrintSummaryModal } from './components/PrintSummaryModal';
import { Teacher, AbsenceRecord, ReplacementAssignment, DayOfWeek } from './types';
import {
  loadTeachers,
  saveTeachers,
  loadAbsences,
  saveAbsences,
  loadReplacements,
  saveReplacements,
  fetchTeachersFromApi,
  fetchAbsencesFromApi,
  fetchReplacementsFromApi,
  fetchDatabaseStatus,
  syncAbsenceToApi,
  syncReplacementsToApi,
  deleteReplacementFromApi,
  toggleReplacementStatusInApi,
  syncTeachersToApi
} from './utils/storage';

export default function App() {
  const [teachers, setTeachers] = useState<Teacher[]>(loadTeachers);
  const [absences, setAbsences] = useState<AbsenceRecord[]>(loadAbsences);
  const [replacements, setReplacements] = useState<ReplacementAssignment[]>(loadReplacements);
  const [sqliteConnected, setSqliteConnected] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'hub' | 'board' | 'schedule' | 'analytics' | 'pdf'>('hub');
  
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

  // Initial load from SQLite Database
  useEffect(() => {
    async function loadFromDb() {
      const status = await fetchDatabaseStatus();
      setSqliteConnected(!!status?.ok);

      const [dbTeachers, dbAbsences, dbReplacements] = await Promise.all([
        fetchTeachersFromApi(),
        fetchAbsencesFromApi(),
        fetchReplacementsFromApi()
      ]);

      if (dbTeachers.length > 0) setTeachers(dbTeachers);
      if (dbAbsences.length > 0) setAbsences(dbAbsences);
      if (dbReplacements.length > 0) setReplacements(dbReplacements);
    }

    loadFromDb();
  }, []);

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

  return (
    <div className="min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans antialiased">
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

        {activeTab === 'pdf' && (
          <PdfLoader
            teachers={teachers}
            onUpdateTeachers={handleUpdateTeachers}
            onNavigateToHub={() => setActiveTab('hub')}
          />
        )}
      </main>

      {/* Printable Replacement Slip Modal */}
      {slipModalAssignment && (
        <PrintSlipModal
          assignment={slipModalAssignment}
          absentTeacher={absentTeacherForModal}
          substituteTeacher={substituteTeacherForModal}
          onClose={() => setSlipModalAssignment(null)}
        />
      )}

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

      {/* Footer conforming to anti-slop rules (quiet institutional copyright and metadata, no fake telemetry) */}
      <footer className="border-t border-neutral-200 bg-white py-6 mt-12 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">Fundación Colegio Bilingüe de Valledupar</span>
            <span>·</span>
            <span>Sistema de Reemplazos Docentes 2026/2027</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Base de Datos: SQLite (<code className="font-mono text-[11px] text-neutral-700 bg-neutral-100 px-1 py-0.5 rounded">school_database.sqlite</code>)</span>
            <span>·</span>
            <span>aSc Timetables v1.8</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
