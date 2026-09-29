import React, { useState } from 'react';
import { FileUp, CheckCircle, AlertCircle, RefreshCw, School, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { Teacher } from '../types';
import { parsePdfSchedule } from '../utils/pdfParser';
import { INITIAL_TEACHERS } from '../data/defaultSchedule';

interface PdfLoaderProps {
  teachers: Teacher[];
  onUpdateTeachers: (newTeachers: Teacher[]) => void;
  onNavigateToHub: () => void;
}

export const PdfLoader: React.FC<PdfLoaderProps> = ({
  teachers,
  onUpdateTeachers,
  onNavigateToHub
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Por favor sube un archivo en formato PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await parsePdfSchedule(file);
      onUpdateTeachers(result.teachers);
      setSuccessMessage(
        `¡PDF procesado exitosamente! Se analizaron ${result.pagesProcessed} páginas del horario escolar aSc Timetables y se actualizaron ${result.teachers.length} profesores.`
      );
    } catch (err: any) {
      console.error(err);
      // If error or unhandled format, allow fallback to official verified dataset
      setErrorMessage(
        `Error al leer el archivo PDF: ${err.message || 'Formato no soportado'}. Puedes restaurar los datos verificados del colegio abajo.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRestoreDefault = () => {
    onUpdateTeachers(INITIAL_TEACHERS);
    setSuccessMessage(
      'Se ha restaurado el horario oficial de la Fundación Colegio Bilingüe de Valledupar (37 docentes, año 2026/2027).'
    );
    setErrorMessage(null);
  };

  const totalClasses = teachers.reduce((acc, t) => acc + t.slots.filter(s => !s.isMeeting).length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Carga y Sincronización del Horario en PDF
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          La aplicación extrae las mallas curriculares y horarios por profesor desde el archivo PDF generado en aSc Timetables para calcular automáticamente las disponibilidades de cada periodo.
        </p>
      </div>

      {/* Status Banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-neutral-900">
                Fundación Colegio Bilingüe de Valledupar
              </span>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Cargado y Activo
              </span>
            </div>
            <div className="text-xs text-neutral-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>Año Lectivo: <strong>2026/2027</strong></span>
              <span>·</span>
              <span>Total Docentes: <strong>{teachers.length}</strong></span>
              <span>·</span>
              <span>Horas de Clase Semanales: <strong>{totalClasses}</strong></span>
              <span>·</span>
              <span>Motor: <strong>aSc Timetables v1.8</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRestoreDefault}
            className="px-3 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
            <span>Recargar Horario Oficial FCBV</span>
          </button>
          <button
            onClick={onNavigateToHub}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Ir a Asignar Reemplazos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3 text-emerald-900 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-900 text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
          dragActive
            ? 'border-blue-600 bg-blue-50/50'
            : 'border-neutral-300 bg-white hover:border-neutral-400'
        }`}
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center mx-auto">
            <FileUp className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Cargar Horario en PDF (aSc Timetables)
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Arrastra y suelta aquí el archivo PDF con los horarios de clase o selecciónalo desde tu computador.
            </p>
          </div>

          <div>
            <label className="inline-block px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors shadow-xs">
              {isProcessing ? 'Analizando archivo PDF...' : 'Seleccionar Archivo PDF'}
              <input
                type="file"
                accept=".pdf"
                disabled={isProcessing}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Procesamiento local seguro y cálculo instantáneo</span>
          </div>
        </div>
      </div>

      {/* Verified Schedule Breakdown */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-neutral-900">
              Malla Docente Cargada ({teachers.length} Profesores)
            </h3>
            <p className="text-[11px] text-neutral-500">
              Horario activo para la detección automática de ausencias y cálculo de suplentes
            </p>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            {totalClasses} bloques lectivos
          </span>
        </div>

        <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
          {teachers.map((teacher, index) => {
            const classSlots = teacher.slots.filter(s => !s.isMeeting).length;
            const meetingSlots = teacher.slots.filter(s => s.isMeeting).length;

            return (
              <div
                key={teacher.id}
                className="p-3.5 hover:bg-neutral-50 flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-neutral-400 w-6 text-center text-[11px]">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-bold text-neutral-900 block">
                      {teacher.name}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {teacher.department} · {teacher.section}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="font-mono font-bold text-neutral-800 block tabular-nums">
                      {classSlots} horas/semana
                    </span>
                    {meetingSlots > 0 && (
                      <span className="text-[10px] text-amber-700 block">
                        +{meetingSlots} h reunión/PLC
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
