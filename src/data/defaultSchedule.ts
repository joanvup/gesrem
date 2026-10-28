import { Teacher, ScheduleSlot, DayOfWeek } from '../types';

function slot(day: DayOfWeek, periods: number[], subject: string, grade: string, isMeeting = false, timeRange?: string): ScheduleSlot[] {
  return periods.map(p => ({
    day,
    period: p,
    subject,
    grade,
    isMeeting,
    timeRange
  }));
}

export const INSTITUTION_INFO = {
  name: 'Fundación Colegio Bilingüe de Valledupar',
  period: '2026/2027',
  source: 'Horarios de Clase versión 1.8 (aSc Timetables)',
};

export const INITIAL_TEACHERS: Teacher[] = [
  // 1. Muegues Danyely (Ingles / Soc Stud - Primaria)
  {
    id: 'muegues-danyely',
    name: 'Muegues Danyely',
    department: 'Inglés',
    section: 'Primaria',
    gradesTaught: ['1A', '1B'],
    phone: '+57 300 123 4501',
    slots: [
      ...slot('Monday', [1], 'Ingles', '1B'),
      ...slot('Monday', [2, 3], 'Ingles', '1A'),
      ...slot('Monday', [8], 'Soc Stud', '1B'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [1], 'Soc Stud', '1B'),
      ...slot('Tuesday', [2, 3], 'Ingles', '1A'),
      ...slot('Tuesday', [8, 9], 'Ingles', '1B'),
      ...slot('Tuesday', [10], 'Soc Stud', '1A'),

      ...slot('Wednesday', [1, 2], 'Ingles', '1A'),
      ...slot('Wednesday', [5, 6], 'Ingles', '1B'),
      ...slot('Wednesday', [8], 'Soc Stud', '1A'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1, 2], 'Ingles', '1B'),
      ...slot('Thursday', [9, 10], 'Ingles', '1A'),

      ...slot('Friday', [1, 2], 'Ingles', '1B', false, '7:29 - 9:03'),
      ...slot('Friday', [4], 'Ingles', '1A', false, '9:48 - 10:28'),
    ]
  },

  // 2. Anaya Loly (Ingles / Soc Stud - Primaria)
  {
    id: 'anaya-loly',
    name: 'Anaya Loly',
    department: 'Inglés',
    section: 'Primaria',
    gradesTaught: ['2A', '2B'],
    phone: '+57 300 123 4502',
    slots: [
      ...slot('Monday', [1], 'Soc Stud', '2A'),
      ...slot('Monday', [2, 3], 'Ingles', '2A'),
      ...slot('Monday', [5, 6], 'Ingles', '2B'),
      ...slot('Monday', [8], 'Soc Stud', '2B'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [2, 3], 'Ingles', '2B'),
      ...slot('Tuesday', [8, 9], 'Ingles', '2A'),

      ...slot('Wednesday', [5, 6], 'Ingles', '2A'),
      ...slot('Wednesday', [8], 'Ingles', '2B'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [3], 'Soc Stud', '2B'),
      ...slot('Thursday', [5, 6], 'Ingles', '2A'),
      ...slot('Thursday', [8, 9], 'Ingles', '2B'),
      ...slot('Thursday', [10], 'Soc Stud', '2A'),

      ...slot('Friday', [2], 'Ingles', '2A', false, '8:16 - 9:03'),
      ...slot('Friday', [5, 6], 'Ingles', '2B', false, '10:28 - 12:00'),
    ]
  },

  // 3. Santos Wanda (Ingles - Primaria)
  {
    id: 'santos-wanda',
    name: 'Santos Wanda',
    department: 'Inglés',
    section: 'Primaria',
    gradesTaught: ['3A', '3B', '3C'],
    phone: '+57 300 123 4503',
    slots: [
      ...slot('Monday', [2, 3], 'Ingles', '3C'),
      ...slot('Monday', [5, 6], 'Ingles', '3A'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [1, 2], 'Ingles', '3B'),
      ...slot('Tuesday', [5, 6], 'Ingles', '3C'),
      ...slot('Tuesday', [9, 10], 'Ingles', '3A'),

      ...slot('Wednesday', [2, 3], 'Ingles', '3C'),
      ...slot('Wednesday', [5, 6], 'Ingles', '3B'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1, 2], 'Ingles', '3A'),
      ...slot('Thursday', [5, 6], 'Ingles', '3B'),
      ...slot('Thursday', [8, 9], 'Ingles', '3C'),

      ...slot('Friday', [1, 2], 'Ingles', '3B', false, '7:29 - 9:03'),
      ...slot('Friday', [5, 6], 'Ingles', '3A', false, '10:28 - 12:00'),
    ]
  },

  // 4. Cruz Maria Patricia (Ingles / Soc Stud - Primaria)
  {
    id: 'cruz-maria-patricia',
    name: 'Cruz Maria Patricia',
    department: 'Inglés',
    section: 'Primaria',
    gradesTaught: ['3A', '4A', '4B'],
    phone: '+57 300 123 4504',
    slots: [
      ...slot('Monday', [1], 'Soc Stud', '4B'),
      ...slot('Monday', [2, 3], 'Ingles', '4B'),
      ...slot('Monday', [8], 'Soc Stud', '4A'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [1], 'Soc Stud', '3A'),
      ...slot('Tuesday', [2, 3], 'Ingles', '4B'),
      ...slot('Tuesday', [8, 9], 'Ingles', '4A'),
      ...slot('Tuesday', [10], 'Soc Stud', '4B'),

      ...slot('Wednesday', [1, 2], 'Ingles', '4B'),
      ...slot('Wednesday', [3], 'Soc Stud', '4A'),
      ...slot('Wednesday', [5, 6], 'Ingles', '4A'),
      ...slot('Wednesday', [8], 'Soc Stud', '3A'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [9, 10], 'Ingles', '4A'),

      ...slot('Friday', [1, 2], 'Ingles', '4A', false, '7:29 - 9:03'),
      ...slot('Friday', [5, 6], 'Ingles', '4B', false, '10:28 - 12:00'),
    ]
  },

  // 5. Meléndez Adriana (Ingles / Soc Stud - Primaria)
  {
    id: 'melendez-adriana',
    name: 'Meléndez Adriana',
    department: 'Inglés',
    section: 'Primaria',
    gradesTaught: ['3B', '3C', '5A', '5B'],
    phone: '+57 300 123 4505',
    slots: [
      ...slot('Monday', [1], 'Soc Stud', '5B'),
      ...slot('Monday', [2, 3], 'Ingles', '5B'),
      ...slot('Monday', [5, 6], 'Ingles', '5A'),
      ...slot('Monday', [8], 'Soc Stud', '3C'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [1], 'Soc Stud', '5A'),
      ...slot('Tuesday', [2], 'Soc Stud', '5B'),
      ...slot('Tuesday', [5, 6], 'Ingles', '5B'),
      ...slot('Tuesday', [8, 9], 'Ingles', '5A'),

      ...slot('Wednesday', [1], 'Ingles', '5A'),
      ...slot('Wednesday', [2, 3], 'Ingles', '5B'),
      ...slot('Wednesday', [6], 'Soc Stud', '5A'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1], 'Soc Stud', '3B'),
      ...slot('Thursday', [3], 'Soc Stud', '3C'),
      ...slot('Thursday', [5, 6], 'Ingles', '5A'),

      ...slot('Friday', [1], 'Ingles', '5B', false, '7:29 - 8:16'),
      ...slot('Friday', [4], 'Soc Stud', '3B', false, '9:48 - 10:28'),
    ]
  },

  // 6. Ferreira Valentina (Ingles - Bachillerato)
  {
    id: 'ferreira-valentina',
    name: 'Ferreira Valentina',
    department: 'Inglés',
    section: 'Bachillerato',
    gradesTaught: ['6A', '6B', '7A', '7B'],
    phone: '+57 300 123 4506',
    slots: [
      ...slot('Monday', [2, 3], 'Ingles', '7B'),
      ...slot('Monday', [6, 7], 'Ingles', '6A'),
      ...slot('Monday', [9, 10], 'Ingles', '7A'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [2, 3], 'Ingles', '7B'),
      ...slot('Tuesday', [6, 7], 'Ingles', '6B'),

      ...slot('Wednesday', [1, 2], 'Ingles', '6A'),
      ...slot('Wednesday', [3, 4], 'Ingles', '7A'),
      ...slot('Wednesday', [9, 10], 'Ingles', '6B'),

      ...slot('Thursday', [1, 2], 'Ingles', '6A'),
      ...slot('Thursday', [3, 4], 'Ingles', '6B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1, 2], 'Ingles', '7B', false, '7:29 - 9:03'),
      ...slot('Friday', [5, 6], 'Ingles', '7A', false, '10:28 - 12:00'),
    ]
  },

  // 7. Taylor Nick (Ingles - Bachillerato)
  {
    id: 'taylor-nick',
    name: 'Taylor Nick',
    department: 'Inglés',
    section: 'Bachillerato',
    gradesTaught: ['8A', '8B', '9A', '9B'],
    phone: '+57 300 123 4507',
    slots: [
      ...slot('Monday', [3, 4], 'Ingles', '8B'),
      ...slot('Monday', [6, 7], 'Ingles', '8A'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [3, 4], 'Ingles', '9A'),
      ...slot('Tuesday', [6, 7], 'Ingles', '9B'),

      ...slot('Wednesday', [3, 4], 'Ingles', '9A'),
      ...slot('Wednesday', [6, 7], 'Ingles', '9B'),
      ...slot('Wednesday', [9, 10], 'Ingles', '8B'),

      ...slot('Thursday', [1, 2], 'Ingles', '8B'),
      ...slot('Thursday', [3], 'Ingles', '9A'),
      ...slot('Thursday', [4], 'Ingles', '9B'),
      ...slot('Thursday', [6, 7], 'Ingles', '8A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [5, 6], 'Ingles', '8A', false, '10:28 - 12:00'),
    ]
  },

  // 8. Torres Leonardo (Ingles - Bachillerato)
  {
    id: 'torres-leonardo',
    name: 'Torres Leonardo',
    department: 'Inglés',
    section: 'Bachillerato',
    gradesTaught: ['10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4508',
    slots: [
      ...slot('Monday', [1, 2], 'Ingles', '10B'),
      ...slot('Monday', [6, 7], 'Ingles', '11B'),
      ...slot('Monday', [10], 'Ingles', '10A'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [1, 2], 'Ingles', '11A'),
      ...slot('Tuesday', [6, 7], 'Ingles', '10A'),

      ...slot('Wednesday', [3, 4], 'Ingles', '11B'),
      ...slot('Wednesday', [6, 7], 'Ingles', '10A'),

      ...slot('Thursday', [3, 4], 'Ingles', '10B'),
      ...slot('Thursday', [9, 10], 'Ingles', '11A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1, 2], 'Ingles', '10B', false, '7:29 - 9:03'),
      ...slot('Friday', [3], 'Ingles', '11B', false, '9:03 - 9:48'),
      ...slot('Friday', [5, 6], 'Ingles', '11A', false, '10:28 - 12:00'),
    ]
  },

  // 9. Uhls Alexander (Soc Stud - Bachillerato)
  {
    id: 'uhls-alexander',
    name: 'Uhls Alexander',
    department: 'Ciencias Sociales',
    section: 'Bachillerato',
    gradesTaught: ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4509',
    slots: [
      ...slot('Monday', [1, 2], 'Soc Stud', '9A'),
      ...slot('Monday', [7], 'Soc Stud', '6B'),
      ...slot('Monday', [9, 10], 'Soc Stud', '9B'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [1], 'Soc Stud', '8B'),
      ...slot('Tuesday', [2], 'Soc Stud', '7A'),
      ...slot('Tuesday', [3, 4], 'Soc Stud', '6A'),
      ...slot('Tuesday', [6, 7], 'Soc Stud', '11B'),

      ...slot('Wednesday', [1, 2], 'Soc Stud', '8A'),
      ...slot('Wednesday', [3, 4], 'Soc Stud', '10B'),
      ...slot('Wednesday', [7], 'Soc Stud', '7B'),
      ...slot('Wednesday', [9, 10], 'Soc Stud', '11A'),

      ...slot('Thursday', [1], 'Soc Stud', '7A'),
      ...slot('Thursday', [2, 3], 'Soc Stud', '10A'),
      ...slot('Thursday', [7], 'Soc Stud', '7B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Soc Stud', '9B', false, '7:29 - 8:16'),
      ...slot('Friday', [3], 'Soc Stud', '8B', false, '9:03 - 9:48'),
      ...slot('Friday', [5], 'Soc Stud', '9A', false, '10:28 - 11:15'),
      ...slot('Friday', [6], 'Soc Stud', '6B', false, '11:15 - 12:00'),
    ]
  },

  // 10. Quintana Claudia (Español - Primaria)
  {
    id: 'quintana-claudia',
    name: 'Quintana Claudia',
    department: 'Español',
    section: 'Primaria',
    gradesTaught: ['1A', '1B', '2A', '2B', '3C'],
    phone: '+57 300 123 4510',
    slots: [
      ...slot('Monday', [2, 3], 'Español', '1B'),

      ...slot('Tuesday', [2, 3], 'Español', '2A'),
      ...slot('Tuesday', [5, 6], 'Español', '1B'),
      ...slot('Tuesday', [8, 9], 'Español', '1A'),
      ...slot('Tuesday', [11], 'PLC Español', 'Docentes', true),

      ...slot('Wednesday', [5, 6], 'Español', '2B'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1, 2], 'Español', '2B'),
      ...slot('Thursday', [5, 6], 'Español', '3C'),
      ...slot('Thursday', [8, 9], 'Español', '2A'),

      ...slot('Friday', [1, 2], 'Español', '1A', false, '7:29 - 9:03'),
      ...slot('Friday', [5, 6], 'Español', '3C', false, '10:28 - 12:00'),
    ]
  },

  // 11. Echavez Jenny (Español - Primaria)
  {
    id: 'echavez-jenny',
    name: 'Echavez Jenny',
    department: 'Español',
    section: 'Primaria',
    gradesTaught: ['3A', '3B', '4A', '4B', '5A'],
    phone: '+57 300 123 4511',
    slots: [
      ...slot('Monday', [1, 2], 'Español', '3B'),
      ...slot('Monday', [5, 6], 'Español', '4A'),

      ...slot('Tuesday', [2, 3], 'Español', '4A'),
      ...slot('Tuesday', [8, 9], 'Español', '4B'),
      ...slot('Tuesday', [11], 'PLC Español', 'Docentes', true),

      ...slot('Wednesday', [1, 2], 'Español', '3B'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1, 2], 'Español', '5A'),
      ...slot('Thursday', [5, 6], 'Español', '4B'),
      ...slot('Thursday', [8, 9], 'Español', '3A'),

      ...slot('Friday', [1, 2], 'Español', '3A', false, '7:29 - 9:03'),
      ...slot('Friday', [4, 5], 'Español', '5A', false, '9:48 - 11:15'),
    ]
  },

  // 12. Camargo Claudia (Español - Bachillerato)
  {
    id: 'camargo-claudia',
    name: 'Camargo Claudia',
    department: 'Español',
    section: 'Bachillerato',
    gradesTaught: ['5B', '6A', '6B', '7A', '7B'],
    phone: '+57 300 123 4512',
    slots: [
      ...slot('Monday', [1, 2], 'Español', '6B'),
      ...slot('Monday', [3, 4], 'Español', '7A'),

      ...slot('Tuesday', [1, 2], 'Español', '6A'),
      ...slot('Tuesday', [4], 'Español', '6B'),
      ...slot('Tuesday', [6, 7], 'Español', '7B'),
      ...slot('Tuesday', [11], 'PLC Español', 'Docentes', true),

      ...slot('Wednesday', [1], 'Español', '7A'),
      ...slot('Wednesday', [2, 3], 'Español', '6B'),
      ...slot('Wednesday', [6, 7], 'Español', '6A'),
      ...slot('Wednesday', [10], 'Español', '7B'),

      ...slot('Thursday', [2, 3], 'Español', '7B'),
      ...slot('Thursday', [6, 7], 'Español', '7A'),
      ...slot('Thursday', [9, 10], 'Español', '5B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [2, 3], 'Español', '6A', false, '8:16 - 9:48'),
      ...slot('Friday', [4, 5], 'Español', '5B', false, '9:48 - 11:15'),
    ]
  },

  // 13. Diaz Yajaira (Español - Bachillerato)
  {
    id: 'diaz-yajaira',
    name: 'Diaz Yajaira',
    department: 'Español',
    section: 'Bachillerato',
    gradesTaught: ['8A', '8B', '9A', '9B'],
    phone: '+57 300 123 4513',
    slots: [
      ...slot('Monday', [2, 3], 'Español', '9A'),

      ...slot('Tuesday', [1, 2], 'Español', '9B'),
      ...slot('Tuesday', [3, 4], 'Español', '8B'),
      ...slot('Tuesday', [6, 7], 'Español', '9A'),
      ...slot('Tuesday', [11], 'PLC Español', 'Docentes', true),

      ...slot('Wednesday', [3, 4], 'Español', '8B'),
      ...slot('Wednesday', [9, 10], 'Español', '9A'),

      ...slot('Thursday', [3, 4], 'Español', '8A'),
      ...slot('Thursday', [6, 7], 'Español', '9B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [2, 3], 'Español', '8A', false, '8:16 - 9:48'),
      ...slot('Friday', [5, 6], 'Español', '9B', false, '10:28 - 12:00'),
    ]
  },

  // 14. Áviles Angélica (Español - Bachillerato)
  {
    id: 'aviles-angelica',
    name: 'Áviles Angélica',
    department: 'Español',
    section: 'Bachillerato',
    gradesTaught: ['10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4514',
    slots: [
      ...slot('Monday', [3, 4], 'Español', '11B'),
      ...slot('Monday', [6, 7], 'Español', '11A'),
      ...slot('Monday', [9, 10], 'Español', '10B'),

      ...slot('Tuesday', [1, 2], 'Español', '10A'),
      ...slot('Tuesday', [3], 'Español', '11A'),
      ...slot('Tuesday', [11], 'PLC Español', 'Docentes', true),

      ...slot('Wednesday', [1, 2], 'Español', '11A'),
      ...slot('Wednesday', [6, 7], 'Español', '10B'),
      ...slot('Wednesday', [9, 10], 'Español', '11B'),

      ...slot('Thursday', [1, 2], 'Español', '10B'),
      ...slot('Thursday', [3, 4], 'Español', '11B'),
      ...slot('Thursday', [10], 'Español', '10A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [5, 6], 'Español', '10A', false, '10:28 - 12:00'),
    ]
  },

  // 15. Salgado Raúl (Francés - Primaria y Bachillerato)
  {
    id: 'salgado-raul',
    name: 'Salgado Raúl',
    department: 'Idiomas (Francés)',
    section: 'Ambas',
    gradesTaught: ['5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B'],
    phone: '+57 300 123 4515',
    slots: [
      ...slot('Monday', [2], 'Frances', '9B'),
      ...slot('Monday', [3], 'Frances', '5A'),
      ...slot('Monday', [4], 'Frances', '8A'),
      ...slot('Monday', [6], 'Frances', '7B'),
      ...slot('Monday', [10], 'Frances', '8B'),
      ...slot('Monday', [11], 'PLC Ingles', 'Docentes', true),

      ...slot('Tuesday', [1], 'Frances', '5B'),
      ...slot('Tuesday', [2], 'Frances', '8A'),
      ...slot('Tuesday', [3], 'Frances', '9B'),
      ...slot('Tuesday', [7], 'Frances', '7A'),

      ...slot('Wednesday', [1, 2], 'Frances', '9A'),
      ...slot('Wednesday', [5], 'Frances', '5A'),
      ...slot('Wednesday', [6], 'Frances', '7B'),
      ...slot('Wednesday', [7], 'Frances', '6B'),

      ...slot('Thursday', [2], 'Frances', '5B'),
      ...slot('Thursday', [3], 'Frances', '8B'),
      ...slot('Thursday', [6], 'Frances', '9A'),
      ...slot('Thursday', [7], 'Frances', '6A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [2], 'Frances', '7A', false, '8:16 - 9:03'),
      ...slot('Friday', [3], 'Frances', '6B', false, '9:03 - 9:48'),
      ...slot('Friday', [6], 'Frances', '6A', false, '11:15 - 12:00'),
    ]
  },

  // 16. Salinas Karenys (Sociales / Historia - Primaria)
  {
    id: 'salinas-karenys',
    name: 'Salinas Karenys',
    department: 'Ciencias Sociales',
    section: 'Primaria',
    gradesTaught: ['1A', '1B', '2A', '2B', '3A', '3B', '3C'],
    phone: '+57 300 123 4516',
    slots: [
      ...slot('Monday', [1], 'Sociales', '3C'),
      ...slot('Monday', [3], 'Historia', '3A'),
      ...slot('Monday', [5], 'Historia', '3C'),
      ...slot('Monday', [8], 'Historia', '3B'),

      ...slot('Tuesday', [1], 'Historia', '1A'),
      ...slot('Tuesday', [2], 'Sociales', '3A'),
      ...slot('Tuesday', [3], 'Historia', '3A'),
      ...slot('Tuesday', [5], 'Sociales', '2A'),
      ...slot('Tuesday', [6], 'Historia', '2B'),
      ...slot('Tuesday', [8], 'Sociales', '3B'),
      ...slot('Tuesday', [11], 'PLC Sociales', 'Docentes', true),

      ...slot('Wednesday', [1], 'Sociales', '3C'),
      ...slot('Wednesday', [2], 'Sociales', '2B'),
      ...slot('Wednesday', [6], 'Sociales', '1A'),
      ...slot('Wednesday', [8], 'Historia', '3C'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1], 'Historia', '2A'),
      ...slot('Thursday', [2], 'Sociales', '3B'),
      ...slot('Thursday', [3], 'Historia', '1B'),
      ...slot('Thursday', [5], 'Sociales', '1A'),
      ...slot('Thursday', [6], 'Sociales', '3A'),
      ...slot('Thursday', [8], 'Historia', '3B'),
      ...slot('Thursday', [10], 'Sociales', '1B'),

      ...slot('Friday', [1], 'Sociales', '2B', false, '7:29 - 8:16'),
      ...slot('Friday', [4], 'Sociales', '1B', false, '9:48 - 10:28'),
      ...slot('Friday', [6], 'Sociales', '2A', false, '11:15 - 12:00'),
    ]
  },

  // 17. Salcedo Daniel (Sociales / Historia - Primaria y Bachillerato)
  {
    id: 'salcedo-daniel',
    name: 'Salcedo Daniel',
    department: 'Ciencias Sociales',
    section: 'Ambas',
    gradesTaught: ['4A', '4B', '5A', '5B', '6A', '6B'],
    phone: '+57 300 123 4517',
    slots: [
      ...slot('Monday', [1], 'Sociales', '6A'),
      ...slot('Monday', [2], 'Historia', '6A'),
      ...slot('Monday', [3], 'Sociales', '6B'),
      ...slot('Monday', [5], 'Sociales', '4B'),
      ...slot('Monday', [6], 'Historia', '4B'),
      ...slot('Monday', [8], 'Sociales', '5A'),

      ...slot('Tuesday', [1, 2], 'Historia', '6B'),
      ...slot('Tuesday', [3], 'Historia', '5B'),
      ...slot('Tuesday', [6], 'Sociales', '4A'),
      ...slot('Tuesday', [10], 'Historia', '5A'),
      ...slot('Tuesday', [11], 'PLC Sociales', 'Docentes', true),

      ...slot('Wednesday', [1], 'Sociales', '5B'),
      ...slot('Wednesday', [4], 'Sociales', '6B'),
      ...slot('Wednesday', [6], 'Historia', '4B'),
      ...slot('Wednesday', [8], 'Historia', '4A'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [3], 'Sociales', '4B'),
      ...slot('Thursday', [5], 'Sociales', '4A'),
      ...slot('Thursday', [6], 'Historia', '4A'),
      ...slot('Thursday', [8], 'Sociales', '5B'),
      ...slot('Thursday', [10], 'Sociales', '5A'),

      ...slot('Friday', [1], 'Sociales', '6A', false, '7:29 - 8:16'),
      ...slot('Friday', [2], 'Historia', '5A', false, '8:16 - 9:03'),
      ...slot('Friday', [5], 'Historia', '6A', false, '10:28 - 11:15'),
      ...slot('Friday', [6], 'Historia', '5B', false, '11:15 - 12:00'),
    ]
  },

  // 18. Cairoza Leonel (Sociales / Filosofía - Bachillerato)
  {
    id: 'cairoza-leonel',
    name: 'Cairoza Leonel',
    department: 'Ciencias Sociales y Filosofía',
    section: 'Bachillerato',
    gradesTaught: ['7A', '7B', '8A', '8B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4518',
    slots: [
      ...slot('Monday', [1], 'Sociales', '8B'),
      ...slot('Monday', [2], 'Filosofía', '10B'),
      ...slot('Monday', [4], 'Sociales', '7B'),
      ...slot('Monday', [7], 'Historia', '7A'),
      ...slot('Monday', [9], 'Filosofía', '11B'),
      ...slot('Monday', [10], 'Historia', '7B'),

      ...slot('Tuesday', [2], 'Filosofía', '11B'),
      ...slot('Tuesday', [3], 'Historia', '8A'),
      ...slot('Tuesday', [4], 'Sociales', '8A'),
      ...slot('Tuesday', [7], 'Filosofía', '10B'),
      ...slot('Tuesday', [10], 'Filosofía', '10A'),
      ...slot('Tuesday', [11], 'PLC Sociales', 'Docentes', true),

      ...slot('Wednesday', [1], 'Historia', '7B'),
      ...slot('Wednesday', [6], 'Historia', '7A'),
      ...slot('Wednesday', [7], 'Sociales', '8A'),
      ...slot('Wednesday', [9], 'Sociales', '7A'),
      ...slot('Wednesday', [10], 'Historia', '8A'),

      ...slot('Thursday', [1], 'Sociales', '7B'),
      ...slot('Thursday', [2], 'Sociales', '7A'),
      ...slot('Thursday', [3], 'Filosofía', '11A'),
      ...slot('Thursday', [6], 'Historia', '8B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Filosofía', '10A', false, '7:29 - 8:16'),
      ...slot('Friday', [2], 'Sociales', '8B', false, '8:16 - 9:03'),
      ...slot('Friday', [3], 'Filosofía', '11A', false, '9:03 - 9:48'),
      ...slot('Friday', [6], 'Historia', '8B', false, '11:15 - 12:00'),
    ]
  },

  // 19. Saumet Guillermo (Sociales / Historia - Bachillerato)
  {
    id: 'saumet-guillermo',
    name: 'Saumet Guillermo',
    department: 'Ciencias Sociales',
    section: 'Bachillerato',
    gradesTaught: ['9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4519',
    slots: [
      ...slot('Monday', [1, 2], 'Sociales', '10A'),
      ...slot('Monday', [3], 'Historia', '10B'),
      ...slot('Monday', [4], 'Historia', '10A'),
      ...slot('Monday', [9], 'Historia', '11A'),
      ...slot('Monday', [10], 'Historia', '9A'),

      ...slot('Tuesday', [3], 'Historia', '10A'),
      ...slot('Tuesday', [4], 'Historia', '10B'),
      ...slot('Tuesday', [9, 10], 'Sociales', '9A'),
      ...slot('Tuesday', [11], 'PLC Sociales', 'Docentes', true),

      ...slot('Wednesday', [2], 'Sociales', '9B'),
      ...slot('Wednesday', [4], 'Historia', '11A'),
      ...slot('Wednesday', [6], 'Historia', '9A'),
      ...slot('Wednesday', [7], 'Historia', '11B'),

      ...slot('Thursday', [1, 2], 'Sociales', '11A'),
      ...slot('Thursday', [7], 'Historia', '9B'),
      ...slot('Thursday', [9, 10], 'Sociales', '10B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [2], 'Historia', '11B', false, '8:16 - 9:03'),
      ...slot('Friday', [3], 'Historia', '9B', false, '9:03 - 9:48'),
      ...slot('Friday', [5, 6], 'Sociales', '11B', false, '10:28 - 12:00'),
    ]
  },

  // 20. Saad Diana (Matemáticas - Primaria)
  {
    id: 'saad-diana',
    name: 'Saad Diana',
    department: 'Matemáticas',
    section: 'Primaria',
    gradesTaught: ['1A', '1B', '2A', '2B', '3B', '3C'],
    phone: '+57 300 123 4520',
    slots: [
      ...slot('Monday', [2, 3], 'Matemáticas', '2B'),
      ...slot('Monday', [5], 'Matemáticas', '1A'),
      ...slot('Monday', [6], 'Matemáticas', '1A'),
      ...slot('Monday', [8], 'Matemáticas', '2A'),

      ...slot('Tuesday', [1], 'Matemáticas', '2A'),
      ...slot('Tuesday', [3], 'PLC Math', 'Docentes', true),
      ...slot('Tuesday', [5, 6], 'Matemáticas', '1A'),
      ...slot('Tuesday', [8], 'Matemáticas', '2B'),
      ...slot('Tuesday', [10], 'Matemáticas', '1B'),

      ...slot('Wednesday', [1, 2], 'Matemáticas', '2A'),
      ...slot('Wednesday', [3], 'Matemáticas', '1B'),
      ...slot('Wednesday', [5], 'Matemáticas', '3C'),
      ...slot('Wednesday', [8], 'Matemáticas', '3B'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1, 2], 'Matemáticas', '3C'),
      ...slot('Thursday', [3], 'Matemáticas', '3B'),
      ...slot('Thursday', [5, 6], 'Matemáticas', '1B'),

      ...slot('Friday', [2], 'Matemáticas', '2B', false, '8:16 - 9:03'),
      ...slot('Friday', [4], 'Matemáticas', '3C', false, '9:48 - 10:28'),
      ...slot('Friday', [5, 6], 'Matemáticas', '3B', false, '10:28 - 12:00'),
    ]
  },

  // 21. Rico Joaquín (Matemáticas - Primaria)
  {
    id: 'rico-joaquin',
    name: 'Rico Joaquín',
    department: 'Matemáticas',
    section: 'Primaria',
    gradesTaught: ['3A', '4A', '4B', '5A', '5B'],
    phone: '+57 300 123 4521',
    slots: [
      ...slot('Monday', [5], 'Matemáticas', '5B'),
      ...slot('Monday', [6], 'Matemáticas', '5B'),
      ...slot('Monday', [8], 'Matemáticas', '3A'),

      ...slot('Tuesday', [1, 2], 'Matemáticas', '4B'),
      ...slot('Tuesday', [3], 'PLC Math', 'Docentes', true),
      ...slot('Tuesday', [5, 6], 'Matemáticas', '5A'),
      ...slot('Tuesday', [8], 'Matemáticas', '5B'),
      ...slot('Tuesday', [10], 'Matemáticas', '4A'),

      ...slot('Wednesday', [3], 'Matemáticas', '4B'),
      ...slot('Wednesday', [5, 6], 'Matemáticas', '3A'),
      ...slot('Wednesday', [8], 'Matemáticas', '5A'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1, 2], 'Matemáticas', '4A'),
      ...slot('Thursday', [3], 'Matemáticas', '5A'),
      ...slot('Thursday', [8], 'Matemáticas', '4B'),
      ...slot('Thursday', [10], 'Matemáticas', '3A'),

      ...slot('Friday', [4], 'Matemáticas', '4A', false, '9:48 - 10:28'),
    ]
  },

  // 22. Montero Robinson (Matemáticas - Bachillerato)
  {
    id: 'montero-robinson',
    name: 'Montero Robinson',
    department: 'Matemáticas',
    section: 'Bachillerato',
    gradesTaught: ['6A', '6B', '7A', '7B'],
    phone: '+57 300 123 4522',
    slots: [
      ...slot('Monday', [1, 2], 'Matemáticas', '7A'),
      ...slot('Monday', [4], 'Matemáticas', '6B'),
      ...slot('Monday', [9], 'Matemáticas', '7B'),
      ...slot('Monday', [10], 'Matemáticas', '6A'),

      ...slot('Tuesday', [1], 'Matemáticas', '7B'),
      ...slot('Tuesday', [2], 'Matemáticas', '6A'),
      ...slot('Tuesday', [3], 'PLC Math', 'Docentes', true),
      ...slot('Tuesday', [4], 'Matemáticas', '7A'),

      ...slot('Wednesday', [3, 4], 'Matemáticas', '6A'),
      ...slot('Wednesday', [7], 'Matemáticas', '7A'),
      ...slot('Wednesday', [9], 'Matemáticas', '7B'),

      ...slot('Thursday', [1], 'Matemáticas', '6B'),
      ...slot('Thursday', [2], 'Matemáticas', '6B'),
      ...slot('Thursday', [3], 'Matemáticas', '6A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1, 2], 'Matemáticas', '6B', false, '7:29 - 9:03'),
      ...slot('Friday', [3], 'Matemáticas', '7A', false, '9:03 - 9:48'),
      ...slot('Friday', [5, 6], 'Matemáticas', '7B', false, '10:28 - 12:00'),
    ]
  },

  // 23. Sarabia Rafael (Matemáticas - Bachillerato)
  {
    id: 'sarabia-rafael',
    name: 'Sarabia Rafael',
    department: 'Matemáticas',
    section: 'Bachillerato',
    gradesTaught: ['8A', '8B', '9A', '9B'],
    phone: '+57 300 123 4523',
    slots: [
      ...slot('Monday', [2], 'Matemáticas', '8A'),
      ...slot('Monday', [3, 4], 'Matemáticas', '9B'),
      ...slot('Monday', [6], 'Matemáticas', '9A'),
      ...slot('Monday', [7], 'Matemáticas', '9A'),
      ...slot('Monday', [9], 'Matemáticas', '8B'),

      ...slot('Tuesday', [3], 'PLC Math', 'Docentes', true),
      ...slot('Tuesday', [6, 7], 'Matemáticas', '8A'),
      ...slot('Tuesday', [9], 'Matemáticas', '9B'),
      ...slot('Tuesday', [10], 'Matemáticas', '9B'),

      ...slot('Wednesday', [1, 2], 'Matemáticas', '8B'),
      ...slot('Wednesday', [3], 'Matemáticas', '8A'),
      ...slot('Wednesday', [7], 'Matemáticas', '9A'),

      ...slot('Thursday', [1, 2], 'Matemáticas', '9B'),
      ...slot('Thursday', [7], 'Matemáticas', '8B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Matemáticas', '8A', false, '7:29 - 8:16'),
      ...slot('Friday', [2, 3], 'Matemáticas', '9A', false, '8:16 - 9:48'),
      ...slot('Friday', [5], 'Matemáticas', '8B', false, '10:28 - 11:15'),
    ]
  },

  // 24. Arciria Elida (Matemáticas - Bachillerato)
  {
    id: 'arciria-elida',
    name: 'Arciria Elida',
    department: 'Matemáticas',
    section: 'Bachillerato',
    gradesTaught: ['10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4524',
    slots: [
      ...slot('Monday', [1, 2], 'Matemáticas', '11B'),
      ...slot('Monday', [3], 'Matemáticas', '11A'),
      ...slot('Monday', [4], 'Matemáticas', '11A'),
      ...slot('Monday', [6], 'Matemáticas', '10B'),
      ...slot('Monday', [7], 'Matemáticas', '10B'),

      ...slot('Tuesday', [1], 'Matemáticas', '11B'),
      ...slot('Tuesday', [2], 'Matemáticas', '10B'),
      ...slot('Tuesday', [3], 'PLC Math', 'Docentes', true),
      ...slot('Tuesday', [4], 'Matemáticas', '10A'),
      ...slot('Tuesday', [6, 7], 'Matemáticas', '11A'),

      ...slot('Wednesday', [1, 2], 'Matemáticas', '10B'),
      ...slot('Wednesday', [3], 'Matemáticas', '10A'),
      ...slot('Wednesday', [4], 'Matemáticas', '10A'),

      ...slot('Thursday', [2], 'Matemáticas', '11B'),
      ...slot('Thursday', [4], 'Matemáticas', '11A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Matemáticas', '11B', false, '7:29 - 8:16'),
      ...slot('Friday', [2, 3], 'Matemáticas', '10A', false, '8:16 - 9:48'),
    ]
  },

  // 25. Vargas Jaramillo Jose David (Science - Primaria)
  {
    id: 'vargas-jose-david',
    name: 'Vargas Jaramillo Jose David',
    department: 'Ciencias Naturales',
    section: 'Primaria',
    gradesTaught: ['1A', '1B', '2A', '2B', '3B', '3C'],
    phone: '+57 300 123 4525',
    slots: [
      ...slot('Monday', [1, 2], 'Science', '2B'),
      ...slot('Monday', [5], 'Science', '3B'),
      ...slot('Monday', [6], 'Science', '2A'),
      ...slot('Monday', [8], 'Science', '1A'),
      ...slot('Monday', [11], 'PLC Science', 'Docentes', true),

      ...slot('Tuesday', [1, 2], 'Science', '3C'),
      ...slot('Tuesday', [3], 'Science', '1B'),
      ...slot('Tuesday', [5, 6], 'Science', '3B'),
      ...slot('Tuesday', [9, 10], 'Science', '2B'),

      ...slot('Wednesday', [2], 'Science', '1B'),
      ...slot('Wednesday', [3], 'Science', '2B'),
      ...slot('Wednesday', [5], 'Science', '1A'),
      ...slot('Wednesday', [8], 'Science', '2A'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [2, 3], 'Science', '1A'),
      ...slot('Thursday', [8], 'Science', '1B'),
      ...slot('Thursday', [10], 'Science', '3B'),

      ...slot('Friday', [1, 2], 'Science', '3C', false, '7:29 - 9:03'),
      ...slot('Friday', [4, 5], 'Science', '2A', false, '9:48 - 11:15'),
    ]
  },

  // 26. De Guevara Eric (Science - Bachillerato)
  {
    id: 'de-guevara-eric',
    name: 'De Guevara Eric',
    department: 'Ciencias Naturales',
    section: 'Bachillerato',
    gradesTaught: ['6A', '6B', '7A', '7B', '8A', '8B'],
    phone: '+57 300 123 4526',
    slots: [
      ...slot('Monday', [1, 2], 'Science', '8A'),
      ...slot('Monday', [7], 'Science', '7B'),
      ...slot('Monday', [11], 'PLC Science', 'Docentes', true),

      ...slot('Tuesday', [1], 'Science', '7A'),
      ...slot('Tuesday', [2], 'Science', '8B'),
      ...slot('Tuesday', [3], 'Science', '6B'),
      ...slot('Tuesday', [6, 7], 'Science', '6A'),

      ...slot('Wednesday', [1], 'Science', '6B'),
      ...slot('Wednesday', [2, 3], 'Science', '7B'),
      ...slot('Wednesday', [4], 'Science', '8A'),
      ...slot('Wednesday', [7], 'Science', '8B'),
      ...slot('Wednesday', [9, 10], 'Science', '6A'),

      ...slot('Thursday', [3, 4], 'Science', '7A'),
      ...slot('Thursday', [6, 7], 'Science', '6B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Science', '7A', false, '7:29 - 8:16'),
      ...slot('Friday', [3], 'Science', '7B', false, '9:03 - 9:48'),
    ]
  },

  // 27. Mendoza Carlos (Quimica / Science - Bachillerato)
  {
    id: 'mendoza-carlos',
    name: 'Mendoza Carlos',
    department: 'Ciencias Naturales (Química)',
    section: 'Bachillerato',
    gradesTaught: ['8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4527',
    slots: [
      ...slot('Monday', [2], 'Science', '11A'),
      ...slot('Monday', [3], 'Quimica', '8A'),
      ...slot('Monday', [4], 'Science', '9A'),
      ...slot('Monday', [6], 'Science', '10A'),
      ...slot('Monday', [7], 'Quimica', '8B'),
      ...slot('Monday', [9], 'Quimica', '9A'),
      ...slot('Monday', [10], 'Quimica', '9B'),
      ...slot('Monday', [11], 'PLC Science', 'Docentes', true),

      ...slot('Tuesday', [9, 10], 'Science', '11B'),

      ...slot('Wednesday', [1], 'Quimica', '9B'),
      ...slot('Wednesday', [2], 'Science', '11B'),
      ...slot('Wednesday', [3], 'Science', '11A'),
      ...slot('Wednesday', [4], 'Science', '9B'),
      ...slot('Wednesday', [6], 'Quimica', '8B'),
      ...slot('Wednesday', [7], 'Science', '10B'),
      ...slot('Wednesday', [9], 'Quimica', '8A'),

      ...slot('Thursday', [1], 'Quimica', '9A'),
      ...slot('Thursday', [4], 'Science', '10A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Science', '9A', false, '7:29 - 8:16'),
      ...slot('Friday', [2], 'Science', '9B', false, '8:16 - 9:03'),
      ...slot('Friday', [3], 'Science', '10B', false, '9:03 - 9:48'),
    ]
  },

  // 28. Valera Andrés (Física - Bachillerato)
  {
    id: 'valera-andres',
    name: 'Valera Andrés',
    department: 'Ciencias Naturales (Física)',
    section: 'Bachillerato',
    gradesTaught: ['8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4528',
    slots: [
      ...slot('Monday', [1, 2], 'Física', '11A'),
      ...slot('Monday', [6, 7], 'Física', '9B'),
      ...slot('Monday', [9, 10], 'Física', '8A'),
      ...slot('Monday', [11], 'PLC Science', 'Docentes', true),

      ...slot('Tuesday', [1, 2], 'Física', '9A'),
      ...slot('Tuesday', [3, 4], 'Física', '11B'),
      ...slot('Tuesday', [6, 7], 'Física', '8B'),
      ...slot('Tuesday', [9, 10], 'Física', '10B'),

      ...slot('Wednesday', [1, 2], 'Física', '10A'),
      ...slot('Wednesday', [6, 7], 'Física', '11B'),

      ...slot('Thursday', [1], 'Física', '10A'),
      ...slot('Thursday', [2], 'Física', '9B'),
      ...slot('Thursday', [7], 'Física', '9A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1, 2], 'Física', '11A', false, '7:29 - 9:03'),
      ...slot('Friday', [5], 'Física', '10B', false, '10:28 - 11:15'),
    ]
  },

  // 29. Olivella Luis Miguel (Química - Bachillerato)
  {
    id: 'olivella-luis-miguel',
    name: 'Olivella Luis Miguel',
    department: 'Ciencias Naturales (Química)',
    section: 'Bachillerato',
    gradesTaught: ['10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4529',
    slots: [
      ...slot('Monday', [9], 'Quimica', '10A'),
      ...slot('Monday', [10], 'Quimica', '11B'),
      ...slot('Monday', [11], 'PLC Science', 'Docentes', true),

      ...slot('Tuesday', [9], 'Quimica', '10A'),
      ...slot('Tuesday', [10], 'Quimica', '11A'),

      ...slot('Wednesday', [9, 10], 'Quimica', '10B'),

      ...slot('Thursday', [9], 'Quimica', '11B'),
      ...slot('Thursday', [10], 'Quimica', '11A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),
    ]
  },

  // 30. Fuentes Joán (Informática - Primaria y Bachillerato)
  {
    id: 'fuentes-joan',
    name: 'Fuentes Joán',
    department: 'Tecnología e Informática',
    section: 'Ambas',
    gradesTaught: ['1A', '1B', '2A', '2B', '3A', '3B', '3C', '4A', '4B', '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4530',
    slots: [
      ...slot('Monday', [3], 'Informática', '4A'),
      ...slot('Monday', [5], 'Informática', '2A'),
      ...slot('Monday', [6], 'Informática', '8B'),
      ...slot('Monday', [9], 'Informática', '6A'),
      ...slot('Monday', [10], 'Informática', '6B'),

      ...slot('Tuesday', [5], 'Informática', '2B'),
      ...slot('Tuesday', [6], 'Informática', '10B'),
      ...slot('Tuesday', [9], 'Informática', '11A'),
      ...slot('Tuesday', [10], 'Informática', '11B'),

      ...slot('Wednesday', [3], 'Informática', '5A'),
      ...slot('Wednesday', [5], 'Informática', '5B'),
      ...slot('Wednesday', [6], 'Informática', '8A'),
      ...slot('Wednesday', [9], 'Informática', '10A'),
      ...slot('Wednesday', [10], 'Informática', '7A'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [3], 'Informática', '9B'),
      ...slot('Thursday', [4], 'Informática', '9A'),
      ...slot('Thursday', [5], 'Informática', '3A'),
      ...slot('Thursday', [6], 'Informática', '7B'),
      ...slot('Thursday', [9], 'Informática', '3B'),
      ...slot('Thursday', [10], 'Informática', '3C'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [4], 'Informática', '4B', false, '9:48 - 10:28'),
      ...slot('Friday', [5], 'Informática', '1A', false, '10:28 - 11:15'),
      ...slot('Friday', [6], 'Informática', '1B', false, '11:15 - 12:00'),
    ]
  },

  // 31. Morán Laura (Educación Física - Primaria y Bachillerato)
  {
    id: 'moran-laura',
    name: 'Morán Laura',
    department: 'Educación Física y Deportes',
    section: 'Ambas',
    gradesTaught: ['1A', '1B', '2A', '2B', '3A', '3B', '3C', '4A', '4B', '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4531',
    slots: [
      ...slot('Monday', [1], 'Educ Fisica', '7B'),
      ...slot('Monday', [3], 'Educ Fisica', '9A'),
      ...slot('Monday', [6], 'Educ Fisica', '7A'),
      ...slot('Monday', [9, 10], 'Deportes', 'Primaria (1A-5B)'),

      ...slot('Tuesday', [1], 'Educ Fisica', '2B'),
      ...slot('Tuesday', [3], 'Educ Fisica', '3C'),
      ...slot('Tuesday', [5], 'Educ Fisica', '4A'),
      ...slot('Tuesday', [6], 'Educ Fisica', '3A'),
      ...slot('Tuesday', [9, 10], 'Deportes', 'Bachillerato (6A-8B)'),

      ...slot('Wednesday', [1], 'Educ Fisica', '1B'),
      ...slot('Wednesday', [2], 'Educ Fisica', '5A'),
      ...slot('Wednesday', [3], 'Educ Fisica', '3B'),
      ...slot('Wednesday', [6], 'Educ Fisica', '11A'),
      ...slot('Wednesday', [10], 'Educ Fisica', '9B'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1], 'Educ Fisica', '1A'),
      ...slot('Thursday', [2], 'Educ Fisica', '4B'),
      ...slot('Thursday', [4], 'Educ Fisica', '6A'),
      ...slot('Thursday', [9], 'Educ Fisica', '10A'),
      ...slot('Thursday', [10], 'Educ Fisica', '11B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Educ Fisica', '2A', false, '7:29 - 8:16'),
      ...slot('Friday', [2], 'Educ Fisica', '5B', false, '8:16 - 9:03'),
      ...slot('Friday', [5], 'Educ Fisica', '6B', false, '10:28 - 11:15'),
      ...slot('Friday', [6], 'Educ Fisica', '10B', false, '11:15 - 12:00'),
    ]
  },

  // 32. Velazquez Ángela (Religión - Primaria y Bachillerato)
  {
    id: 'velazquez-angela',
    name: 'Velazquez Ángela',
    department: 'Educación Religiosa',
    section: 'Ambas',
    gradesTaught: ['1A', '1B', '2A', '2B', '3A', '3B', '3C', '4A', '4B', '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4532',
    slots: [
      ...slot('Tuesday', [1], 'Religión', '10B'),
      ...slot('Tuesday', [2], 'Religión', '5A'),
      ...slot('Tuesday', [3], 'Religión', '3B'),
      ...slot('Tuesday', [4], 'Religión', '11A'),
      ...slot('Tuesday', [8], 'Religión', '3A'),
      ...slot('Tuesday', [9], 'Religión', '3C'),
      ...slot('Tuesday', [10], 'Religión', '2A'),
      ...slot('Tuesday', [11], 'PLC Sociales', 'Docentes', true),

      ...slot('Wednesday', [1], 'Religión', '11B'),
      ...slot('Wednesday', [2], 'Religión', '7A'),
      ...slot('Wednesday', [3], 'Religión', '1A'),
      ...slot('Wednesday', [4], 'Religión', '7B'),
      ...slot('Wednesday', [5], 'Religión', '4B'),
      ...slot('Wednesday', [6], 'Religión', '6B'),
      ...slot('Wednesday', [8], 'Religión', '1B'),
      ...slot('Wednesday', [9], 'Religión', '9B'),
      ...slot('Wednesday', [10], 'Religión', '10A'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1], 'Religión', '8A'),
      ...slot('Thursday', [2], 'Religión', '9A'),
      ...slot('Thursday', [3], 'Religión', '5B'),
      ...slot('Thursday', [4], 'Religión', '8B'),
      ...slot('Thursday', [6], 'Religión', '6A'),
      ...slot('Thursday', [8], 'Religión', '4A'),
      ...slot('Thursday', [10], 'Religión', '2B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),
    ]
  },

  // 33. Arte/Musica Profesor (Art/Music - Primaria y Bachillerato)
  {
    id: 'arte-musica-profesor',
    name: 'Arte / Música Profesor',
    department: 'Educación Artística',
    section: 'Ambas',
    gradesTaught: ['1A', '1B', '2A', '2B', '3A', '3B', '3C', '4A', '4B', '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4533',
    slots: [
      ...slot('Monday', [1], 'Art/Music', '1A'),
      ...slot('Monday', [2], 'Art/Music', '8B'),
      ...slot('Monday', [3], 'Art/Music', '10A'),
      ...slot('Monday', [4], 'Art/Music', '6A'),
      ...slot('Monday', [6], 'Art/Music', '1B'),
      ...slot('Monday', [9], 'Art/Music', '6B'),
      ...slot('Monday', [10], 'Art/Music', '11A'),

      ...slot('Tuesday', [1], 'Art/Music', '8A'),
      ...slot('Tuesday', [3], 'Art/Music', '10B'),
      ...slot('Tuesday', [4], 'Art/Music', '9B'),
      ...slot('Tuesday', [6], 'Art/Music', '7A'),
      ...slot('Tuesday', [9], 'Art/Music', '3B'),
      ...slot('Tuesday', [10], 'Art/Music', '3C'),

      ...slot('Wednesday', [1], 'Art/Music', '3A'),
      ...slot('Wednesday', [2], 'Art/Music', '9A'),
      ...slot('Wednesday', [3], 'Art/Music', '2A'),
      ...slot('Wednesday', [6], 'Art/Music', '5B'),
      ...slot('Wednesday', [9, 10], 'Taller', 'Primaria (1A-5B)'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1], 'Art/Music', '11B'),
      ...slot('Thursday', [3], 'Art/Music', '4A'),
      ...slot('Thursday', [4], 'Art/Music', '7B'),
      ...slot('Thursday', [6], 'Taller', '10A-11B'),
      ...slot('Thursday', [9, 10], 'Taller', '6A-9B'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Art/Music', '5A', false, '7:29 - 8:16'),
      ...slot('Friday', [2], 'Art/Music', '4B', false, '8:16 - 9:03'),
      ...slot('Friday', [4], 'Art/Music', '2B', false, '9:48 - 10:28'),
    ]
  },

  // 34. Celedon Ruth (Ética - Primaria)
  {
    id: 'celedon-ruth',
    name: 'Celedon Ruth',
    department: 'Ética y Valores',
    section: 'Primaria',
    gradesTaught: ['1A', '1B', '2A', '2B', '3A', '3B', '3C', '4A', '4B', '5A', '5B'],
    phone: '+57 300 123 4534',
    slots: [
      ...slot('Monday', [1], 'Etica', '3A'),
      ...slot('Monday', [2], 'Etica', '4A'),
      ...slot('Monday', [6], 'Etica', '3B'),
      ...slot('Monday', [8], 'Etica', '5B'),

      ...slot('Tuesday', [2], 'Etica', '1B'),
      ...slot('Tuesday', [6], 'Etica', '2A'),
      ...slot('Tuesday', [8], 'Etica', '3C'),
      ...slot('Tuesday', [11], 'PLC Sociales', 'Docentes', true),

      ...slot('Wednesday', [1], 'Etica', '2B'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1], 'Etica', '4B'),
      ...slot('Thursday', [6], 'Etica', '1A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [6], 'Etica', '5A', false, '11:15 - 12:00'),
    ]
  },

  // 35. Polo Jair (Geometría - Primaria)
  {
    id: 'polo-jair',
    name: 'Polo Jair',
    department: 'Matemáticas (Geometría)',
    section: 'Primaria',
    gradesTaught: ['1A', '1B', '2A', '2B', '3A', '3B', '3C', '4A', '4B', '5A', '5B'],
    phone: '+57 300 123 4535',
    slots: [
      ...slot('Monday', [1, 2], 'Geometria', '5A'),
      ...slot('Monday', [3], 'Geometria', '3B'),
      ...slot('Monday', [5], 'Geometria', '1B'),
      ...slot('Monday', [6], 'Geometria', '3C'),
      ...slot('Monday', [8], 'Geometria', '4B'),

      ...slot('Tuesday', [5], 'Geometria', '3A'),
      ...slot('Tuesday', [10], 'Geometria', '3B'),

      ...slot('Wednesday', [1, 2], 'Geometria', '4A'),
      ...slot('Wednesday', [6], 'Geometria', '3C'),
      ...slot('Wednesday', [8], 'Geometria', '5B'),
      ...slot('Wednesday', [11], 'Reunion de Seccion Primaria', 'Sección', true),

      ...slot('Thursday', [1], 'Geometria', '5B'),
      ...slot('Thursday', [2, 3], 'Geometria', '2A'),
      ...slot('Thursday', [5, 6], 'Geometria', '2B'),
      ...slot('Thursday', [8], 'Geometria', '1A'),

      ...slot('Friday', [1], 'Geometria', '4B', false, '7:29 - 8:16'),
      ...slot('Friday', [4], 'Geometria', '3A', false, '9:48 - 10:28'),
      ...slot('Friday', [5], 'Geometria', '1B', false, '10:28 - 11:15'),
      ...slot('Friday', [6], 'Geometria', '1A', false, '11:15 - 12:00'),
    ]
  },

  // 36. Lesmes Maya (Ética - Bachillerato)
  {
    id: 'lesmes-maya',
    name: 'Lesmes Maya',
    department: 'Ética y Valores',
    section: 'Bachillerato',
    gradesTaught: ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B'],
    phone: '+57 300 123 4536',
    slots: [
      ...slot('Monday', [1], 'Etica', '9B'),
      ...slot('Monday', [3], 'Etica', '6A'),
      ...slot('Monday', [4], 'Etica', '10B'),
      ...slot('Monday', [6], 'Etica', '6B'),
      ...slot('Monday', [7], 'Etica', '10A'),

      ...slot('Tuesday', [3], 'Etica', '7A'),
      ...slot('Tuesday', [4], 'Etica', '7B'),
      ...slot('Tuesday', [11], 'PLC Sociales', 'Docentes', true),

      ...slot('Wednesday', [7], 'Etica', '11A'),
      ...slot('Wednesday', [10], 'Etica', '11B'),

      ...slot('Thursday', [2], 'Etica', '8A'),
      ...slot('Thursday', [11], 'Reunión de Sección Bachillerato', 'Sección', true),

      ...slot('Friday', [1], 'Etica', '8B', false, '7:29 - 8:16'),
      ...slot('Friday', [6], 'Etica', '9A', false, '11:15 - 12:00'),
    ]
  },

  // 37. Teacher Valeria Peña (Science - Primaria)
  {
    id: 'valeria-pena',
    name: 'Teacher Valeria Peña',
    department: 'Ciencias Naturales',
    section: 'Primaria',
    gradesTaught: ['3A', '4A', '4B', '5A', '5B'],
    phone: '+57 300 123 4537',
    slots: [
      ...slot('Monday', [1], 'Science', '4A'),
      ...slot('Monday', [2], 'Science', '3A'),

      ...slot('Tuesday', [1], 'Science', '4A'),
      ...slot('Tuesday', [3], 'Science', '5A'),
      ...slot('Tuesday', [5, 6], 'Science', '4B'),
      ...slot('Tuesday', [10], 'Science', '5B'),

      ...slot('Wednesday', [2, 3], 'Science', '3A'),
      ...slot('Wednesday', [8], 'Science', '4B'),

      ...slot('Thursday', [3], 'Science', '3A'),
      ...slot('Thursday', [5, 6], 'Science', '5B'),
      ...slot('Thursday', [8, 9], 'Science', '5A'),
      ...slot('Thursday', [10], 'Science', '4B'),

      ...slot('Friday', [5, 6], 'Science', '4A', false, '10:28 - 12:00'),
    ]
  }
];
