import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import {
  Teacher,
  ScheduleSlot,
  AbsenceRecord,
  ReplacementAssignment,
  AuditLogEntry,
  BackupPoint
} from '../types';
import { INITIAL_TEACHERS } from '../data/defaultSchedule';

const DB_DIR = path.resolve(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DB_DIR, 'backups');
const DB_FILE = path.join(DB_DIR, 'school_database.sqlite');

let dbInstance: Database | null = null;
let SQL_MODULE: any = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  if (!SQL_MODULE) {
    SQL_MODULE = await initSqlJs();
  }

  let db: Database;
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL_MODULE.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not read existing SQLite file, creating new database', err);
      db = new SQL_MODULE.Database();
    }
  } else {
    db = new SQL_MODULE.Database();
  }

  dbInstance = db;
  initTables(db);
  saveDatabase(db);
  return db;
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

export function getRawDatabaseBuffer(): Buffer {
  if (fs.existsSync(DB_FILE)) {
    return fs.readFileSync(DB_FILE);
  }
  if (dbInstance) {
    return Buffer.from(dbInstance.export());
  }
  return Buffer.from([]);
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

  // 5. Audit logs table (who edited, what changed, exact timestamp)
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      details TEXT NOT NULL,
      previous_value TEXT,
      new_value TEXT
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

// ----------------- Audit Logs Operations -----------------

export async function addAuditLog(entry: {
  action: AuditLogEntry['action'];
  entityType: AuditLogEntry['entityType'];
  entityId: string;
  userName?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}): Promise<void> {
  const db = await getDatabase();
  const timestamp = new Date().toISOString();
  const user = entry.userName || 'Coordinación Académica';

  db.run(
    `INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, user_name, details, previous_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      timestamp,
      entry.action,
      entry.entityType,
      entry.entityId,
      user,
      entry.details,
      entry.previousValue || null,
      entry.newValue || null
    ]
  );
  saveDatabase(db);
}

export async function getAuditLogsFromDb(limit: number = 200): Promise<AuditLogEntry[]> {
  const db = await getDatabase();
  const res = db.exec(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ${limit}`);
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
      timestamp: obj.timestamp,
      action: obj.action,
      entityType: obj.entity_type,
      entityId: obj.entity_id,
      userName: obj.user_name,
      details: obj.details,
      previousValue: obj.previous_value,
      newValue: obj.new_value
    };
  });
}

// ----------------- Teacher Queries -----------------

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

export async function setAllTeachersInDb(teachers: Teacher[], userName = 'Coordinación Académica'): Promise<void> {
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
  await addAuditLog({
    action: 'CREATE',
    entityType: 'TEACHER',
    entityId: 'all_teachers',
    userName,
    details: `Actualizada la base de datos de docentes con ${teachers.length} profesores y sus mallas horarias.`
  });
}

// ----------------- Absence Queries -----------------

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

export async function addAbsenceToDb(absence: AbsenceRecord, userName = 'Coordinación Académica'): Promise<void> {
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

  await addAuditLog({
    action: 'CREATE',
    entityType: 'ABSENCE',
    entityId: absence.id,
    userName,
    details: `Reportada inasistencia de ${absence.teacherName} para el día ${absence.date} (${absence.reason}). Periodos: ${absence.periods.join(', ')}.`
  });
}

// ----------------- Replacement Queries -----------------

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

export async function addReplacementsToDb(
  replacements: ReplacementAssignment[],
  userName = 'Coordinación Académica'
): Promise<void> {
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

    // Audit log for this assignment
    await addAuditLog({
      action: 'CREATE',
      entityType: 'REPLACEMENT',
      entityId: r.id,
      userName,
      details: `Asignado reemplazo para Periodo ${r.period} (${r.grade} · ${r.subject}). Titular: ${r.absentTeacherName} -> Suplente: ${r.substituteTeacherName} (${r.date}).`,
      newValue: JSON.stringify({
        substitute: r.substituteTeacherName,
        status: r.status,
        plan: r.activityPlan
      })
    });
  }
  saveDatabase(db);
}

export async function toggleReplacementStatusInDb(id: string, userName = 'Coordinación Académica'): Promise<string> {
  const db = await getDatabase();
  const cur = db.exec(
    'SELECT status, substitute_teacher_name, absent_teacher_name, period, grade, subject, date FROM replacements WHERE id = ?',
    [id]
  );
  if (!cur || cur.length === 0 || !cur[0].values[0]) {
    throw new Error('Replacement not found');
  }

  const currentStatus = cur[0].values[0][0] as string;
  const subName = cur[0].values[0][1] as string;
  const period = cur[0].values[0][3] as number;
  const grade = cur[0].values[0][4] as string;
  const subject = cur[0].values[0][5] as string;
  const date = cur[0].values[0][6] as string;

  const newStatus = currentStatus === 'confirmed' ? 'draft' : 'confirmed';

  db.run('UPDATE replacements SET status = ? WHERE id = ?', [newStatus, id]);
  saveDatabase(db);

  await addAuditLog({
    action: 'UPDATE_STATUS',
    entityType: 'REPLACEMENT',
    entityId: id,
    userName,
    details: `Cambio de estado para suplencia de ${subName} (Periodo ${period}, Grado ${grade}, ${subject} · ${date}): ${currentStatus === 'confirmed' ? 'Confirmado' : 'Borrador'} ➔ ${newStatus === 'confirmed' ? 'Confirmado' : 'Borrador'}.`,
    previousValue: currentStatus,
    newValue: newStatus
  });

  return newStatus;
}

