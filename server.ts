import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import {
  getDatabase,
  getAllTeachersFromDb,
  setAllTeachersInDb,
  updateTeacherEmailInDb,
  updateTeachersBulkInDb,
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
  getRawDatabaseBuffer,
  findUserWithPassword,
  findUserByIdInDb,
  getAllUsersFromDb,
  createUserInDb,
  updateUserPasswordInDb,
  deleteUserInDb,
  verifyPassword,
  getSmtpConfigFromDb,
  saveSmtpConfigInDb
} from './src/db/sqlite';
import { AppUser, SmtpConfig, EmailNotificationResult, ReplacementAssignment } from './src/types';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support JSON payloads up to 50MB (for database uploads)
app.use(express.json({ limit: '50mb' }));

// Active token sessions cache (7-day validity)
interface SessionData {
  user: AppUser;
  expiresAt: number;
}
const activeSessions = new Map<string, SessionData>();

function getRequestUser(req: express.Request): AppUser | null {
  let token: string | null = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (token) {
    const session = activeSessions.get(token);
    if (session) {
      if (session.expiresAt > Date.now()) {
        return session.user;
      } else {
        activeSessions.delete(token);
      }
    }
  }
  return null;
}

// Helper to extract active user name from request
function getUserName(req: express.Request): string {
  const user = getRequestUser(req);
  if (user) {
    return `${user.name} (${user.username})`;
  }
  return (
    (req.body && req.body.userName) ||
    (req.headers['x-user-name'] as string) ||
    'Coordinación Académica'
  );
}

