import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle, Share2, School, Calendar, Clock, BookOpen, User, Download, Loader2 } from 'lucide-react';
import { generateSlipPdf } from '../utils/pdfGenerator';
import { ReplacementAssignment, Teacher, DAYS_CONFIG } from '../types';

interface PrintSlipModalProps {
  assignment: ReplacementAssignment | null;
  absentTeacher?: Teacher;
  substituteTeacher?: Teacher;
  onClose: () => void;
}

export const PrintSlipModal: React.FC<PrintSlipModalProps> = ({
  assignment,
  absentTeacher,
  substituteTeacher,
  onClose
}) => {
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

  if (!assignment) return null;

  const dayLabel = DAYS_CONFIG.find(d => d.id === assignment.dayOfWeek)?.labelEs || assignment.dayOfWeek;

  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    setNoticeMessage('Generando volante oficial en PDF de alta resolución...');
    try {
      generateSlipPdf({
        assignment,
        absentTeacher,
        substituteTeacher
      });
      setNoticeMessage('✅ Volante PDF oficial descargado correctamente.');
      setTimeout(() => setNoticeMessage(null), 6000);
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      setNoticeMessage('No se pudo generar el volante PDF: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      handleDownloadPdf();
      return;
    }

    try {
      window.print();
    } catch {
      handleDownloadPdf();
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*FUNDACIÓN COLEGIO BILINGÜE DE VALLEDUPAR*
*Asignación Oficial de Reemplazo Docente*
📅 *Fecha:* ${dayLabel}, ${assignment.date}
⏰ *Periodo:* Periodo ${assignment.period} (${assignment.timeRange})
📚 *Asignatura:* ${assignment.subject}
🏫 *Grupo:* ${assignment.grade}
👤 *Docente Titular:* ${assignment.absentTeacherName}
✅ *Docente Suplente Asignado:* ${assignment.substituteTeacherName}
📝 *Instrucciones / Actividad:* ${assignment.activityPlan || 'Seguimiento curricular en aula'}

Por favor presentarse puntualmente en el aula de clase.`;

    const encoded = encodeURIComponent(text);
    const phone = substituteTeacher?.phone ? substituteTeacher.phone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Modal Controls Bar (hidden during browser print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 print:hidden shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <School className="w-5 h-5 text-blue-900 dark:text-blue-400 shrink-0" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm truncate">
              <span className="sm:hidden">Volante de Reemplazo</span>
              <span className="hidden sm:inline">Volante Oficial de Reemplazo Docente</span>
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShareWhatsApp}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">WhatsApp</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Descargar archivo PDF oficial del volante"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-900 dark:text-blue-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
              )}
              <span>{isExportingPdf ? 'Generando...' : 'Descargar PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isExportingPdf}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
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

        {/* Notice Message */}
        {noticeMessage && (
          <div className="bg-blue-50 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs px-4 py-2 flex items-center justify-between gap-2 shadow-2xs">
            <span className="font-medium">{noticeMessage}</span>
            <button
              onClick={() => setNoticeMessage(null)}
              className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Printable Voucher Section */}
        <div id="printable-slip" className="p-8 bg-white print:p-6 text-neutral-900 overflow-y-auto flex-1">
          {/* Header */}
          <div className="border-b-2 border-neutral-800 pb-5 mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="/logo_320x320.png"
                alt="Logo Fundación Colegio Bilingüe de Valledupar"
                className="w-14 h-14 rounded-full object-contain border border-amber-600/50 bg-white shadow-2xs"
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight uppercase text-neutral-900">
                  Fundación Colegio Bilingüe de Valledupar
                </h1>
                <p className="text-xs text-neutral-600 font-medium">
                  Coordinación Académica · Año Lectivo 2026/2027
                </p>
              </div>
            </div>
            <div className="inline-block mt-2 bg-neutral-100 px-4 py-1 rounded text-xs font-semibold uppercase tracking-wider text-neutral-800 border border-neutral-200">
              Orden Oficial de Cobertura y Reemplazo de Clase
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
              <span className="text-neutral-500 block mb-1">Docente Titular Ausente:</span>
              <span className="font-bold text-neutral-900 text-sm block">
                {assignment.absentTeacherName}
              </span>
              <span className="text-neutral-500 text-[11px] block mt-0.5">
                {absentTeacher?.department || 'Docente Titular'}
              </span>
            </div>

            <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3">
              <span className="text-blue-700 block mb-1 font-medium">Docente Reemplazante Designado:</span>
              <span className="font-bold text-blue-950 text-sm block">
                {assignment.substituteTeacherName}
              </span>
              <span className="text-blue-700 text-[11px] block mt-0.5">
                {assignment.substituteDepartment}
              </span>
            </div>
          </div>

          {/* Class Details Table */}
          <table className="w-full border-collapse border border-neutral-300 text-xs mb-6">
            <tbody>
              <tr className="border-b border-neutral-200 bg-neutral-100/75">
                <th className="p-2.5 text-left font-semibold text-neutral-700 w-1/3 border-r border-neutral-300">
                  Fecha y Día:
                </th>
                <td className="p-2.5 font-medium text-neutral-900">
                  {dayLabel}, {assignment.date}
                </td>
              </tr>
              <tr className="border-b border-neutral-200">
                <th className="p-2.5 text-left font-semibold text-neutral-700 border-r border-neutral-300">
                  Periodo y Horario:
                </th>
                <td className="p-2.5 font-mono text-neutral-900 font-semibold">
                  Periodo {assignment.period} · {assignment.timeRange}
                </td>
              </tr>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <th className="p-2.5 text-left font-semibold text-neutral-700 border-r border-neutral-300">
                  Grado / Curso:
                </th>
                <td className="p-2.5 font-bold text-neutral-900">
                  Grado {assignment.grade}
                </td>
              </tr>
              <tr className="border-b border-neutral-200">
                <th className="p-2.5 text-left font-semibold text-neutral-700 border-r border-neutral-300">
                  Asignatura:
                </th>
                <td className="p-2.5 font-medium text-neutral-900">
                  {assignment.subject}
                </td>
              </tr>
              <tr>
                <th className="p-2.5 text-left font-semibold text-neutral-700 border-r border-neutral-300">
                  Plan de Trabajo / Indicaciones:
                </th>
                <td className="p-2.5 text-neutral-800 italic">
                  {assignment.activityPlan || 'Seguimiento normal de temática programada. Mantener orden y disciplina en el aula.'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Criteria & Compatibility Note */}
          <div className="mb-8 p-3 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 bg-neutral-50/30">
            <span className="font-semibold text-neutral-800">Criterios de Asignación Automática:</span>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {assignment.matchReasons.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  ✓ {r}
                </span>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-6 border-t border-neutral-300 text-center text-xs">
            <div>
              <div className="h-14 border-b border-dashed border-neutral-400"></div>
              <p className="font-bold text-neutral-900 mt-2">Coordinación Académica</p>
              <p className="text-[11px] text-neutral-500">Fundación Colegio Bilingüe de Valledupar</p>
            </div>
            <div>
              <div className="h-14 border-b border-dashed border-neutral-400"></div>
              <p className="font-bold text-neutral-900 mt-2">{assignment.substituteTeacherName}</p>
              <p className="text-[11px] text-neutral-500">Docente Reemplazante (Firma de Recibido)</p>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-neutral-400 font-mono">
            ID de Asignación: {assignment.id} · Generado automáticamente por ReemplazaDocente
          </div>
        </div>

        {/* Bottom Controls Bar (hidden during browser print) */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between print:hidden shrink-0">
          <span className="text-xs text-neutral-500 hidden sm:inline">
            Presiona <kbd className="px-1.5 py-0.5 bg-neutral-200 rounded border border-neutral-300 font-mono text-[10px]">Esc</kbd> o haz clic en Cerrar para volver al sistema
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
              <span>Imprimir Volante</span>
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

