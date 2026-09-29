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
  Info,
  Users,
  UserPlus,
  Trash2,
  Lock,
  KeyRound
} from 'lucide-react';
import { AuditLogEntry, BackupPoint, AppUser, UserRole } from '../types';
import {
  fetchAuditLogsApi,
  createLocalBackupApi,
  fetchLocalBackupsListApi,
  restoreLocalBackupApi,
  restoreUploadBackupApi,
  downloadSqliteBackup,
  fetchUsersApi,
  createUserApi,
  deleteUserApi
} from '../utils/storage';

interface AuditAndBackupProps {
  onDatabaseRestored: () => Promise<void>;
  currentUser?: AppUser | null;
}

export const AuditAndBackup: React.FC<AuditAndBackupProps> = ({
  onDatabaseRestored,
  currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'backup' | 'users'>('audit');
  
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
  
  // Users State
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserForm, setNewUserForm] = useState<{
    username: string;
    password: string;
    name: string;
    role: UserRole;
  }>({
    username: '',
    password: '',
    name: '',
    role: 'coordinator'
  });

  // Current operator name
  const userName = currentUser ? `${currentUser.name} (${currentUser.username})` : 'Coordinación Académica';

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

  // Load users list
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchUsersApi();
      setUsersList(data);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadLogs();
    loadBackups();
    loadUsers();
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
          await loadUsers();
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
          await loadUsers();
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.name.trim() || !newUserForm.password) {
      alert('Por favor completa todos los campos.');
      return;
    }

    if (newUserForm.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      const res = await createUserApi(newUserForm);
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Usuario ${newUserForm.username} creado con éxito y contraseña cifrada.`
        });
        setNewUserForm({
          username: '',
          password: '',
          name: '',
          role: 'coordinator'
        });
        setShowAddUserModal(false);
        await loadUsers();
        await loadLogs();
      } else {
        alert(res.error || 'Error al crear usuario');
      }
    } catch (err: any) {
      alert(err.message || 'Error al crear usuario');
    }
  };

  const handleDeleteUser = async (userToDelete: AppUser) => {
    if (confirm(`¿Estás seguro de que deseas eliminar al usuario '${userToDelete.username}' (${userToDelete.name})?`)) {
      try {
        const res = await deleteUserApi(userToDelete.id);
        if (res.ok) {
          setStatusMessage({
            type: 'success',
            text: `Usuario ${userToDelete.username} eliminado correctamente.`
          });
          await loadUsers();
          await loadLogs();
        } else {
          alert(res.error || 'Error al eliminar usuario');
        }
      } catch (err: any) {
        alert(err.message || 'Error al eliminar usuario');
      }
    }
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
              Auditoría, Usuarios & Base de Datos
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Registro cronológico inmutable de suplencias, control de accesos cifrados con PBKDF2/SHA-512 y copias de seguridad SQLite.
          </p>
        </div>

        {/* Responsible user badge */}
        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-1.5 shadow-2xs self-start md:self-auto">
          <User className="w-4 h-4 text-blue-900" />
          <div className="text-xs">
            <span className="text-neutral-400 text-[10px] block">Sesión Activa:</span>
            <span className="font-semibold text-neutral-900 block truncate max-w-[200px]">
              {userName}
            </span>
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

        <button
          onClick={() => setActiveSubTab('users')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'users'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestión de Usuarios ({usersList.length})</span>
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
                  Restaura el sistema seleccionando un archivo <code className="font-mono bg-neutral-100 px-1 rounded text-neutral-800">.sqlite</code> previamente descargado. Se creará una copia de seguridad preventiva automática.
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

      {/* TAB 3: USERS MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Security Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-950">
            <Lock className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block">Cifrado Criptográfico de Contraseñas Activo</span>
              <p className="text-blue-900/80 leading-relaxed">
                Todas las contraseñas se almacenan en la tabla <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">users</code> de SQLite mediante hash criptográfico irreversible <strong>PBKDF2 con HMAC-SHA512</strong> y 100.000 iteraciones con sal individual (Salt). Ninguna contraseña se guarda en texto plano.
              </p>
            </div>
          </div>

          {/* Users Header and Actions */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">
                  Cuentas de Acceso al Sistema
                </h3>
                <p className="text-xs text-neutral-500">
                  Usuarios autorizados para acceder, gestionar reemplazos y realizar auditorías.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadUsers}
                  disabled={loadingUsers}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg border border-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  <span>Refrescar</span>
                </button>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Crear Usuario</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                    <th className="py-2.5 px-4">Usuario</th>
                    <th className="py-2.5 px-4">Nombre Completo / Cargo</th>
                    <th className="py-2.5 px-4">Rol</th>
                    <th className="py-2.5 px-4">Fecha Creación</th>
                    <th className="py-2.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs uppercase">
                            {u.username.substring(0, 2)}
                          </div>
                          <span>{u.username}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-neutral-800">
                        {u.name}
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                            Administrador
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                            Coordinador
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-neutral-500 text-[11px]">
                        {formatTimestamp(u.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {u.username !== 'admin' && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-neutral-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">
                  Registrar Nuevo Usuario
                </h3>
                <p className="text-xs text-neutral-500">
                  La contraseña se cifrará automáticamente con PBKDF2.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  required
                  value={newUserForm.username}
                  onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  placeholder="ej. cprimaria"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-blue-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Nombre Completo y Cargo</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="ej. Lic. Martha Gómez (Coord. Primaria)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-blue-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Contraseña (Mínimo 6 caracteres)</label>
                <input
                  type="password"
                  required
                  value={newUserForm.password}
                  onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-blue-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Rol en el Sistema</label>
                <select
                  value={newUserForm.role}
                  onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-blue-800 bg-white"
                >
                  <option value="coordinator">Coordinador (Gestión de Reemplazos)</option>
                  <option value="admin">Administrador (Control Total & Backups)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Crear y Cifrar Usuario
                </button>
              </div>
            </form>
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
