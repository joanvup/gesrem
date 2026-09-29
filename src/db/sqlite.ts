import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { Teacher, ScheduleSlot, AbsenceRecord, ReplacementAssignment } from '../types';
import { INITIAL_TEACHERS } from '../data/defaultSchedule';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'school_database.sqlite');

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not read existing SQLite file, creating new database', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDatabase(dbInstance);
  return dbInstance;
}

export function saveDatabase(db: Database): void {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to file', err);
  }
}

function initTables(db: Database): void {
  // 1. Teachers table
  db.run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      section TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      grades_taught TEXT NOT NULL
    );
  `);

  // 2. Schedule slots table
  db.run(`
    CREATE TABLE IF NOT EXISTS schedule_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id TEXT NOT NULL,
      day TEXT NOT NULL,
      period INTEGER NOT NULL,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      time_range TEXT,
      is_meeting INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    );
  `);

  // 3. Absences table
  db.run(`
    CREATE TABLE IF NOT EXISTS absences (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      date TEXT NOT NULL,
      day_of_week TEXT NOT NULL,
      is_full_day INTEGER NOT NULL DEFAULT 1,
      periods TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'assigned',
      created_at TEXT NOT NULL
    );
  `);

  // 4. Replacements table
  db.run(`
    CREATE TABLE IF NOT EXISTS replacements (
      id TEXT PRIMARY KEY,
      absence_id TEXT NOT NULL,
      date TEXT NOT NULL,
      day_of_week TEXT NOT NULL,
      period INTEGER NOT NULL,
      time_range TEXT NOT NULL,
      grade TEXT NOT NULL,
      subject TEXT NOT NULL,
      absent_teacher_id TEXT NOT NULL,
      absent_teacher_name TEXT NOT NULL,
      substitute_teacher_id TEXT NOT NULL,
      substitute_teacher_name TEXT NOT NULL,
      substitute_department TEXT NOT NULL,
      score INTEGER NOT NULL,
      match_reasons TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      activity_plan TEXT,
      assigned_at TEXT NOT NULL
    );
  `);

  // Check if teachers table is empty; if so, seed from INITIAL_TEACHERS
  const countResult = db.exec('SELECT COUNT(*) as count FROM teachers');
  const count = countResult[0]?.values[0]?.[0] as number;
  if (!count || count === 0) {
    seedInitialData(db);
  }
}

export function seedInitialData(db: Database): void {
  db.run('DELETE FROM schedule_slots');
  db.run('DELETE FROM teachers');

  for (const t of INITIAL_TEACHERS) {
    db.run(
      'INSERT INTO teachers (id, name, department, section, phone, email, grades_taught) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.name, t.department, t.section, t.phone || '', t.email || '', JSON.stringify(t.gradesTaught)]
    );

    for (const s of t.slots) {
      db.run(
        'INSERT INTO schedule_slots (teacher_id, day, period, subject, grade, time_range, is_meeting) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.id, s.day, s.period, s.subject, s.grade, s.timeRange || '', s.isMeeting ? 1 : 0]
      );
    }
  }

  saveDatabase(db);
}

// Queries
export async function getAllTeachersFromDb(): Promise<Teacher[]> {
  const db = await getDatabase();
  const teachersResult = db.exec('SELECT * FROM teachers ORDER BY name ASC');
  if (!teachersResult || teachersResult.length === 0) return [];

  const rows = teachersResult[0].values;
  const cols = teachersResult[0].columns;

  const teachersMap: Record<string, Teacher> = {};
  for (const row of rows) {
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    teachersMap[obj.id] = {
      id: obj.id,
      name: obj.name,
      department: obj.department,
      section: obj.section,
      phone: obj.phone,
      email: obj.email,
      gradesTaught: JSON.parse(obj.grades_taught || '[]'),
      slots: []
    };
  }

  const slotsResult = db.exec('SELECT * FROM schedule_slots ORDER BY period ASC');
  if (slotsResult && slotsResult.length > 0) {
    const sRows = slotsResult[0].values;
    const sCols = slotsResult[0].columns;

    for (const row of sRows) {
      const sObj: any = {};
      sCols.forEach((col, idx) => {
        sObj[col] = row[idx];
      });

      if (teachersMap[sObj.teacher_id]) {
        teachersMap[sObj.teacher_id].slots.push({
          day: sObj.day,
          period: sObj.period,
          subject: sObj.subject,
          grade: sObj.grade,
          timeRange: sObj.time_range,
          isMeeting: sObj.is_meeting === 1
        });
      }
    }
  }

  return Object.values(teachersMap);
}

export async function setAllTeachersInDb(teachers: Teacher[]): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM schedule_slots');
  db.run('DELETE FROM teachers');

  for (const t of teachers) {
    db.run(
      'INSERT INTO teachers (id, name, department, section, phone, email, grades_taught) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [t.id, t.name, t.department, t.section, t.phone || '', t.email || '', JSON.stringify(t.gradesTaught || [])]
    );

    for (const s of t.slots) {
      db.run(
        'INSERT INTO schedule_slots (teacher_id, day, period, subject, grade, time_range, is_meeting) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.id, s.day, s.period, s.subject, s.grade, s.timeRange || '', s.isMeeting ? 1 : 0]
      );
    }
  }

  saveDatabase(db);
}

export async function getAllAbsencesFromDb(): Promise<AbsenceRecord[]> {
  const db = await getDatabase();
  const res = db.exec('SELECT * FROM absences ORDER BY created_at DESC');
  if (!res || res.length === 0) return [];

  const rows = res[0].values;
  const cols = res[0].columns;

  return rows.map(row => {
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      id: obj.id,
      teacherId: obj.teacher_id,
      teacherName: obj.teacher_name,
      date: obj.date,
      dayOfWeek: obj.day_of_week,
      isFullDay: obj.is_full_day === 1,
      periods: JSON.parse(obj.periods || '[]'),
      reason: obj.reason,
      notes: obj.notes,
      status: obj.status,
      createdAt: obj.created_at
    };
  });
}

export async function addAbsenceToDb(absence: AbsenceRecord): Promise<void> {
  const db = await getDatabase();
  db.run(
    `INSERT INTO absences (id, teacher_id, teacher_name, date, day_of_week, is_full_day, periods, reason, notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      absence.id,
      absence.teacherId,
      absence.teacherName,
      absence.date,
      absence.dayOfWeek,
      absence.isFullDay ? 1 : 0,
      JSON.stringify(absence.periods),
      absence.reason,
      absence.notes || '',
      absence.status,
      absence.createdAt
    ]
  );
  saveDatabase(db);
}

