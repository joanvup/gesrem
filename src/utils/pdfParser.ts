// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Teacher, ScheduleSlot, DayOfWeek, PERIODS_CONFIG, getGradeSection } from '../types';
import { INITIAL_TEACHERS } from '../data/defaultSchedule';
import { generateTeacherEmail } from './emailHelper';

// Ensure Promise.try compatibility across all runtime environments
if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function (fn: any, ...args: any[]) {
    return new Promise(resolve => resolve(fn(...args)));
  };
}

// Configure pdfjs worker in browser environment
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Worker initialization fallback', e);
  }
}

export interface ParseResult {
  teachers: Teacher[];
  pagesProcessed: number;
  warnings: string[];
  institution?: string;
  academicYear?: string;
  totalSlotsExtracted: number;
}

const DAYS_MAP: { regex: RegExp; day: DayOfWeek }[] = [
  { regex: /(?:Monday|Lunes|Lun|Mon)/i, day: 'Monday' },
  { regex: /(?:Tuesday|Martes|Mar|Tue)/i, day: 'Tuesday' },
  { regex: /(?:Wednesday|Mi[eé]rcoles|Mi[eé]|Wed)/i, day: 'Wednesday' },
  { regex: /(?:Thursday|Jueves|Jue|Thu)/i, day: 'Thursday' },
  { regex: /(?:Friday|Viernes|Vie|Fri)/i, day: 'Friday' }
];

// Calibrated geometric day intervals for A4 landscape aSc Timetables
const DEFAULT_DAY_INTERVALS: { day: DayOfWeek; minX: number; maxX: number }[] = [
  { day: 'Monday', minX: 65, maxX: 210 },
  { day: 'Tuesday', minX: 210, maxX: 355 },
  { day: 'Wednesday', minX: 355, maxX: 500 },
  { day: 'Thursday', minX: 500, maxX: 645 },
  { day: 'Friday', minX: 645, maxX: 775 }
];

// Calibrated geometric period intervals (y-coordinates descending from top to bottom)
const DEFAULT_PERIOD_INTERVALS = [
  { period: 1, minY: 395, maxY: 432 },
  { period: 2, minY: 358, maxY: 395 },
  { period: 3, minY: 321, maxY: 358 },
  { period: 4, minY: 284, maxY: 321 },
  { period: 5, minY: 247, maxY: 284 },
  { period: 6, minY: 210, maxY: 247 },
  { period: 7, minY: 173, maxY: 210 },
  { period: 8, minY: 136, maxY: 173 },
  { period: 9, minY: 99, maxY: 136 },
  { period: 10, minY: 62, maxY: 99 },
  { period: 11, minY: 25, maxY: 62 }
];

export function sanitizeTeacherId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeTeacherName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function inferDepartment(subjects: string[]): string {
  const counts: Record<string, number> = {};
  for (const s of subjects) {
    const low = s.toLowerCase();
    let dept = 'Educación General';
    if (low.includes('matem') || low.includes('c[aá]lcul') || low.includes('geom') || low.includes('estad')) dept = 'Matemáticas';
    else if (low.includes('ingl') || low.includes('english') || low.includes('phonics') || low.includes('reading') || low.includes('language arts')) dept = 'Inglés & Bilingüismo';
    else if (low.includes('españ') || low.includes('lengu') || low.includes('literat') || low.includes('lectur')) dept = 'Lengua Castellana';
    else if (low.includes('cienc') || low.includes('biol') || low.includes('qu[ií]m') || low.includes('f[ií]sic') || low.includes('science')) dept = 'Ciencias Naturales';
    else if (low.includes('socia') || low.includes('hist') || low.includes('geogr') || low.includes('filos') || low.includes('c[ií]vic') || low.includes('social studies')) dept = 'Ciencias Sociales';
    else if (low.includes('f[ií]sic') || low.includes('deport') || low.includes('educaci[oó]n f[ií]sica') || low.includes('pe')) dept = 'Educación Física';
    else if (low.includes('art') || low.includes('m[uú]sic') || low.includes('danz') || low.includes('pl[aá]st')) dept = 'Artes & Expresión';
    else if (low.includes('inform') || low.includes('tecnol') || low.includes('rob[oó]t') || low.includes('comput')) dept = 'Tecnología & Sistemas';
    else if (low.includes('relig') || low.includes('[eé]tic') || low.includes('valor')) dept = 'Ética y Valores';

    counts[dept] = (counts[dept] || 0) + 1;
  }

  let topDept = 'Educación General';
  let max = 0;
  for (const [dept, cnt] of Object.entries(counts)) {
    if (cnt > max) {
      max = cnt;
      topDept = dept;
    }
  }
  return topDept;
}

