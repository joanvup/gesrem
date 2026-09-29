# ReemplazaDocente — Gestión Inteligente de Reemplazos Docentes

Sistema de gestión, asignación algorítmica y control operativo de reemplazos y suplencias docentes para instituciones educativas (basado en el modelo de horarios **aSc Timetables** de la **Fundación Colegio Bilingüe de Valledupar**).

---

## 🌟 Características Principales

- **Separación Oficial por Secciones**:
  - 🎒 **Primaria**: Grados **1° a 5°** (1A, 1B, 2A, 2B, 3A, 3B, 3C, 4A, 4B, 5A, 5B).
  - 🎓 **Bachillerato**: Grados **6° a 11°** (6A, 6B, 7A, 7B, 8A, 8B, 9A, 9B, 10A, 10B, 11A, 11B).
- **Asignación Automática Inteligente**: Algoritmo de ponderación que prioriza profesores de la misma sección educativa, misma asignatura o departamento, grados conocidos y menor carga previa acumulada para garantizar equidad.
- **Tablero Diario Operativo**: Monitoreo en tiempo real de faltas reportadas, suplencias activas, estado (Confirmado / Borrador) y filtros por periodo y docente.
- **Persistencia con SQLite**: Base de datos relacional integrada en el archivo `data/school_database.sqlite` servida mediante una API REST en Node.js/Express.
- **Log de Auditoría Inmutable**: Registro automático de quién editó, qué cambió y la fecha/hora exacta para todas las creaciones, cambios de estado y eliminaciones de suplencias.
- **Sistema Integrado de Backup y Restauración**:
  - Descarga del archivo SQLite actual (`.sqlite`) directamente desde la interfaz.
  - Generación de puntos de restauración automáticos en `data/backups/`.
  - Restauración segura en un solo clic con creación preventiva de respaldo de seguridad.
  - Subida de archivos `.sqlite` desde la computadora.
- **Planillas Oficiales para Impresión**:
  - Imprimir planilla exclusiva para Coordinación de Primaria (1° a 5°).
  - Imprimir planilla exclusiva para Coordinación de Bachillerato (6° a 11°).
  - Planilla consolidada general y volantes individuales de cobertura docente.
- **Notificaciones por WhatsApp**: Generación instantánea de mensajes formateados con detalles de la hora, salón y plan pedagógico para los profesores de reemplazo.
- **Importador de Horarios en PDF**: Carga y sincronización de mallas curriculares generadas en aSc Timetables.

---

## 📋 Requisitos Previos en Ubuntu Linux

- **Sistema Operativo**: Ubuntu 20.04 LTS, 22.04 LTS, 24.04 LTS o superior.
- **Node.js**: Versión 18.x, 20.x o 22.x LTS (Recomendada: v20.x LTS).
- **npm** (incluido con Node.js) o **bun**.
- **Git**.

---

## 🚀 Guía de Instalación Paso a Paso en Ubuntu Linux

### Paso 1: Actualizar el Sistema

Abre tu terminal en Ubuntu y actualiza la lista de paquetes:

```bash
sudo apt update && sudo apt upgrade -y
```

### Paso 2: Instalar Dependencias Básicas, Git y Node.js

Si no tienes Node.js ni Git instalados, instálalos utilizando el repositorio oficial de NodeSource (versión 20 LTS):

```bash
# Instalar utilidades esenciales
sudo apt install -y curl git build-essential

# Configurar el repositorio oficial de Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js y npm
sudo apt install -y nodejs
```

Verifica que las herramientas quedaron correctamente instaladas:

```bash
node -v   # Debe mostrar v20.x.x o superior
npm -v    # Debe mostrar v10.x.x o superior
git --version
```

---

### Paso 3: Clonar el Repositorio desde GitHub

Clona el proyecto en tu directorio preferido (por ejemplo, en tu carpeta personal `~` o en `/var/www/`):

```bash
cd ~
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git reemplaza-docente
cd reemplaza-docente
```

*(Reemplaza `TU_USUARIO/TU_REPOSITORIO.git` por la URL real de tu repositorio en GitHub).*

---

### Paso 4: Instalar las Dependencias del Proyecto

Ejecuta el gestor de paquetes de Node:

```bash
npm install
```

---

### Paso 5: Configurar las Variables de Entorno

Crea el archivo `.env` a partir de la plantilla `.env.example`:

```bash
cp .env.example .env
```

*(Opcional: Si deseas utilizar funciones con modelos Gemini, edita el archivo con `nano .env` y asigna tu `GEMINI_API_KEY`).*

---

### Paso 6: Permisos para la Carpeta de Base de Datos SQLite

Asegúrate de que la carpeta de almacenamiento de datos existe y tiene permisos de lectura/escritura:

```bash
mkdir -p data
chmod -R 755 data
```

---

## 💻 Ejecución de la Aplicación

### Opción A: Modo Desarrollo

Para desarrollo local con recarga en caliente:

```bash
npm run dev
```

La aplicación iniciará en `http://localhost:3000` (o `http://IP_DE_TU_SERVIDOR:3000`).

---

### Opción B: Modo Producción (Recomendado para uso en el colegio)

1. Compila los assets estáticos de la aplicación frontend:
   ```bash
   npm run build
   ```

2. Inicia el servidor de producción con persistencia SQLite:
   ```bash
   npm start
   ```

---

### Opción C: Ejecutar en Segundo Plano 24/7 con PM2 (Servidor Dedicado)

Para que la aplicación continúe funcionando aunque cierres la terminal y se reinicie automáticamente tras caídas o reinicios del servidor Ubuntu:

1. Instala **PM2** de manera global:
   ```bash
   sudo npm install -g pm2
   ```

2. Inicia la aplicación con PM2:
   ```bash
   pm2 start server.ts --name "reemplazadocente" --interpreter tsx
   ```

3. Guarda la lista de procesos y configura el arranque automático en el sistema:
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Copia y ejecuta en la terminal el comando generado por `pm2 startup` si te lo solicita).*

4. Comandos útiles de PM2:
   - Ver estado: `pm2 status`
   - Ver logs en vivo: `pm2 logs reemplazadocente`
   - Reiniciar: `pm2 restart reemplazadocente`
   - Detener: `pm2 stop reemplazadocente`

---

## 🔒 Configuración del Firewall (UFW) en Ubuntu

Si vas a acceder a la aplicación desde otras computadoras de la red del colegio (computadores de coordinación, secretaría, etc.), habilita el puerto `3000` en el firewall de Ubuntu:

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

Luego podrás ingresar desde cualquier navegador dentro de la misma red local mediante:
```
http://IP_DEL_SERVIDOR_UBUNTU:3000
```
*(Puedes consultar la IP de tu servidor con el comando `hostname -I` o `ip addr`).*

---

## 💾 Copias de Seguridad de la Base de Datos SQLite

Todos los docentes, ausencias, horarios y reemplazos se almacenan en un único archivo SQLite:

```
./data/school_database.sqlite
```

### Para hacer un respaldo manual:
```bash
cp data/school_database.sqlite data/school_database_backup_$(date +%Y%m%d).sqlite
```

### Para restaurar una copia de seguridad:
```bash
cp data/school_database_backup_YYYYMMDD.sqlite data/school_database.sqlite
pm2 restart reemplazadocente
```

---

## 📁 Estructura del Proyecto

```
├── data/                      # Directorio persistente de SQLite
│   └── school_database.sqlite # Base de datos SQLite activa
├── src/
│   ├── components/            # Componentes React (Hub, Tablero, Planillas)
│   │   ├── DailyBoard.tsx     # Tablero diario con separación Primaria / Bachillerato
│   │   ├── PrintSummaryModal.tsx # Planillas oficiales impresas por sección
│   │   ├── ReplacementHub.tsx # Motor de asignación de ausencias
│   │   ├── ScheduleViewer.tsx # Matriz de disponibilidad docente
│   │   └── Navbar.tsx         # Barra superior con estado de SQLite
│   ├── db/
│   │   └── sqlite.ts          # Inicializador y queries SQLite (sql.js)
│   ├── utils/
│   │   ├── replacementEngine.ts # Algoritmo de afinidad por sección (1°-5° vs 6°-11°)
│   │   └── storage.ts         # Sincronizador de API REST y caché local
│   ├── types.ts               # Tipos TypeScript y división de grados
│   └── App.tsx                # Contenedor principal de la aplicación
├── server.ts                  # Servidor Express Full-Stack y API SQLite
├── package.json               # Dependencias y scripts de ejecución
└── vite.config.ts             # Configuración de compilación Vite y Tailwind CSS
```

---

## 🛠️ Solución de Problemas Comunes

1. **Error: `Port 3000 is already in use`**:
   Si el puerto 3000 ya está ocupado por otro servicio, puedes identificarlo y cerrarlo:
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```
   O configurar otro puerto temporalmente en la variable de entorno:
   ```bash
   PORT=8080 npm start
   ```

2. **Permisos en la base de datos**:
   Si recibes errores de escritura en SQLite, asegúrate de que el usuario que ejecuta Node tenga permisos sobre `data/`:
   ```bash
   sudo chown -R $USER:$USER data/
   ```

---

## 📄 Licencia y Créditos

Desarrollado para la **Fundación Colegio Bilingüe de Valledupar** (Año Lectivo 2026/2027) para la optimización de la coordinación académica y la equidad en las asignaciones docentes.
