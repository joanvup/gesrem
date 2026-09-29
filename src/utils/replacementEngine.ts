import {
  Teacher,
  ScheduleSlot,
  DayOfWeek,
  ReplacementAssignment,
  CandidateAvailability,
  PERIODS_CONFIG,
  getGradeSection,
  SchoolSection
} from '../types';

export function getSlotTime(periodNumber: number, day: DayOfWeek): string {
  const p = PERIODS_CONFIG.find(item => item.number === periodNumber);
  if (!p) return '';
  if (day === 'Friday' && p.fridayTime) {
    return p.fridayTime;
  }
  return p.regularTime;
}

export function getTeacherSlot(teacher: Teacher, day: DayOfWeek, period: number): ScheduleSlot | undefined {
  return teacher.slots.find(s => s.day === day && s.period === period);
}

export function isTeacherBusy(
  teacher: Teacher,
  date: string,
  day: DayOfWeek,
  period: number,
  activeReplacements: ReplacementAssignment[]
): { busy: boolean; reason?: string } {
  // 1. Regular schedule class or meeting
  const regularSlot = getTeacherSlot(teacher, day, period);
  if (regularSlot) {
    if (regularSlot.isMeeting) {
      return { busy: true, reason: `En ${regularSlot.subject} (${regularSlot.grade})` };
    }
    return { busy: true, reason: `En clase: ${regularSlot.subject} ${regularSlot.grade}` };
  }

  // 2. Already assigned to another replacement on the same date and period
  const replacementAssignment = activeReplacements.find(
    r => r.substituteTeacherId === teacher.id && r.date === date && r.period === period
  );
  if (replacementAssignment) {
    return {
      busy: true,
      reason: `Asignado a reemplazo (${replacementAssignment.subject} ${replacementAssignment.grade})`
    };
  }

  return { busy: false };
}

export function calculateCandidateCompatibility(
  candidate: Teacher,
  absentTeacher: Teacher,
  slotToCover: ScheduleSlot,
  pastReplacementsCount: number,
  day: DayOfWeek
): { score: number; reasons: string[] } {
  let score = 50; // Base score for being free
  const reasons: string[] = ['Disponible en este periodo'];

  // Educational Section alignment: Primaria (1 a 5) vs Bachillerato (6 a 11)
  const classSection: SchoolSection = getGradeSection(slotToCover.grade);
  const isCandidateSameSection = candidate.section === classSection;
  const isCandidateAmbas = candidate.section === 'Ambas';

  if (isCandidateSameSection) {
    score += 35;
    reasons.push(`Docente de Sección ${classSection} (Grados ${classSection === 'Primaria' ? '1° a 5°' : '6° a 11°'})`);
  } else if (isCandidateAmbas) {
    score += 20;
    reasons.push(`Docente de ambas secciones (${classSection})`);
  } else {
    // Cross-section penalty: prefer keeping teachers in their own section
    score -= 20;
  }

  // Subject / Department Match
  const candidateDept = candidate.department.toLowerCase();
  const absentDept = absentTeacher.department.toLowerCase();
  const targetSubject = slotToCover.subject.toLowerCase();

  const isSameDept = candidateDept === absentDept ||
    candidateDept.includes(absentDept) ||
    absentDept.includes(candidateDept);

  const candidateTeachesSubject = candidate.slots.some(
    s => s.subject.toLowerCase() === targetSubject
  );

  if (candidateTeachesSubject) {
    score += 30;
    reasons.push(`Enseña la misma asignatura (${slotToCover.subject})`);
  } else if (isSameDept) {
    score += 20;
    reasons.push(`Mismo departamento (${candidate.department})`);
  }

  // Grade familiarity
  if (candidate.gradesTaught.includes(slotToCover.grade)) {
    score += 15;
    reasons.push(`Conoce el grupo ${slotToCover.grade}`);
  }

  // Workload balance penalty / bonus (fair distribution)
  if (pastReplacementsCount === 0) {
    score += 15;
    reasons.push('Sin reemplazos previos acumulados (prioridad equidad)');
  } else if (pastReplacementsCount <= 2) {
    score += 5;
    reasons.push(`Carga baja de reemplazos (${pastReplacementsCount})`);
  } else {
    const penalty = Math.min(pastReplacementsCount * 5, 30);
    score -= penalty;
  }

  // Schedule continuity: has class right before or after on this day?
  const prevSlot = getTeacherSlot(candidate, day, slotToCover.period - 1);
  const nextSlot = getTeacherSlot(candidate, day, slotToCover.period + 1);
  if (prevSlot || nextSlot) {
    score += 10;
    reasons.push('Ya se encuentra en el colegio en periodos contiguos');
  }

  return { score: Math.max(score, 10), reasons };
}