export async function parsePdfSchedule(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  knownExistingTeachers: Teacher[] = []
): Promise<ParseResult> {
  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer instanceof Uint8Array) {
    const copy = new Uint8Array(fileOrBuffer.byteLength);
    copy.set(fileOrBuffer);
    arrayBuffer = copy.buffer;
  } else {
    arrayBuffer = await (fileOrBuffer as File).arrayBuffer();
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages;
  const warnings: string[] = [];
  const extractedTeachers: Teacher[] = [];
  let totalSlotsExtracted = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = (textContent.items as Array<{ str: string; transform: number[]; width: number; height: number }>)
        .map(it => ({
          text: it.str.trim(),
          x: it.transform[4],
          y: it.transform[5],
          width: it.width,
          height: it.height
        }))
        .filter(it => it.text.length > 0);

      if (items.length === 0) {
        warnings.push(`Página ${pageNum}: Sin contenido de texto legible.`);
        continue;
      }

      const fullPageText = items.map(p => p.text).join(' ');

      // 1. Extract Teacher Name from Header (y >= 510)
      let teacherName = '';

      // Find text items located in the top header band (between y=510 and y=575)
      const headerBandItems = items
        .filter(it => it.y >= 510 && it.y <= 575)
        .sort((a, b) => a.x - b.x);

      // Filter out institution name, timetable titles, academic year, etc.
      const nonInstitutional = headerBandItems.filter(it =>
        !/fundaci[oó]n|colegio|biling[uü]e|valledupar|horarios?\s+de\s+clase|timetable|202\d|asc\s*timetables|periodo/i.test(
          it.text
        )
      );

      if (nonInstitutional.length > 0) {
        teacherName = nonInstitutional
          .map(it => it.text)
          .join(' ')
          .replace(/^[-–:;\s]+|[-–:;\s]+$/g, '')
          .trim();
      }

      // Regex fallback if header band was empty or noisy
      if (!teacherName || teacherName.length < 3) {
        const headerPatterns = [
          /(?:Horarios de Clase|Timetable|Horario)\s+(?:Fundaci[oó]n\s+Colegio\s+Biling[uü]e(?:\s+de\s+Valledupar)?)?\s*[-–:]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s/.-]+?)(?=\s*(?:202\d|Monday|Lunes|LUN|Periodo|Grupo|Aula|$))/i,
          /(?:Profesor|Docente|Teacher)\s*:\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s/.-]+?)(?=\s*(?:202\d|Monday|Lunes|$))/i,
          /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\s+(?:202\d\/202\d|aSc)/i
        ];

        for (const pattern of headerPatterns) {
          const match = fullPageText.match(pattern);
          if (match && match[1] && match[1].trim().length > 3) {
            const candidate = match[1].trim();
            if (!candidate.toLowerCase().includes('horario') && !candidate.toLowerCase().includes('colegio')) {
              teacherName = candidate;
              break;
            }
          }
        }
      }

      if (!teacherName) {
        teacherName = `Docente ${pageNum}`;
      }

      // 2. Determine Day Column Boundaries
      // Look for day headers (y around 475-505)
      const dayHeaders: { day: DayOfWeek; x: number }[] = [];
      for (const dayDef of DAYS_MAP) {
        const found = items.find(it => dayDef.regex.test(it.text) && it.y >= 475 && it.y <= 510);
        if (found) {
          dayHeaders.push({ day: dayDef.day, x: found.x });
        }
      }
      dayHeaders.sort((a, b) => a.x - b.x);

      let dayIntervals = DEFAULT_DAY_INTERVALS;
      if (dayHeaders.length === 5) {
        dayIntervals = [
          { day: dayHeaders[0].day, minX: 65, maxX: (dayHeaders[0].x + dayHeaders[1].x) / 2 },
          { day: dayHeaders[1].day, minX: (dayHeaders[0].x + dayHeaders[1].x) / 2, maxX: (dayHeaders[1].x + dayHeaders[2].x) / 2 },
          { day: dayHeaders[2].day, minX: (dayHeaders[1].x + dayHeaders[2].x) / 2, maxX: (dayHeaders[2].x + dayHeaders[3].x) / 2 },
          { day: dayHeaders[3].day, minX: (dayHeaders[2].x + dayHeaders[3].x) / 2, maxX: (dayHeaders[3].x + dayHeaders[4].x) / 2 },
          { day: dayHeaders[4].day, minX: (dayHeaders[3].x + dayHeaders[4].x) / 2, maxX: 775 }
        ];
      }

      // 3. Determine Period Row Intervals
      // Check if period labels (1..11, home) on left column (x < 65) can be anchored
      const periodLabels: { period: number; y: number }[] = [];
      for (let pNum = 1; pNum <= 11; pNum++) {
        // Look for exact standalone number or period marker in the left column
        const found = items.find(
          it => it.x < 65 && it.y >= 25 && it.y <= 450 &&
                (it.text === `${pNum}` || new RegExp(`^Periodo\\s*${pNum}$`, 'i').test(it.text))
        );
        if (found) {
          periodLabels.push({ period: pNum, y: found.y });
        }
      }

      let periodIntervals = DEFAULT_PERIOD_INTERVALS;
      if (periodLabels.length >= 8) {
        // Sort by period number ascending
        periodLabels.sort((a, b) => a.period - b.period);
        periodIntervals = periodLabels.map((pl, idx) => {
          const prev = periodLabels[idx - 1]; // previous period has higher Y
          const next = periodLabels[idx + 1]; // next period has lower Y
          const maxY = prev ? (prev.y + pl.y) / 2 : pl.y + 18;
          const minY = next ? (pl.y + next.y) / 2 : pl.y - 18;
          return { period: pl.period, minY, maxY };
        });
      }

      // 4. Extract Raw Slots from Grid Cells
      interface RawSlot {
        day: DayOfWeek;
        period: number;
        text: string;
        grade: string;
        subject: string;
        isMeeting: boolean;
        classroom?: string;
      }

      const rawSlots: RawSlot[] = [];
      const gradesSet = new Set<string>();
      const detectedSubjectsList: string[] = [];

      for (const d of dayIntervals) {
        for (const p of periodIntervals) {
          // Filter items strictly within cell boundaries, excluding time strings on right edge
          const cellItems = items.filter(
            it => it.x >= d.minX && it.x < d.maxX &&
                  it.y >= p.minY && it.y < p.maxY &&
                  !/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(it.text) &&
                  !/^(?:monday|tuesday|wednesday|thursday|friday|lunes|martes|mi[eé]rcoles|jueves|viernes)$/i.test(it.text)
          );

          if (cellItems.length > 0) {
            const cellText = cellItems.map(it => it.text).join(' ');
            if (cellText.length > 1) {
              const isMeeting = /reuni[oó]n|plc|coordinaci[oó]n|comit[eé]|secci[oó]n|atenci[oó]n/i.test(cellText);
              
              // Match grades such as 1A, 5B, 10A, 11B, Transición, Kínder, Pre-K, 10-1, 11-2
              const gradeMatch = cellText.match(/\b([1-9]|1[01])\s*[A-D]\b|\b([1-9]|1[01])\s*[-–]\s*[1-4]\b|Transici[oó]n|K[ií]nder|Pre-K/i);
              const grade = gradeMatch ? gradeMatch[0].replace(/\s+/g, '').toUpperCase() : (isMeeting ? 'Docentes' : '');

              let subject = cellText
                .replace(/\b([1-9]|1[01])\s*[A-D]\b/gi, '')
                .replace(/\b([1-9]|1[01])\s*[-–]\s*[1-4]\b/gi, '')
                .replace(/\b\d{1,2}:\d{2}\b/g, '')
                .replace(/Aula\s*\w+/gi, '')
                .replace(/Salon\s*\w+/gi, '')
                .trim();

              if (grade && grade !== 'Docentes' && grade !== 'General') {
                gradesSet.add(grade);
              }
              if (subject) {
                detectedSubjectsList.push(subject);
              }

              rawSlots.push({
                day: d.day,
                period: p.period,
                text: cellText,
                grade,
                subject,
                isMeeting
              });
            }
          }
        }
      }

      // Sort raw slots chronologically by day and period
      const dayOrder: Record<DayOfWeek, number> = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5
      };
      rawSlots.sort((a, b) => {
        if (dayOrder[a.day] !== dayOrder[b.day]) {
          return dayOrder[a.day] - dayOrder[b.day];
        }
        return a.period - b.period;
      });

      // 5. Multi-Period Block Pairing & Inheritance
      // In aSc Timetables, a multi-period block frequently places the subject in period N and group/grade in period N+1 (or vice-versa)
      for (let i = 0; i < rawSlots.length; i++) {
        const cur = rawSlots[i];
        const prev = rawSlots[i - 1];
        const next = rawSlots[i + 1];

        if (cur.isMeeting) {
          if (!cur.subject) cur.subject = cur.text;
          continue;
        }

        // Current has subject but no grade; check if next slot is adjacent in same day and has grade
        if (cur.subject && !cur.grade && next && next.day === cur.day && next.period === cur.period + 1 && next.grade) {
          cur.grade = next.grade;
          if (!next.subject) next.subject = cur.subject;
        }

        // Current has grade but no subject; check if previous slot is adjacent in same day and has subject
        if (cur.grade && !cur.subject && prev && prev.day === cur.day && prev.period === cur.period - 1 && prev.subject) {
          cur.subject = prev.subject;
        }
      }

      // Infer predominant subject for this teacher to fill any remaining solitary grade slots
      const primarySubject = detectedSubjectsList.length > 0 ? detectedSubjectsList[0] : '';

      // 6. Assemble Final ScheduleSlots
      const finalSlots: ScheduleSlot[] = rawSlots.map(s => {
        let finalSubject = s.subject;
        if (!finalSubject || finalSubject.length === 0) {
          finalSubject = s.isMeeting
            ? (s.text || 'Reunión de Área / PLC')
            : (primarySubject || 'Clase Curricular');
        }

        let finalGrade = s.grade;
        if (!finalGrade || finalGrade.length === 0) {
          finalGrade = s.isMeeting ? 'Docentes' : 'General';
        }

        const timeConfig = PERIODS_CONFIG.find(pc => pc.number === s.period);
        const timeRange = s.day === 'Friday' && timeConfig?.fridayTime
          ? timeConfig.fridayTime
          : (timeConfig?.regularTime || `${s.period}° Periodo`);

        return {
          day: s.day,
          period: s.period,
          subject: finalSubject,
          grade: finalGrade,
          timeRange,
          isMeeting: s.isMeeting
        };
      });

      totalSlotsExtracted += finalSlots.length;

      // Determine grades taught array
      const gradesTaught = Array.from(gradesSet);

      // Infer Section (Primaria, Bachillerato, Ambas)
      let section: 'Primaria' | 'Bachillerato' | 'Ambas' = 'Ambas';
      if (gradesTaught.length > 0) {
        const sections = gradesTaught.map(g => getGradeSection(g));
        const hasPrimaria = sections.includes('Primaria');
        const hasBachillerato = sections.includes('Bachillerato');
        if (hasPrimaria && !hasBachillerato) section = 'Primaria';
        else if (hasBachillerato && !hasPrimaria) section = 'Bachillerato';
        else section = 'Ambas';
      }

      // Match against known teachers (from database or default list) to preserve configured email/phone
      const normalizedCurrent = normalizeTeacherName(teacherName);
      const matchedTeacher =
        knownExistingTeachers.find(
          t => normalizeTeacherName(t.name) === normalizedCurrent ||
               t.id === sanitizeTeacherId(teacherName)
        ) ||
        INITIAL_TEACHERS.find(
          t => normalizeTeacherName(t.name) === normalizedCurrent ||
               t.id === sanitizeTeacherId(teacherName)
        );

      // Department inference
      const department =
        matchedTeacher?.department ||
        (detectedSubjectsList.length > 0 ? inferDepartment(detectedSubjectsList) : 'Educación General');

      const teacherRecord: Teacher = {
        id: matchedTeacher?.id || sanitizeTeacherId(teacherName),
        name: teacherName,
        department,
        section: matchedTeacher?.section || section,
        gradesTaught: gradesTaught.length > 0 ? gradesTaught : (matchedTeacher?.gradesTaught || []),
        slots: finalSlots,
        // Crucial: preserve existing email/phone, or automatically assign institutional email (firstInitial + lastName@colegiobilingue.edu.co)
        phone: matchedTeacher?.phone || '',
        email: (matchedTeacher?.email && matchedTeacher.email.trim().length > 0)
          ? matchedTeacher.email.trim()
          : generateTeacherEmail(teacherName)
      };

      // Avoid duplicate teacher IDs in same PDF
      const existingIdx = extractedTeachers.findIndex(t => t.id === teacherRecord.id);
      if (existingIdx >= 0) {
        extractedTeachers[existingIdx] = teacherRecord;
      } else {
        extractedTeachers.push(teacherRecord);
      }
    } catch (err: any) {
      warnings.push(`Página ${pageNum}: ${err.message || 'Error al procesar página'}`);
    }
  }

  if (extractedTeachers.length === 0) {
    throw new Error('No se pudo extraer ningún horario del archivo PDF. Verifica que sea un PDF de aSc Timetables válido.');
  }

  return {
    teachers: extractedTeachers,
    pagesProcessed: numPages,
    warnings,
    institution: 'Fundación Colegio Bilingüe de Valledupar',
    academicYear: '2026/2027',
    totalSlotsExtracted
  };
}
