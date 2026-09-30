import React, { useState, useEffect, useMemo } from 'react';
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
  KeyRound,
  Mail,
  Send,
  AtSign,
  Check,
  X,
  Phone,
  Settings,
  Globe,
  Shield,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { AuditLogEntry, BackupPoint, AppUser, UserRole, Teacher, SmtpConfig } from '../types';
import {
  fetchAuditLogsApi,
  createLocalBackupApi,
  fetchLocalBackupsListApi,
  restoreLocalBackupApi,
  restoreUploadBackupApi,
  downloadSqliteBackup,
  fetchUsersApi,
  createUserApi,
  deleteUserApi,
  fetchSmtpConfigApi,
  saveSmtpConfigApi,
  testSmtpConnectionApi,
  updateTeacherEmailApi,
  updateTeachersBulkApi,
  fetchTeachersFromApi,
  saveTeachers
} from '../utils/storage';

interface AuditAndBackupProps {
  onDatabaseRestored: () => Promise<void>;
  currentUser?: AppUser | null;
  teachers?: Teacher[];
  onUpdateTeachers?: (teachers: Teacher[]) => void;
}

export const AuditAndBackup: React.FC<AuditAndBackupProps> = ({
  onDatabaseRestored,
  currentUser,
  teachers = [],
  onUpdateTeachers
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'backup' | 'teachers_dir' | 'smtp' | 'users'>('audit');

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

  // Teacher Directory & Email Management State
  const [teacherDirectory, setTeacherDirectory] = useState<Teacher[]>(teachers);
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [teacherFilterEmail, setTeacherFilterEmail] = useState<'all' | 'with_email' | 'without_email'>('all');
  const [teacherFilterSection, setTeacherFilterSection] = useState<'all' | 'Primaria' | 'Bachillerato'>('all');
  const [editedEmails, setEditedEmails] = useState<Record<string, string>>({});
  const [editedPhones, setEditedPhones] = useState<Record<string, string>>({});
  const [savingTeacherId, setSavingTeacherId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState<boolean>(false);

  // SMTP Settings State
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'Fundación Colegio Bilingüe de Valledupar',
    fromEmail: '',
    enabled: true
  });
  const [loadingSmtp, setLoadingSmtp] = useState<boolean>(false);
  const [savingSmtp, setSavingSmtp] = useState<boolean>(false);
  const [showSmtpPass, setShowSmtpPass] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showSmtpGuide, setShowSmtpGuide] = useState<boolean>(false);

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

  // Load teachers
  const loadTeachersList = async () => {
    setLoadingTeachers(true);
    try {
      const data = await fetchTeachersFromApi();
      if (data && data.length > 0) {
        setTeacherDirectory(data);
        const emailMap: Record<string, string> = {};
        const phoneMap: Record<string, string> = {};
        data.forEach(t => {
          emailMap[t.id] = t.email || '';
          phoneMap[t.id] = t.phone || '';
        });
        setEditedEmails(emailMap);
        setEditedPhones(phoneMap);
      }
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Load SMTP config
  const loadSmtpConfig = async () => {
    if (!isAdmin) return;
    setLoadingSmtp(true);
    try {
      const cfg = await fetchSmtpConfigApi();
      if (cfg) {
        setSmtpForm(prev => ({
          ...prev,
          ...cfg,
          pass: (cfg as any).passMasked || cfg.pass || ''
        }));
        if (cfg.fromEmail) {
          setTestEmailAddress(cfg.fromEmail);
        } else if (cfg.user) {
          setTestEmailAddress(cfg.user);
        }
      }
    } finally {
      setLoadingSmtp(false);
    }
  };

  // Keep local teacher list in sync if props change
  useEffect(() => {
    if (teachers && teachers.length > 0) {
      setTeacherDirectory(teachers);
      const emailMap: Record<string, string> = {};
      const phoneMap: Record<string, string> = {};
      teachers.forEach(t => {
        emailMap[t.id] = t.email || '';
        phoneMap[t.id] = t.phone || '';
      });
      setEditedEmails(prev => ({ ...emailMap, ...prev }));
      setEditedPhones(prev => ({ ...phoneMap, ...prev }));
    }
  }, [teachers]);

  useEffect(() => {
    loadLogs();
    if (isAdmin) {
      loadBackups();
      loadUsers();
      loadSmtpConfig();
    }
    loadTeachersList();
  }, [isAdmin]);

  const handleCreateBackup = async () => {
    setActionInProgress('Creando copia de seguridad...');
    setStatusMessage(null);
    try {
      const res = await createLocalBackupApi(userName);
      if (res.ok && res.filename) {
        setStatusMessage({
          type: 'success',
          text: `Copia de seguridad creada con éxito: ${res.filename}`
        });
        await loadBackups();
        await loadLogs();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'No se pudo generar la copia de seguridad.'
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

  const handleDownloadCurrentDb = async () => {
    setActionInProgress('Descargando base de datos SQLite...');
    setStatusMessage(null);
    try {
      const res = await downloadSqliteBackup();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: res.error || 'No se pudo descargar la base de datos.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'Base de datos descargada exitosamente en tu equipo.'
        });
        await loadLogs();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al descargar: ${err.message}`
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDownloadBackupFile = async (filename: string) => {
    setActionInProgress(`Descargando ${filename}...`);
    setStatusMessage(null);
    try {
      const res = await downloadSqliteBackup(filename);
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: res.error || 'No se pudo descargar el archivo de respaldo.'
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Archivo de respaldo ${filename} descargado exitosamente.`
        });
        await loadLogs();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al descargar: ${err.message}`
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
          await loadTeachersList();
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
          await loadTeachersList();
        } else {
          setStatusMessage({
            type: 'error',
            text: 'No se pudo restaurar el archivo SQLite cargado.'
          });
        }
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error durante la restauración: ${err.message}`
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
    e.target.value = '';
  };

  // User management actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username || !newUserForm.password || !newUserForm.name) return;

    try {
      const res = await createUserApi({
        username: newUserForm.username,
        password: newUserForm.password,
        name: newUserForm.name,
        role: newUserForm.role
      });

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Usuario '${newUserForm.username}' creado con éxito con rol de ${newUserForm.role === 'admin' ? 'Administrador' : 'Coordinador'}.`
        });
        setShowAddUserModal(false);
        setNewUserForm({
          username: '',
          password: '',
          name: '',
          role: 'coordinator'
        });
        await loadUsers();
        await loadLogs();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'No se pudo crear el usuario.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al crear usuario: ${err.message}`
      });
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario '${username}'? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await deleteUserApi(userId);
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Usuario '${username}' eliminado correctamente.`
        });
        await loadUsers();
        await loadLogs();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'No se pudo eliminar el usuario.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al eliminar: ${err.message}`
      });
    }
  };

  // Teacher Email Save Single
  const handleSaveTeacherEmail = async (teacher: Teacher) => {
    const newEmail = (editedEmails[teacher.id] ?? teacher.email ?? '').trim();
    const newPhone = (editedPhones[teacher.id] ?? teacher.phone ?? '').trim();
    setSavingTeacherId(teacher.id);

    try {
      const res = await updateTeacherEmailApi(teacher.id, newEmail);
      if (res.ok) {
        const updatedList = teacherDirectory.map(t =>
          t.id === teacher.id ? { ...t, email: newEmail, phone: newPhone } : t
        );
        setTeacherDirectory(updatedList);
        saveTeachers(updatedList);
        if (onUpdateTeachers) onUpdateTeachers(updatedList);

        setStatusMessage({
          type: 'success',
          text: `Correo de ${teacher.name} guardado correctamente: ${newEmail || '(ninguno)'}`
        });
        await loadLogs();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'No se pudo actualizar el correo del docente.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al guardar: ${err.message}`
      });
    } finally {
      setSavingTeacherId(null);
    }
  };

  // Bulk Save all modified teachers
  const handleSaveAllTeachers = async () => {
    setBulkSaving(true);
    setStatusMessage(null);

    const updates = teacherDirectory.map(t => ({
      id: t.id,
      email: (editedEmails[t.id] ?? t.email ?? '').trim(),
      phone: (editedPhones[t.id] ?? t.phone ?? '').trim()
    }));

    try {
      const res = await updateTeachersBulkApi(updates);
      if (res.ok) {
        const updatedList = teacherDirectory.map(t => ({
          ...t,
          email: (editedEmails[t.id] ?? t.email ?? '').trim(),
          phone: (editedPhones[t.id] ?? t.phone ?? '').trim()
        }));
        setTeacherDirectory(updatedList);
        saveTeachers(updatedList);
        if (onUpdateTeachers) onUpdateTeachers(updatedList);

        setStatusMessage({
          type: 'success',
          text: `Se actualizaron exitosamente los datos y correos de ${res.count || updates.length} docentes.`
        });
        await loadLogs();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Error al guardar cambios masivos de docentes.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al guardar: ${err.message}`
      });
    } finally {
      setBulkSaving(false);
    }
  };

  // Suggest institutional email for teacher
  const handleSuggestEmail = (teacherId: string, teacherName: string) => {
    // Convert "Pérez Juan" or "Juan Pérez" to "juan.perez@colegiobilingue.edu.co"
    const cleaned = teacherName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/);

    let emailUser = '';
    if (cleaned.length >= 2) {
      emailUser = `${cleaned[1]}.${cleaned[0]}`;
    } else if (cleaned.length === 1) {
      emailUser = cleaned[0];
    } else {
      emailUser = 'docente';
    }

    const suggested = `${emailUser}@colegiobilingue.edu.co`;
    setEditedEmails(prev => ({
      ...prev,
      [teacherId]: suggested
    }));
  };

  // SMTP Save
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    setStatusMessage(null);

    try {
      const res = await saveSmtpConfigApi(smtpForm);
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: 'Configuración del servidor SMTP guardada con éxito.'
        });
        await loadSmtpConfig();
        await loadLogs();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Error al guardar la configuración SMTP.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error: ${err.message}`
      });
    } finally {
      setSavingSmtp(false);
    }
  };

  // SMTP Test
  const handleTestSmtp = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      alert('Por favor introduce un correo electrónico de destino válido para la prueba.');
      return;
    }

    setTestingSmtp(true);
    setTestResult(null);

    try {
      const res = await testSmtpConnectionApi(testEmailAddress);
      if (res.ok) {
        setTestResult({
          ok: true,
          message: res.message || 'Prueba exitosa. Se ha enviado el correo de verificación.'
        });
        await loadLogs();
      } else {
        setTestResult({
          ok: false,
          message: res.error || 'Fallo en la prueba de conexión SMTP.'
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Error de conexión con el servidor.'
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  // Filtered audit logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'all' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teacherDirectory.filter(t => {
      const currentEmail = (editedEmails[t.id] ?? t.email ?? '').trim();
      const matchesSearch =
        t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        t.department.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        currentEmail.toLowerCase().includes(teacherSearch.toLowerCase());

      const matchesSection =
        teacherFilterSection === 'all' ||
        t.section === teacherFilterSection ||
        t.section === 'Ambas';

      const hasEmail = currentEmail.length > 0 && currentEmail.includes('@');
      const matchesEmail =
        teacherFilterEmail === 'all' ||
        (teacherFilterEmail === 'with_email' && hasEmail) ||
        (teacherFilterEmail === 'without_email' && !hasEmail);

      return matchesSearch && matchesSection && matchesEmail;
    });
  }, [teacherDirectory, teacherSearch, teacherFilterSection, teacherFilterEmail, editedEmails]);

  // Statistics
  const totalTeachersCount = teacherDirectory.length;
  const withEmailCount = teacherDirectory.filter(t => {
    const e = (editedEmails[t.id] ?? t.email ?? '').trim();
    return e.length > 0 && e.includes('@');
  }).length;
  const withoutEmailCount = totalTeachersCount - withEmailCount;
  const emailPercentage = totalTeachersCount > 0 ? Math.round((withEmailCount / totalTeachersCount) * 100) : 0;

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
              {isAdmin ? 'Gestión Administrativa, Correos & Base de Datos' : 'Registro de Auditoría e Historial'}
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {isAdmin
              ? 'Control de acceso, directorio docente y correos, notificaciones automáticas SMTP (Gmail), copias de seguridad y bitácora de auditoría.'
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

      {/* Main Tabs Navigation */}
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

        <button
          onClick={() => setActiveSubTab('teachers_dir')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'teachers_dir'
              ? 'border-blue-900 dark:border-blue-400 text-blue-900 dark:text-blue-400'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Directorio & Correos Docentes</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${withEmailCount === totalTeachersCount ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
            {withEmailCount}/{totalTeachersCount}
          </span>
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveSubTab('smtp')}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeSubTab === 'smtp'
                  ? 'border-blue-900 dark:border-blue-400 text-blue-900 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configuración SMTP (Gmail)</span>
              {smtpForm.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

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
              <span>Usuarios & Accesos ({usersList.length})</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          {/* Controls: Search and Filter */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por detalle, usuario o entidad..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 transition-colors"
              >
                <option value="all">Todas las Acciones</option>
                <option value="CREATE">Creaciones</option>
                <option value="UPDATE_STATUS">Cambios de Estado</option>
                <option value="UPDATE_PLAN">Planes de Trabajo</option>
                <option value="DELETE">Eliminaciones</option>
                <option value="RESTORE_BACKUP">Restauraciones</option>
                <option value="CREATE_BACKUP">Copias de Seguridad</option>
              </select>

              <button
                onClick={loadLogs}
                disabled={loadingLogs}
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Actualizar registro"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-blue-900' : ''}`} />
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-300">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200 font-semibold border-b border-neutral-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Acción</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Responsable</th>
                    <th className="py-3 px-4">Detalle de la Operación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-sans">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                        {loadingLogs ? 'Cargando bitácora de auditoría...' : 'No se encontraron registros de auditoría que coincidan con la búsqueda.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.action === 'CREATE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : log.action === 'DELETE'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300'
                                : log.action === 'UPDATE_STATUS'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                                : log.action === 'RESTORE_BACKUP'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-neutral-700 dark:text-neutral-300">
                          {log.entityType}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-neutral-800 dark:text-neutral-200">
                          {log.userName}
                        </td>
                        <td className="py-3 px-4 leading-relaxed text-neutral-700 dark:text-neutral-300 max-w-md">
                          <div>{log.details}</div>
                          {log.previousValue && log.newValue && (
                            <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded">
                              <span className="text-red-600 dark:text-red-400 line-through mr-2">{log.previousValue}</span>
                              <ArrowRight className="w-3 h-3 inline text-neutral-400 mx-1" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">{log.newValue}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEACHERS DIRECTORY & EMAILS */}
      {activeSubTab === 'teachers_dir' && (
        <div className="space-y-4">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Total Docentes
                </span>
                <span className="text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono mt-0.5 block">
                  {totalTeachersCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Con Correo Configurado
                </span>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                  {withEmailCount} <span className="text-xs text-neutral-500 font-normal">({emailPercentage}%)</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Pendientes por Correo
                </span>
                <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                  {withoutEmailCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search, Filters and Bulk Actions */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  placeholder="Buscar docente o materia..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500"
                />
              </div>

              <select
                value={teacherFilterSection}
                onChange={e => setTeacherFilterSection(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500"
              >
                <option value="all">Todas las Secciones</option>
                <option value="Primaria">Primaria</option>
                <option value="Bachillerato">Bachillerato</option>
              </select>

              <select
                value={teacherFilterEmail}
                onChange={e => setTeacherFilterEmail(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500"
              >
                <option value="all">Todos los Correos</option>
                <option value="with_email">Solo con correo asignado</option>
                <option value="without_email">Sin correo asignado</option>
              </select>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleSaveAllTeachers}
                  disabled={bulkSaving}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{bulkSaving ? 'Guardando...' : 'Guardar Todos los Correos'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Directory Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-300">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200 font-semibold border-b border-neutral-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Docente</th>
                    <th className="py-3 px-4">Departamento & Sección</th>
                    <th className="py-3 px-4">Correo Electrónico Institucional (Para Notificaciones)</th>
                    <th className="py-3 px-4">Teléfono / Ext.</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                        No se encontraron profesores con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map(t => {
                      const curEmail = editedEmails[t.id] ?? t.email ?? '';
                      const curPhone = editedPhones[t.id] ?? t.phone ?? '';
                      const isSaving = savingTeacherId === t.id;
                      const hasValidEmail = curEmail.trim().length > 0 && curEmail.includes('@');

                      return (
                        <tr key={t.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${hasValidEmail ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} title={hasValidEmail ? 'Correo activo' : 'Sin correo asignado'} />
                              <span>{t.name}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">
                              {t.department}
                            </span>
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono block">
                              {t.section} · {t.slots.length} clases/sem
                            </span>
                          </td>

                          <td className="py-3 px-4 min-w-[320px]">
                            {isAdmin ? (
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-1">
                                  <AtSign className="w-3.5 h-3.5 absolute left-2.5 top-2 text-neutral-400" />
                                  <input
                                    type="email"
                                    value={curEmail}
                                    onChange={e =>
                                      setEditedEmails({
                                        ...editedEmails,
                                        [t.id]: e.target.value
                                      })
                                    }
                                    placeholder="ej. docente@colegiobilingue.edu.co"
                                    className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSuggestEmail(t.id, t.name)}
                                  title="Generar correo sugerido @colegiobilingue.edu.co"
                                  className="p-1.5 text-neutral-500 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer shrink-0"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono text-neutral-800 dark:text-neutral-200">
                                {t.email || <span className="text-neutral-400 italic">Sin correo registrado</span>}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap min-w-[130px]">
                            {isAdmin ? (
                              <input
                                type="text"
                                value={curPhone}
                                onChange={e =>
                                  setEditedPhones({
                                    ...editedPhones,
                                    [t.id]: e.target.value
                                  })
                                }
                                placeholder="Teléfono"
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                              />
                            ) : (
                              <span className="font-mono text-neutral-700 dark:text-neutral-300">
                                {t.phone || '-'}
                              </span>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleSaveTeacherEmail(t)}
                                disabled={isSaving}
                                className="px-3 py-1 text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                              >
                                {isSaving ? 'Guardando...' : 'Guardar'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SMTP CONFIGURATION */}
      {activeSubTab === 'smtp' && (
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
                La configuración del servidor de correo SMTP está restringida al perfil de <strong>Administrador</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        Servidor de Correo SMTP (Gmail / Google Workspace)
                      </h2>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Envía notificaciones automáticas por correo electrónico a los docentes cuando se les asigne un reemplazo.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      {smtpForm.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                    <input
                      type="checkbox"
                      checked={smtpForm.enabled}
                      onChange={e => setSmtpForm({ ...smtpForm, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                  </label>
                </div>

                <form onSubmit={handleSaveSmtp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Servidor SMTP (Host)
                      </label>
                      <input
                        type="text"
                        required
                        value={smtpForm.host}
                        onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Puerto
                        </label>
                        <input
                          type="number"
                          required
                          value={smtpForm.port}
                          onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                          placeholder="587"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Seguridad
                        </label>
                        <select
                          value={smtpForm.secure ? 'ssl' : 'tls'}
                          onChange={e => setSmtpForm({ ...smtpForm, secure: e.target.value === 'ssl' })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500"
                        >
                          <option value="tls">STARTTLS (587)</option>
                          <option value="ssl">SSL / TLS (465)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Usuario / Correo Emisor (Gmail)
                      </label>
                      <input
                        type="email"
                        required
                        value={smtpForm.user}
                        onChange={e => {
                          const val = e.target.value;
                          setSmtpForm({
                            ...smtpForm,
                            user: val,
                            fromEmail: smtpForm.fromEmail || val
                          });
                        }}
                        placeholder="coordinacion@colegiobilingue.edu.co"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          Contraseña de Aplicación (Google App Password)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSmtpPass(!showSmtpPass)}
                          className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {showSmtpPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showSmtpPass ? 'Ocultar' : 'Ver'}</span>
                        </button>
                      </div>
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        value={smtpForm.pass}
                        onChange={e => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                        placeholder="abcd efgh ijkl mnop (16 caracteres)"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Nombre para Mostrar del Remitente
                      </label>
                      <input
                        type="text"
                        value={smtpForm.fromName}
                        onChange={e => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                        placeholder="Fundación Colegio Bilingüe de Valledupar"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Dirección "De:" (From Email)
                      </label>
                      <input
                        type="email"
                        value={smtpForm.fromEmail}
                        onChange={e => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                        placeholder="coordinacion@colegiobilingue.edu.co"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="submit"
                      disabled={savingSmtp}
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{savingSmtp ? 'Guardando...' : 'Guardar Configuración SMTP'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Test Email Section */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <Send className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                  <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                    Probar Conexión y Envío de Correo
                  </h3>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Envía un correo de prueba en tiempo real para verificar que el servidor SMTP y la contraseña de aplicación de Google estén autorizados correctamente.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={e => setTestEmailAddress(e.target.value)}
                    placeholder="Correo de prueba (ej. tu_correo@colegiobilingue.edu.co)"
                    className="w-full sm:flex-1 px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-800 dark:focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp || !testEmailAddress}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {testingSmtp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enviando prueba...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Correo de Prueba</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      testResult.ok
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <span className="font-bold block">
                        {testResult.ok ? 'Prueba Exitosa' : 'Fallo en la prueba'}
                      </span>
                      <p className="leading-relaxed font-mono text-[11px]">{testResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Guide: How to create Google App Password */}
            <div className="space-y-4">
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                  <HelpCircle className="w-5 h-5" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">
                    ¿Cómo obtener la Contraseña de Aplicación de Gmail?
                  </h3>
                </div>

                <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-2.5 leading-relaxed">
                  <p>
                    Para cuentas de Gmail o Google Workspace con verificación en dos pasos (2FA), Google requiere una <strong>Contraseña de Aplicación de 16 caracteres</strong>:
                  </p>

                  <ol className="list-decimal list-inside space-y-1.5 pl-1 font-sans text-[11px]">
                    <li>Accede a tu <strong>Cuenta de Google</strong> (<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-800 dark:text-blue-400 underline font-semibold">myaccount.google.com/security</a>).</li>
                    <li>Ve a la pestaña <strong>Seguridad</strong>.</li>
                    <li>Asegúrate de que la <strong>Verificación en 2 pasos</strong> esté activada.</li>
                    <li>Busca y selecciona <strong>«Contraseñas de aplicaciones»</strong>.</li>
                    <li>Escribe un nombre (ej. <em>«ReemplazaDocente FCBV»</em>) y haz clic en <strong>Crear</strong>.</li>
                    <li>Copia el código generado de 16 letras (sin espacios) y pégalo en el campo superior.</li>
                  </ol>

                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-300 font-medium">
                    🛡️ Tu contraseña personal de Google nunca se expone; la contraseña de aplicación puede revocarse en cualquier momento desde Google.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* TAB 4: BACKUPS & RESTORE */}
      {activeSubTab === 'backup' && (
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
                La descarga directa de base de datos, creación de instantáneas y restauración del sistema están restringidas exclusivamente al perfil de <strong>Administrador</strong>.
              </p>
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
                  onClick={handleDownloadCurrentDb}
                  disabled={actionInProgress !== null}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
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
                          onClick={() => handleDownloadBackupFile(b.filename)}
                          disabled={actionInProgress !== null}
                          title="Descargar este archivo .sqlite a tu equipo"
                          className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
                          <span className="hidden sm:inline">Descargar</span>
                        </button>

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

      {/* TAB 5: USERS MANAGEMENT */}
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Usuarios con Acceso al Sistema
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Administra las credenciales y roles para coordinadores y administradores.
                </p>
              </div>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Nuevo Usuario</span>
              </button>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-300">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200 font-semibold border-b border-neutral-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Nombre / Cargo</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Fecha de Creación</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-400">Cargando usuarios...</td>
                      </tr>
                    ) : usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-400">No hay usuarios registrados.</td>
                      </tr>
                    ) : (
                      usersList.map(u => (
                        <tr key={u.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            {u.username}
                          </td>
                          <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                            {u.name}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                              }`}
                            >
                              {u.role === 'admin' ? 'Administrador' : 'Coordinador'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                            {formatTimestamp(u.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
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
