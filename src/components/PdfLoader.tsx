import React, { useState } from 'react';
import {
  FileUp,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  School,
  FileText,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Database,
  Loader2,
  Lock
} from 'lucide-react';
import { Teacher, ScheduleVersionInfo, AppUser } from '../types';
import { parsePdfSchedule } from '../utils/pdfParser';
import { INITIAL_TEACHERS } from '../data/defaultSchedule';
import { DEFAULT_SCHEDULE_VERSION, createLocalBackupApi } from '../utils/storage';

interface PdfLoaderProps {
  teachers: Teacher[];
  scheduleVersion: ScheduleVersionInfo;
  currentUser?: AppUser | null;
  onUpdateTeachers: (newTeachers: Teacher[]) => Promise<void> | void;
  onUpdateScheduleVersion: (version: ScheduleVersionInfo) => void;
  onNavigateToHub: () => void;
}

export const PdfLoader: React.FC<PdfLoaderProps> = ({
  teachers,
  scheduleVersion,
  currentUser,
  onUpdateTeachers,
  onUpdateScheduleVersion,
  onNavigateToHub
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    backupName?: string;
    teachersCount: number;
    slotsCount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Por favor sube un archivo en formato PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    const operatorName = currentUser
      ? `${currentUser.name} (${currentUser.username})`
      : 'Administrador del Sistema';

    try {
      // Step 1: Automatic Preventive Backup before replacing schedule
      setProcessingStep('Paso 1/3: Creando copia de seguridad preventiva de la base de datos...');
      let backupFilename: string | undefined = undefined;
      try {
        const backupRes = await createLocalBackupApi(
          operatorName,
          `Backup automático preventivo antes de cargar nuevo horario "${file.name}"`
        );
        if (backupRes.ok && backupRes.filename) {
          backupFilename = backupRes.filename;
        }
      } catch (backupErr) {
        console.warn('Backup creation notice:', backupErr);
      }

      // Step 2: Spatial & Text PDF Grid Analysis
      setProcessingStep('Paso 2/3: Analizando docentes y cuadrículas de horario desde aSc Timetables...');
      const result = await parsePdfSchedule(file);

      // Step 3: Synchronize with SQLite Database and App state
      setProcessingStep('Paso 3/3: Guardando nuevos docentes y horarios en la base de datos...');
      await onUpdateTeachers(result.teachers);

      const newVersionInfo: ScheduleVersionInfo = {
        versionName: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        uploadedAt: new Date().toLocaleString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        source: 'uploaded_pdf',
        pagesProcessed: result.pagesProcessed,
        teachersCount: result.teachers.length,
        academicYear: result.academicYear || '2026/2027'
      };

      onUpdateScheduleVersion(newVersionInfo);

      setSuccessInfo({
        message: `¡Horario y nómina docente actualizados con éxito desde "${file.name}"!`,
        backupName: backupFilename,
        teachersCount: result.teachers.length,
        slotsCount: result.totalSlotsExtracted
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        `Error al procesar el archivo PDF: ${err.message || 'Formato no soportado'}. Puedes restaurar el horario oficial predeterminado abajo.`
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRestoreDefault = async () => {
    setIsProcessing(true);
    setProcessingStep('Restaurando horario oficial verificado...');
    try {
      await onUpdateTeachers(INITIAL_TEACHERS);
      onUpdateScheduleVersion(DEFAULT_SCHEDULE_VERSION);
      setSuccessInfo({
        message: 'Se ha restaurado el horario oficial de la Fundación Colegio Bilingüe de Valledupar (37 docentes, año 2026/2027).',
        teachersCount: INITIAL_TEACHERS.length,
        slotsCount: INITIAL_TEACHERS.reduce((acc, t) => acc + t.slots.length, 0)
      });
      setErrorMessage(null);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const totalClasses = teachers.reduce((acc, t) => acc + t.slots.filter(s => !s.isMeeting).length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Carga y Actualización del Horario Escolar en PDF
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            El sistema realiza una copia de seguridad preventiva automática de la base de datos, analiza los nombres de los docentes, departamentos y cuadrículas semanales de <em>aSc Timetables</em>, y actualiza todos los módulos en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-lg px-3 py-1.5 text-xs text-blue-900 dark:text-blue-300">
          <Database className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>Backup automático activo previo a cada carga</span>
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Fundación Colegio Bilingüe de Valledupar
              </span>
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {scheduleVersion.source === 'uploaded_pdf' ? 'PDF Personalizado Activo' : 'Horario Oficial Activo'}
              </span>
            </div>
            
            {/* Active Schedule Version pill */}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 font-medium">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Versión activa: <strong>{scheduleVersion.fileName || scheduleVersion.versionName}</strong></span>
              {scheduleVersion.uploadedAt && (
                <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">({scheduleVersion.uploadedAt})</span>
              )}
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>Año Lectivo: <strong className="text-neutral-700 dark:text-neutral-200">{scheduleVersion.academicYear || '2026/2027'}</strong></span>
              <span>·</span>
              <span>Total Docentes: <strong className="text-neutral-700 dark:text-neutral-200">{teachers.length}</strong></span>
              <span>·</span>
              <span>Horas de Clase Semanales: <strong className="text-neutral-700 dark:text-neutral-200">{totalClasses}</strong></span>
              <span>·</span>
              <span>Motor: <strong className="text-neutral-700 dark:text-neutral-200">aSc Timetables v1.8</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRestoreDefault}
            disabled={isProcessing}
            className="px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Recargar Horario Oficial FCBV</span>
          </button>
          <button
            onClick={onNavigateToHub}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Ir a Asignar Reemplazos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications and Progress */}
      {isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex items-center gap-3 text-blue-950 dark:text-blue-200 text-xs shadow-xs animate-pulse">
          <Loader2 className="w-5 h-5 text-blue-700 dark:text-blue-400 animate-spin shrink-0" />
          <div>
            <span className="font-bold text-sm block">Procesando horario escolar...</span>
            <span className="text-blue-800/90 dark:text-blue-300/90 font-medium">{processingStep}</span>
          </div>
        </div>
      )}

      {successInfo && !isProcessing && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2 text-emerald-950 dark:text-emerald-200 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-sm">{successInfo.message}</span>
          </div>
          <div className="pl-7 space-y-1 text-emerald-900/90 dark:text-emerald-300/90">
            {successInfo.backupName && (
              <p className="flex items-center gap-1.5">
                <span>🛡️ <strong>Copia de seguridad preventiva creada:</strong></span>
                <code className="font-mono bg-white/80 dark:bg-neutral-800 px-1 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-bold">
                  {successInfo.backupName}
                </code>
              </p>
            )}
            <p>
              📊 Se sincronizaron <strong>{successInfo.teachersCount} profesores</strong> y <strong>{successInfo.slotsCount} bloques semanales</strong> en la base de datos SQLite y en la interfaz.
            </p>
          </div>
        </div>
      )}

      {errorMessage && !isProcessing && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-900 dark:text-red-200 text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
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
            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
            : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600'
        }`}
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center mx-auto">
            <FileUp className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Cargar Nuevo Horario en PDF (aSc Timetables)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Arrastra y suelta aquí el archivo PDF con los horarios de clase o selecciónalo desde tu computador. Se creará un backup automático antes de sustituir la malla.
            </p>
          </div>

          <div>
            <label className={`inline-block px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-xs ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
              {isProcessing ? 'Procesando archivo...' : 'Seleccionar Archivo PDF'}
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

          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Respaldo automático previo en SQLite y cálculo instantáneo de disponibilidad</span>
          </div>
        </div>
      </div>

      {/* Verified Schedule Breakdown */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Malla Docente Cargada ({teachers.length} Profesores)
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Horario activo para la detección automática de ausencias y cálculo de suplentes
            </p>
          </div>
          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            {totalClasses} bloques lectivos
          </span>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[500px] overflow-y-auto">
          {teachers.map((teacher, index) => {
            const classSlots = teacher.slots.filter(s => !s.isMeeting).length;
            const meetingSlots = teacher.slots.filter(s => s.isMeeting).length;

            return (
              <div
                key={teacher.id}
                className="p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-neutral-400 dark:text-neutral-500 w-6 text-center text-[11px]">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                      {teacher.name}
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {teacher.department} · {teacher.section}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 block tabular-nums">
                      {classSlots} horas/semana
                    </span>
                    {meetingSlots > 0 && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block">
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
