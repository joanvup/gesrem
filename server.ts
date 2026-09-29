import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  getDatabase,
  getAllTeachersFromDb,
  setAllTeachersInDb,
  getAllAbsencesFromDb,
  addAbsenceToDb,
  getAllReplacementsFromDb,
  addReplacementsToDb,
  toggleReplacementStatusInDb,
  deleteReplacementFromDb,
  resetDatabaseToDefault,
  getAuditLogsFromDb,
  addAuditLog,
  createLocalBackup,
  listLocalBackups,
  restoreFromLocalBackup,
  restoreFromSqliteBuffer,
  getRawDatabaseBuffer
} from './src/db/sqlite';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support JSON payloads up to 50MB (for database uploads)
app.use(express.json({ limit: '50mb' }));

// Helper to extract active user name from request
function getUserName(req: express.Request): string {
  return (
    (req.body && req.body.userName) ||
    (req.headers['x-user-name'] as string) ||
    'Coordinación Académica'
  );
}

// ----------------- SQLite API Endpoints -----------------

app.get('/api/status', async (req, res) => {
  try {
    const teachers = await getAllTeachersFromDb();
    const absences = await getAllAbsencesFromDb();
    const replacements = await getAllReplacementsFromDb();
    const auditLogs = await getAuditLogsFromDb(1);

    res.json({
      ok: true,
      database: 'SQLite',
      file: 'data/school_database.sqlite',
      counts: {
        teachers: teachers.length,
        absences: absences.length,
        replacements: replacements.length,
        auditLogsCount: auditLogs.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Teachers
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await getAllTeachersFromDb();
    res.json(teachers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers', async (req, res) => {
  try {
    const teachers = Array.isArray(req.body) ? req.body : req.body.teachers;
    const userName = getUserName(req);
    if (!Array.isArray(teachers)) {
      return res.status(400).json({ error: 'Expected an array of teachers' });
    }
    await setAllTeachersInDb(teachers, userName);
    res.json({ ok: true, count: teachers.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Absences
app.get('/api/absences', async (req, res) => {
  try {
    const absences = await getAllAbsencesFromDb();
    res.json(absences);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/absences', async (req, res) => {
  try {
    const absence = req.body.absence || req.body;
    const userName = getUserName(req);
    await addAbsenceToDb(absence, userName);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Replacements
app.get('/api/replacements', async (req, res) => {
  try {
    const replacements = await getAllReplacementsFromDb();
    res.json(replacements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/replacements', async (req, res) => {
  try {
    const payload = req.body;
    const replacements = Array.isArray(payload) ? payload : payload.replacements || [payload];
    const userName = getUserName(req);
    await addReplacementsToDb(replacements, userName);
    res.json({ ok: true, count: replacements.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/replacements/:id/status', async (req, res) => {
  try {
    const userName = getUserName(req);
    const newStatus = await toggleReplacementStatusInDb(req.params.id, userName);
    res.json({ ok: true, status: newStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/replacements/:id', async (req, res) => {
  try {
    const userName = getUserName(req);
    await deleteReplacementFromDb(req.params.id, userName);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    const userName = getUserName(req);
    await resetDatabaseToDefault(userName);
    const teachers = await getAllTeachersFromDb();
    res.json({ ok: true, teachersCount: teachers.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- Audit Logs Endpoints -----------------

app.get('/api/audit-logs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 250;
    const logs = await getAuditLogsFromDb(limit);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  try {
    const { action, entityType, entityId, details, previousValue, newValue } = req.body;
    const userName = getUserName(req);
    await addAuditLog({
      action,
      entityType,
      entityId,
      userName,
      details,
      previousValue,
      newValue
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- Backup and Restore Endpoints -----------------

// 1. Download current raw SQLite database file
app.get('/api/backup/download', async (req, res) => {
  try {
    const dbPath = path.resolve(process.cwd(), 'data', 'school_database.sqlite');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T]/g, '_').split('.')[0];
    const filename = `fcbv_reemplazos_${dateStr}.sqlite`;

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.download(dbPath, filename);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a local backup checkpoint on server
app.post('/api/backup/create', async (req, res) => {
  try {
    const userName = getUserName(req);
    const filename = await createLocalBackup(userName);
    res.json({ ok: true, filename });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. List local backup checkpoints
app.get('/api/backup/list', async (req, res) => {
  try {
    const backups = await listLocalBackups();
    res.json(backups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Restore from a local backup file on server
app.post('/api/backup/restore-local', async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    const userName = getUserName(req);
    await restoreFromLocalBackup(filename, userName);
    res.json({ ok: true, message: `Restaurado desde ${filename}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Restore from an uploaded base64 SQLite file
app.post('/api/backup/restore-upload', async (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Base64 data is required' });
    }
    const userName = getUserName(req);
    const buffer = Buffer.from(base64Data, 'base64');
    await restoreFromSqliteBuffer(buffer, userName, filename || 'Archivo subido por usuario');
    res.json({ ok: true, message: 'Base de datos restaurada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- Server Initialization -----------------

async function startServer() {
  // Initialize SQLite database
  await getDatabase();
  console.log('SQLite database initialized successfully at data/school_database.sqlite');

  if (!isProduction) {
    // Vite middleware in development
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
