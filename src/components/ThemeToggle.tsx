import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo Claro (Accesibilidad)' : 'Modo Oscuro (Accesibilidad)'}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-blue-600 transition-transform -rotate-12 hover:rotate-0" />
      )}
      <span className="sr-only">
        {isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
      </span>
    </button>
  );
};
