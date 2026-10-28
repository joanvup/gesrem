# Plan de Implementación: Persistencia Segura y Sistema de Migraciones no Destructivas

Garantizar que la base de datos de producción (`school_database.sqlite` / `data/`) nunca se sobrescriba ni se comitee en git, y dotar al sistema de un mecanismo de migraciones de esquema versionado y seguro (tanto automático al arranque como manual desde el panel de administración) con respaldo previo automático ante cualquier cambio estructural.

---

## 1. Protección de Base de Datos en Control de Versiones (.gitignore)
- Agregar reglas estrictas en `.gitignore` para:
  - `data/`
  - `*.sqlite`
  - `*.sqlite-journal`
  - `*.db`
  - `*.sqlite.bak*`
  - `data/backups/`
- Asegurar que ningún archivo de base de datos con información real de producción pueda ser trackeado o reemplazado por commits futuros.

---

## 2. Sistema de Migraciones Versionadas y No Destructivas (`src/db/migrations.ts`)
- Implementar una tabla de control de versiones `schema_migrations`:
  ```sql
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );
  ```
- **Registro de migraciones ordenadas**:
  - Migración 1: Tablas base iniciales (`teachers`, `schedule_slots`, `absences`, `replacement_assignments`, `audit_logs`, `backups`, `app_users`, `smtp_config`).
  - Migraciones incrementales futuras: Adición segura de columnas (`ALTER TABLE ... ADD COLUMN`), creación de índices para optimización, nuevas tablas o vistas sin afectar los registros existentes.
- **Respaldo preventivo automático**:
  - Antes de ejecutar cualquier migración nueva, el sistema crea automáticamente un snapshot de seguridad en `data/backups/pre_migration_v{version}_{timestamp}.sqlite` y un registro en la tabla `backups`.
- **Ejecución dual**:
  - **Al inicio del servidor**: Durante `getDatabase()`, revisa las migraciones pendientes y las aplica de forma transparente sin alterar datos.
  - **Manual vía API / UI**: Endpoint para comprobar el estado y forzar la verificación/actualización bajo demanda.

---

## 3. Endpoints de Backend (`server.ts`)
- `GET /api/migrations/status`: Devuelve el número de versión actual, migraciones aplicadas, migraciones pendientes, tamaño del archivo y recuento de registros por tabla.
- `POST /api/migrations/run`: Ejecuta manualmente cualquier migración pendiente, genera el backup previo y devuelve el resultado detallado con registro de auditoría.

---

## 4. Interfaz de Usuario en Panel de Auditoría y Respaldo (`AuditAndBackup.tsx`)
- Nueva tarjeta interactiva **"Estructura y Migraciones de Base de Datos"**:
  - Muestra la versión actual del esquema de base de datos.
  - Visualización del estado de salud de la base de datos (tablas verificadas, registros existentes conservados).
  - Botón: **"Comprobar y Actualizar Estructura"** con confirmación y badge de estado en tiempo real.
  - Alerta informativa garantizando que ningún cambio estructural afectará o borrará los datos existentes.

---

## 5. Verificación y Pruebas
1. Verificar que `.gitignore` excluye efectivamente los archivos de base de datos.
2. Probar el arranque del servidor comprobando que `schema_migrations` se inicializa y detecta el esquema actual sin borrar profesores, asignaciones ni correos configurados.
3. Probar el endpoint `GET /api/migrations/status` y `POST /api/migrations/run`.
4. Comprobar que en la UI de Auditoría y Respaldo se visualiza el estado y el botón funciona correctamente.
5. Ejecutar `compile_applet` para garantizar que la compilación de TypeScript y Vite es 100% limpia.
