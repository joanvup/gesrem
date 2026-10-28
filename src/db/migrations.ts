import fs from 'fs';
import path from 'path';
import { Database } from 'sql.js';

export interface Migration {
  version: number;
  name: string;
  description: string;
  up: (db: Database) => Promise<void> | void;
}

export interface AppliedMigration {
  id: number;
  version: number;
  name: string;
  description: string;
  appliedAt: string;
}

export interface MigrationStatus {
  currentVersion: number;
  latestAvailableVersion: number;
  isUpToDate: boolean;
  appliedMigrations: AppliedMigration[];
  pendingMigrations: Array<{ version: number; name: string; description: string }>;
  tableCounts: Record<string, number>;
  databaseSizeBytes: number;
  lastChecked: string;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DB_DIR, 'backups');
const DB_FILE = path.join(DB_DIR, 'school_database.sqlite');

/**
 * Ensures the schema_migrations tracking table exists.
 */
export function initMigrationsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      applied_at TEXT NOT NULL
    );
  `);
}

/**
 * Creates an automatic safety snapshot before applying any structural migration.
 */
export function createPreMigrationBackup(db: Database, targetVersion: number): string | null {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pre_migration_v${targetVersion}_${timestamp}.sqlite`;
    const targetPath = path.join(BACKUPS_DIR, filename);

    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(targetPath, buffer);
    console.log(`[Migrations] Automatic pre-migration snapshot created: ${filename} (${buffer.length} bytes)`);
    return filename;
  } catch (err) {
    console.error('[Migrations] Failed to create pre-migration backup:', err);
    return null;
  }
}

/**
 * Checks if a specific column exists in a table using PRAGMA table_info.
 */
export function hasColumn(db: Database, tableName: string, columnName: string): boolean {
  try {
    const res = db.exec(`PRAGMA table_info(${tableName})`);
    if (!res || res.length === 0 || !res[0].values) return false;
    return res[0].values.some(row => row[1] === columnName);
  } catch {
    return false;
  }
}

/**
 * Non-destructively adds a column if it doesn't already exist.
 */
export function addColumnIfNotExists(
  db: Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
): boolean {
  if (!hasColumn(db, tableName, columnName)) {
    console.log(`[Migrations] Non-destructively adding column '${columnName}' to table '${tableName}'`);
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    return true;
  }
  return false;
}

/**
 * Ordered registry of all schema migrations.
 * Every migration must be strictly idempotent and non-destructive.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_base_schema_verification',
    description: 'Verificación de integridad de las 7 tablas fundamentales del sistema (teachers, schedule_slots, absences, replacements, audit_logs, users, app_settings)',
    up: (db: Database) => {
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
          section TEXT,
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

      // 5. Audit logs table
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

      // 6. Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'coordinator',
          created_at TEXT NOT NULL
        );
      `);

      // 7. App settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    }
  },
  {
    version: 2,
    name: '002_performance_indexes',
    description: 'Creación de índices B-Tree de alto rendimiento para consultas de horarios, ausencias por fecha, reemplazos y bitácora de auditoría',
    up: (db: Database) => {
      db.run('CREATE INDEX IF NOT EXISTS idx_schedule_slots_teacher ON schedule_slots(teacher_id);');
      db.run('CREATE INDEX IF NOT EXISTS idx_schedule_slots_day ON schedule_slots(day);');
      db.run('CREATE INDEX IF NOT EXISTS idx_schedule_slots_day_period ON schedule_slots(day, period);');
      db.run('CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(date);');
      db.run('CREATE INDEX IF NOT EXISTS idx_absences_teacher ON absences(teacher_id);');
      db.run('CREATE INDEX IF NOT EXISTS idx_replacements_date ON replacements(date);');
      db.run('CREATE INDEX IF NOT EXISTS idx_replacements_absence ON replacements(absence_id);');
      db.run('CREATE INDEX IF NOT EXISTS idx_replacements_substitute ON replacements(substitute_teacher_id);');
      db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);');
      db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);');
    }
  },
  {
    version: 3,
    name: '003_column_integrity_and_compat',
    description: 'Inspección profunda de columnas requeridas en producción y adición no destructiva si alguna falta en bases de datos migradas',
    up: (db: Database) => {
      // Ensure section exists in replacements
      addColumnIfNotExists(db, 'replacements', 'section', 'TEXT');
      // Ensure activity_plan exists in replacements
      addColumnIfNotExists(db, 'replacements', 'activity_plan', 'TEXT');
      // Ensure notes exists in absences
      addColumnIfNotExists(db, 'absences', 'notes', 'TEXT');
      // Ensure status exists in absences
      addColumnIfNotExists(db, 'absences', 'status', "TEXT NOT NULL DEFAULT 'assigned'");
      // Ensure previous_value and new_value in audit_logs
      addColumnIfNotExists(db, 'audit_logs', 'previous_value', 'TEXT');
      addColumnIfNotExists(db, 'audit_logs', 'new_value', 'TEXT');
      // Ensure email and phone in teachers
      addColumnIfNotExists(db, 'teachers', 'email', 'TEXT');
      addColumnIfNotExists(db, 'teachers', 'phone', 'TEXT');
      // Ensure time_range and is_meeting in schedule_slots
      addColumnIfNotExists(db, 'schedule_slots', 'time_range', 'TEXT');
      addColumnIfNotExists(db, 'schedule_slots', 'is_meeting', 'INTEGER NOT NULL DEFAULT 0');
    }
  }
];

/**
 * Returns current migration status, applied list, pending list, and row counts of tables.
 */
