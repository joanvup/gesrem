# Corrección del Parser de Horarios PDF (aSc Timetables) y Preservación de Correos Docentes

Plan integral para resolver las discrepancias en la asignación de horarios entre versiones de PDF (v1.7 y v1.9) y asegurar que cualquier actualización de archivo mantenga intactos los correos y teléfonos institucionales configurados.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Hallazgos Clave del Análisis de los PDFs v1.7 y v1.9**:
> 1. **Diferencia de idioma en encabezados de días**: La versión 1.7 tiene días en español (`Lunes`, `Martes`, etc.), mientras que la versión 1.9 está en inglés (`Monday`, `Tuesday`, etc.). Ambos formatos deben ser reconocidos sin ambigüedad por coordenadas espaciales ($X$).
> 2. **Detección errónea de periodos**: La expresión regular anterior confundía números de periodos (ej. 1, 7, 8, 9, 10) con marcas horarias (`7:00`, `8:44`, `9:31`) y con el texto de pie de página (`versión 1.7`, `versión 1.9` a $Y=17$), desfasando las filas de clases y forzando caídas al horario estático de respaldo.
> 3. **Variación en nombres de profesores**: Docentes con nombres compuestos o con números (como `Ingles 1 y 2 Profesor`, `Science 6, 7 y 8 Profesor`, `Arte/Musica Profesor` y `Teacher Valeria Peña`) fallaban en el patrón regex al no admitir dígitos o tener posiciones de encabezado ligeramente distintas, provocando un desalineamiento secuencial con la lista estática.
> 4. **Preservación de correos**: Al subir un nuevo PDF, el sistema reemplazaba la tabla de docentes sin transferir los correos y teléfonos previamente registrados en SQLite, dejándolos en blanco.

- **Preservación Automática de Correos y Teléfonos**: Al procesar cualquier nuevo PDF, el sistema cruzará la nómina entrante con la nómina actual en la base de datos (por ID normalizado y coincidencia fonética/lexical de nombre) conservando el 100% de los correos, teléfonos y departamentos ya configurados.
- **Detección Geométrica Rigurosa de Celdas**: El parser se basará en las bandas fijas de coordenadas de aSc Timetables (filas de periodos $Y \in [459, 30]$ y columnas de días $X \in [80, 800]$), eliminando la dependencia de coincidencias frágiles por texto o respaldos fijos obsoletos.

---

## 1. Overview & Core Concept

- **Qué hace**:
  Permite cargar de manera infalible cualquier versión generada por *aSc Timetables* (tanto con encabezados en español como en inglés, y con cualquier variación en el orden o nómina de docentes como v1.7 y v1.9), extrayendo exactamente los 11 periodos lectivos, homeroom y reuniones semanales, sin perder jamás los correos institucionales asignados previamente.
- **Audiencia**:
  Coordinación académica, rectoría y directores de sección de la Fundación Colegio Bilingüe de Valledupar (FCBV).
- **Valor agregado**:
  Tranquilidad operativa absoluta al actualizar la malla horaria a lo largo del año lectivo: las asignaciones de suplencias y el despacho de correos SMTP continúan funcionando sin interrupciones ni pérdida de datos de contacto.

---

## 2. User Experience & Visual Design

### Flujo de Usuario Mejorado

1. **Carga y Verificación Visual**:
   - En el módulo **"Cargar Horario PDF"**, el usuario arrastra o selecciona el archivo (ej. `Horarios Primaria-Bachillerato 2026-2027 ver 1.9 (Profesores).pdf`).
   - Se muestra un progreso en 3 pasos con diseño sobrio y limpio:
     1. Creación de respaldo preventivo automático en SQLite.
     2. Análisis espacial de cuadrícula y extracción de docentes.
     3. Sincronización y fusión de correos existentes.
2. **Resumen de Resultados y Fusión de Correos**:
   - Tras el procesamiento, el panel despliega un resumen cuantitativo claro y tabular:
     - Docentes identificados (ej. 37 docentes).
     - Clases y reuniones extraídas con precisión.
     - **Métrica de Correos Preservados**: Indicador explícito de cuántos correos institucionales fueron preservados de la versión anterior (ej. *"37 docentes actualizados · 35 correos institucionales preservados · 0 eliminados"*).
     - Si se detectan docentes completamente nuevos en el PDF, se señalan sutilmente para que coordinación pueda asignarles su correo institucional desde el módulo de Auditoría y Directorio.
3. **Inspección en el Visor de Horarios**:
   - En la pestaña de Horarios, al seleccionar cualquier docente (incluyendo nuevos como `Anaya Loly` o `Teacher Valeria Peña`), se visualiza su malla horaria fidedigna para cada día de la semana de Periodo 1 a Periodo 11.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Fusión Inteligente de Docentes (Smart Merge)**:
  - *Enfoque*: En lugar de un reemplazo destructivo ciego (`DELETE FROM teachers`), el cargador toma los docentes existentes en la base de datos SQLite antes de la actualización y propaga sus campos de contacto (`email`, `phone`, `department` si fue ajustado manualmente) a los registros entrantes mediante coincidencia por ID normalizado y nombres similares.
  - *Por qué*: Los correos son configurados manualmente o por lotes por el coordinador; una actualización pedagógica de horario no debe destruir datos administrativos.
