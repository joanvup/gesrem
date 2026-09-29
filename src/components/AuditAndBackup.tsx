import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  History,
  Download,
  Upload,
  Database,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Clock,
  User,
  ArrowRight,
  HardDriveDownload,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { AuditLogEntry, BackupPoint } from '../types';
import {
  fetchAuditLogsApi,
  createLocalBackupApi,
  fetchLocalBackupsListApi,
  restoreLocalBackupApi,
  restoreUploadBackupApi,
  downloadSqliteBackup
} from '../utils/storage';

interface AuditAndBackupProps {
  onDatabaseRestored: () => Promise<void>;
}

export const AuditAndBackup: React.FC<AuditAndBackupProps> = ({ onDatabaseRestored }) => {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'backup'>('audit');
  
  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');

  // Backups State
  const [backups, setBackups] = useState<BackupPoint[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Custom user name for audit actions
  const [userName, setUserName] = useState<string>('Coordinación Académica');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'restore_local' | 'restore_upload';
    targetName?: string;
    fileToUpload?: File;
  }>({ isOpen: false, type: 'restore_local' });

  // Load audit logs
  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchAuditLogsApi(250);
      setLogs(data);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load backups list
  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const data = await fetchLocalBackupsListApi();
      setBackups(data);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadLogs();
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setActionInProgress('Creando copia de seguridad...');
    setStatusMessage(null);
    try {
      const filename = await createLocalBackupApi(userName);
      if (filename) {
        setStatusMessage({
          type: 'success',
          text: `Copia de seguridad creada con éxito: ${filename}`
        });
        await loadBackups();
        await loadLogs();
      } else {
        setStatusMessage({
          type: 'error',
          text: 'No se pudo generar la copia de seguridad.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al crear copia: ${err.message}`
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteRestore = async () => {
    if (!confirmModal.isOpen) return;
    setStatusMessage(null);
    setActionInProgress('Restaurando base de datos SQLite...');

    try {
      if (confirmModal.type === 'restore_local' && confirmModal.targetName) {
        const ok = await restoreLocalBackupApi(confirmModal.targetName, userName);
        if (ok) {
          setStatusMessage({
            type: 'success',
            text: `Base de datos restaurada correctamente desde el punto ${confirmModal.targetName}.`
          });
          await onDatabaseRestored();
          await loadBackups();
          await loadLogs();
        } else {
          setStatusMessage({
            type: 'error',
            text: 'Hubo un error al restaurar el archivo de respaldo seleccionado.'
          });
        }
      } else if (confirmModal.type === 'restore_upload' && confirmModal.fileToUpload) {
        const ok = await restoreUploadBackupApi(confirmModal.fileToUpload, userName);
        if (ok) {
          setStatusMessage({
            type: 'success',
            text: `Base de datos restaurada correctamente desde ${confirmModal.fileToUpload.name}.`
          });
          await onDatabaseRestored();
          await loadBackups();
          await loadLogs();
        } else {
          setStatusMessage({
            type: 'error',
            text: 'El archivo subido no es una base de datos SQLite válida o ocurrió un error.'
          });
        }
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error de restauración: ${err.message}`
      });
    } finally {
      setActionInProgress(null);
      setConfirmModal({ isOpen: false, type: 'restore_local' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfirmModal({
      isOpen: true,
      type: 'restore_upload',
      fileToUpload: file,
      targetName: file.name
    });
    // Reset file input value
    e.target.value = '';
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            CREACIÓN
          </span>
        );
      case 'UPDATE_STATUS':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            CAMBIO ESTADO
          </span>
        );
      case 'DELETE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
            ELIMINADO
          </span>
        );
      case 'CREATE_BACKUP':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            BACKUP CREADO
          </span>
        );
      case 'RESTORE_BACKUP':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            BD RESTAURADA
          </span>
        );
      case 'RESET_DATABASE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
            REINICIO BD
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
            {action}
          </span>
        );
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header and User Name */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-900" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Auditoría & Respaldo SQLite
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Registro cronológico inmutable de modificaciones en reemplazos (quién editó, qué cambió y fecha/hora) y gestión de copias de seguridad de la base de datos.
          </p>
        </div>

        {/* Responsible user badge */}
        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 shadow-2xs self-start md:self-auto">
          <User className="w-4 h-4 text-neutral-400" />
          <div className="text-xs">
            <span className="text-neutral-400 text-[10px] block">Usuario / Operador:</span>
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              className="font-semibold text-neutral-900 bg-transparent border-none text-xs focus:outline-none w-44"
              placeholder="Coordinación Académica"
            />
          </div>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs underline hover:no-underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'audit'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Log de Auditoría ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'backup'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Copias de Seguridad & Restauración</span>
        </button>
      </div>

      {/* TAB 1: AUDIT LOG */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs bg-white w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por profesor, periodo, detalle..."
                  className="w-full bg-transparent border-none text-neutral-800 focus:outline-none placeholder:text-neutral-400"
                />
              </div>

              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="border border-neutral-300 rounded-lg px-2.5 py-1 text-xs bg-white text-neutral-800 focus:outline-none"
              >
                <option value="all">Todas las acciones</option>
                <option value="CREATE">Creación de Reemplazo</option>
                <option value="UPDATE_STATUS">Cambio de Estado</option>
                <option value="DELETE">Eliminación</option>
                <option value="CREATE_BACKUP">Backups Creados</option>
                <option value="RESTORE_BACKUP">Restauraciones</option>
              </select>
            </div>

            <button
              onClick={loadLogs}
              disabled={loadingLogs}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg border border-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Actualizar Log</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-xs space-y-2">
                <History className="w-8 h-8 text-neutral-300 mx-auto" />
                <p>No se encontraron registros de auditoría para los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                      <th className="py-2.5 px-4 w-44">Fecha y Hora</th>
                      <th className="py-2.5 px-4 w-32">Acción</th>
                      <th className="py-2.5 px-4 w-44">Usuario / Editor</th>
                      <th className="py-2.5 px-4">Detalle de Modificación</th>
                      <th className="py-2.5 px-4 w-28 text-right">ID Entidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-sans">
                    {filteredLogs.map(item => (
                      <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-neutral-800 font-semibold">
                            <Clock className="w-3 h-3 text-neutral-400" />
                            <span>{formatTimestamp(item.timestamp)}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getActionBadge(item.action)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{item.userName}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-neutral-800 font-medium leading-relaxed">
                            {item.details}
                          </div>
                          {(item.previousValue || item.newValue) && (
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-mono">
                              {item.previousValue && (
                                <span className="bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                                  Antes: {item.previousValue}
                                </span>
                              )}
                              {item.previousValue && item.newValue && (
                                <ArrowRight className="w-3 h-3 text-neutral-400" />
                              )}
                              {item.newValue && (
                                <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                                  Ahora: {item.newValue}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-[10px] text-neutral-400 whitespace-nowrap truncate max-w-[120px]">
                          {item.entityId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BACKUPS & RESTORE */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Download Current Database */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-900 text-sm">
                  Descargar Copia (.sqlite)
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Descarga una copia completa e idéntica del archivo <code className="font-mono bg-neutral-100 px-1 rounded text-neutral-800">school_database.sqlite</code> a tu equipo con todos los datos y auditorías.
                </p>
              </div>

              <button
                onClick={downloadSqliteBackup}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>Descargar Base de Datos</span>
              </button>
            </div>

            {/* Card 2: Create Server Checkpoint */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-900 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-900 text-sm">
                  Crear Punto de Restauración
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Genera una instantánea protegida en la carpeta <code className="font-mono bg-neutral-100 px-1 rounded text-neutral-800">data/backups/</code> del servidor para volver a ella en cualquier momento.
                </p>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={actionInProgress !== null}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Crear Instantánea Ahora</span>
              </button>
            </div>

            {/* Card 3: Upload and Restore */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-900 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-900 text-sm">
                  Subir y Restaurar Archivo
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Restaura el sistema seleccionando un archivo <code className="font-mono bg-neutral-100 px-1 rounded text-neutral-800">.sqlite</code> previamente descargado. Se creará una copia de seguridad automática preventiva.
                </p>
              </div>

              <label className="w-full py-2 px-3 text-xs font-semibold text-neutral-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer text-center">
                <Upload className="w-4 h-4 text-amber-800" />
                <span>Seleccionar Archivo .sqlite</span>
                <input
                  type="file"
                  accept=".sqlite,.db"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Local Backups List */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">
                  Puntos de Restauración en el Servidor (data/backups/)
                </h3>
                <p className="text-xs text-neutral-500">
                  Instantáneas disponibles para restaurar con un solo clic.
                </p>
              </div>

              <button
                onClick={loadBackups}
                disabled={loadingBackups}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
                <span>Refrescar Lista</span>
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-xs">
                No hay puntos de restauración guardados aún en el servidor. Crea uno con el botón "Crear Instantánea Ahora".
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {backups.map(b => (
                  <div key={b.filename} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5 text-blue-900 shrink-0" />
                      <div>
                        <span className="font-mono font-bold text-xs text-neutral-900 block">
                          {b.filename}
                        </span>
                        <span className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5 font-mono">
                          <span>📅 {formatTimestamp(b.createdAt)}</span>
                          <span>·</span>
                          <span>💾 {(b.sizeBytes / 1024).toFixed(1)} KB</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            type: 'restore_local',
                            targetName: b.filename
                          })
                        }
                        className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-800" />
                        <span>Restaurar este Punto</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-neutral-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">
                  ¿Confirmar Restauración de Base de Datos?
                </h3>
                <p className="text-xs text-neutral-500">
                  Esta acción reemplazará la base de datos actual con la del archivo seleccionado.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1 font-mono text-neutral-700">
              <span className="block font-semibold">Archivo a restaurar:</span>
              <span className="block text-blue-900 font-bold">{confirmModal.targetName}</span>
              <span className="block text-neutral-500 text-[11px] pt-1">
                🛡️ Se creará automáticamente un respaldo previo del estado actual antes de proceder.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ isOpen: false, type: 'restore_local' })}
                disabled={actionInProgress !== null}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={actionInProgress !== null}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {actionInProgress ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Restaurando...</span>
                  </>
                ) : (
                  <span>Sí, Restaurar Ahora</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