export function getMigrationStatus(db: Database): MigrationStatus {
  initMigrationsTable(db);

  // Fetch applied migrations
  const appliedList: AppliedMigration[] = [];
  try {
    const res = db.exec('SELECT id, version, name, description, applied_at FROM schema_migrations ORDER BY version ASC');
    if (res && res.length > 0 && res[0].values) {
      for (const row of res[0].values) {
        appliedList.push({
          id: row[0] as number,
          version: row[1] as number,
          name: row[2] as string,
          description: (row[3] as string) || '',
          appliedAt: row[4] as string
        });
      }
    }
  } catch (err) {
    console.warn('[Migrations] Could not query schema_migrations:', err);
  }

  const appliedVersions = new Set(appliedList.map(m => m.version));
  const currentVersion = appliedList.length > 0 ? Math.max(...appliedList.map(m => m.version)) : 0;
  const latestAvailableVersion = MIGRATIONS.length > 0 ? Math.max(...MIGRATIONS.map(m => m.version)) : 0;

  const pendingMigrations = MIGRATIONS
    .filter(m => !appliedVersions.has(m.version))
    .map(m => ({
      version: m.version,
      name: m.name,
      description: m.description
    }));

  // Fetch table counts safely
  const tableCounts: Record<string, number> = {};
  const tablesToCheck = ['teachers', 'schedule_slots', 'absences', 'replacements', 'audit_logs', 'users', 'app_settings'];
  for (const table of tablesToCheck) {
    try {
      const countRes = db.exec(`SELECT COUNT(*) FROM ${table}`);
      tableCounts[table] = (countRes[0]?.values[0]?.[0] as number) || 0;
    } catch {
      tableCounts[table] = 0;
    }
  }

  let dbSize = 0;
  try {
    if (fs.existsSync(DB_FILE)) {
      const stats = fs.statSync(DB_FILE);
      dbSize = stats.size;
    }
  } catch {}

  return {
    currentVersion,
    latestAvailableVersion,
    isUpToDate: pendingMigrations.length === 0,
    appliedMigrations: appliedList,
    pendingMigrations,
    tableCounts,
    databaseSizeBytes: dbSize,
    lastChecked: new Date().toISOString()
  };
}

/**
 * Runs all pending migrations in order, generating a pre-migration safety backup.
 */
export async function runPendingMigrations(
  db: Database,
  trigger: 'auto' | 'manual' = 'auto',
  saveDbCallback?: (db: Database) => void
): Promise<{
  appliedCount: number;
  appliedVersions: number[];
  backupFile: string | null;
  status: MigrationStatus;
  message: string;
}> {
  initMigrationsTable(db);
  const statusBefore = getMigrationStatus(db);

  if (statusBefore.isUpToDate) {
    return {
      appliedCount: 0,
      appliedVersions: [],
      backupFile: null,
      status: statusBefore,
      message: `La base de datos ya está en la versión más reciente (v${statusBefore.currentVersion}). No se requirieron cambios.`
    };
  }

  // Create safety backup prior to modifications
  const targetNextVersion = statusBefore.pendingMigrations[0].version;
  const backupFile = createPreMigrationBackup(db, targetNextVersion);

  const appliedVersions: number[] = [];

  for (const migration of MIGRATIONS) {
    if (!statusBefore.appliedMigrations.some(a => a.version === migration.version)) {
      console.log(`[Migrations] Applying v${migration.version} (${migration.name}) [trigger: ${trigger}]...`);
      try {
        await migration.up(db);

        // Record in schema_migrations
        db.run(
          'INSERT INTO schema_migrations (version, name, description, applied_at) VALUES (?, ?, ?, ?)',
          [migration.version, migration.name, migration.description, new Date().toISOString()]
        );
        appliedVersions.push(migration.version);
        console.log(`[Migrations] Successfully applied v${migration.version}`);
      } catch (migrationErr: any) {
        console.error(`[Migrations] Error applying migration v${migration.version}:`, migrationErr);
        throw new Error(`Fallo al aplicar la migración v${migration.version} (${migration.name}): ${migrationErr.message}`);
      }
    }
  }

  if (saveDbCallback) {
    saveDbCallback(db);
  }

  const statusAfter = getMigrationStatus(db);
  return {
    appliedCount: appliedVersions.length,
    appliedVersions,
    backupFile,
    status: statusAfter,
    message: `Se aplicaron exitosamente ${appliedVersions.length} migraciones sin afectar los datos existentes. Versión actual: v${statusAfter.currentVersion}.`
  };
}
