import React, { useState } from 'react';
import {
  Clock,
  Printer,
  Share2,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Filter,
  Search,
  School,
  UserCheck,
  Calendar,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { ReplacementAssignment, Teacher, DAYS_CONFIG, DayOfWeek, getGradeSection, SchoolSection } from '../types';

interface DailyBoardProps {
  replacements: ReplacementAssignment[];
  teachers: Teacher[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onOpenSlip: (assignment: ReplacementAssignment) => void;
  onDeleteReplacement: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onNavigateToHub: () => void;
  onOpenSummaryModal: (data: {
    date: string;
    dayOfWeek: DayOfWeek;
    assignments: ReplacementAssignment[];
    title?: string;
  }) => void;
}

export const DailyBoard: React.FC<DailyBoardProps> = ({
  replacements,
  teachers,
  selectedDate,
  setSelectedDate,
  onOpenSlip,
  onDeleteReplacement,
  onToggleStatus,
  onNavigateToHub,
  onOpenSummaryModal
}) => {
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewScope, setViewScope] = useState<'today' | 'all'>('today');
  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | 'Primaria' | 'Bachillerato'>('all');

  // Filter replacements by date and search
  const filteredReplacements = replacements.filter(r => {
    if (viewScope === 'today' && r.date !== selectedDate) {
      return false;
    }
    if (filterPeriod !== 'all' && r.period.toString() !== filterPeriod) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.absentTeacherName.toLowerCase().includes(q) ||
        r.substituteTeacherName.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.grade.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => a.period - b.period);

  // Group by sections: Primaria (1 a 5) vs Bachillerato (6 a 11)
  const primariaReplacements = filteredReplacements.filter(
    r => (r.section || getGradeSection(r.grade)) === 'Primaria'
  );
  const bachilleratoReplacements = filteredReplacements.filter(
    r => (r.section || getGradeSection(r.grade)) === 'Bachillerato'
  );

  const totalAssignedToday = replacements.filter(r => r.date === selectedDate).length;
  const primariaToday = replacements.filter(
    r => r.date === selectedDate && (r.section || getGradeSection(r.grade)) === 'Primaria'
  ).length;
  const bachilleratoToday = replacements.filter(
    r => r.date === selectedDate && (r.section || getGradeSection(r.grade)) === 'Bachillerato'
  ).length;

  const handleShareWhatsApp = (r: ReplacementAssignment) => {
    const sub = teachers.find(t => t.id === r.substituteTeacherId);
    const dayLabel = DAYS_CONFIG.find(d => d.id === r.dayOfWeek)?.labelEs || r.dayOfWeek;
    const sectionName = (r.section || getGradeSection(r.grade)) === 'Primaria' ? 'Primaria (1° a 5°)' : 'Bachillerato (6° a 11°)';

    const text = `*FUNDACIÓN COLEGIO BILINGÜE DE VALLEDUPAR*
*Aviso de Suplencia Docente (${sectionName})*
Estimado(a) *${r.substituteTeacherName}*:
Le ha sido asignado el siguiente reemplazo pedagógico:

📅 *Fecha:* ${dayLabel}, ${r.date}
⏰ *Periodo:* Periodo ${r.period} (${r.timeRange})
🏫 *Grado:* ${r.grade} (${sectionName})
📚 *Asignatura:* ${r.subject}
👤 *Docente Titular Ausente:* ${r.absentTeacherName}
📝 *Instrucciones:* ${r.activityPlan || 'Seguimiento temario de clase'}

Agradecemos su puntual asistencia en el salón.`;

    const encoded = encodeURIComponent(text);
    const phone = sub?.phone ? sub.phone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const openSummaryForSection = (section: 'all' | 'Primaria' | 'Bachillerato') => {
    let list = filteredReplacements;
    let title = `Planilla General de Reemplazos (${selectedDate})`;

    if (section === 'Primaria') {
      list = primariaReplacements;
      title = `Planilla Oficial Sección PRIMARIA (Grados 1° a 5°) · ${selectedDate}`;
    } else if (section === 'Bachillerato') {
      list = bachilleratoReplacements;
      title = `Planilla Oficial Sección BACHILLERATO (Grados 6° a 11°) · ${selectedDate}`;
    }

    if (list.length === 0) {
      alert(`No hay reemplazos registrados para la sección ${section} en esta fecha.`);
      return;
    }

    onOpenSummaryModal({
      date: selectedDate,
      dayOfWeek: list[0]?.dayOfWeek || 'Monday',
      assignments: list,
      title
    });
  };

  // Sub-component to render replacement rows cleanly
  const renderTable = (items: ReplacementAssignment[], sectionTitle: string, sectionBadge: string, badgeColor: string) => {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        {/* Section Table Header */}
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
              {sectionBadge}
            </span>
            <h3 className="font-bold text-neutral-900 text-sm">
              {sectionTitle}
            </h3>
            <span className="text-xs text-neutral-500 font-mono">
              ({items.length} {items.length === 1 ? 'suplencia' : 'suplencias'})
            </span>
          </div>

          {items.length > 0 && (
            <button
              onClick={() => openSummaryForSection(sectionBadge.includes('Primaria') ? 'Primaria' : 'Bachillerato')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir esta sección</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-neutral-400 text-xs">
            No hay reemplazos programados para esta sección en la fecha seleccionada.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                    <th className="py-2.5 px-4 w-28">Periodo & Hora</th>
                    <th className="py-2.5 px-4 w-36">Clase / Grado</th>
                    <th className="py-2.5 px-4">Docente Titular (Ausente)</th>
                    <th className="py-2.5 px-4">Docente Reemplazante</th>
                    <th className="py-2.5 px-4">Instrucciones / Plan</th>
                    <th className="py-2.5 px-4 text-center w-28">Estado</th>
                    <th className="py-2.5 px-4 text-right w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map(rep => {
                    const absentTeacher = teachers.find(t => t.id === rep.absentTeacherId);

                    return (
                      <tr key={rep.id} className="hover:bg-neutral-50/60 transition-colors">
                        {/* Period & Hour */}
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-neutral-900">
                            Periodo {rep.period}
                          </div>
                          <div className="font-mono text-[11px] text-neutral-500">
                            {rep.timeRange}
                          </div>
                          {viewScope === 'all' && (
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              {rep.date}
                            </div>
                          )}
                        </td>

                        {/* Class / Group */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-neutral-900">
                            {rep.subject}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.2 bg-blue-50 text-blue-900 border border-blue-200 font-bold rounded text-[11px]">
                              Grado {rep.grade}
                            </span>
                          </div>
                        </td>

                        {/* Absent Teacher */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-neutral-900">
                            {rep.absentTeacherName}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {absentTeacher?.department || 'Titular'}
                          </div>
                        </td>

                        {/* Substitute Teacher */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{rep.substituteTeacherName}</span>
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {rep.substituteDepartment}
                          </div>
                        </td>

                        {/* Match & Plan */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="text-[11px] text-neutral-700 italic truncate" title={rep.activityPlan}>
                            {rep.activityPlan || 'Seguimiento de clase'}
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                            {rep.matchReasons.join(' · ')}
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onToggleStatus(rep.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                              rep.status === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                            }`}
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>{rep.status === 'confirmed' ? 'Confirmado' : 'Borrador'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onOpenSlip(rep)}
                              title="Ver e imprimir volante individual"
                              className="p-1.5 text-neutral-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleShareWhatsApp(rep)}
                              title="Enviar aviso por WhatsApp"
                              className="p-1.5 text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onDeleteReplacement(rep.id)}
                              title="Eliminar asignación"
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-neutral-100">
              {items.map(rep => {
                const absentTeacher = teachers.find(t => t.id === rep.absentTeacherId);

                return (
                  <div key={rep.id} className="p-4 space-y-3 hover:bg-neutral-50/50 transition-colors">
                    {/* Top Row: Period, Grade & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-neutral-900 text-white px-2 py-0.5 rounded">
                          Periodo {rep.period}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-500">
                          {rep.timeRange}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 font-bold rounded text-xs">
                        Grado {rep.grade}
                      </span>
                    </div>

                    {/* Class & Subject */}
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm">
                        {rep.subject}
                      </h4>
                      {rep.activityPlan && (
                        <p className="text-xs text-neutral-600 italic mt-0.5 bg-neutral-50 p-2 rounded border border-neutral-150">
                          📝 "{rep.activityPlan}"
                        </p>
                      )}
                    </div>

                    {/* Teachers Assignment Row */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50/80 p-2.5 rounded-lg border border-neutral-200">
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-semibold uppercase">
                          Docente Ausente
                        </span>
                        <span className="font-medium text-neutral-800 block truncate">
                          {rep.absentTeacherName}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {absentTeacher?.department || 'Titular'}
                        </span>
                      </div>

                      <div className="border-l border-neutral-200 pl-2.5">
                        <span className="text-[10px] text-emerald-700 block font-semibold uppercase flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Reemplazante
                        </span>
                        <span className="font-bold text-emerald-950 block truncate">
                          {rep.substituteTeacherName}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {rep.substituteDepartment}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons row with touch targets */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => onToggleStatus(rep.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
                          rep.status === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                            : 'bg-neutral-100 text-neutral-700 border border-neutral-300'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{rep.status === 'confirmed' ? 'Confirmado' : 'Borrador'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenSlip(rep)}
                          title="Imprimir volante"
                          className="p-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                        >
                          <Printer className="w-4 h-4 text-blue-900" />
                        </button>

                        <button
                          onClick={() => handleShareWhatsApp(rep)}
                          title="WhatsApp"
                          className="p-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeleteReplacement(rep.id)}
                          title="Eliminar"
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Tablero de Suplencias por Secciones
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Gestión separada de horarios de reemplazo: <strong className="text-neutral-700">Primaria (1° a 5°)</strong> y <strong className="text-neutral-700">Bachillerato (6° a 11°)</strong> con planillas independientes de coordinación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Dropdown / Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openSummaryForSection('Primaria')}
              disabled={primariaReplacements.length === 0}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 shadow-2xs ${
                primariaReplacements.length > 0
                  ? 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100 cursor-pointer'
                  : 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-amber-700" />
              <span>Imprimir Primaria</span>
            </button>

            <button
              onClick={() => openSummaryForSection('Bachillerato')}
              disabled={bachilleratoReplacements.length === 0}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 shadow-2xs ${
                bachilleratoReplacements.length > 0
                  ? 'bg-indigo-50 text-indigo-950 border-indigo-300 hover:bg-indigo-100 cursor-pointer'
                  : 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-indigo-700" />
              <span>Imprimir Bachillerato</span>
            </button>

            <button
              onClick={() => openSummaryForSection('all')}
              disabled={filteredReplacements.length === 0}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 shadow-2xs ${
                filteredReplacements.length > 0
                  ? 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50 cursor-pointer'
                  : 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-neutral-600" />
              <span>Imprimir Todo</span>
            </button>
          </div>

          <button
            onClick={() => setViewScope(viewScope === 'today' ? 'all' : 'today')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              viewScope === 'all'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            {viewScope === 'all' ? 'Todas las Fechas' : 'Fecha de Hoy'}
          </button>

          <button
            onClick={onNavigateToHub}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            + Nueva Ausencia
          </button>
        </div>
      </div>

      {/* Metrics Row: General, Primaria (1 a 5), Bachillerato (6 a 11) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 text-xs font-medium">Total Suplencias</span>
            <span className="text-[11px] font-mono text-neutral-400">
              {viewScope === 'today' ? selectedDate : 'Histórico'}
            </span>
          </div>
          <span className="text-2xl font-bold font-mono text-neutral-900 mt-1 block tabular-nums">
            {viewScope === 'today' ? totalAssignedToday : replacements.length}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            {primariaToday} en Primaria · {bachilleratoToday} en Bachillerato
          </span>
        </div>

        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-amber-900 text-xs font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              Sección Primaria
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
              Grados 1° a 5°
            </span>
          </div>
          <span className="text-2xl font-bold font-mono text-amber-950 mt-1 block tabular-nums">
            {viewScope === 'today' ? primariaToday : primariaReplacements.length}
          </span>
          <span className="text-[11px] text-amber-800 mt-0.5 block">
            Horas cubiertas en salones de 1A a 5B
          </span>
        </div>

        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-indigo-900 text-xs font-bold flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-700" />
              Sección Bachillerato
            </span>
            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.2 rounded border border-indigo-300">
              Grados 6° a 11°
            </span>
          </div>
          <span className="text-2xl font-bold font-mono text-indigo-950 mt-1 block tabular-nums">
            {viewScope === 'today' ? bachilleratoToday : bachilleratoReplacements.length}
          </span>
          <span className="text-[11px] text-indigo-800 mt-0.5 block">
            Horas cubiertas en salones de 6A a 11B
          </span>
        </div>
      </div>

      {/* Section Filter Tabs + Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
        {/* Section Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSectionFilter('all')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeSectionFilter === 'all'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Todas las Secciones ({filteredReplacements.length})
          </button>
          <button
            onClick={() => setActiveSectionFilter('Primaria')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeSectionFilter === 'Primaria'
                ? 'bg-white text-amber-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            🎒 Primaria (Grados 1 a 5) · {primariaReplacements.length}
          </button>
          <button
            onClick={() => setActiveSectionFilter('Bachillerato')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeSectionFilter === 'Bachillerato'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            🎓 Bachillerato (Grados 6 a 11) · {bachilleratoReplacements.length}
          </button>
        </div>

        {/* Search & Period Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs bg-white flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Profesor, materia, grado..."
              className="w-full bg-transparent border-none text-neutral-800 focus:outline-none placeholder:text-neutral-400"
            />
          </div>

          <select
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
            className="border border-neutral-300 rounded px-2 py-1 text-xs bg-white text-neutral-800"
          >
            <option value="all">Todos los periodos</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(p => (
              <option key={p} value={p}>Periodo {p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: Separated Tables by Section */}
      {filteredReplacements.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-500 space-y-3 shadow-xs">
          <School className="w-10 h-10 text-neutral-300 mx-auto" />
          <p className="text-sm font-semibold text-neutral-800">
            No hay reemplazos registrados para esta fecha o filtros seleccionados
          </p>
          <button
            onClick={onNavigateToHub}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
          >
            + Reportar Nueva Ausencia
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Primaria (1 a 5) */}
          {(activeSectionFilter === 'all' || activeSectionFilter === 'Primaria') &&
            renderTable(
              primariaReplacements,
              'Horarios de Reemplazo — Sección Primaria (Grados 1° a 5°)',
              'Sección Primaria',
              'bg-amber-100 text-amber-950 border-amber-300'
            )}

          {/* Section 2: Bachillerato (6 a 11) */}
          {(activeSectionFilter === 'all' || activeSectionFilter === 'Bachillerato') &&
            renderTable(
              bachilleratoReplacements,
              'Horarios de Reemplazo — Sección Bachillerato (Grados 6° a 11°)',
              'Sección Bachillerato',
              'bg-indigo-100 text-indigo-950 border-indigo-300'
            )}
        </div>
      )}
    </div>
  );
};
