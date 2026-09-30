import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BarChart3,
  FileUp,
  Sparkles,
  PlusCircle,
  Database,
  ShieldCheck,
  LogOut,
  KeyRound,
  ChevronDown,
  Menu,
  X,
  Layers
} from 'lucide-react';
import { DayOfWeek, DAYS_CONFIG, AppUser } from '../types';
import { ThemeToggle } from './ThemeToggle';

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
  const [managementMenuOpen, setManagementMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const managementMenuRef = useRef<HTMLDivElement>(null);

  const currentDayConfig = DAYS_CONFIG.find(d => d.id === selectedDay);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (managementMenuRef.current && !managementMenuRef.current.contains(event.target as Node)) {
        setManagementMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isManagementActive = activeTab === 'analytics' || activeTab === 'audit' || activeTab === 'pdf';

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('hub')}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <img
                src="/logo_320x320.png"
                alt="Fundación Colegio Bilingüe de Valledupar"
                className="w-9 h-9 rounded-full object-contain border border-amber-600/40 shadow-xs bg-white shrink-0 group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-50 block leading-tight">
                  ReemplazaDocente
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block">
                  FCBV · 2026/2027
                </span>
              </div>
            </button>
          </div>

          {/* Center: Grouped Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {/* Primary Operations Group */}
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'hub'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Asignación</span>
            </button>

            <button
              onClick={() => setActiveTab('board')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'board'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Tablero Diario</span>
              {activeReplacementsCount > 0 && (
                <span className="text-[11px] font-mono font-bold tabular-nums px-1.5 py-0.2 text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/60 rounded">
                  {activeReplacementsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Horarios & Matriz</span>
            </button>

            {/* Secondary Tools Group: Dropdown */}
            <div className="relative" ref={managementMenuRef}>
              <button
                onClick={() => setManagementMenuOpen(!managementMenuOpen)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isManagementActive
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Gestión & Reportes</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${managementMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Management Dropdown Menu */}
              {managementMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50 animate-fade-in text-xs">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">
                    Módulos Administrativos
                  </div>

                  <button
                    onClick={() => {
                      setManagementMenuOpen(false);
                      setActiveTab('analytics');
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                      activeTab === 'analytics'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-bold'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="block">Equidad & Distribución</span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">Estadísticas y balance docente</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setManagementMenuOpen(false);
                      setActiveTab('audit');
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                      activeTab === 'audit'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-bold'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
                    <div>
                      <span className="block">{currentUser?.role === 'admin' ? 'Auditoría, Usuarios & Backups' : 'Log de Auditoría'}</span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">Historial inmutable y seguridad</span>
                    </div>
                  </button>

                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setManagementMenuOpen(false);
                        setActiveTab('pdf');
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                        activeTab === 'pdf'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-bold'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <FileUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <span className="block">Cargar Horario en PDF</span>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">Actualizar desde aSc Timetables</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Right: Actions, Date Picker, Theme Toggle & User Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Date Selector */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
              <span className="text-neutral-600 dark:text-neutral-300 font-semibold">{currentDayConfig?.shortEs}</span>
              <span className="text-neutral-300 dark:text-neutral-600">|</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-neutral-800 dark:text-neutral-200 font-mono text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* Quick Action: Report Absence */}
            <button
              onClick={onOpenNewAbsence}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Reportar Falta</span>
              <span className="sm:hidden">+ Falta</span>
            </button>

            {/* User Session Profile & Menu */}
            {currentUser && (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700 cursor-pointer bg-neutral-50 dark:bg-neutral-800 min-h-[34px]"
                  title={`Conectado como ${currentUser.name}`}
                >
                  <div className="w-6 h-6 rounded-md bg-blue-900 dark:bg-blue-700 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    {currentUser.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden xl:block text-left text-[11px] leading-tight pr-1">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 block truncate max-w-[100px]">
                      {currentUser.name.split(' ')[0]}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 max-w-[calc(100vw-24px)] bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50 text-xs animate-fade-in">
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                      <span className="font-bold text-neutral-900 dark:text-white block truncate">
                        {currentUser.name}
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                          @{currentUser.username}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {currentUser.role === 'admin' ? 'Admin' : 'Coord'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenChangePassword?.();
                      }}
                      className="w-full px-3 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                      <span>Cambiar Contraseña</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveTab('audit');
                      }}
                      className="w-full px-3 py-2 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>{currentUser?.role === 'admin' ? 'Auditoría & Backups' : 'Log de Auditoría'}</span>
                    </button>

                    <div className="border-t border-neutral-100 dark:border-neutral-800 my-1"></div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 font-semibold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
              title="Menú"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 space-y-3">
          {/* Mobile Date Row */}
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
              <span>{currentDayConfig?.labelEs}:</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-0.5 text-neutral-800 dark:text-neutral-200 font-mono text-xs focus:outline-none"
            />
          </div>

          {/* Group 1: Operación Diaria */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-neutral-400 dark:text-neutral-500 tracking-wider block px-1">
              Operación de Reemplazos
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setActiveTab('hub');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                  activeTab === 'hub'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Asignación</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('board');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between ${
                  activeTab === 'board'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tablero</span>
                </div>
                {activeReplacementsCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/20 dark:bg-black/20 font-bold">
                    {activeReplacementsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('schedule');
                  setMobileMenuOpen(false);
                }}
                className={`col-span-2 px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                  activeTab === 'schedule'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Horarios & Matriz Escolar</span>
              </button>
            </div>
          </div>

          {/* Group 2: Gestión & Reportes */}
          <div className="space-y-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-bold uppercase text-neutral-400 dark:text-neutral-500 tracking-wider block px-1">
              Administración & Reportes
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setActiveTab('analytics');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                  activeTab === 'analytics'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Equidad</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('audit');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
                <span>Auditoría</span>
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    setActiveTab('pdf');
                    setMobileMenuOpen(false);
                  }}
                  className={`col-span-2 px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                    activeTab === 'pdf'
                      ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Cargar Horario en PDF (aSc Timetables)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
