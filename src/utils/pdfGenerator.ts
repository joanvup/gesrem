import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReplacementAssignment, Teacher, DAYS_CONFIG, DayOfWeek, getGradeSection } from '../types';
import { FCBV_LOGO_BASE64 } from './logoBase64';

export interface GenerateSummaryPdfParams {
  date: string;
  dayOfWeek: DayOfWeek;
  assignments: ReplacementAssignment[];
  selectedSection: 'all' | 'Primaria' | 'Bachillerato';
}

/**
 * Generates an official, publication-quality vector PDF of the daily replacement roster.
 * Avoids html2canvas entirely, eliminating CSS color parsing errors (like oklch) and raster pixelation.
 */
export function generateSummaryPdf({
  date,
  dayOfWeek,
  assignments,
  selectedSection
}: GenerateSummaryPdfParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const dayLabel = (DAYS_CONFIG.find(d => d.id === dayOfWeek)?.labelEs || dayOfWeek).toUpperCase();

  const sortedAssignments = [...assignments].sort((a, b) => a.period - b.period);
  const primariaAssignments = sortedAssignments.filter(
    a => (a.section || getGradeSection(a.grade)) === 'Primaria'
  );
  const bachilleratoAssignments = sortedAssignments.filter(
    a => (a.section || getGradeSection(a.grade)) === 'Bachillerato'
  );

  const displayedAssignments =
    selectedSection === 'all'
      ? sortedAssignments
      : selectedSection === 'Primaria'
      ? primariaAssignments
      : bachilleratoAssignments;

  const uniqueAbsent = Array.from(new Set(displayedAssignments.map(a => a.absentTeacherName)));
  const uniqueSubstitutes = Array.from(new Set(displayedAssignments.map(a => a.substituteTeacherName)));

  // --- HEADER SECTION ---
  // Official FCBV Emblem Logo
  try {
    doc.addImage(FCBV_LOGO_BASE64, 'PNG', margin, margin, 15, 15);
  } catch {
    doc.setFillColor(30, 58, 138); // blue-900 fallback
    doc.circle(margin + 7.5, margin + 7.5, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('FCBV', margin + 7.5, margin + 9.5, { align: 'center' });
  }

  // Institution title
  doc.setTextColor(23, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FUNDACIÓN COLEGIO BILINGÜE DE VALLEDUPAR', margin + 18, margin + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 82);
  doc.text('Coordinación Académica · Planilla Oficial de Reemplazos y Cobertura Docente', margin + 18, margin + 10.5);

  // Subheader Bar
  const barY = margin + 16;
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(212, 212, 212);
  doc.roundedRect(margin, barY, pageWidth - margin * 2, 7, 1.5, 1.5, 'FD');

  let bannerText = `AÑO LECTIVO 2026/2027  ·  ${dayLabel}, ${date}`;
  if (selectedSection !== 'all') {
    bannerText += `  ·  SECCIÓN ${selectedSection.toUpperCase()} (${selectedSection === 'Primaria' ? 'GRADOS 1° A 5°' : 'GRADOS 6° A 11°'})`;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text(bannerText, pageWidth / 2, barY + 4.8, { align: 'center' });

  // --- METRIC CARDS ---
  // High contrast design: 100% white background, subtle light-gray borders, solid dark text
  const cardsY = barY + 10;
  const cardWidth = (pageWidth - margin * 2 - 8) / 3;
  const cardHeight = 16;

  // Card 1: Total clases asignadas
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, cardsY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Total Clases Asignadas:', margin + 3.5, cardsY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900 (deep black)
  doc.text(`${displayedAssignments.length} horas lectivas`, margin + 3.5, cardsY + 11.5);

  // Card 2: Ausentes (Crystal clear text contrast)
  const card2X = margin + cardWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(card2X, cardsY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Docentes Titulares Ausentes:', card2X + 3.5, cardsY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(185, 28, 28); // red-700 (high contrast against white)
  const absentStr = uniqueAbsent.join(', ');
  const absentTrunc = absentStr.length > 36 ? absentStr.substring(0, 34) + '...' : absentStr;
  doc.text(`${uniqueAbsent.length} (${absentTrunc || 'Ninguno'})`, card2X + 3.5, cardsY + 11.5);

  // Card 3: Suplentes
  const card3X = card2X + cardWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(card3X, cardsY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Docentes Suplentes Activados:', card3X + 3.5, cardsY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(4, 120, 87); // emerald-700 (high contrast against white)
  doc.text(`${uniqueSubstitutes.length} ${uniqueSubstitutes.length === 1 ? 'docente' : 'docentes'}`, card3X + 3.5, cardsY + 11.5);

  let currentY = cardsY + cardHeight + 6;

  const tableHead = [
    [
      { content: 'Periodo / Hora', styles: { halign: 'left' as const } },
      { content: 'Grado', styles: { halign: 'center' as const } },
      { content: 'Asignatura', styles: { halign: 'left' as const } },
      { content: 'Docente Titular (Ausente)', styles: { halign: 'left' as const } },
      { content: 'Docente Reemplazante', styles: { halign: 'left' as const } },
      { content: 'Plan / Instrucciones', styles: { halign: 'left' as const } },
      { content: 'Firma Recibido', styles: { halign: 'center' as const } }
    ]
  ];

  const buildTableRows = (items: ReplacementAssignment[]) => {
    return items.map(a => [
      `Periodo ${a.period}\n${a.timeRange}`,
      a.grade,
      a.subject,
      a.absentTeacherName,
      `${a.substituteTeacherName}\n(${a.substituteDepartment || 'Reemplazo'})`,
      a.activityPlan || 'Seguimiento de temario escolar',
      '________________'
    ]);
  };

  const renderSectionPdfTable = (
    title: string,
    items: ReplacementAssignment[],
    headerColor: [number, number, number]
  ) => {
    if (items.length === 0) return;

    // Check if we need a new page for the table header
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
    }

    // Section bar
    doc.setFillColor(...headerColor);
    doc.rect(margin, currentY, pageWidth - margin * 2, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), margin + 3.5, currentY + 4.5);
    doc.text(`${items.length} ${items.length === 1 ? 'hora' : 'horas'}`, pageWidth - margin - 3.5, currentY + 4.5, { align: 'right' });

    currentY += 6.5;

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: buildTableRows(items),
      margin: { left: margin, right: margin, bottom: 25 },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: 'middle',
        overflow: 'linebreak',
        textColor: [15, 23, 42], // Deep slate-900, highly legible
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [241, 245, 249], // slate-100
        textColor: [15, 23, 42], // slate-900
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold', textColor: [15, 23, 42] },
        1: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
        2: { cellWidth: 28, textColor: [30, 41, 59] },
        3: { cellWidth: 34, fontStyle: 'bold', textColor: [185, 28, 28] }, // Docente Titular Ausente: red-700 for maximum clarity
        4: { cellWidth: 36, fontStyle: 'bold', textColor: [30, 58, 138] }, // Docente Reemplazante: dark blue
        5: { cellWidth: 'auto', textColor: [51, 65, 85] },
        6: { cellWidth: 26, halign: 'center', textColor: [148, 163, 184] }
      },
      didDrawPage: (data) => {
        currentY = data.cursor?.y || currentY;
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY;
    if (finalY) {
      currentY = finalY + 4;
    }
  };

  // Render requested sections
  if (selectedSection === 'all') {
    renderSectionPdfTable('Sección Primaria (Grados 1° a 5°)', primariaAssignments, [180, 83, 9]); // amber-700
    renderSectionPdfTable('Sección Bachillerato (Grados 6° a 11°)', bachilleratoAssignments, [67, 56, 202]); // indigo-700
  } else if (selectedSection === 'Primaria') {
    renderSectionPdfTable('Planilla Oficial de Reemplazos — Sección Primaria (Grados 1° a 5°)', primariaAssignments, [180, 83, 9]);
  } else {
    renderSectionPdfTable('Planilla Oficial de Reemplazos — Sección Bachillerato (Grados 6° a 11°)', bachilleratoAssignments, [67, 56, 202]);
  }

  // Check if signatures fit on current page
  if (currentY > pageHeight - 32) {
    doc.addPage();
    currentY = margin + 10;
  } else {
    currentY += 4;
  }

  // --- SIGNATURES ---
  const sigWidth = (pageWidth - margin * 2 - 20) / 2;
  const sig1X = margin + 5;
  const sig2X = margin + sigWidth + 15;

  doc.setDrawColor(156, 163, 175);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(sig1X, currentY + 12, sig1X + sigWidth, currentY + 12);
  doc.line(sig2X, currentY + 12, sig2X + sigWidth, currentY + 12);
  doc.setLineDashPattern([], 0); // reset line dash

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(23, 23, 23);
  doc.text('Coordinación Académica', sig1X + sigWidth / 2, currentY + 16, { align: 'center' });
  doc.text('Supervisión / Control de Aulas', sig2X + sigWidth / 2, currentY + 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(115, 115, 115);
  doc.text('Fundación Colegio Bilingüe de Valledupar', sig1X + sigWidth / 2, currentY + 19.5, { align: 'center' });
  doc.text('Verificación de Cobertura Efectiva', sig2X + sigWidth / 2, currentY + 19.5, { align: 'center' });

  // Footer page numbers & emission text
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Planilla Oficial emitida por ReemplazaDocente · FCBV Valledupar · Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanDate = date.replace(/[^0-9-]/g, '_');
  const cleanSection = selectedSection === 'all' ? 'General' : selectedSection;
  doc.save(`Planilla_Remplazos_FCBV_${cleanSection}_${cleanDate}.pdf`);
}

export interface GenerateSlipPdfParams {
  assignment: ReplacementAssignment;
  absentTeacher?: Teacher;
  substituteTeacher?: Teacher;
}

/**
 * Generates an official printable PDF slip voucher for a single substitute assignment.
 */
export function generateSlipPdf({
  assignment,
  absentTeacher,
  substituteTeacher
}: GenerateSlipPdfParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const dayLabel = (DAYS_CONFIG.find(d => d.id === assignment.dayOfWeek)?.labelEs || assignment.dayOfWeek).toUpperCase();

  // Top Crest & Header
  try {
    doc.addImage(FCBV_LOGO_BASE64, 'PNG', margin, margin, 17, 17);
  } catch {
    doc.setFillColor(30, 58, 138); // blue-900
    doc.circle(margin + 8.5, margin + 8.5, 8.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('FCBV', margin + 8.5, margin + 11, { align: 'center' });
  }

  doc.setTextColor(23, 23, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('FUNDACIÓN COLEGIO BILINGÜE DE VALLEDUPAR', margin + 21, margin + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(82, 82, 82);
  doc.text('Coordinación Académica · Año Lectivo 2026/2027', margin + 21, margin + 12.5);

  // Voucher Banner
  const bannerY = margin + 20;
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(margin, bannerY, contentWidth, 8, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text('ORDEN OFICIAL DE COBERTURA Y REEMPLAZO DE CLASE', pageWidth / 2, bannerY + 5.5, { align: 'center' });

  // Two columns: Absent vs Substitute
  const cardsY = bannerY + 12;
  const cardW = (contentWidth - 6) / 2;
  const cardH = 20;

  // Absent
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, cardsY, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Docente Titular Ausente:', margin + 4, cardsY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(185, 28, 28); // red-700 for distinct visibility
  doc.text(assignment.absentTeacherName, margin + 4, cardsY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(absentTeacher?.department || 'Docente Titular', margin + 4, cardsY + 16.5);

  // Substitute
  const subX = margin + cardW + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(subX, cardsY, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Docente Reemplazante Designado:', subX + 4, cardsY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(assignment.substituteTeacherName, subX + 4, cardsY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(assignment.substituteDepartment || substituteTeacher?.department || 'Docente de Apoyo', subX + 4, cardsY + 16.5);

  // Class Details Table
  const tableY = cardsY + cardH + 7;
  autoTable(doc, {
    startY: tableY,
    head: [],
    body: [
      ['Fecha y Día:', `${dayLabel}, ${assignment.date}`],
      ['Periodo y Horario:', `Periodo ${assignment.period}  ·  ${assignment.timeRange}`],
      ['Grado / Curso:', `Grado ${assignment.grade}`],
      ['Asignatura:', assignment.subject],
      ['Plan de Clase / Actividad:', assignment.activityPlan || 'Seguimiento de temario curricular y control de aula.']
    ],
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      valign: 'middle',
      lineColor: [209, 213, 219],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [55, 65, 81] },
      1: { cellWidth: 'auto', textColor: [17, 24, 39] }
    }
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || tableY + 45;

  // Instructions Box
  const boxY = finalTableY + 6;
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(252, 211, 77); // amber-300
  doc.roundedRect(margin, boxY, contentWidth, 14, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text('Instrucciones para el Docente Reemplazante:', margin + 4, boxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  doc.text(
    'Favor presentarse puntualmente en el aula de clases indicada, verificar asistencia y reportar cualquier novedad a Coordinación Académica al finalizar la hora lectiva.',
    margin + 4,
    boxY + 9.5,
    { maxWidth: contentWidth - 8 }
  );

  // Signatures
  const sigY = boxY + 24;
  const sigW = (contentWidth - 20) / 2;
  const sig1X = margin + 5;
  const sig2X = margin + sigW + 15;

  doc.setDrawColor(156, 163, 175);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(sig1X, sigY, sig1X + sigW, sigY);
  doc.line(sig2X, sigY, sig2X + sigW, sigY);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(23, 23, 23);
  doc.text('Coordinación Académica', sig1X + sigW / 2, sigY + 4.5, { align: 'center' });
  doc.text(assignment.substituteTeacherName, sig2X + sigW / 2, sigY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(115, 115, 115);
  doc.text('Autorización y Registro', sig1X + sigW / 2, sigY + 8.5, { align: 'center' });
  doc.text('Firma Docente Reemplazante (Recibido)', sig2X + sigW / 2, sigY + 8.5, { align: 'center' });

  // Footer emission
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Volante Oficial emitido por ReemplazaDocente · FCBV Valledupar · Generado el ${new Date().toLocaleDateString('es-CO')}`,
    pageWidth / 2,
    sigY + 20,
    { align: 'center' }
  );

  const cleanTeacher = assignment.substituteTeacherName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Volante_Reemplazo_${cleanTeacher}_P${assignment.period}.pdf`);
}