// ----------------- Authentication Endpoints -----------------

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const userWithPw = await findUserWithPassword(username);
    if (!userWithPw) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu usuario y contraseña.' });
    }

    const isValid = verifyPassword(password, userWithPw.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu usuario y contraseña.' });
    }

    // Generate secure session token (64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');
    const userSafe: AppUser = {
      id: userWithPw.id,
      username: userWithPw.username,
      name: userWithPw.name,
      role: userWithPw.role,
      createdAt: userWithPw.createdAt
    };

    // Store in session map for 7 days
    activeSessions.set(token, {
      user: userSafe,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    await addAuditLog({
      action: 'UPDATE_STATUS',
      entityType: 'DATABASE',
      entityId: userSafe.id,
      userName: `${userSafe.name} (${userSafe.username})`,
      details: `Inicio de sesión exitoso desde ${req.ip || 'servidor'}.`
    });

    res.json({
      ok: true,
      token,
      user: userSafe
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'No autenticado o sesión expirada' });
  }
  res.json({ ok: true, user });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    activeSessions.delete(token);
  }
  res.json({ ok: true });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const currentUser = getRequestUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Debes iniciar sesión para cambiar tu contraseña' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Se requiere la contraseña actual y la nueva' });
    }

    const userWithPw = await findUserWithPassword(currentUser.username);
    if (!userWithPw || !verifyPassword(currentPassword, userWithPw.passwordHash)) {
      return res.status(400).json({ error: 'La contraseña actual ingresada es incorrecta' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    await updateUserPasswordInDb(currentUser.id, newPassword, `${currentUser.name} (${currentUser.username})`);
    res.json({ ok: true, message: 'Contraseña actualizada con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- User Management Endpoints (Admin only) -----------------

app.get('/api/users', async (req, res) => {
  try {
    const currentUser = getRequestUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a Administradores' });
    }

    const users = await getAllUsersFromDb();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const currentUser = getRequestUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a Administradores' });
    }

    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Nombre, usuario y contraseña son obligatorios' });
    }

    const newUser = await createUserInDb(
      username,
      password,
      name,
      role || 'coordinator',
      `${currentUser.name} (${currentUser.username})`
    );

    res.json({ ok: true, user: newUser });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const currentUser = getRequestUser(req);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a Administradores' });
    }

    await deleteUserInDb(req.params.id, `${currentUser.name} (${currentUser.username})`);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------- SQLite Core API Endpoints -----------------

app.get('/api/status', async (req, res) => {
  try {
    const teachers = await getAllTeachersFromDb();
    const absences = await getAllAbsencesFromDb();
    const replacements = await getAllReplacementsFromDb();
    const auditLogs = await getAuditLogsFromDb(1);
    const users = await getAllUsersFromDb();

    res.json({
      ok: true,
      database: 'SQLite',
      file: 'data/school_database.sqlite',
      counts: {
        teachers: teachers.length,
        absences: absences.length,
        replacements: replacements.length,
        auditLogsCount: auditLogs.length,
        usersCount: users.length
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
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const teachers = Array.isArray(req.body) ? req.body : req.body.teachers;
    const userName = `${admin.name} (${admin.username})`;
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

// Helper to verify admin authorization
function requireAdmin(req: express.Request, res: express.Response): AppUser | null {
  const user = getRequestUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado: Esta función requiere privilegios de Administrador.' });
    return null;
  }
  return user;
}

// ----------------- Backup and Restore Endpoints (Admin Only) -----------------

// 1. Download SQLite database file (current live DB or a saved backup point)
app.get('/api/backup/download', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const requestedFilename = (req.query.file || req.query.filename) as string | undefined;
    let targetPath: string;
    let outputFilename: string;

    if (requestedFilename) {
      // Secure filename to prevent path traversal
      const safeFilename = path.basename(requestedFilename);
      targetPath = path.resolve(process.cwd(), 'data', 'backups', safeFilename);
      outputFilename = safeFilename;
    } else {
      targetPath = path.resolve(process.cwd(), 'data', 'school_database.sqlite');
      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:T]/g, '_').split('.')[0];
      outputFilename = `fcbv_reemplazos_${dateStr}.sqlite`;
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Archivo de base de datos no encontrado en el servidor' });
    }

    // Record audit log for security
    const userName = `${admin.name} (${admin.username})`;
    await addAuditLog({
      action: 'UPDATE_STATUS',
      entityType: 'DATABASE',
      entityId: outputFilename,
      userName,
      details: `Descarga de base de datos SQLite (${outputFilename}) solicitada por el usuario.`
    });

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.download(targetPath, outputFilename);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a local backup checkpoint on server
app.post('/api/backup/create', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const userName = `${admin.name} (${admin.username})`;
    const description = req.body?.description;
    const filename = await createLocalBackup(userName, description);
    res.json({ ok: true, filename });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. List local backup checkpoints
app.get('/api/backup/list', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const backups = await listLocalBackups();
    res.json(backups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Restore from a local backup file on server
app.post('/api/backup/restore-local', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    const userName = `${admin.name} (${admin.username})`;
    await restoreFromLocalBackup(filename, userName);
    res.json({ ok: true, message: `Restaurado desde ${filename}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Restore from an uploaded base64 SQLite file
app.post('/api/backup/restore-upload', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Base64 data is required' });
    }
    const userName = `${admin.name} (${admin.username})`;
    const buffer = Buffer.from(base64Data, 'base64');
    await restoreFromSqliteBuffer(buffer, userName, filename || 'Archivo subido por usuario');
    res.json({ ok: true, message: 'Base de datos restaurada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- Teacher Email Management Endpoints -----------------

// Update a single teacher's email address
app.post('/api/teachers/:id/email', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { email } = req.body;
    if (typeof email !== 'string') {
      return res.status(400).json({ error: 'El campo de correo electrónico es inválido' });
    }

    const userName = `${admin.name} (${admin.username})`;
    const ok = await updateTeacherEmailInDb(req.params.id, email, userName);
    if (!ok) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }

    res.json({ ok: true, message: 'Correo actualizado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update teachers data (emails, phones, etc.)
app.post('/api/teachers/bulk-update', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Se esperaba un arreglo de actualizaciones' });
    }

    const userName = `${admin.name} (${admin.username})`;
    const updatedCount = await updateTeachersBulkInDb(updates, userName);
    res.json({ ok: true, count: updatedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------- SMTP Settings & Mail Notification Service -----------------

function createMailTransporter(config: SmtpConfig) {
  const isGmail = (config.host || '').toLowerCase().includes('gmail');
  const portNum = Number(config.port) || (config.secure ? 465 : 587);
  const isSecure = config.secure === true || portNum === 465;

  return nodemailer.createTransport({
    host: (config.host || 'smtp.gmail.com').trim(),
    port: portNum,
    secure: isSecure,
    auth: {
      user: (config.user || '').trim(),
      pass: (config.pass || '').trim()
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

function formatSmtpErrorMessage(error: any): string {
  const msg = error?.message || String(error);
  if (msg.includes('EAUTH') || msg.includes('535') || msg.includes('BadCredentials') || msg.includes('Invalid login') || msg.includes('Username and Password not accepted')) {
    return 'Error de autenticación SMTP (Gmail): Verifica tu correo y que la contraseña sea una "Contraseña de Aplicación" de 16 caracteres de Google (con 2FA activado), no tu contraseña normal.';
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('timeout') || msg.includes('ESOCKETTIMEDOUT')) {
    return 'Tiempo de espera agotado al conectar con el servidor SMTP. Verifica el puerto (587 o 465) o si tu red permite conexiones salientes.';
  }
  if (msg.includes('ECONNREFUSED')) {
    return 'Conexión rechazada por el servidor de correo. Verifica la dirección del host y el puerto.';
  }
  if (msg.includes('ENOTFOUND')) {
    return 'No se pudo resolver el host del servidor SMTP. Verifica la dirección del servidor.';
  }
  return msg;
}

function generateReplacementEmailHtml(params: {
  substituteTeacherName: string;
  absentTeacherName: string;
  date: string;
  dayOfWeek: string;
  period: number;
  timeRange: string;
  subject: string;
  grade: string;
  section?: string;
  activityPlan?: string;
}): string {
  const dayNameEs =
    params.dayOfWeek === 'Monday'
      ? 'Lunes'
      : params.dayOfWeek === 'Tuesday'
      ? 'Martes'
      : params.dayOfWeek === 'Wednesday'
      ? 'Miércoles'
      : params.dayOfWeek === 'Thursday'
      ? 'Jueves'
      : params.dayOfWeek === 'Friday'
      ? 'Viernes'
      : params.dayOfWeek;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asignación de Reemplazo Docente</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    <!-- Top Brand Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 26px 24px; text-align: center;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #fbbf24; margin-bottom: 4px;">
          COORDINACIÓN ACADÉMICA
        </div>
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
          Fundación Colegio Bilingüe de Valledupar
        </h1>
        <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 12px;">
          Sistema Institucional de Gestión de Reemplazos Docentes
        </p>
      </td>
    </tr>

    <!-- Main Message Body -->
    <tr>
      <td style="padding: 26px 24px;">
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 14px 16px; border-radius: 6px; margin-bottom: 22px;">
          <h2 style="margin: 0; font-size: 14px; color: #166534; font-weight: 700;">
            🔔 Notificación de Cobertura de Clase
          </h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.4;">
            Estimado(a) <strong>${params.substituteTeacherName}</strong>, se le ha asignado una cobertura de suplencia en su horario disponible.
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 10px 0;">
            Detalles de la Asignación
          </h3>
          <table width="100%" cellpadding="10" cellspacing="0" style="font-size: 13px; border-collapse: separate; border-spacing: 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-weight: 600; width: 38%; padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">📅 Fecha y Día:</td>
              <td style="color: #0f172a; font-weight: 700; padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${dayNameEs}, ${params.date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">⏰ Periodo y Horario:</td>
              <td style="color: #1e40af; font-weight: 800; font-size: 14px; padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">Periodo ${params.period} <span style="font-size: 12px; font-weight: 600; color: #475569;">(${params.timeRange})</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">📚 Asignatura:</td>
              <td style="color: #0f172a; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${params.subject}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="color: #64748b; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">🏫 Grado / Sección:</td>
              <td style="color: #0f172a; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${params.grade} ${params.section ? `<span style="font-size: 11px; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${params.section}</span>` : ''}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 10px 14px;">👤 Docente Titular:</td>
              <td style="color: #b91c1c; font-weight: 700; padding: 10px 14px;">${params.absentTeacherName}</td>
            </tr>
          </table>
        </div>

        <!-- Activity Plan / Notes -->
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin-bottom: 22px;">
          <div style="font-size: 11px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">
            📝 Plan de Trabajo / Indicaciones para la Clase:
          </div>
          <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5; white-space: pre-wrap;">
            ${params.activityPlan || 'Desarrollar el contenido programático de la sesión, supervisar el trabajo individual o grupal y registrar asistencia en el libro de clases.'}
          </p>
        </div>

        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; background-color: #f8fafc; padding: 12px; border-radius: 8px;">
          🏫 <em>Por favor presentarse puntualmente en el aula de clases 5 minutos antes del inicio de la sesión.</em>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">
          Fundación Colegio Bilingüe de Valledupar
        </p>
        <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8;">
          Mensaje generado automáticamente por el Sistema de Reemplazos Docentes.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// GET /api/smtp/config (Admin only)
app.get('/api/smtp/config', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const config = await getSmtpConfigFromDb();
    // Mask password partially for security on display
    const maskedConfig = {
      ...config,
      passMasked: config.pass ? '••••••••••••' : ''
    };
    res.json(maskedConfig);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/smtp/config (Admin only)
app.post('/api/smtp/config', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const existingConfig = await getSmtpConfigFromDb();
    const { host, port, secure, user, pass, fromName, fromEmail, enabled } = req.body;

    const finalPass = (pass && pass.trim() !== '' && pass !== '••••••••••••')
      ? pass.trim()
      : existingConfig.pass;

    const newConfig: SmtpConfig = {
      host: (host || 'smtp.gmail.com').trim(),
      port: Number(port) || 587,
      secure: Boolean(secure),
      user: (user || '').trim(),
      pass: finalPass,
      fromName: (fromName || 'Fundación Colegio Bilingüe de Valledupar').trim(),
      fromEmail: (fromEmail || user || '').trim(),
      enabled: Boolean(enabled)
    };

    const userName = `${admin.name} (${admin.username})`;
    await saveSmtpConfigInDb(newConfig, userName);

    res.json({ ok: true, message: 'Configuración SMTP guardada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/smtp/test (Admin only - verify connection & send test email)
app.post('/api/smtp/test', async (req, res) => {
  try {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { targetEmail } = req.body;
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'Debes proporcionar un correo electrónico válido para la prueba.' });
    }

    const config = await getSmtpConfigFromDb();
    if (!config.user || !config.pass) {
      return res.status(400).json({
        error: 'Faltan credenciales SMTP. Por favor ingresa el usuario (correo) y la contraseña de aplicación antes de probar.'
      });
    }

    const transporter = createMailTransporter(config);

    // Verify SMTP connection
    await transporter.verify();

    // Send test email
    const sender = config.fromEmail || config.user;
    const fromHeader = `"${config.fromName || 'Fundación Colegio Bilingüe'}" <${sender}>`;

    const info = await transporter.sendMail({
      from: fromHeader,
      to: targetEmail.trim(),
      subject: '✅ Prueba de Conexión SMTP - Fundación Colegio Bilingüe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
          <h2 style="color: #1e3a8a; margin-top: 0;">Prueba de Servidor SMTP Exitosa 🎉</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">
            Este mensaje confirma que el servidor de correo <strong>${config.host}</strong> (${config.port}) está correctamente configurado y listo para enviar notificaciones de reemplazos docentes.
          </p>
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 12px; color: #64748b; margin-top: 15px;">
            <strong>Remitente:</strong> ${sender}<br>
            <strong>Destinatario de prueba:</strong> ${targetEmail.trim()}<br>
            <strong>Fecha/Hora:</strong> ${new Date().toLocaleString('es-CO')}
          </div>
        </div>
      `
    });

    res.json({
      ok: true,
      message: `Correo de prueba enviado con éxito a ${targetEmail.trim()}. (Message ID: ${info.messageId})`
    });
  } catch (error: any) {
    console.error('SMTP test error:', error);
    const friendlyMsg = formatSmtpErrorMessage(error);
    res.status(500).json({
      error: friendlyMsg
    });
  }
});

// POST /api/notifications/send-replacements (Send emails to substitute teachers)
app.post('/api/notifications/send-replacements', async (req, res) => {
  try {
    const { replacements } = req.body as { replacements: ReplacementAssignment[] };
    if (!Array.isArray(replacements) || replacements.length === 0) {
      return res.status(400).json({ error: 'No se recibieron reemplazos para notificar' });
    }

    const config = await getSmtpConfigFromDb();
    if (!config.enabled || !config.user || !config.pass) {
      return res.json({
        ok: true,
        sentCount: 0,
        skippedCount: replacements.length,
        reason: 'El servicio SMTP (Gmail) no está habilitado o no tiene credenciales configuradas en el sistema (Administración > Servidor SMTP).',
        results: replacements.map(r => ({
          recipient: '(sin correo)',
          teacherName: r.substituteTeacherName,
          success: false,
          error: 'Servidor SMTP no configurado o deshabilitado'
        }))
      });
    }

    const allTeachers = await getAllTeachersFromDb();
    const teachersById = new Map(allTeachers.map(t => [t.id, t]));
    
    // Helper to normalize teacher names for fuzzy matching
    const normalizeStr = (str: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    const teachersByName = new Map(allTeachers.map(t => [normalizeStr(t.name), t]));

    const transporter = createMailTransporter(config);
    const sender = config.fromEmail || config.user;
    const fromHeader = `"${config.fromName || 'Fundación Colegio Bilingüe'}" <${sender}>`;

    const results: EmailNotificationResult[] = [];
    let sentCount = 0;
    let skippedCount = 0;

    for (const r of replacements) {
      // Look up substitute teacher by ID first, then by normalized Name
      let substitute = teachersById.get(r.substituteTeacherId);
      if (!substitute && r.substituteTeacherName) {
        substitute = teachersByName.get(normalizeStr(r.substituteTeacherName));
      }
      if (!substitute && r.substituteTeacherName) {
        substitute = allTeachers.find(t => 
          t.name.toLowerCase().trim() === r.substituteTeacherName.toLowerCase().trim()
        );
      }

      const targetEmail = substitute?.email?.trim();

      if (!targetEmail || !targetEmail.includes('@')) {
        skippedCount++;
        results.push({
          recipient: targetEmail || '(sin correo)',
          teacherName: r.substituteTeacherName,
          success: false,
          error: `El docente suplente ${r.substituteTeacherName} no tiene correo electrónico asignado en el Directorio Docente.`
        });
        continue;
      }

      try {
        const emailHtml = generateReplacementEmailHtml({
          substituteTeacherName: r.substituteTeacherName,
          absentTeacherName: r.absentTeacherName,
          date: r.date,
          dayOfWeek: r.dayOfWeek,
          period: r.period,
          timeRange: r.timeRange,
          subject: r.subject,
          grade: r.grade,
          section: r.section,
          activityPlan: r.activityPlan
        });

        const dayNameEs =
          r.dayOfWeek === 'Monday'
            ? 'Lunes'
            : r.dayOfWeek === 'Tuesday'
            ? 'Martes'
            : r.dayOfWeek === 'Wednesday'
            ? 'Miércoles'
            : r.dayOfWeek === 'Thursday'
            ? 'Jueves'
            : r.dayOfWeek === 'Friday'
            ? 'Viernes'
            : r.dayOfWeek;

        const mailRes = await transporter.sendMail({
          from: fromHeader,
          to: targetEmail,
          subject: `🔔 Reemplazo Docente: ${r.subject} (${r.grade}) - Periodo ${r.period} [${dayNameEs} ${r.date}]`,
          html: emailHtml
        });

        sentCount++;
        results.push({
          recipient: targetEmail,
          teacherName: r.substituteTeacherName,
          success: true,
          messageId: mailRes.messageId
        });
      } catch (mailErr: any) {
        console.error(`Failed to send email to ${targetEmail}:`, mailErr);
        const friendlyError = formatSmtpErrorMessage(mailErr);
        results.push({
          recipient: targetEmail,
          teacherName: r.substituteTeacherName,
          success: false,
          error: friendlyError
        });
      }
    }

    const activeUser = getRequestUser(req);
    const userName = activeUser ? `${activeUser.name} (${activeUser.username})` : 'Coordinación Académica';
    if (sentCount > 0) {
      await addAuditLog({
        action: 'UPDATE_STATUS',
        entityType: 'REPLACEMENT',
        entityId: 'notifications',
        userName,
        details: `Enviadas ${sentCount} notificaciones por correo electrónico a docentes suplentes.`
      });
    }

    res.json({
      ok: true,
      sentCount,
      skippedCount,
      results
    });
  } catch (error: any) {
    console.error('Error sending replacement notifications:', error);
    const friendlyMsg = formatSmtpErrorMessage(error);
    res.status(500).json({ error: friendlyMsg });
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