export function evaluateCandidatesForSlot(
  teachers: Teacher[],
  absentTeacher: Teacher,
  slotToCover: ScheduleSlot,
  date: string,
  day: DayOfWeek,
  currentReplacements: ReplacementAssignment[],
  allHistoryReplacements: ReplacementAssignment[]
): {
  freeCandidates: CandidateAvailability[];
  busyCandidates: CandidateAvailability[];
} {
  // Count past completed replacements for equity
  const pastCountMap: Record<string, number> = {};
  allHistoryReplacements.forEach(r => {
    pastCountMap[r.substituteTeacherId] = (pastCountMap[r.substituteTeacherId] || 0) + 1;
  });

  const freeCandidates: CandidateAvailability[] = [];
  const busyCandidates: CandidateAvailability[] = [];

  for (const teacher of teachers) {
    // Cannot substitute oneself
    if (teacher.id === absentTeacher.id) continue;

    const busyCheck = isTeacherBusy(teacher, date, day, slotToCover.period, currentReplacements);
    const pastCount = pastCountMap[teacher.id] || 0;

    if (busyCheck.busy) {
      busyCandidates.push({
        teacher,
        isFree: false,
        busyReason: busyCheck.reason,
        score: 0,
        reasons: [busyCheck.reason || 'Ocupado'],
        pastReplacementsCount: pastCount
      });
    } else {
      const evaluation = calculateCandidateCompatibility(
        teacher,
        absentTeacher,
        slotToCover,
        pastCount,
        day
      );
      freeCandidates.push({
        teacher,
        isFree: true,
        score: evaluation.score,
        reasons: evaluation.reasons,
        pastReplacementsCount: pastCount
      });
    }
  }

  // Sort free candidates by highest compatibility score, then lowest past replacements count
  freeCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.pastReplacementsCount - b.pastReplacementsCount;
  });

  return { freeCandidates, busyCandidates };
}

export function autoGenerateAssignmentsForAbsence(
  absenceId: string,
  absentTeacher: Teacher,
  targetSlots: ScheduleSlot[],
  date: string,
  day: DayOfWeek,
  allTeachers: Teacher[],
  existingReplacements: ReplacementAssignment[],
  allHistoryReplacements: ReplacementAssignment[]
): {
  assignments: ReplacementAssignment[];
  unassignedSlots: ScheduleSlot[];
} {
  const newAssignments: ReplacementAssignment[] = [];
  const unassignedSlots: ScheduleSlot[] = [];

  // Track assignments dynamically within this run to avoid double booking
  const simulatedReplacements = [...existingReplacements];

  for (const targetSlot of targetSlots) {
    // Skip if target slot is a meeting or PLC without a class
    if (targetSlot.isMeeting) continue;

    const { freeCandidates } = evaluateCandidatesForSlot(
      allTeachers,
      absentTeacher,
      targetSlot,
      date,
      day,
      simulatedReplacements,
      allHistoryReplacements
    );

    if (freeCandidates.length > 0) {
      const best = freeCandidates[0];
      const timeRange = targetSlot.timeRange || getSlotTime(targetSlot.period, day);

      const assignment: ReplacementAssignment = {
        id: `rep_${Date.now()}_${targetSlot.period}_${Math.random().toString(36).substring(2, 7)}`,
        absenceId,
        date,
        dayOfWeek: day,
        period: targetSlot.period,
        timeRange,
        grade: targetSlot.grade,
        section: getGradeSection(targetSlot.grade),
        subject: targetSlot.subject,
        absentTeacherId: absentTeacher.id,
        absentTeacherName: absentTeacher.name,
        substituteTeacherId: best.teacher.id,
        substituteTeacherName: best.teacher.name,
        substituteDepartment: best.teacher.department,
        score: best.score,
        matchReasons: best.reasons,
        status: 'confirmed',
        activityPlan: `Seguimiento de temario escolar (${targetSlot.subject} ${targetSlot.grade})`,
        assignedAt: new Date().toISOString()
      };

      newAssignments.push(assignment);
      simulatedReplacements.push(assignment);
    } else {
      unassignedSlots.push(targetSlot);
    }
  }

  return { assignments: newAssignments, unassignedSlots };
}