export async function getAllReplacementsFromDb(): Promise<ReplacementAssignment[]> {
  const db = await getDatabase();
  const res = db.exec('SELECT * FROM replacements ORDER BY date DESC, period ASC');
  if (!res || res.length === 0) return [];

  const rows = res[0].values;
  const cols = res[0].columns;

  return rows.map(row => {
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      id: obj.id,
      absenceId: obj.absence_id,
      date: obj.date,
      dayOfWeek: obj.day_of_week,
      period: obj.period,
      timeRange: obj.time_range,
      grade: obj.grade,
      subject: obj.subject,
      absentTeacherId: obj.absent_teacher_id,
      absentTeacherName: obj.absent_teacher_name,
      substituteTeacherId: obj.substitute_teacher_id,
      substituteTeacherName: obj.substitute_teacher_name,
      substituteDepartment: obj.substitute_department,
      score: obj.score,
      matchReasons: JSON.parse(obj.match_reasons || '[]'),
      status: obj.status,
      activityPlan: obj.activity_plan,
      assignedAt: obj.assigned_at
    };
  });
}

export async function addReplacementsToDb(replacements: ReplacementAssignment[]): Promise<void> {
  const db = await getDatabase();
  for (const r of replacements) {
    db.run(
      `INSERT OR REPLACE INTO replacements 
       (id, absence_id, date, day_of_week, period, time_range, grade, subject, absent_teacher_id, absent_teacher_name, substitute_teacher_id, substitute_teacher_name, substitute_department, score, match_reasons, status, activity_plan, assigned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.absenceId,
        r.date,
        r.dayOfWeek,
        r.period,
        r.timeRange,
        r.grade,
        r.subject,
        r.absentTeacherId,
        r.absentTeacherName,
        r.substituteTeacherId,
        r.substituteTeacherName,
        r.substituteDepartment,
        r.score,
        JSON.stringify(r.matchReasons),
        r.status,
        r.activityPlan || '',
        r.assignedAt
      ]
    );
  }
  saveDatabase(db);
}

export async function toggleReplacementStatusInDb(id: string): Promise<string> {
  const db = await getDatabase();
  const cur = db.exec('SELECT status FROM replacements WHERE id = ?', [id]);
  const currentStatus = cur[0]?.values[0]?.[0] as string;
  const newStatus = currentStatus === 'confirmed' ? 'draft' : 'confirmed';

  db.run('UPDATE replacements SET status = ? WHERE id = ?', [newStatus, id]);
  saveDatabase(db);
  return newStatus;
}

export async function deleteReplacementFromDb(id: string): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM replacements WHERE id = ?', [id]);
  saveDatabase(db);
}

export async function resetDatabaseToDefault(): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM replacements');
  db.run('DELETE FROM absences');
  seedInitialData(db);
}
