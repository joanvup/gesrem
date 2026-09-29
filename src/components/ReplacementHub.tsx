import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  UserX,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  UserCheck,
  Zap,
  Printer,
  Share2,
  Users
} from 'lucide-react';
import {
  Teacher,
  ScheduleSlot,
  DayOfWeek,
  DAYS_CONFIG,
  ReplacementAssignment,
  AbsenceRecord,
  CandidateAvailability,
  PERIODS_CONFIG,
  getGradeSection,
  SchoolSection
} from '../types';
import {
  getSlotTime,
  evaluateCandidatesForSlot,
  autoGenerateAssignmentsForAbsence
} from '../utils/replacementEngine';

interface ReplacementHubProps {
  teachers: Teacher[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedDay: DayOfWeek;
  activeReplacements: ReplacementAssignment[];
  allReplacementsHistory: ReplacementAssignment[];
  onSaveAbsenceAndReplacements: (
    absence: AbsenceRecord,
    assignments: ReplacementAssignment[]
  ) => void;
  onOpenSlip: (assignment: ReplacementAssignment) => void;
  onOpenSummaryModal: (data: {
    date: string;
    dayOfWeek: DayOfWeek;
    assignments: ReplacementAssignment[];
    title?: string;
  }) => void;
}

export const ReplacementHub: React.FC<ReplacementHubProps> = ({
  teachers,
  selectedDate,
  setSelectedDate,
  selectedDay,
  activeReplacements,
  allReplacementsHistory,
  onSaveAbsenceAndReplacements,
  onOpenSlip,
  onOpenSummaryModal
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [teacherSectionFilter, setTeacherSectionFilter] = useState<'all' | 'Primaria' | 'Bachillerato'>('all');
  const [isFullDay, setIsFullDay] = useState<boolean>(true);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [reason, setReason] = useState<string>('Incapacidad médica');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  
  // Pending stage for slot-by-slot assignments before final confirmation
  const [stagedAssignments, setStagedAssignments] = useState<Record<number, ReplacementAssignment | null>>({});
  const [activeSlotModal, setActiveSlotModal] = useState<ScheduleSlot | null>(null);
  const [modalCandidateSectionFilter, setModalCandidateSectionFilter] = useState<'all' | 'Primaria' | 'Bachillerato'>('all');
  const [successBanner, setSuccessBanner] = useState<boolean>(false);
  const [lastSavedAssignments, setLastSavedAssignments] = useState<ReplacementAssignment[] | null>(null);

  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || teachers[0];
  }, [teachers, selectedTeacherId]);

