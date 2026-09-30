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
  const isAdmin = currentUser?.role === 'admin';
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

  // Load backups list (Admin only)
  const loadBackups = async () => {
    if (!isAdmin) return;
    setLoadingBackups(true);
    try {
      const data = await fetchLocalBackupsListApi();
      setBackups(data);
    } catch {
      // Handled silently
    } finally {
      setLoadingBackups(false);
    }
  };

  // Load users list (Admin only)
  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const data = await fetchUsersApi();
      setUsersList(data);
    } catch {
      // Handled silently
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadLogs();
    if (isAdmin) {
      loadBackups();
      loadUsers();
    }
  }, [isAdmin]);

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
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            CREACIÓN
          </span>
        );
      case 'UPDATE_STATUS':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            CAMBIO ESTADO
          </span>
        );
      case 'DELETE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
            ELIMINADO
          </span>
        );
      case 'CREATE_BACKUP':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            BACKUP CREADO
          </span>
        );
      case 'RESTORE_BACKUP':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            BD RESTAURADA
          </span>
        );
      case 'RESET_DATABASE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700">
            REINICIO BD
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-900 dark:text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {isAdmin ? 'Auditoría, Usuarios & Base de Datos' : 'Registro de Auditoría e Historial'}
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {isAdmin
              ? 'Registro cronológico inmutable de suplencias, control de accesos cifrados con PBKDF2/SHA-512 y copias de seguridad SQLite.'
              : 'Historial cronológico inmutable de asignaciones, cambios de estado y registros de reemplazos docentes.'}
          </p>
        </div>

        {/* Responsible user badge */}
        <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 shadow-2xs self-start md:self-auto">
          <User className="w-4 h-4 text-blue-900 dark:text-blue-400" />
          <div className="text-xs">
            <span className="text-neutral-400 dark:text-neutral-500 text-[10px] block">Sesión Activa:</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block truncate max-w-[200px]">
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
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
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
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'audit'
              ? 'border-blue-900 dark:border-blue-400 text-blue-900 dark:text-blue-400'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Log de Auditoría ({logs.length})</span>
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveSubTab('backup')}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeSubTab === 'backup'
                  ? 'border-blue-900 dark:border-blue-400 text-blue-900 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Copias de Seguridad & Restauración</span>
            </button>

            <button
              onClick={() => setActiveSubTab('users')}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeSubTab === 'users'
                  ? 'border-blue-900 dark:border-blue-400 text-blue-900 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Gestión de Usuarios ({usersList.length})</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: AUDIT LOG */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs bg-white dark:bg-neutral-800 w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por profesor, periodo, detalle..."
                  className="w-full bg-transparent border-none text-neutral-800 dark:text-neutral-100 focus:outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                />
              </div>

              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none"
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
              className="px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Actualizar Log</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 dark:text-neutral-500 text-xs space-y-2">
                <History className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
                <p>No se encontraron registros de auditoría para los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                      <th className="py-2.5 px-4 w-44">Fecha y Hora</th>
                      <th className="py-2.5 px-4 w-32">Acción</th>
                      <th className="py-2.5 px-4 w-44">Usuario / Editor</th>
                      <th className="py-2.5 px-4">Detalle de Modificación</th>
                      <th className="py-2.5 px-4 w-28 text-right">ID Entidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-sans">
                    {filteredLogs.map(item => (
                      <tr key={item.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-200 font-semibold">
                            <Clock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                            <span>{formatTimestamp(item.timestamp)}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getActionBadge(item.action)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                            <span>{item.userName}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed">
                            {item.details}
                          </div>
                          {(item.previousValue || item.newValue) && (
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                              {item.previousValue && (
                                <span className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                                  Antes: {item.previousValue}
                                </span>
                              )}
                              {item.previousValue && item.newValue && (
                                <ArrowRight className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                              )}
                              {item.newValue && (
                                <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-bold">
                                  Ahora: {item.newValue}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap truncate max-w-[120px]">
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
        !isAdmin ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 my-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-7 h-7 text-amber-800 dark:text-amber-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
                Módulo Reservado para Administradores
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                La descarga, creación de puntos de restauración y recuperación de la base de datos <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-800 dark:text-neutral-200">.sqlite</code> están reservadas exclusivamente para el perfil de <strong>Administrador</strong>.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setActiveSubTab('audit')}
                className="px-4 py-2 text-xs font-semibold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                ← Volver al Log de Auditoría
              </button>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Download Current Database */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                  Descargar Copia (.sqlite)
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Descarga una copia completa e idéntica del archivo <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded text-neutral-800 dark:text-neutral-200">school_database.sqlite</code> a tu equipo con todos los datos y auditorías.
                </p>
              </div>

              <button
                onClick={downloadSqliteBackup}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>Descargar Base de Datos</span>
              </button>
            </div>

            {/* Card 2: Create Server Checkpoint */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                  Crear Punto de Restauración
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Genera una instantánea protegida en la carpeta <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded text-neutral-800 dark:text-neutral-200">data/backups/</code> del servidor para volver a ella en cualquier momento.
                </p>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={actionInProgress !== null}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Crear Instantánea Ahora</span>
              </button>
            </div>

            {/* Card 3: Upload and Restore */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                  Subir y Restaurar Archivo
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Restaura el sistema seleccionando un archivo <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded text-neutral-800 dark:text-neutral-200">.sqlite</code> previamente descargado. Se creará una copia de seguridad preventiva automática.
                </p>
              </div>

              <label className="w-full py-2 px-3 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer text-center">
                <Upload className="w-4 h-4 text-amber-800 dark:text-amber-400" />
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
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                  Puntos de Restauración en el Servidor (data/backups/)
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Instantáneas disponibles para restaurar con un solo clic.
                </p>
              </div>

              <button
                onClick={loadBackups}
                disabled={loadingBackups}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
                <span>Refrescar Lista</span>
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 dark:text-neutral-500 text-xs">
                No hay puntos de restauración guardados aún en el servidor. Crea uno con el botón "Crear Instantánea Ahora".
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {backups.map(b => (
                  <div key={b.filename} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5 text-blue-900 dark:text-blue-400 shrink-0" />
                      <div>
                        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                          {b.filename}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5 font-mono">
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
                        className="px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                        <span>Restaurar este Punto</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* TAB 3: USERS MANAGEMENT */}
      {activeSubTab === 'users' && (
        !isAdmin ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 my-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 flex items-center justify-center mx-auto shadow-2xs">
              <Lock className="w-7 h-7 text-blue-800 dark:text-blue-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
                Módulo Reservado para Administradores
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                La creación, eliminación y administración de cuentas de usuario están restringidas exclusivamente al perfil de <strong>Administrador</strong>.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setActiveSubTab('audit')}
                className="px-4 py-2 text-xs font-semibold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                ← Volver al Log de Auditoría
              </button>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Security Banner */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-3 text-xs text-blue-950 dark:text-blue-200">
            <Lock className="w-5 h-5 text-blue-800 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block">Cifrado Criptográfico de Contraseñas Activo</span>
              <p className="text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
                Todas las contraseñas se almacenan en la tabla <code className="bg-white/80 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono font-bold">users</code> de SQLite mediante hash criptográfico irreversible <strong>PBKDF2 con HMAC-SHA512</strong> y 100.000 iteraciones con sal individual (Salt). Ninguna contraseña se guarda en texto plano.
              </p>
            </div>
          </div>

          {/* Users Header and Actions */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                  Cuentas de Acceso al Sistema
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Usuarios autorizados para acceder, gestionar reemplazos y realizar auditorías.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadUsers}
                  disabled={loadingUsers}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  <span>Refrescar</span>
                </button>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                  <tr className="bg-neutral-50 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                    <th className="py-2.5 px-4">Usuario</th>
                    <th className="py-2.5 px-4">Nombre Completo / Cargo</th>
                    <th className="py-2.5 px-4">Rol</th>
                    <th className="py-2.5 px-4">Fecha Creación</th>
                    <th className="py-2.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase">
                            {u.username.substring(0, 2)}
                          </div>
                          <span>{u.username}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                        {u.name}
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Administrador
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Coordinador
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-neutral-500 dark:text-neutral-400 text-[11px]">
                        {formatTimestamp(u.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {u.username !== 'admin' && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
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
        )
      )}

      {/* Modal Add User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                  Registrar Nuevo Usuario
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  La contraseña se cifrará automáticamente con PBKDF2.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  required
                  value={newUserForm.username}
                  onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  placeholder="ej. cprimaria"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Nombre Completo y Cargo</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="ej. Lic. Martha Gómez (Coord. Primaria)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Contraseña (Mínimo 6 caracteres)</label>
                <input
                  type="password"
                  required
                  value={newUserForm.password}
                  onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Rol en el Sistema</label>
                <select
                  value={newUserForm.role}
                  onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500"
                >
                  <option value="coordinator">Coordinador (Gestión de Reemplazos)</option>
                  <option value="admin">Administrador (Control Total & Backups)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                  ¿Confirmar Restauración de Base de Datos?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Esta acción reemplazará la base de datos actual con la del archivo seleccionado.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs space-y-1 font-mono text-neutral-700 dark:text-neutral-300">
              <span className="block font-semibold">Archivo a restaurar:</span>
              <span className="block text-blue-900 dark:text-blue-300 font-bold">{confirmModal.targetName}</span>
              <span className="block text-neutral-500 dark:text-neutral-400 text-[11px] pt-1">
                🛡️ Se creará automáticamente un respaldo previo del estado actual antes de proceder.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ isOpen: false, type: 'restore_local' })}
                disabled={actionInProgress !== null}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={actionInProgress !== null}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
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