export async function deleteReplacementFromDb(id: string, userName = 'Coordinación Académica'): Promise<void> {
  const db = await getDatabase();
  const cur = db.exec(
    'SELECT substitute_teacher_name, absent_teacher_name, period, grade, subject, date FROM replacements WHERE id = ?',
    [id]
  );
  const repInfo = cur?.[0]?.values?.[0];
  const desc = repInfo
    ? `Periodo ${repInfo[2]} (${repInfo[3]} - ${repInfo[4]}), Titular: ${repInfo[1]}, Suplente: ${repInfo[0]}, Fecha: ${repInfo[5]}`
    : `ID: ${id}`;

  db.run('DELETE FROM replacements WHERE id = ?', [id]);
  saveDatabase(db);

  await addAuditLog({
    action: 'DELETE',
    entityType: 'REPLACEMENT',
    entityId: id,
    userName,
    details: `Eliminada la asignación de reemplazo: ${desc}.`
  });
}

export async function resetDatabaseToDefault(userName = 'Coordinación Académica'): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM replacements');
  db.run('DELETE FROM absences');
  seedInitialData(db);

  await addAuditLog({
    action: 'RESET_DATABASE',
    entityType: 'DATABASE',
    entityId: 'database',
    userName,
    details: 'Base de datos restaurada al conjunto inicial oficial de Valledupar 2026/2027.'
  });
}

// ----------------- Backup and Restore Operations -----------------

export async function createLocalBackup(userName = 'Coordinación Académica'): Promise<string> {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const now = new Date();
  const datePart = now.toISOString().replace(/[-:T]/g, '_').split('.')[0];
  const backupFileName = `school_database_backup_${datePart}.sqlite`;
  const backupPath = path.join(BACKUPS_DIR, backupFileName);

  const buffer = getRawDatabaseBuffer();
  fs.writeFileSync(backupPath, buffer);

  await addAuditLog({
    action: 'CREATE_BACKUP',
    entityType: 'DATABASE',
    entityId: backupFileName,
    userName,
    details: `Punto de restauración creado: ${backupFileName} (${(buffer.length / 1024).toFixed(1)} KB).`
  });

  return backupFileName;
}

export async function listLocalBackups(): Promise<BackupPoint[]> {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.sqlite'));
  const backups: BackupPoint[] = [];

  for (const f of files) {
    const fullPath = path.join(BACKUPS_DIR, f);
    const stats = fs.statSync(fullPath);
    backups.push({
      filename: f,
      createdAt: stats.mtime.toISOString(),
      sizeBytes: stats.size
    });
  }

  // Sort descending by creation date
  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function restoreFromLocalBackup(
  filename: string,
  userName = 'Coordinación Académica'
): Promise<boolean> {
  const backupPath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`El archivo de respaldo ${filename} no existe.`);
  }

  // Before restoring, create an automatic safety backup of current state
  await createLocalBackup(`Seguridad Pre-Restauración (${userName})`);

  const fileBuffer = fs.readFileSync(backupPath);
  await restoreFromSqliteBuffer(fileBuffer, userName, `Restaurado desde archivo local ${filename}`);
  return true;
}

export async function restoreFromSqliteBuffer(
  buffer: Buffer,
  userName = 'Coordinación Académica',
  reason = 'Copia de seguridad subida por el usuario'
): Promise<boolean> {
  if (!SQL_MODULE) {
    SQL_MODULE = await initSqlJs();
  }

  try {
    const testDb = new SQL_MODULE.Database(buffer);
    // Verify it is a valid sqlite database by checking teachers table or master
    const testRes = testDb.exec("SELECT count(*) FROM sqlite_master WHERE type='table'");
    if (!testRes || testRes.length === 0) {
      throw new Error('El archivo no es una base de datos SQLite válida.');
    }

    // Overwrite the DB file
    fs.writeFileSync(DB_FILE, buffer);
    dbInstance = testDb;
    initTables(testDb);

    await addAuditLog({
      action: 'RESTORE_BACKUP',
      entityType: 'DATABASE',
      entityId: 'database',
      userName,
      details: `Base de datos restaurada con éxito (${reason}). Tamaño: ${(buffer.length / 1024).toFixed(1)} KB.`
    });

    return true;
  } catch (err: any) {
    console.error('Failed to restore database from buffer', err);
    throw new Error(`Error restaurando base de datos: ${err.message}`);
  }
}
