import React from 'react';
import { BarChart3, ShieldCheck, Scale, Award, Download, TrendingUp } from 'lucide-react';
import { Teacher, ReplacementAssignment } from '../types';

interface FairnessAnalyticsProps {
  teachers: Teacher[];
  replacements: ReplacementAssignment[];
}

export const FairnessAnalytics: React.FC<FairnessAnalyticsProps> = ({
  teachers,
  replacements
}) => {
  // Count replacements per teacher
  const countsMap: Record<string, number> = {};
  replacements.forEach(r => {
    countsMap[r.substituteTeacherId] = (countsMap[r.substituteTeacherId] || 0) + 1;
  });

  // Calculate statistics
  const teacherStats = teachers.map(t => ({
    teacher: t,
    count: countsMap[t.id] || 0
  })).sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...teacherStats.map(s => s.count), 1);
  const teachersWithZero = teacherStats.filter(s => s.count === 0).length;
  const teachersWithReplacements = teacherStats.filter(s => s.count > 0).length;
  const totalReplacements = replacements.length;
  const averageReplacements = teachers.length > 0 ? (totalReplacements / teachers.length).toFixed(1) : '0';

  // Department breakdown
  const deptCounts: Record<string, number> = {};
  replacements.forEach(r => {
    deptCounts[r.substituteDepartment] = (deptCounts[r.substituteDepartment] || 0) + 1;
  });

  const handleExportCSV = () => {
    const rows = [
      ['ID', 'Nombre', 'Departamento', 'Seccion', 'Reemplazos Asignados'],
      ...teacherStats.map(s => [
        s.teacher.id,
        `"${s.teacher.name}"`,
        `"${s.teacher.department}"`,
        s.teacher.section,
        s.count.toString()
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_equidad_reemplazos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Equidad y Distribución de Carga Docente
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Monitoreo de justicia laboral en la asignación de reemplazos. El algoritmo prioriza automáticamente a profesores con menor cantidad de suplencias realizadas.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4 text-neutral-500" />
          <span>Exportar Reporte CSV</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-neutral-500 text-xs">
            <Scale className="w-4 h-4 text-blue-600" />
            <span>Total Suplencias</span>
          </div>
          <span className="text-2xl font-bold font-mono text-neutral-900 mt-2 block tabular-nums">
            {totalReplacements}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            Acumulado histórico registrado
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-neutral-500 text-xs">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Promedio por Docente</span>
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-2 block tabular-nums">
            {averageReplacements}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            Suplencias por cada profesor
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-neutral-500 text-xs">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Docentes con 0 Reemplazos</span>
          </div>
          <span className="text-2xl font-bold font-mono text-amber-600 mt-2 block tabular-nums">
            {teachersWithZero}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            Prioridad máxima para próximas asignaciones
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-neutral-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-800" />
            <span>Cuerpo Docente Total</span>
          </div>
          <span className="text-2xl font-bold font-mono text-neutral-900 mt-2 block tabular-nums">
            {teachers.length}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            Colegio Bilingüe de Valledupar
          </span>
        </div>
      </div>

      {/* Main Table: Distribution by Teacher */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neutral-700" />
            <h3 className="text-xs font-bold text-neutral-900">
              Ranking de Distribución de Carga de Reemplazos
            </h3>
          </div>
          <span className="text-[11px] text-neutral-500">
            {teacherStats.length} docentes monitoreados
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200">
              <tr className="text-neutral-500 font-medium">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Docente</th>
                <th className="py-2.5 px-4">Departamento</th>
                <th className="py-2.5 px-4">Sección</th>
                <th className="py-2.5 px-4 w-64">Carga Relativa</th>
                <th className="py-2.5 px-4 text-right">Total Reemplazos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {teacherStats.map((item, index) => {
                const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                return (
                  <tr key={item.teacher.id} className="hover:bg-neutral-50/60">
                    <td className="py-2 px-4 text-center font-mono text-neutral-400">
                      {index + 1}
                    </td>
                    <td className="py-2 px-4 font-bold text-neutral-900">
                      {item.teacher.name}
                    </td>
                    <td className="py-2 px-4 text-neutral-600">
                      {item.teacher.department}
                    </td>
                    <td className="py-2 px-4 text-neutral-500">
                      {item.teacher.section}
                    </td>
                    <td className="py-2 px-4">
                      <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.count === 0
                              ? 'bg-transparent'
                              : item.count > 3
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                      {item.count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
