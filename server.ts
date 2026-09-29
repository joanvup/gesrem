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
  resetDatabaseToDefault
} from './src/db/sqlite';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// SQLite API endpoints
app.get('/api/status', async (req, res) => {
  try {
    const teachers = await getAllTeachersFromDb();
    const absences = await getAllAbsencesFromDb();
    const replacements = await getAllReplacementsFromDb();

    res.json({
      ok: true,
      database: 'SQLite',
      file: 'data/school_database.sqlite',
      counts: {
        teachers: teachers.length,
        absences: absences.length,
        replacements: replacements.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

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
    const teachers = req.body;
    if (!Array.isArray(teachers)) {
      return res.status(400).json({ error: 'Expected an array of teachers' });
    }
    await setAllTeachersInDb(teachers);
    res.json({ ok: true, count: teachers.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
    const absence = req.body;
    await addAbsenceToDb(absence);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
    const replacements = Array.isArray(req.body) ? req.body : [req.body];
    await addReplacementsToDb(replacements);
    res.json({ ok: true, count: replacements.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/replacements/:id/status', async (req, res) => {
  try {
    const newStatus = await toggleReplacementStatusInDb(req.params.id);
    res.json({ ok: true, status: newStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/replacements/:id', async (req, res) => {
  try {
    await deleteReplacementFromDb(req.params.id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    await resetDatabaseToDefault();
    const teachers = await getAllTeachersFromDb();
    res.json({ ok: true, teachersCount: teachers.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
