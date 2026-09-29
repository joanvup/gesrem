import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  School,
  BookOpen
} from 'lucide-react';
import {
  Teacher,
  DayOfWeek,
  DAYS_CONFIG,
  PERIODS_CONFIG,
  ScheduleSlot
} from '../types';
import { getTeacherSlot, getSlotTime } from '../utils/replacementEngine';

interface ScheduleViewerProps {
  teachers: Teacher[];
  selectedDay: DayOfWeek;
  onSelectTeacherForAbsence: (teacherId: string) => void;
}

export const ScheduleViewer: React.FC<ScheduleViewerProps> = ({
  teachers,
  selectedDay,
  onSelectTeacherForAbsence
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'individual'>('matrix');
  const [activeDay, setActiveDay] = useState<DayOfWeek>(selectedDay);
  const [activePeriod, setActivePeriod] = useState<number>(3);
  const [filterSection, setFilterSection] = useState<'all' | 'Primaria' | 'Bachillerato'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIndividualTeacherId, setSelectedIndividualTeacherId] = useState<string>(
    teachers[0]?.id || ''
  );

  // Departments list for filter
  const departments = Array.from(new Set(teachers.map(t => t.department))).sort();

  // Filtered teachers list
  const filteredTeachers = teachers.filter(t => {
    if (filterSection === 'Primaria' && t.section === 'Bachillerato') {
      return false;
    }
    if (filterSection === 'Bachillerato' && t.section === 'Primaria') {
      return false;
    }
    if (filterDepartment !== 'all' && t.department !== filterDepartment) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.section.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate free vs busy for activeDay and activePeriod
  const freeTeachers: { teacher: Teacher }[] = [];
  const busyTeachers: { teacher: Teacher; slot: ScheduleSlot }[] = [];

  filteredTeachers.forEach(teacher => {
    const slot = getTeacherSlot(teacher, activeDay, activePeriod);
    if (!slot) {
      freeTeachers.push({ teacher });
    } else {
      busyTeachers.push({ teacher, slot });
    }
  });

  const selectedIndividualTeacher =
    teachers.find(t => t.id === selectedIndividualTeacherId) || teachers[0];

  const currentPeriodConfig = PERIODS_CONFIG.find(p => p.number === activePeriod);

  // Helper color map for subjects
  const getSubjectColor = (subject: string, isMeeting?: boolean) => {
    if (isMeeting) return 'bg-amber-100 text-amber-900 border-amber-300';
    const s = subject.toLowerCase();
    if (s.includes('ingl') || s.includes('soc stud')) return 'bg-sky-50 text-sky-900 border-sky-200';
    if (s.includes('español')) return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    if (s.includes('mate') || s.includes('geom')) return 'bg-indigo-50 text-indigo-900 border-indigo-200';
    if (s.includes('scien') || s.includes('quim') || s.includes('físic')) return 'bg-teal-50 text-teal-900 border-teal-200';
    if (s.includes('socia') || s.includes('histo') || s.includes('filo')) return 'bg-orange-50 text-orange-900 border-orange-200';
    if (s.includes('infor')) return 'bg-purple-50 text-purple-900 border-purple-200';
    if (s.includes('depor') || s.includes('educ')) return 'bg-lime-50 text-lime-900 border-lime-200';
    if (s.includes('art') || s.includes('musi')) return 'bg-rose-50 text-rose-900 border-rose-200';
    return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Horarios y Matriz de Disponibilidad
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Explora la disponibilidad en tiempo real de todo el cuerpo docente o consulta el horario semanal completo de cualquier profesor extraído del PDF.
          </p>
        </div>

        {/* Subtabs switcher */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'matrix'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Matriz de Disponibilidad
          </button>
          <button
            onClick={() => setActiveSubTab('individual')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeSubTab === 'individual'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Horario Individual (Docente)
          </button>
        </div>
      </div>

      {activeSubTab === 'matrix' ? (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Day Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 font-medium">Día:</span>
                <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg">
                  {DAYS_CONFIG.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setActiveDay(d.id)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                        activeDay === d.id
                          ? 'bg-white text-neutral-900 shadow-xs font-bold'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {d.labelEs}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 font-medium">Sección:</span>
                <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg">
                  <button
                    onClick={() => setFilterSection('all')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      filterSection === 'all'
                        ? 'bg-white text-neutral-900 shadow-xs font-bold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFilterSection('Primaria')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      filterSection === 'Primaria'
                        ? 'bg-white text-amber-950 shadow-xs font-bold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Primaria (1°-5°)
                  </button>
                  <button
                    onClick={() => setFilterSection('Bachillerato')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      filterSection === 'Bachillerato'
                        ? 'bg-white text-indigo-950 shadow-xs font-bold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Bachillerato (6°-11°)
                  </button>
                </div>
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Departamento:</span>
                <select
                  value={filterDepartment}
                  onChange={e => setFilterDepartment(e.target.value)}
                  className="border border-neutral-300 rounded px-2.5 py-1 text-xs bg-white text-neutral-800"
                >
                  <option value="all">Todos los departamentos</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex items-center gap-1.5 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs bg-white">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por nombre..."
                  className="bg-transparent border-none text-neutral-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Periods selector pills */}
            <div className="border-t border-neutral-100 pt-3">
              <span className="text-[11px] text-neutral-500 block mb-1.5 font-medium">
                Selecciona el Periodo para calcular quién está libre:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5">
                {PERIODS_CONFIG.map(p => {
                  const isSelected = p.number === activePeriod;
                  const time = activeDay === 'Friday' && p.fridayTime ? p.fridayTime : p.regularTime;

                  return (
                    <button
                      key={p.number}
                      onClick={() => setActivePeriod(p.number)}
                      className={`p-2 text-center rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="text-xs font-bold font-mono">P{p.number}</div>
                      <div className={`text-[10px] font-mono leading-tight mt-0.5 ${isSelected ? 'text-blue-200' : 'text-neutral-400'}`}>
                        {time}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Period Banner */}
          <div className="flex items-center justify-between bg-neutral-900 text-white rounded-xl p-4 shadow-sm text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-bold text-sm">
                P{activePeriod}
              </div>
              <div>
                <span className="font-bold text-sm block">
                  {DAYS_CONFIG.find(d => d.id === activeDay)?.labelEs} · Periodo {activePeriod} ({getSlotTime(activePeriod, activeDay)})
                </span>
                <span className="text-neutral-400">
                  {freeTeachers.length} profesores disponibles para reemplazos · {busyTeachers.length} profesores con clase asignada
                </span>
              </div>
            </div>
          </div>

          {/* Dual Columns: Free Teachers vs Busy Teachers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Free Teachers */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-neutral-900">
                    Docentes Disponibles ({freeTeachers.length})
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Libres en este periodo
                </span>
              </div>

              {freeTeachers.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs">
                  No hay docentes disponibles con los filtros actuales.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
                  {freeTeachers.map(({ teacher }) => (
                    <div
                      key={teacher.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-neutral-50 px-2 rounded-md transition-colors"
                    >
                      <div>
                        <span className="font-bold text-neutral-900 block">
                          {teacher.name}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {teacher.department} · {teacher.section}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedIndividualTeacherId(teacher.id);
                          setActiveSubTab('individual');
                        }}
                        className="text-[11px] text-blue-700 hover:underline cursor-pointer"
                      >
                        Ver Horario
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Busy Teachers */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-bold text-neutral-900">
                    Docentes en Clase / Reunión ({busyTeachers.length})
                  </h3>
                </div>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Ocupados
                </span>
              </div>

              {busyTeachers.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs">
                  Ningún docente tiene clase asignada en este periodo.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
                  {busyTeachers.map(({ teacher, slot }) => (
                    <div
                      key={teacher.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-neutral-50 px-2 rounded-md transition-colors"
                    >
                      <div>
                        <span className="font-bold text-neutral-800 block">
                          {teacher.name}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {teacher.department}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border inline-block ${getSubjectColor(slot.subject, slot.isMeeting)}`}>
                          {slot.subject} {slot.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Individual Teacher Weekly Timetable View (resembling aSc Timetables) */
        <div className="space-y-6">
          {/* Teacher Selector Card */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <School className="w-5 h-5 text-blue-900" />
              <div>
                <label className="text-xs text-neutral-500 block">
                  Seleccionar Docente a consultar:
                </label>
                <select
                  value={selectedIndividualTeacherId}
                  onChange={e => setSelectedIndividualTeacherId(e.target.value)}
                  className="font-bold text-neutral-900 text-sm border-none bg-transparent focus:outline-none cursor-pointer"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.department} ({t.section})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => onSelectTeacherForAbsence(selectedIndividualTeacher.id)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Reportar Ausencia de {selectedIndividualTeacher.name.split(' ')[0]}
            </button>
          </div>

          {/* Schedule Sheet Header */}
          <div className="border border-neutral-300 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="bg-neutral-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-blue-300 block font-semibold">
                  Fundación Colegio Bilingüe de Valledupar · 2026/2027
                </span>
                <h2 className="text-lg font-bold">
                  {selectedIndividualTeacher.name}
                </h2>
              </div>
              <div className="text-right text-xs">
                <span className="text-neutral-400 block">Departamento: {selectedIndividualTeacher.department}</span>
                <span className="text-neutral-400 block">Sección: {selectedIndividualTeacher.section}</span>
              </div>
            </div>

            {/* Weekly Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-700">
                    <th className="py-2.5 px-3 w-28 text-left border-r border-neutral-300">
                      Periodo / Hora
                    </th>
                    {DAYS_CONFIG.map(d => (
                      <th
                        key={d.id}
                        className="py-2.5 px-3 text-center border-r border-neutral-300 font-bold"
                      >
                        {d.labelEs}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {PERIODS_CONFIG.map(p => (
                    <tr key={p.number} className="hover:bg-neutral-50/50">
                      {/* Period Label */}
                      <td className="p-2 border-r border-neutral-300 bg-neutral-50/70">
                        <div className="font-mono font-bold text-neutral-900">
                          Periodo {p.number}
                        </div>
                        <div className="font-mono text-[10px] text-neutral-500">
                          {p.regularTime}
                        </div>
                      </td>

                      {/* Monday to Friday columns */}
                      {DAYS_CONFIG.map(d => {
                        const slot = getTeacherSlot(selectedIndividualTeacher, d.id, p.number);

                        return (
                          <td
                            key={d.id}
                            className="p-1.5 border-r border-neutral-200 text-center align-middle h-14"
                          >
                            {slot ? (
                              <div
                                className={`p-1.5 rounded-lg border text-left h-full flex flex-col justify-between shadow-2xs ${getSubjectColor(
                                  slot.subject,
                                  slot.isMeeting
                                )}`}
                              >
                                <span className="font-bold text-[11px] block truncate">
                                  {slot.subject}
                                </span>
                                <span className="font-semibold text-[10px] block opacity-90">
                                  {slot.grade}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-neutral-300 font-mono">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