  // Filter teachers for dropdown search and educational section
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (teacherSectionFilter === 'Primaria' && t.section === 'Bachillerato') return false;
      if (teacherSectionFilter === 'Bachillerato' && t.section === 'Primaria') return false;
      if (searchTeacher) {
        const q = searchTeacher.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q) ||
          t.section.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teachers, searchTeacher, teacherSectionFilter]);

  // All slots for this teacher on this day
  const teacherDaySlots = useMemo(() => {
    if (!selectedTeacher) return [];
    return selectedTeacher.slots
      .filter(s => s.day === selectedDay && !s.isMeeting)
      .sort((a, b) => a.period - b.period);
  }, [selectedTeacher, selectedDay]);

  // Meetings on this day (informative)
  const teacherDayMeetings = useMemo(() => {
    if (!selectedTeacher) return [];
    return selectedTeacher.slots
      .filter(s => s.day === selectedDay && s.isMeeting)
      .sort((a, b) => a.period - b.period);
  }, [selectedTeacher, selectedDay]);

  // Target slots to cover based on full day or period selection
  const slotsToCover = useMemo(() => {
    if (isFullDay) {
      return teacherDaySlots;
    }
    return teacherDaySlots.filter(s => selectedPeriods.includes(s.period));
  }, [teacherDaySlots, isFullDay, selectedPeriods]);

  // Quick preset reasons
  const PRESET_REASONS = [
    'Incapacidad médica',
    'Cita médica / EPS',
    'Calamidad doméstica',
    'Comisión pedagógica',
    'Permiso personal'
  ];

  // Run instant 1-click automatic assignment for all slots to cover
  const handleAutoAssignAll = () => {
    if (!selectedTeacher || slotsToCover.length === 0) return;

    const absenceId = `abs_${Date.now()}`;
    const result = autoGenerateAssignmentsForAbsence(
      absenceId,
      selectedTeacher,
      slotsToCover,
      selectedDate,
      selectedDay,
      teachers,
      activeReplacements,
      allReplacementsHistory
    );

    const map: Record<number, ReplacementAssignment> = {};
    result.assignments.forEach(a => {
      map[a.period] = a;
    });

    setStagedAssignments(map);
  };

  // Assign a specific candidate to an individual slot
  const handleSelectCandidateForSlot = (slot: ScheduleSlot, candidate: CandidateAvailability) => {
    if (!selectedTeacher) return;

    const timeRange = slot.timeRange || getSlotTime(slot.period, selectedDay);
    const assignment: ReplacementAssignment = {
      id: `rep_${Date.now()}_${slot.period}_${Math.random().toString(36).substring(2, 6)}`,
      absenceId: `abs_${Date.now()}`,
      date: selectedDate,
      dayOfWeek: selectedDay,
      period: slot.period,
      timeRange,
      grade: slot.grade,
      section: getGradeSection(slot.grade),
      subject: slot.subject,
      absentTeacherId: selectedTeacher.id,
      absentTeacherName: selectedTeacher.name,
      substituteTeacherId: candidate.teacher.id,
      substituteTeacherName: candidate.teacher.name,
      substituteDepartment: candidate.teacher.department,
      score: candidate.score,
      matchReasons: candidate.reasons,
      status: 'confirmed',
      activityPlan: customInstructions || `Actividad de ${slot.subject} para ${slot.grade}`,
      assignedAt: new Date().toISOString()
    };

    setStagedAssignments(prev => ({
      ...prev,
      [slot.period]: assignment
    }));

    setActiveSlotModal(null);
  };

  // Final submit: saves absence record and all staged assignments
  const handleConfirmAndSave = () => {
    if (!selectedTeacher || slotsToCover.length === 0) return;

    const assignmentsList = Object.values(stagedAssignments).filter(
      (a): a is ReplacementAssignment => a !== null
    );

    if (assignmentsList.length === 0) {
      alert('Por favor realice la asignación automática o elija suplentes para las clases antes de guardar.');
      return;
    }

    const absenceRecord: AbsenceRecord = {
      id: `abs_${Date.now()}`,
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.name,
      date: selectedDate,
      dayOfWeek: selectedDay,
      isFullDay,
      periods: slotsToCover.map(s => s.period),
      reason,
      notes: customInstructions,
      createdAt: new Date().toISOString(),
      status: 'assigned'
    };

    // Update the absenceId on all assignments
    const finalAssignments = assignmentsList.map(a => ({
      ...a,
      absenceId: absenceRecord.id,
      activityPlan: customInstructions || a.activityPlan
    }));

    onSaveAbsenceAndReplacements(absenceRecord, finalAssignments);
    setLastSavedAssignments(finalAssignments);
    setSuccessBanner(true);

    // Automatically open the General Summary Modal so the user can review and print immediately
    onOpenSummaryModal({
      date: selectedDate,
      dayOfWeek: selectedDay,
      assignments: finalAssignments,
      title: `Planilla Oficial de Reemplazos: Ausencia de ${selectedTeacher.name}`
    });
  };

  const dayConfig = DAYS_CONFIG.find(d => d.id === selectedDay);

  // When modal is open for a slot, compute candidates list
  const modalCandidates = useMemo(() => {
    if (!activeSlotModal || !selectedTeacher) return null;
    return evaluateCandidatesForSlot(
      teachers,
      selectedTeacher,
      activeSlotModal,
      selectedDate,
      selectedDay,
      activeReplacements,
      allReplacementsHistory
    );
  }, [activeSlotModal, selectedTeacher, teachers, selectedDate, selectedDay, activeReplacements, allReplacementsHistory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Asignación Inteligente de Reemplazos
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Detecta automáticamente las horas de clase del docente ausente y calcula en tiempo real qué profesores están libres y mejor calificados para cubrir la suplencia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoAssignAll}
            disabled={slotsToCover.length === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs ${
              slotsToCover.length > 0
                ? 'bg-blue-700 text-white hover:bg-blue-800 cursor-pointer'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            <span>⚡ Asignar Todo Automáticamente</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900 text-xs animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold block text-emerald-950">¡Reemplazos confirmados y guardados exitosamente!</span>
              <span className="text-emerald-800">
                Se han generado las asignaciones para el cuerpo docente. Puedes imprimir el resumen general o consultarlo en el Tablero Diario.
              </span>
            </div>
          </div>

          {lastSavedAssignments && lastSavedAssignments.length > 0 && (
            <button
              onClick={() => {
                onOpenSummaryModal({
                  date: selectedDate,
                  dayOfWeek: selectedDay,
                  assignments: lastSavedAssignments,
                  title: `Resumen General de Reemplazos: Ausencia de ${selectedTeacher.name}`
                });
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-center"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span>Imprimir Resumen General</span>
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Form Left, Schedule Coverage Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-5 space-y-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <UserX className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-semibold text-neutral-900">
              1. Datos del Docente Ausente
            </h2>
          </div>

          {/* Teacher Selector */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-medium text-neutral-700 block">
                Docente que faltará:
              </label>
              <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-md text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTeacherSectionFilter('all')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    teacherSectionFilter === 'all'
                      ? 'bg-white font-bold text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherSectionFilter('Primaria')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    teacherSectionFilter === 'Primaria'
                      ? 'bg-white font-bold text-amber-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Primaria (1°-5°)
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherSectionFilter('Bachillerato')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    teacherSectionFilter === 'Bachillerato'
                      ? 'bg-white font-bold text-indigo-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Bachillerato (6°-11°)
                </button>
              </div>
            </div>
            <div className="relative">
              <select
                value={selectedTeacherId}
                onChange={e => {
                  setSelectedTeacherId(e.target.value);
                  setStagedAssignments({});
                }}
                className="w-full text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                {filteredTeachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.department} ({t.section})
                  </option>
                ))}
              </select>
            </div>
            {selectedTeacher && (
              <div className="text-[11px] text-neutral-500 flex items-center gap-2 pt-1">
                <span>{selectedTeacher.department}</span>
                <span>·</span>
                <span>Sección {selectedTeacher.section}</span>
                <span>·</span>
                <span>{selectedTeacher.slots.length} horas semanales</span>
              </div>
            )}
          </div>

          {/* Date & Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Fecha:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full text-xs border border-neutral-300 rounded-lg px-2.5 py-1.5 font-mono text-neutral-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Día de la Semana:
              </label>
              <div className="text-xs font-semibold text-neutral-800 border border-neutral-200 bg-neutral-50 rounded-lg px-2.5 py-1.5">
                {dayConfig?.labelEs}
              </div>
            </div>
          </div>

          {/* Duration: Full Day vs Specific Periods */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-700 block">
              Duración de la ausencia:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFullDay(true);
                  setSelectedPeriods([]);
                }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-colors cursor-pointer ${
                  isFullDay
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Día Completo ({teacherDaySlots.length} clases)
              </button>
              <button
                type="button"
                onClick={() => setIsFullDay(false)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-colors cursor-pointer ${
                  !isFullDay
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Horas Específicas
              </button>
            </div>

            {/* If specific periods selected, show pills to toggle */}
            {!isFullDay && (
              <div className="pt-2 border-t border-neutral-100">
                <span className="text-[11px] text-neutral-500 block mb-1.5">
                  Selecciona los periodos en los que no estará presente:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {teacherDaySlots.map(s => {
                    const isChecked = selectedPeriods.includes(s.period);
                    return (
                      <button
                        key={s.period}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedPeriods(selectedPeriods.filter(p => p !== s.period));
                          } else {
                            setSelectedPeriods([...selectedPeriods, s.period]);
                          }
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md border font-mono transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-blue-700 text-white border-blue-700 font-bold'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        P{s.period} ({s.grade})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700 block">
              Motivo de la falta:
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_REASONS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    reason === p
                      ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Otro motivo..."
              className="w-full text-xs border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-900"
            />
          </div>

          {/* Class Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-700 block">
              Instrucciones o plan para los suplentes (opcional):
            </label>
            <textarea
              rows={2}
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="Ej: Continuar con el ejercicio de la página 42 del libro guía, entregar al final de clase."
              className="w-full text-xs border border-neutral-300 rounded-lg p-2 text-neutral-900 placeholder:text-neutral-400"
            />
          </div>
        </div>

        {/* Right Column: Detected Classes & Replacements Assignment (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm font-semibold text-neutral-900">
                  2. Horario del Día ({dayConfig?.labelEs}) a Cubrir
                </h2>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {slotsToCover.length} de {teacherDaySlots.length} clases seleccionadas
              </span>
            </div>

            {/* Empty state: No classes scheduled on that day */}
            {teacherDaySlots.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 space-y-2">
                <AlertCircle className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-medium">
                  {selectedTeacher.name} no tiene clases lectivas registradas los {dayConfig?.labelEs}.
                </p>
                <p className="text-[11px] text-neutral-400">
                  Puedes seleccionar otro día en la barra superior o elegir otro docente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 mt-2">
                {slotsToCover.map(slot => {
                  const staged = stagedAssignments[slot.period];
                  const time = slot.timeRange || getSlotTime(slot.period, selectedDay);

                  return (
                    <div key={slot.period} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Class info */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] uppercase font-bold text-neutral-500 leading-none">
                            Per
                          </span>
                          <span className="text-base font-bold font-mono text-neutral-900 leading-none mt-0.5">
                            {slot.period}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-neutral-900">
                              {slot.subject}
                            </span>
                            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Grado {slot.grade}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                              getGradeSection(slot.grade) === 'Primaria'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                            }`}>
                              {getGradeSection(slot.grade) === 'Primaria' ? 'Primaria (1°-5°)' : 'Bachillerato (6°-11°)'}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                            ⏰ {time}
                          </div>
                        </div>
                      </div>

                      {/* Right: Assigned Substitute or Assign Button */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {staged ? (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                            <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div className="text-left">
                              <span className="text-xs font-bold text-emerald-950 block leading-tight">
                                {staged.substituteTeacherName}
                              </span>
                              <span className="text-[10px] text-emerald-700 block">
                                {staged.substituteDepartment} · Score: {staged.score}%
                              </span>
                            </div>
                            <button
                              onClick={() => setActiveSlotModal(slot)}
                              className="text-[11px] text-blue-700 hover:underline ml-2 cursor-pointer font-medium"
                            >
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveSlotModal(slot)}
                            className="px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Ver Disponibles</span>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Notice about teacher meetings (PLC / Reunion de Seccion) */}
            {teacherDayMeetings.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Nota sobre reuniones institucionales:</span>
                  <span>
                    El docente tiene programada reunión en el periodo {teacherDayMeetings.map(m => m.period).join(', ')} ({teacherDayMeetings.map(m => m.subject).join(', ')}). Las reuniones institucionales no requieren reemplazo de aula pero se registran en la inasistencia.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Confirmation Bar */}
          {slotsToCover.length > 0 && (
            <div className="bg-neutral-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="text-xs space-y-0.5">
                <span className="font-bold block text-sm">
                  {Object.keys(stagedAssignments).length} de {slotsToCover.length} reemplazos asignados
                </span>
                <span className="text-neutral-400">
                  {Object.keys(stagedAssignments).length === slotsToCover.length
                    ? 'Todo listo para registrar y generar volantes de suplencia.'
                    : 'Puedes presionar "Asignar Todo" para completar automáticamente los faltantes.'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoAssignAll}
                  className="px-3 py-2 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors cursor-pointer"
                >
                  Completar Faltantes
                </button>
                <button
                  onClick={handleConfirmAndSave}
                  disabled={Object.keys(stagedAssignments).length === 0}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    Object.keys(stagedAssignments).length > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  Confirmar y Guardar Reemplazos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Candidate Selection Drawer for an Individual Slot */}
      {activeSlotModal && modalCandidates && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-neutral-200 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Disponibilidad Docente · Periodo {activeSlotModal.period} ({getSlotTime(activeSlotModal.period, selectedDay)})
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Cubriendo: <span className="font-semibold text-neutral-800">{activeSlotModal.subject}</span> en grado <span className="font-semibold text-neutral-800">{activeSlotModal.grade}</span> ({selectedTeacher.name})
                </p>
              </div>
              <button
                onClick={() => setActiveSlotModal(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Available vs Busy Teachers */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5 text-xs">
              {/* Available candidates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Docentes Disponibles ({modalCandidates.freeCandidates.length})
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Ordenados por afinidad pedagógica y equidad
                  </span>
                </div>

                {modalCandidates.freeCandidates.length === 0 ? (
                  <div className="p-4 border border-dashed border-red-200 bg-red-50 text-red-800 rounded-lg text-center">
                    No se encontraron docentes libres en este periodo.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden">
                    {modalCandidates.freeCandidates.map(cand => (
                      <div
                        key={cand.teacher.id}
                        className="p-3.5 hover:bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-neutral-900 text-xs">
                              {cand.teacher.name}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              {cand.teacher.department}
                            </span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                              {cand.score}% compatibilidad
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-neutral-500">
                            {cand.reasons.map((r, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5 text-neutral-600">
                                · {r}
                              </span>
                            ))}
                            <span className="text-neutral-400">
                              ({cand.pastReplacementsCount} reemplazos previos)
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectCandidateForSlot(activeSlotModal, cand)}
                          className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs min-h-[38px] text-center"
                        >
                          Asignar Suplente
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Busy teachers list (collapsible / informative) */}
              <div>
                <span className="font-bold text-neutral-700 block mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
                  Docentes Ocupados en este periodo ({modalCandidates.busyCandidates.length})
                </span>

                <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100 text-[11px] bg-neutral-50/50">
                  {modalCandidates.busyCandidates.map(b => (
                    <div key={b.teacher.id} className="p-2 flex items-center justify-between text-neutral-600">
                      <span>{b.teacher.name} ({b.teacher.department})</span>
                      <span className="font-mono text-neutral-500 text-[10px]">{b.busyReason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button
                onClick={() => setActiveSlotModal(null)}
                className="px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
