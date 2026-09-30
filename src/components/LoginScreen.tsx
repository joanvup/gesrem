import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, School } from 'lucide-react';
import { loginApi } from '../utils/storage';
import { AppUser } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginApi(username, password);
      if (result.ok && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Credenciales incorrectas. Verifica tu información.');
      }
    } catch (err: any) {
      setErrorMessage('Ocurrió un error al contactar el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col justify-center items-center p-4 relative transition-colors duration-150">
      {/* Top right theme toggle for accessibility */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-blue-900 dark:bg-blue-950 px-6 py-8 text-white text-center relative overflow-hidden border-b border-blue-800/40">
            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
              <School className="w-40 h-40" />
            </div>

            <img
              src="/logo_320x320.png"
              alt="Logo FCBV"
              className="w-16 h-16 rounded-full bg-white border-2 border-amber-400 object-contain mx-auto shadow-md mb-3"
            />

            <h1 className="text-xl font-bold tracking-tight">ReemplazaDocente</h1>
            <p className="text-xs text-blue-200 mt-1 font-medium">
              Colegio Bilingüe de Valledupar · 2026/2027
            </p>
            <p className="text-[11px] text-blue-300 mt-0.5">
              Sistema de Asignación y Control de Suplencias
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Usuario Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ej. admin o cprimaria"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-800/20 dark:focus:ring-blue-600/40 focus:border-blue-800 dark:focus:border-blue-600 font-medium text-neutral-900 dark:text-neutral-100 bg-neutral-50/50 dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-800/20 dark:focus:ring-blue-600/40 focus:border-blue-800 dark:focus:border-blue-600 font-medium text-neutral-900 dark:text-neutral-100 bg-neutral-50/50 dark:bg-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span>Verificando credenciales...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500 mt-4">
          Acceso Restringido · Colegio Bilingüe de Valledupar
        </p>
      </div>
    </div>
  );
};
