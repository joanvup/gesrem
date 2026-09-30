import React, { useState } from 'react';
import {
  Calendar,
  UserX,
  Clock,
  BarChart3,
  FileUp,
  Sparkles,
  PlusCircle,
  Database,
  ShieldCheck,
  LogOut,
  KeyRound,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { DayOfWeek, DAYS_CONFIG, AppUser } from '../types';

interface NavbarProps {
  activeTab: 'hub' | 'board' | 'schedule' | 'analytics' | 'pdf' | 'audit';
  setActiveTab: (tab: 'hub' | 'board' | 'schedule' | 'analytics' | 'pdf' | 'audit') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedDay: DayOfWeek;
  onOpenNewAbsence: () => void;
  activeReplacementsCount: number;
  sqliteConnected?: boolean;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onOpenChangePassword?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
  selectedDay,
  onOpenNewAbsence,
  activeReplacementsCount,
  sqliteConnected = true,
  currentUser,
  onLogout,
  onOpenChangePassword
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const currentDayConfig = DAYS_CONFIG.find(d => d.id === selectedDay);

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Single element brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/fcbv-logo.jpg"
              alt="Fundación Colegio Bilingüe de Valledupar"
              className="w-10 h-10 rounded-full object-contain border border-amber-600/40 shadow-xs bg-white"
            />
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

            {currentUser?.role === 'admin' && (
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
            )}

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <span>{currentUser?.role === 'admin' ? 'Auditoría & Backups' : 'Log de Auditoría'}</span>
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

            <div className="hidden md:flex items-center gap-2 text-xs border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-neutral-50">
              <span className="text-neutral-500 font-medium">{currentDayConfig?.labelEs}</span>
              <span className="text-neutral-300">|</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-neutral-700 font-mono text-xs focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={onOpenNewAbsence}
              className="px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">+ Reportar Falta</span>
              <span className="sm:hidden">+ Falta</span>
            </button>

            {/* User Session Profile & Menu */}
            {currentUser && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-neutral-100 transition-colors border border-neutral-200 cursor-pointer bg-neutral-50 min-h-[36px]"
                  title={`Conectado como ${currentUser.name}`}
                >
                  <div className="w-7 h-7 rounded-md bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden xl:block text-left text-[11px] leading-tight pr-1">
                    <span className="font-bold text-neutral-800 block truncate max-w-[110px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 capitalize block">
                      {currentUser.role === 'admin' ? 'Administrador' : 'Coordinador'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-56 max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <span className="font-bold text-neutral-900 block truncate">
                        {currentUser.name}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        @{currentUser.username}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenChangePassword?.();
                      }}
                      className="w-full px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-900" />
                      <span>Cambiar Mi Contraseña</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveTab('audit');
                      }}
                      className="w-full px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{currentUser?.role === 'admin' ? 'Auditoría & Backups' : 'Log de Auditoría'}</span>
                    </button>

                    <div className="border-t border-neutral-100 my-1"></div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile subnav & date bar */}
      <div className="md:hidden border-t border-neutral-200 bg-neutral-50">
        {/* Mobile Date Row */}
        <div className="px-3 py-1.5 border-b border-neutral-150 flex items-center justify-between text-xs bg-white/70">
          <div className="flex items-center gap-1.5 text-neutral-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-900" />
            <span>{currentDayConfig?.labelEs}:</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-neutral-100 border border-neutral-300 rounded px-2 py-0.5 text-neutral-800 font-mono text-xs focus:outline-none"
          />
        </div>

        {/* Mobile Tabs Scrollable Row */}
        <div className="flex overflow-x-auto px-2 py-1.5 gap-1 scrollbar-none items-center">
          <button
            onClick={() => setActiveTab('hub')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'hub' ? 'bg-blue-900 text-white shadow-xs font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asignación</span>
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'board' ? 'bg-blue-900 text-white shadow-xs font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tablero ({activeReplacementsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'schedule' ? 'bg-blue-900 text-white shadow-xs font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Horarios</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'analytics' ? 'bg-blue-900 text-white shadow-xs font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Equidad</span>
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'pdf' ? 'bg-blue-900 text-white shadow-xs font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'audit' ? 'bg-blue-900 text-white shadow-xs font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Auditoría</span>
          </button>
        </div>
      </div>
    </header>
  );
};
