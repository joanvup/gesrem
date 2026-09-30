import { Teacher, AbsenceRecord, ReplacementAssignment, AuditLogEntry, BackupPoint, AppUser, UserRole, ScheduleVersionInfo } from '../types';
import { INITIAL_TEACHERS } from '../data/defaultSchedule';

const STORAGE_KEYS = {
  TEACHERS: 'reemplaza_teachers_v1',
  ABSENCES: 'reemplaza_absences_v1',
  REPLACEMENTS: 'reemplaza_replacements_v1',
  CUSTOM_CONFIG: 'reemplaza_config_v1',
  AUTH_TOKEN: 'gesrem_auth_token_v1',
  AUTH_USER: 'gesrem_auth_user_v1',
  SCHEDULE_VERSION: 'reemplaza_schedule_version_v1'
};

export const DEFAULT_SCHEDULE_VERSION: ScheduleVersionInfo = {
  versionName: 'Horario Oficial FCBV 2026/2027',
  source: 'official_default',
  fileName: 'Horario_Oficial_FCBV_2026_2027.pdf',
  uploadedAt: '01/09/2026 07:00',
  teachersCount: 37,
  pagesProcessed: 37,
  academicYear: '2026/2027'
};

// Initial sample absences for realistic demonstration if none exist
const INITIAL_SAMPLE_ABSENCES: AbsenceRecord[] = [
  {
    id: 'abs_demo_1',
    teacherId: 'muegues-danyely',
    teacherName: 'Muegues Danyely',
    date: new Date().toISOString().split('T')[0],
    dayOfWeek: getTodayDayOfWeek(),
    isFullDay: true,
    periods: [1, 2, 3, 8],
    reason: 'Incapacidad médica (Cita EPS)',
    notes: 'Por favor avanzar en el taller de reading de inglés y dictar vocabulario.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'assigned'
  }
];

export function getTodayDayOfWeek(): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' {
  const day = new Date().getDay();
  switch (day) {
    case 1: return 'Monday';
    case 2: return 'Tuesday';
    case 3: return 'Wednesday';
    case 4: return 'Thursday';
    case 5: return 'Friday';
    default: return 'Monday'; // Default to Monday on weekends
  }
}

// ----------------- SQLite API Sync Handlers -----------------

export async function fetchDatabaseStatus(): Promise<{
  ok: boolean;
  database: string;
  file: string;
  counts: { teachers: number; absences: number; replacements: number };
} | null> {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('API status not reachable, working with local cache', err);
  }
  return null;
}

export async function fetchTeachersFromApi(): Promise<Teacher[]> {
  try {
    const res = await fetch('/api/teachers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveTeachers(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('API /api/teachers not reachable, falling back to local storage', err);
  }
  return loadTeachers();
}

export async function syncTeachersToApi(teachers: Teacher[]): Promise<boolean> {
  saveTeachers(teachers);
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/teachers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`
      },
      body: JSON.stringify(teachers)
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to sync teachers to SQLite API', err);
    return false;
  }
}

export async function fetchAbsencesFromApi(): Promise<AbsenceRecord[]> {
  try {
    const res = await fetch('/api/absences');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveAbsences(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('API /api/absences not reachable, falling back to local storage', err);
  }
  return loadAbsences();
}

export async function syncAbsenceToApi(absence: AbsenceRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(absence)
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to sync absence to SQLite API', err);
    return false;
  }
}

export async function fetchReplacementsFromApi(): Promise<ReplacementAssignment[]> {
  try {
    const res = await fetch('/api/replacements');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveReplacements(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('API /api/replacements not reachable, falling back to local storage', err);
  }
  return loadReplacements();
}

export async function syncReplacementsToApi(replacements: ReplacementAssignment[]): Promise<boolean> {
  saveReplacements(replacements);
  try {
    const res = await fetch('/api/replacements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replacements)
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to sync replacements to SQLite API', err);
    return false;
  }
}

export async function deleteReplacementFromApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/replacements/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete replacement on SQLite API', err);
    return false;
  }
}

export async function toggleReplacementStatusInApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/replacements/${id}/status`, { method: 'PUT' });
    return res.ok;
  } catch (err) {
    console.warn('Failed to toggle replacement on SQLite API', err);
    return false;
  }
}

export async function resetDatabaseOnApi(): Promise<boolean> {
  resetToDefaultData();
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.warn('Failed to reset SQLite API', err);
    return false;
  }
}

// ----------------- Audit Logs & Backups API -----------------

export async function fetchAuditLogsApi(limit = 200): Promise<AuditLogEntry[]> {
  try {
    const res = await fetch(`/api/audit-logs?limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch audit logs', err);
  }
  return [];
}

export async function createLocalBackupApi(
  userName = 'Coordinación Académica',
  description?: string
): Promise<{ ok: boolean; filename?: string; error?: string }> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/backup/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`
      },
      body: JSON.stringify({ userName, description })
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, filename: data.filename };
    }
    const errData = await res.json().catch(() => ({}));
    return { ok: false, error: errData.error || 'Error al generar backup' };
  } catch (err: any) {
    console.error('Failed to create local backup', err);
    return { ok: false, error: err.message };
  }
}

