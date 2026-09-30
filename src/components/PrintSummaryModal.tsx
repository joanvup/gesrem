import React, { useEffect, useState } from 'react';
import { X, Printer, Share2, School, Calendar, CheckCircle, Users, BookOpen, GraduationCap, Download, Loader2 } from 'lucide-react';
import { generateSummaryPdf } from '../utils/pdfGenerator';
import { ReplacementAssignment, Teacher, DAYS_CONFIG, DayOfWeek, getGradeSection, SchoolSection } from '../types';

interface PrintSummaryModalProps {
  date: string;
  dayOfWeek: DayOfWeek;
  assignments: ReplacementAssignment[];
  teachers: Teacher[];
  title?: string;
  initialSection?: 'all' | 'Primaria' | 'Bachillerato';
  onClose: () => void;
}

export const PrintSummaryModal: React.FC<PrintSummaryModalProps> = ({
  date,
  dayOfWeek,
  assignments,
  teachers,
  title = 'Resumen General Oficial de Reemplazos Docentes',
  initialSection = 'all',
  onClose
}) => {
  const [selectedSection, setSelectedSection] = useState<'all' | 'Primaria' | 'Bachillerato'>(initialSection);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Listen for Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (assignments.length === 0) return null;

  const dayLabel = DAYS_CONFIG.find(d => d.id === dayOfWeek)?.labelEs || dayOfWeek;
  const sortedAssignments = [...assignments].sort((a, b) => a.period - b.period);

  const primariaAssignments = sortedAssignments.filter(
    a => (a.section || getGradeSection(a.grade)) === 'Primaria'
  );
  const bachilleratoAssignments = sortedAssignments.filter(
    a => (a.section || getGradeSection(a.grade)) === 'Bachillerato'
  );

  const displayedAssignments =
    selectedSection === 'all'
      ? sortedAssignments
      : selectedSection === 'Primaria'
      ? primariaAssignments
      : bachilleratoAssignments;

  const uniqueAbsent = Array.from(new Set(displayedAssignments.map(a => a.absentTeacherName)));
  const uniqueSubstitutes = Array.from(new Set(displayedAssignments.map(a => a.substituteTeacherName)));

  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    setNoticeMessage('Generando documento PDF oficial de alta resolución...');
    try {
      generateSummaryPdf({
        date,
        dayOfWeek,
        assignments,
        selectedSection
      });
      setNoticeMessage('✅ PDF oficial generado y descargado correctamente en formato vectorial nítido.');
      setTimeout(() => setNoticeMessage(null), 7000);
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      setNoticeMessage('No se pudo generar el archivo PDF: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      // Browsers block window.print() inside sandboxed iframes.
      // Automatically download high-res vector PDF and notify user!
      handleDownloadPdf();
      return;
    }

    try {
      window.print();
    } catch {
      handleDownloadPdf();
    }
  };

  const handleShareSummary = () => {
    const sectionName =
      selectedSection === 'Primaria'
        ? 'Sección Primaria (1° a 5°)'
        : selectedSection === 'Bachillerato'
        ? 'Sección Bachillerato (6° a 11°)'
        : 'General (Primaria y Bachillerato)';

    let summaryText = `*FUNDACIÓN COLEGIO BILINGÜE DE VALLEDUPAR*\n`;
    summaryText += `*Planilla Oficial de Reemplazos — ${sectionName}*\n`;
    summaryText += `📅 *Fecha:* ${dayLabel}, ${date}\n`;
    summaryText += `📊 *Total Suplencias:* ${displayedAssignments.length} horas asignadas\n\n`;

    displayedAssignments.forEach((a, index) => {
      const aSec = (a.section || getGradeSection(a.grade)) === 'Primaria' ? 'Primaria' : 'Bachillerato';
      summaryText += `${index + 1}. *Periodo ${a.period}* (${a.timeRange}) · [${aSec}]\n`;
      summaryText += `   • Grado: ${a.grade} | Asignatura: ${a.subject}\n`;
      summaryText += `   • Titular Ausente: ${a.absentTeacherName}\n`;
      summaryText += `   • Suplente: *${a.substituteTeacherName}*\n`;
      if (a.activityPlan) summaryText += `   • Actividad: ${a.activityPlan}\n`;
      summaryText += `\n`;
    });

    summaryText += `_Coordinación Académica - FCBV_`;

    const encoded = encodeURIComponent(summaryText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const renderSectionTable = (
    items: ReplacementAssignment[],
    sectionName: string,
    badgeText: string,
    badgeStyle: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between bg-neutral-100 px-3.5 py-2 border border-neutral-300 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${badgeStyle}`}>
              {badgeText}
            </span>
            <span className="font-bold text-xs text-neutral-900">
              {sectionName}
            </span>
          </div>
          <span className="text-[11px] text-neutral-600 font-mono">
            {items.length} {items.length === 1 ? 'hora de reemplazo' : 'horas de reemplazo'}
          </span>
        </div>

        <table className="w-full border-collapse text-left text-xs border border-t-0 border-neutral-300 rounded-b-lg overflow-hidden">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-300 text-neutral-700 font-bold">
              <th className="py-2 px-3 w-28 border-r border-neutral-300">Periodo / Hora</th>
              <th className="py-2 px-3 w-20 border-r border-neutral-300 text-center">Grado</th>
              <th className="py-2 px-3 border-r border-neutral-300">Asignatura</th>
              <th className="py-2 px-3 border-r border-neutral-300">Docente Titular (Ausente)</th>
              <th className="py-2 px-3 border-r border-neutral-300 bg-blue-50/70 text-blue-950 font-bold">
                Docente Reemplazante
              </th>
              <th className="py-2 px-3 border-r border-neutral-300">Plan / Instrucciones</th>
              <th className="py-2 px-3 w-28 text-center">Firma Recibido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {items.map((a, index) => (
              <tr key={a.id} className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/40'}>
                <td className="py-2 px-3 font-mono border-r border-neutral-200">
                  <div className="font-bold text-neutral-900">Periodo {a.period}</div>
                  <div className="text-[10px] text-neutral-500">{a.timeRange}</div>
                </td>
                <td className="py-2 px-3 font-bold text-center border-r border-neutral-200 text-neutral-900">
                  {a.grade}
                </td>
                <td className="py-2 px-3 font-semibold border-r border-neutral-200 text-neutral-800">
                  {a.subject}
                </td>
                <td className="py-2 px-3 border-r border-neutral-200 text-neutral-700">
                  {a.absentTeacherName}
                </td>
                <td className="py-2 px-3 border-r border-neutral-200 font-bold text-blue-900 bg-blue-50/30">
                  {a.substituteTeacherName}
                  <span className="text-[10px] block text-neutral-500 font-normal">
                    {a.substituteDepartment}
                  </span>
                </td>
                <td className="py-2 px-3 border-r border-neutral-200 text-[11px] text-neutral-600 italic">
                  {a.activityPlan || 'Seguimiento temario de aula'}
                </td>
                <td className="py-2 px-3 text-center align-middle">
                  <div className="h-6 border-b border-neutral-300 mx-2"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-4xl w-full border border-neutral-200 dark:border-neutral-800 overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Modal Controls Bar (hidden during print) */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 print:hidden shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <School className="w-5 h-5 text-blue-900 dark:text-blue-400 shrink-0" />
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm truncate">
                  {title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {dayLabel}, {date} · {displayedAssignments.length} reemplazos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                onClick={handleShareSummary}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">WhatsApp</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                title="Descargar archivo PDF oficial para imprimir o archivar"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900 dark:text-blue-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                )}
                <span>{isExportingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
              </button>
              <button
                onClick={handlePrint}
                disabled={isExportingPdf}
                className="px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Planilla</span>
              </button>
              <button
                onClick={onClose}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar</span>
              </button>
            </div>
          </div>

          {/* Feedback Notice Banner */}
          {noticeMessage && (
            <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs px-3 py-2 rounded-lg flex items-center justify-between gap-2 shadow-2xs animate-fade-in">
              <span className="font-medium">{noticeMessage}</span>
              <button
                onClick={() => setNoticeMessage(null)}
                className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section Filter Pills for Printing */}
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mr-1">Filtrar para impresión:</span>
            <button
              onClick={() => setSelectedSection('all')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedSection === 'all'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              Todas las Secciones ({sortedAssignments.length})
            </button>
            <button
              onClick={() => setSelectedSection('Primaria')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedSection === 'Primaria'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-700 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              🎒 Primaria ({primariaAssignments.length})
            </button>
            <button
              onClick={() => setSelectedSection('Bachillerato')}
              className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedSection === 'Bachillerato'
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-200 font-bold border border-indigo-300 dark:border-indigo-700 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              🎓 Bachillerato ({bachilleratoAssignments.length})
            </button>
          </div>
        </div>

        {/* Scrollable Printable Section */}
        <div id="printable-summary" className="p-8 bg-white print:p-4 text-neutral-900 overflow-y-auto flex-1">
          {/* Institution Header */}
          <div className="border-b-2 border-neutral-800 pb-4 mb-5 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="/logo_320x320.png"
                alt="Logo Fundación Colegio Bilingüe de Valledupar"
                className="w-12 h-12 rounded-full object-contain border border-amber-600/50 bg-white shadow-2xs"
              />
              <div>
                <h1 className="text-lg font-bold tracking-tight uppercase text-neutral-900">
                  Fundación Colegio Bilingüe de Valledupar
                </h1>
                <p className="text-xs text-neutral-600 font-medium">
                  Coordinación Académica · Planilla Oficial de Reemplazos y Cobertura Docente
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 mt-1 bg-neutral-100 px-4 py-1 rounded text-xs font-bold uppercase tracking-wider text-neutral-800 border border-neutral-200">
              <span>Año Lectivo 2026/2027</span>
              <span>·</span>
              <span>{dayLabel.toUpperCase()}, {date}</span>
              {selectedSection !== 'all' && (
                <>
                  <span>·</span>
                  <span className={selectedSection === 'Primaria' ? 'text-amber-800' : 'text-indigo-800'}>
                    SECCIÓN {selectedSection.toUpperCase()} ({selectedSection === 'Primaria' ? 'GRADOS 1° A 5°' : 'GRADOS 6° A 11°'})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
            <div className="border border-neutral-300 bg-white rounded-lg p-3 shadow-2xs">
              <span className="text-neutral-600 block text-[11px] font-medium">Total Clases Asignadas:</span>
              <span className="font-bold text-base font-mono text-neutral-900 block mt-0.5">
                {displayedAssignments.length} horas lectivas
              </span>
            </div>
            <div className="border border-neutral-300 bg-white rounded-lg p-3 shadow-2xs">
              <span className="text-neutral-600 block text-[11px] font-medium">Docentes Titulares Ausentes:</span>
              <span className="font-bold text-sm text-red-700 block mt-0.5 truncate" title={uniqueAbsent.join(', ')}>
                {uniqueAbsent.length} ({uniqueAbsent.join(', ') || 'Ninguno'})
              </span>
            </div>
            <div className="border border-neutral-300 bg-white rounded-lg p-3 shadow-2xs">
              <span className="text-neutral-600 block text-[11px] font-medium">Docentes Suplentes Activados:</span>
              <span className="font-bold text-sm text-emerald-700 block mt-0.5 truncate" title={uniqueSubstitutes.join(', ')}>
                {uniqueSubstitutes.length} {uniqueSubstitutes.length === 1 ? 'docente' : 'docentes'}
              </span>
            </div>
          </div>

          {/* Separated Section Tables */}
          {displayedAssignments.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 border border-dashed rounded-lg">
              No hay reemplazos registrados para esta sección.
            </div>
          ) : selectedSection === 'all' ? (
            <div>
              {renderSectionTable(
                primariaAssignments,
                'Horarios de Reemplazo — Grados 1° a 5° (Primaria)',
                'Sección Primaria',
                'bg-amber-100 text-amber-950 border-amber-300'
              )}

              {renderSectionTable(
                bachilleratoAssignments,
                'Horarios de Reemplazo — Grados 6° a 11° (Bachillerato)',
                'Sección Bachillerato',
                'bg-indigo-100 text-indigo-950 border-indigo-300'
              )}
            </div>
          ) : (
            <div>
              {selectedSection === 'Primaria' &&
                renderSectionTable(
                  primariaAssignments,
                  'Planilla Oficial de Reemplazos — Grados 1° a 5° (Primaria)',
                  'Sección Primaria',
                  'bg-amber-100 text-amber-950 border-amber-300'
                )}

              {selectedSection === 'Bachillerato' &&
                renderSectionTable(
                  bachilleratoAssignments,
                  'Planilla Oficial de Reemplazos — Grados 6° a 11° (Bachillerato)',
                  'Sección Bachillerato',
                  'bg-indigo-100 text-indigo-950 border-indigo-300'
                )}
            </div>
          )}

          {/* Institutional Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-6 border-t border-neutral-300 text-center text-xs">
            <div>
              <div className="h-12 border-b border-dashed border-neutral-400"></div>
              <p className="font-bold text-neutral-900 mt-2">
                Coordinación Académica {selectedSection === 'Primaria' ? 'Primaria' : selectedSection === 'Bachillerato' ? 'Bachillerato' : ''}
              </p>
              <p className="text-[11px] text-neutral-500">Fundación Colegio Bilingüe de Valledupar</p>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-neutral-400"></div>
              <p className="font-bold text-neutral-900 mt-2">Supervisión / Control de Aulas</p>
              <p className="text-[11px] text-neutral-500">Verificación de Cobertura Efectiva</p>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-neutral-400 font-mono">
            Planilla Oficial emitida por ReemplazaDocente · FCBV Valledupar {new Date().getFullYear()}
          </div>
        </div>

        {/* Bottom Footer Bar (hidden during print) */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between print:hidden shrink-0">
          <span className="text-xs text-neutral-500 hidden sm:inline">
            Presiona <kbd className="px-1.5 py-0.5 bg-neutral-200 rounded border border-neutral-300 font-mono text-[10px]">Esc</kbd> o haz clic en Cerrar para volver
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
              ) : (
                <Download className="w-4 h-4 text-blue-900" />
              )}
              <span>{isExportingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isExportingPdf}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Planilla</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-neutral-800 bg-neutral-200 hover:bg-neutral-300 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <X className="w-4 h-4" />
              <span>Cerrar Ventana</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
