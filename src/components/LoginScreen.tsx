import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, School } from 'lucide-react';
import { loginApi } from '../utils/storage';
import { AppUser } from '../types';

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
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-blue-900 px-6 py-8 text-white text-center relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
              <School className="w-40 h-40" />
            </div>

            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-inner mb-3">
              R
            </div>

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
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Usuario Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ej. admin o cprimaria"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 font-medium text-neutral-900 bg-neutral-50/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 font-medium text-neutral-900 bg-neutral-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60 mt-2"
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

        <p className="text-center text-[11px] text-neutral-400 mt-4">
          Acceso Restringido · Colegio Bilingüe de Valledupar
        </p>
      </div>
    </div>
  );
};