- **Decisión 2: Detección Robusta de Cuadrícula aSc Timetables**:
  - *Enfoque*: Identificar la fila de cada periodo mediante la posición exacta de las etiquetas numéricas `1` a `11` en la columna izquierda ($X \in [15, 60]$) y franjas horarias contiguas, desestimando pies de página y marcas de agua.
  - *Por qué*: Evita los falsos positivos donde el texto "versión 1.9" o timestamps como "7:10" eran interpretados como número de periodo.
- **Decisión 3: Extracción Robusta del Nombre del Docente**:
  - *Enfoque*: Extraer el nombre directamente de la coordenada superior derecha de la cabecera ($Y \in [520, 560]$, $X > 200$), filtrando el nombre de la institución y el año lectivo, permitiendo caracteres alfanuméricos y formatos especiales (`Ingles 1 y 2 Profesor`, `Teacher Valeria Peña`).
  - *Por qué*: No depende de un listado estático predeterminado ni falla ante reorganizaciones de páginas entre versiones.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Flujo de Datos

```
┌────────────────────────────────────────────────────────┐
│             Archivo PDF aSc Timetables                 │
│      (ver 1.7 ES, ver 1.9 EN, o futuras versiones)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               pdfParser.ts Refactorizado               │
│  ├─ Detección de Nombre por Coordenada Header (y≈532)   │
│  ├─ Detección de Columnas (Lun/Mon..Vie/Fri)           │
│  ├─ Mapeo de Periodos por Etiquetas (X<60, Y desc)     │
│  └─ Asignación de Celdas (Asignatura + Grado)         │
└───────────────────────────┬────────────────────────────┘
                            │ Nuevos Docentes + Slots
                            ▼
┌────────────────────────────────────────────────────────┐
│            PdfLoader.tsx / Smart Merger                │
│  ├─ Carga docentes actuales de la BD SQLite            │
│  ├─ Cruce bidireccional (ID normalizado / Nombre)      │
│  └─ Inyección de correos y teléfonos existentes        │
└───────────────────────────┬────────────────────────────┘
                            │ Docentes fusionados
                            ▼
┌────────────────────────────────────────────────────────┐
│            Base de Datos SQLite (sqlite.ts)            │
│  ├─ Copia de respaldo automática en /data              │
│  ├─ Actualización atómica de nómina y slots            │
│  └─ Registro de auditoría (Audit Log)                  │
└────────────────────────────────────────────────────────┘
```

### Plan de Cambios Específicos

1. **`src/utils/pdfParser.ts`**:
   - Reescribir la detección de docentes: inspeccionar elementos de texto en la zona superior de cada página ($Y \in [515, 565]$), filtrando términos conocidos de la institución (`Fundación`, `Colegio`, `Bilingüe`, `Valledupar`, `Horarios`, `2026/2027`, `aSc`) para obtener el nombre exacto del profesor sin importar si incluye números o cargos.
   - Corregir el mapeo de columnas de días: admitir indistintamente `Lunes|Monday`, `Martes|Tuesday`, `Miércoles|Wednesday`, `Jueves|Thursday`, `Viernes|Friday`.
   - Corregir la detección de filas de periodos: filtrar exclusivamente los números de periodo `1` a `11` ubicados en $X < 60$ dentro del rango vertical válido de la tabla ($Y \in [40, 435]$), ignorando timestamps y el pie de página ($Y < 25$).
   - Aceptar la lista de docentes existentes opcionalmente en `parsePdfSchedule(file, existingTeachers)` para preservar inmediatamente correos y configuraciones previas.
2. **`src/components/PdfLoader.tsx`**:
   - Obtener la lista actual de docentes (`teachers`) y pasarla al proceso de análisis y fusión.
   - Al recibir la nueva nómina del PDF, fusionar los datos preservando correos (`email`), teléfonos (`phone`) y cualquier personalización.
   - Presentar en la interfaz métricas claras de preservación de correos tras la carga.
3. **`src/db/sqlite.ts` & `src/utils/storage.ts`**:
   - Garantizar que la persistencia preserve y audite los correos que se conservaron.
4. **Verificación Automatizada**:
   - Probar directamente el parser contra ambos archivos existentes en `/public`:
     - `Horarios Primaria-Bachillerato 2026-2027 ver 1.7 (Profesores).pdf` (37 páginas)
     - `Horarios Primaria-Bachillerato 2026-2027 ver 1.9 (Profesores).pdf` (37 páginas)
   - Verificar que todos los docentes extraigan sus periodos correctamente (sin caer a slots vacíos o predeterminados) y que ningún correo se pierda al alternar entre ambos archivos.
