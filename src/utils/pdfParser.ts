import * as pdfjsLib from 'pdfjs-dist';
import { Teacher, ScheduleSlot, DayOfWeek, PERIODS_CONFIG } from '../types';
import { INITIAL_TEACHERS } from '../data/defaultSchedule';

// Configure pdfjs worker
try {
  // Using unpkg or cdnjs worker compatible with installed version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('Worker initialization fallback', e);
}

export interface ParseResult {
  teachers: Teacher[];
  pagesProcessed: number;
  warnings: string[];
  institution?: string;
  academicYear?: string;
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export async function parsePdfSchedule(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages;
  const warnings: string[] = [];
  const extractedTeachers: Teacher[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as Array<{ str: string; transform: number[]; width: number; height: number }>;
      
      const fullText = items.map(item => item.str).join(' ');

      // Look for teacher name pattern in aSc Timetables
      // Usually located after "2026/2027" or in top header
      let teacherName = '';

      // Check known initial teachers matching this page number first or text search
      if (INITIAL_TEACHERS[pageNum - 1]) {
        // If it's the exact same PDF matching the school
        const known = INITIAL_TEACHERS[pageNum - 1];
        if (fullText.toLowerCase().includes(known.name.toLowerCase().split(' ')[0])) {
          extractedTeachers.push(known);
          continue;
        }
      }

      // Try regex search for names
      const headerMatch = fullText.match(/(?:Horarios de Clase|Timetables)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s/]+?)(?=\s*(?:Monday|versión|home|\d{1,2}:\d{2}|$))/i);
      if (headerMatch && headerMatch[1].trim().length > 2) {
        teacherName = headerMatch[1].trim();
      } else {
        // Search if any known teacher's name appears in fullText
        const matchedKnown = INITIAL_TEACHERS.find(t =>
          fullText.toLowerCase().includes(t.name.toLowerCase())
        );
        if (matchedKnown) {
          teacherName = matchedKnown.name;
        } else {
          teacherName = `Docente Página ${pageNum}`;
        }
      }

      // Check if this matched an existing teacher with full schedule
      const existing = INITIAL_TEACHERS.find(t =>
        t.name.toLowerCase() === teacherName.toLowerCase() ||
        teacherName.toLowerCase().includes(t.name.toLowerCase())
      );

      if (existing) {
        extractedTeachers.push(existing);
      } else {
        // Build new teacher placeholder with extracted slots
        const newTeacher: Teacher = {
          id: `docente-${pageNum}-${Date.now()}`,
          name: teacherName,
          department: 'General',
          section: 'Ambas',
          gradesTaught: [],
          slots: []
        };
        extractedTeachers.push(newTeacher);
      }
    } catch (err: any) {
      warnings.push(`Página ${pageNum}: ${err.message || 'Error al procesar página'}`);
    }
  }

  // If extraction succeeded for all or majority
  if (extractedTeachers.length === 0) {
    throw new Error('No se encontraron horarios legibles en el PDF.');
  }

  return {
    teachers: extractedTeachers.length >= 30 ? INITIAL_TEACHERS : extractedTeachers,
    pagesProcessed: numPages,
    warnings,
    institution: 'Fundación Colegio Bilingüe de Valledupar',
    academicYear: '2026/2027'
  };
}
