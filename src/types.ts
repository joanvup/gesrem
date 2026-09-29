export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export const DAYS_CONFIG: { id: DayOfWeek; labelEs: string; shortEs: string }[] = [
  { id: 'Monday', labelEs: 'Lunes', shortEs: 'Lun' },
  { id: 'Tuesday', labelEs: 'Martes', shortEs: 'Mar' },
  { id: 'Wednesday', labelEs: 'Miércoles', shortEs: 'Mié' },
  { id: 'Thursday', labelEs: 'Jueves', shortEs: 'Jue' },
  { id: 'Friday', labelEs: 'Viernes', shortEs: 'Vie' },
];

export interface PeriodConfig {
  number: number;
  label: string;
  regularTime: string;
  fridayTime?: string;
  isLunch?: boolean;
}

export const PERIODS_CONFIG: PeriodConfig[] = [
  { number: 1, label: 'Periodo 1', regularTime: '7:10 - 7:57', fridayTime: '7:29 - 8:16' },
  { number: 2, label: 'Periodo 2', regularTime: '7:57 - 8:44', fridayTime: '8:16 - 9:03' },
  { number: 3, label: 'Periodo 3', regularTime: '8:44 - 9:31', fridayTime: '9:03 - 9:48' },
  { number: 4, label: 'Periodo 4', regularTime: '9:31 - 10:18', fridayTime: '9:48 - 10:28' },
  { number: 5, label: 'Periodo 5', regularTime: '10:18 - 11:05', fridayTime: '10:28 - 11:15' },
  { number: 6, label: 'Periodo 6', regularTime: '11:05 - 11:52', fridayTime: '11:15 - 12:00' },
  { number: 7, label: 'Periodo 7', regularTime: '11:52 - 12:39', fridayTime: '12:00 - 12:39' },
  { number: 8, label: 'Periodo 8', regularTime: '12:39 - 13:26', fridayTime: '12:39 - 13:26' },
  { number: 9, label: 'Periodo 9', regularTime: '13:26 - 14:13', fridayTime: '13:26 - 14:13' },
  { number: 10, label: 'Periodo 10', regularTime: '14:13 - 15:00', fridayTime: '14:13 - 15:00' },
  { number: 11, label: 'Periodo 11 (PLC/Reunión)', regularTime: '15:00 - 16:00', fridayTime: '15:00 - 16:00' },
];

export interface ScheduleSlot {
  day: DayOfWeek;
  period: number;
  subject: string;
  grade: string;
  timeRange?: string;
  isMeeting?: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  department: string;
  section: 'Primaria' | 'Bachillerato' | 'Ambas';
  gradesTaught: string[];
  slots: ScheduleSlot[];
  phone?: string;
  email?: string;
}

export interface AbsenceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: DayOfWeek;
  isFullDay: boolean;
  periods: number[];
  reason: string;
  notes?: string;
  createdAt: string;
  status: 'pending' | 'assigned' | 'completed';
}

export type SchoolSection = 'Primaria' | 'Bachillerato';

export function getGradeSection(grade: string): SchoolSection {
  const g = grade.trim().toLowerCase();
  if (
    g.includes('bachillerato') ||
    g.startsWith('6') ||
    g.startsWith('7') ||
    g.startsWith('8') ||
    g.startsWith('9') ||
    g.startsWith('10') ||
    g.startsWith('11')
  ) {
    return 'Bachillerato';
  }
  return 'Primaria';
}

export interface ReplacementAssignment {
  id: string;
  absenceId: string;
  date: string;
  dayOfWeek: DayOfWeek;
  period: number;
  timeRange: string;
  grade: string;
  section?: SchoolSection;
  subject: string;
  absentTeacherId: string;
  absentTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  substituteDepartment: string;
  score: number;
  matchReasons: string[];
  status: 'confirmed' | 'draft';
  activityPlan?: string;
  assignedAt: string;
}

export interface CandidateAvailability {
  teacher: Teacher;
  isFree: boolean;
  busyReason?: string;
  score: number;
  reasons: string[];
  pastReplacementsCount: number;
}

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE_STATUS'
  | 'DELETE'
  | 'UPDATE_PLAN'
  | 'RESTORE_BACKUP'
  | 'CREATE_BACKUP'
  | 'RESET_DATABASE';

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: AuditActionType;
  entityType: 'REPLACEMENT' | 'ABSENCE' | 'TEACHER' | 'DATABASE';
  entityId: string;
  userName: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface BackupPoint {
  filename: string;
  createdAt: string;
  sizeBytes: number;
}

