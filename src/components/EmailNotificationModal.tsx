import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mail,
  ExternalLink,
  Settings,
  Users,
  RefreshCw,
  X,
  Send,
  HelpCircle
} from 'lucide-react';
import { EmailNotificationResult, ReplacementAssignment } from '../types';

export interface EmailModalData {
  isOpen: boolean;
  sentCount: number;
  skippedCount: number;
  reason?: string;
  results: EmailNotificationResult[];
  assignments: ReplacementAssignment[];
  isLoading?: boolean;
}

interface EmailNotificationModalProps {
  data: EmailModalData | null;
  onClose: () => void;
  onRetry: (assignments: ReplacementAssignment[]) => void;
  onNavigateToSmtp: () => void;
  onNavigateToTeachers: () => void;
}

export const EmailNotificationModal: React.FC<EmailNotificationModalProps> = ({
  data,
  onClose,
  onRetry,
  onNavigateToSmtp,
  onNavigateToTeachers
}) => {
  if (!data || !data.isOpen) return null;

  const { sentCount, skippedCount, reason, results, assignments, isLoading } = data;
  const failedResults = results.filter(r => !r.success && r.recipient !== '(sin correo)');
  const noEmailResults = results.filter(r => !r.success && (!r.recipient || r.recipient === '(sin correo)'));
  const successResults = results.filter(r => r.success);

  const hasAnySuccess = sentCount > 0 || successResults.length > 0;
  const hasSmtpIssue = Boolean(reason) || failedResults.length > 0;
  const hasMissingEmails = skippedCount > 0 || noEmailResults.length > 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-xl w-full border border-neutral-200 dark:border-neutral-800 overflow-hidden my-6 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                hasAnySuccess && !hasSmtpIssue
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                  : hasSmtpIssue
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400'
              }`}
            >
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Estado de Notificaciones por Correo Electrónico
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Aviso automático enviado a los docentes designados para suplencia
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Main Status Banner */}
          {reason ? (
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-sm block">Servidor SMTP No Configurado o Deshabilitado</span>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  {reason}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToSmtp();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configurar Servidor SMTP (Gmail)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : hasAnySuccess && failedResults.length === 0 && noEmailResults.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex gap-3 text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block">¡Notificaciones Enviadas con Éxito!</span>
                <p className="text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                  Se enviaron {sentCount} correo(s) a los docentes suplentes con todos los detalles de la hora, materia, grado e instrucciones del reemplazo.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-1 text-blue-900 dark:text-blue-200">
              <span className="font-bold text-sm block">Resumen del Envío de Correos</span>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-bold rounded-md">
                  ✅ Enviados: {sentCount}
                </span>
                {skippedCount > 0 && (
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 font-bold rounded-md">
                    ⚠️ Sin correo: {skippedCount}
                  </span>
                )}
                {failedResults.length > 0 && (
                  <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/80 text-red-800 dark:text-red-200 font-bold rounded-md">
                    ❌ Fallidos: {failedResults.length}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Detailed list per recipient */}
          <div className="space-y-2">
            <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-xs uppercase tracking-wider">
              Detalle por Docente Suplente:
            </h4>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-50/50 dark:bg-neutral-850/50">
              {results.length === 0 && assignments.length > 0 ? (
                assignments.map((a, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                        {a.substituteTeacherName}
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Periodo {a.period} · {a.subject} ({a.grade})
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 italic">Pendiente de envío SMTP</span>
                  </div>
                ))
              ) : (
                results.map((res, index) => (
                  <div
                    key={index}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          {res.teacherName}
                        </span>
                        {res.success ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800">
                            Enviado
                          </span>
                        ) : res.recipient === '(sin correo)' ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800">
                            Sin Correo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 rounded border border-red-300 dark:border-red-800">
                            Error SMTP
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono">
                        {res.recipient}
                      </div>

                      {res.error && (
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-sans mt-0.5">
                          {res.error}
                        </p>
                      )}
                    </div>

                    {!res.success && res.recipient === '(sin correo)' && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToTeachers();
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md transition-colors self-start sm:self-auto shrink-0"
                      >
                        Asignar Correo →
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Help / Info for Gmail */}
          {hasSmtpIssue && (
            <div className="bg-neutral-100 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>¿Cómo activar el envío automático por Gmail?</span>
              </div>
              <p>
                1. En tu cuenta de Google (Gmail institucional), activa la <strong>Verificación en 2 pasos</strong>.
              </p>
              <p>
                2. Genera una <strong>Contraseña de Aplicación</strong> de 16 caracteres en <em>Seguridad &gt; Contraseñas de aplicaciones</em>.
              </p>
              <p>
                3. Ingresa esa clave en <strong>Administración &gt; Servidor de Correo (SMTP)</strong> y guarda los cambios.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
          <div className="flex items-center gap-2">
            {(hasSmtpIssue || hasMissingEmails) && assignments.length > 0 && (
              <button
                onClick={() => onRetry(assignments)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Reintentar Envío</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-neutral-200 dark:bg-neutral-750 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
