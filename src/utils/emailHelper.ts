/**
 * Helper to generate institutional emails for teachers at Fundación Colegio Bilingüe de Valledupar.
 * Institutional Domain: @colegiobilingue.edu.co
 * Rule: First initial of the first name + last name (e.g., Carlos Mendoza -> cmendoza@colegiobilingue.edu.co)
 * Works seamlessly with both timetable format (Apellido Nombre, e.g. "Mendoza Carlos")
 * and direct format (Nombre Apellido, e.g. "Carlos Mendoza").
 */

export const INSTITUTIONAL_EMAIL_DOMAIN = 'colegiobilingue.edu.co';

// Common first names in Spanish and English used in school rosters
const COMMON_FIRST_NAMES = new Set([
  'carlos', 'juan', 'maria', 'jose', 'danyely', 'loly', 'wanda', 'patricia',
  'adriana', 'valentina', 'nick', 'leonardo', 'alexander', 'claudia', 'jenny',
  'yajaira', 'angelica', 'raul', 'karenys', 'daniel', 'leonel', 'guillermo',
  'diana', 'joaquin', 'robinson', 'rafael', 'elida', 'david', 'eric', 'andres',
  'luis', 'miguel', 'joan', 'laura', 'angela', 'ruth', 'jair', 'maya', 'valeria',
  'pedro', 'ana', 'jorge', 'camila', 'alejandro', 'fernando', 'gabriel', 'diego',
  'sebastian', 'lucia', 'sofia', 'felipe', 'esteban', 'paola', 'natalia', 'monica',
  'catalina', 'sergio', 'gustavo', 'ricardo', 'mario', 'alberto', 'julian', 'juliana',
  'santiago', 'mateo', 'nicolas', 'lucas', 'manuel', 'marcela', 'gloria', 'martha'
]);

/**
 * Normalizes text: removes accents, converts to lowercase, strips non-alphabetic chars.
 */
export function normalizeCleanText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .trim();
}

/**
 * Generates the official institutional email for a teacher name.
 * Rule: first initial of first name + last name + @colegiobilingue.edu.co
 * 
 * Examples:
 * - "Carlos Mendoza" -> cmendoza@colegiobilingue.edu.co
 * - "Mendoza Carlos" -> cmendoza@colegiobilingue.edu.co
 * - "Muegues Danyely" -> dmuegues@colegiobilingue.edu.co
 * - "Cruz Maria Patricia" -> mcruz@colegiobilingue.edu.co
 * - "Vargas Jaramillo Jose David" -> jvargas@colegiobilingue.edu.co
 * - "Teacher Valeria Peña" -> vpena@colegiobilingue.edu.co
 * - "De Guevara Eric" -> edeguevara@colegiobilingue.edu.co
 */
export function generateTeacherEmail(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') {
    return `docente@${INSTITUTIONAL_EMAIL_DOMAIN}`;
  }

  // Strip prefixes like "Teacher ", "Profesor ", "Lic. ", etc.
  let cleaned = rawName
    .replace(/^(teacher|profesor|profesora|docente|prof\.|lic\.|dr\.|dra\.|ing\.)\s+/i, '')
    .trim();

  // Normalize accents and keep letters and spaces
  const normalized = normalizeCleanText(cleaned);
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return `docente@${INSTITUTIONAL_EMAIL_DOMAIN}`;
  }

  if (words.length === 1) {
    return `${words[0]}@${INSTITUTIONAL_EMAIL_DOMAIN}`;
  }

  let firstName = '';
  let lastName = '';

  // Case 1: Particle surnames like "De Guevara Eric" or "De La Rosa Juan"
  if (words[0] === 'de') {
    if (words[1] === 'la' && words.length >= 4) {
      lastName = words[0] + words[1] + words[2]; // delarosa
      firstName = words[3];
    } else if (words.length >= 3) {
      lastName = words[0] + words[1]; // deguevara
      firstName = words[2];
    } else {
      lastName = words[0] + words[1];
      firstName = 'docente';
    }
  }
  // Case 2: Direct format "Nombre Apellido" where words[0] is recognized first name
  // and words[last] is not a first name (e.g. "carlos mendoza")
  else if (COMMON_FIRST_NAMES.has(words[0]) && !COMMON_FIRST_NAMES.has(words[words.length - 1])) {
    firstName = words[0];
    lastName = words[1];
  }
  // Case 3: Timetable format "Apellido [Apellido2] Nombre [Nombre2]" (standard aSc format)
  // e.g. "Mendoza Carlos", "Vargas Jaramillo Jose David", "Cruz Maria Patricia"
  else {
    if (words.length >= 4) {
      // 4 words: [Apellido1, Apellido2, Nombre1, Nombre2]
      lastName = words[0];
      firstName = words[2];
    } else if (words.length === 3) {
      // 3 words: could be [Apellido, Nombre1, Nombre2] or [Apellido1, Apellido2, Nombre]
      if (COMMON_FIRST_NAMES.has(words[1])) {
        // e.g. Cruz Maria Patricia -> Apellido: cruz, Nombre: maria
        lastName = words[0];
        firstName = words[1];
      } else {
        // e.g. Vargas Gomez Jose -> Apellido: vargas, Nombre: jose
        lastName = words[0];
        firstName = words[2];
      }
    } else {
      // 2 words: [Apellido, Nombre] (e.g. Mendoza Carlos)
      lastName = words[0];
      firstName = words[1];
    }
  }

  const initial = (firstName && firstName.length > 0) ? firstName.charAt(0) : 'd';
  const cleanLastName = lastName.replace(/[^a-z0-9]/g, '');

  return `${initial}${cleanLastName}@${INSTITUTIONAL_EMAIL_DOMAIN}`.toLowerCase();
}
