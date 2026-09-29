import { Teacher, AbsenceRecord, ReplacementAssignment } from '../types';
import { INITIAL_TEACHERS } from '../data/defaultSchedule';

const STORAGE_KEYS = {
  TEACHERS: 'reemplaza_teachers_v1',
  ABSENCES: 'reemplaza_absences_v1',
  REPLACEMENTS: 'reemplaza_replacements_v1',
  CUSTOM_CONFIG: 'reemplaza_config_v1',
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
  try {
    const res = await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
}
