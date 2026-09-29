import React from 'react';
import { Calendar, UserX, Clock, BarChart3, FileUp, Sparkles, PlusCircle, Database, ShieldCheck } from 'lucide-react';
import { DayOfWeek, DAYS_CONFIG } from '../types';

interface NavbarProps {
  activeTab: 'hub' | 'board' | 'schedule' | 'analytics' | 'pdf' | 'audit';
  setActiveTab: (tab: 'hub' | 'board' | 'schedule' | 'analytics' | 'pdf' | 'audit') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedDay: DayOfWeek;
  onOpenNewAbsence: () => void;
  activeReplacementsCount: number;
  sqliteConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
  selectedDay,
  onOpenNewAbsence,
  activeReplacementsCount,
  sqliteConnected = true
}) => {
  const currentDayConfig = DAYS_CONFIG.find(d => d.id === selectedDay);

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Single element brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              R
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-neutral-900 block leading-tight">
                ReemplazaDocente
              </span>
              <span className="text-xs text-neutral-500 hidden sm:block">
                Col. Bilingüe de Valledupar · 2026/27
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'hub'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Asignación Rápida</span>
            </button>

            <button
              onClick={() => setActiveTab('board')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'board'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Clock className="w-4 h-4 text-neutral-500" />
              <span>Tablero Diario</span>
              {activeReplacementsCount > 0 && (
                <span className="text-xs font-mono tabular-nums px-1.5 py-0.2 text-blue-700 bg-blue-50 border border-blue-200 rounded">
                  {activeReplacementsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'schedule'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-neutral-500" />
              <span>Horarios & Matriz</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-neutral-500" />
              <span>Equidad & Estadísticas</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'pdf'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <FileUp className="w-4 h-4 text-neutral-500" />
              <span>Cargar PDF</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <span>Auditoría & Backups</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions and Date Control */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('audit')}
              title={sqliteConnected ? "Base de datos SQLite activa (clic para ver Auditoría y Backups)" : "Modo desconectado"}
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-1 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 cursor-pointer transition-colors"
            >
              <Database className={`w-3.5 h-3.5 ${sqliteConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
              <span className="hidden xl:inline">SQLite</span>
              <span className={`w-1.5 h-1.5 rounded-full ${sqliteConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            </button>

            <div className="hidden lg:flex items-center gap-2 text-xs border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-neutral-50">
              <span className="text-neutral-500 font-medium">{currentDayConfig?.labelEs}</span>
              <span className="text-neutral-300">|</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-neutral-700 font-mono text-xs focus:outline-none"
              />
            </div>

            <button
              onClick={onOpenNewAbsence}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Reportar Falta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile subnav */}
      <div className="md:hidden border-t border-neutral-100 flex overflow-x-auto px-4 py-2 gap-1 bg-neutral-50">
        <button
          onClick={() => setActiveTab('hub')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            activeTab === 'hub' ? 'bg-white text-blue-800 shadow-xs' : 'text-neutral-600'
          }`}
        >
          Asignación
        </button>
        <button
          onClick={() => setActiveTab('board')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            activeTab === 'board' ? 'bg-white text-blue-800 shadow-xs' : 'text-neutral-600'
          }`}
        >
          Tablero ({activeReplacementsCount})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            activeTab === 'schedule' ? 'bg-white text-blue-800 shadow-xs' : 'text-neutral-600'
          }`}
        >
          Horarios
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            activeTab === 'analytics' ? 'bg-white text-blue-800 shadow-xs' : 'text-neutral-600'
          }`}
        >
          Equidad
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            activeTab === 'pdf' ? 'bg-white text-blue-800 shadow-xs' : 'text-neutral-600'
          }`}
        >
          PDF
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
            activeTab === 'audit' ? 'bg-white text-blue-800 shadow-xs font-bold' : 'text-neutral-600'
          }`}
        >
          🛡️ Auditoría
        </button>
      </div>
    </header>
  );
};