export async function fetchLocalBackupsListApi(): Promise<BackupPoint[]> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/backup/list', {
      headers: { Authorization: `Bearer ${token || ''}` }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to list backups', err);
  }
  return [];
}

export async function restoreLocalBackupApi(filename: string, userName = 'Coordinación Académica'): Promise<boolean> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/backup/restore-local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`
      },
      body: JSON.stringify({ filename, userName })
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to restore local backup', err);
    return false;
  }
}

export async function restoreUploadBackupApi(file: File, userName = 'Coordinación Académica'): Promise<boolean> {
  const token = getStoredAuthToken();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    const res = await fetch('/api/backup/restore-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`
      },
      body: JSON.stringify({
        base64Data,
        filename: file.name,
        userName
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to restore uploaded backup', err);
    return false;
  }
}

export async function downloadSqliteBackup(specificFilename?: string): Promise<{ ok: boolean; error?: string }> {
  const token = getStoredAuthToken();
  try {
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (specificFilename) params.set('file', specificFilename);

    const url = `/api/backup/download${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token || ''}`
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg = errData.error || `Error ${res.status}: No tienes permisos suficientes o la sesión expiró.`;
      return { ok: false, error: errorMsg };
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = specificFilename || `fcbv_database_${new Date().toISOString().slice(0, 10)}.sqlite`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(link);

    return { ok: true };
  } catch (err: any) {
    console.error('Failed to download sqlite backup', err);
    return { ok: false, error: err.message || 'Error al descargar la base de datos' };
  }
}

// ----------------- Authentication Helpers -----------------

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch {}
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  } catch {}
}

export function getStoredAuthUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuthUser(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  } catch {}
}

export async function loginApi(
  username: string,
  password: string
): Promise<{ ok: boolean; user?: AppUser; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setStoredAuthToken(data.token);
      setStoredAuthUser(data.user);
      return { ok: true, user: data.user, token: data.token };
    }
    return { ok: false, error: data.error || 'Credenciales inválidas' };
  } catch (err: any) {
    return { ok: false, error: 'No fue posible conectar con el servidor.' };
  }
}

export async function checkAuthApi(): Promise<AppUser | null> {
  const token = getStoredAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.user) {
        setStoredAuthUser(data.user);
        return data.user;
      }
    }
  } catch (err) {
    console.warn('Could not verify auth with server', err);
  }

  // If server returns 401 or invalid, fall back to cached user or clear
  return getStoredAuthUser();
}

export async function logoutApi(): Promise<void> {
  const token = getStoredAuthToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
  }
  clearStoredAuth();
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Error al cambiar la contraseña' };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function fetchUsersApi(): Promise<AppUser[]> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token || ''}` }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch users', err);
  }
  return [];
}

export async function createUserApi(user: {
  username: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<{ ok: boolean; user?: AppUser; error?: string }> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`
      },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      return { ok: true, user: data.user };
    }
    return { ok: false, error: data.error || 'Error al crear usuario' };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function deleteUserApi(userId: string): Promise<{ ok: boolean; error?: string }> {
  const token = getStoredAuthToken();
  try {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token || ''}` }
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Error al eliminar usuario' };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ----------------- Local Storage Cache -----------------

export function loadTeachers(): Teacher[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading teachers from storage', e);
  }
  return INITIAL_TEACHERS;
}

export function saveTeachers(teachers: Teacher[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  } catch (e) {
    console.error('Error saving teachers to storage', e);
  }
}

export function loadAbsences(): AbsenceRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ABSENCES);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading absences', e);
  }
  return INITIAL_SAMPLE_ABSENCES;
}

export function saveAbsences(absences: AbsenceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(absences));
  } catch (e) {
    console.error('Error saving absences', e);
  }
}

export function loadReplacements(): ReplacementAssignment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPLACEMENTS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading replacements', e);
  }
  return [];
}

export function saveReplacements(replacements: ReplacementAssignment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REPLACEMENTS, JSON.stringify(replacements));
  } catch (e) {
    console.error('Error saving replacements', e);
  }
}

export function resetToDefaultData(): void {
  localStorage.removeItem(STORAGE_KEYS.TEACHERS);
  localStorage.removeItem(STORAGE_KEYS.ABSENCES);
  localStorage.removeItem(STORAGE_KEYS.REPLACEMENTS);
  localStorage.removeItem(STORAGE_KEYS.SCHEDULE_VERSION);
}

export function loadScheduleVersion(): ScheduleVersionInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULE_VERSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.versionName) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading schedule version from storage', e);
  }
  return DEFAULT_SCHEDULE_VERSION;
}

export function saveScheduleVersion(versionInfo: ScheduleVersionInfo): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE_VERSION, JSON.stringify(versionInfo));
  } catch (e) {
    console.error('Error saving schedule version to storage', e);
  }
}
