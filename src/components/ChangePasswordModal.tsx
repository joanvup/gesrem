import React, { useState } from 'react';
import { Lock, CheckCircle, AlertCircle, X, KeyRound } from 'lucide-react';
import { changePasswordApi } from '../utils/storage';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userName
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePasswordApi(currentPassword, newPassword);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          onClose();
        }, 1500);
      } else {
        setError(res.error || 'Error al actualizar la contraseña');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-900" />
            <h3 className="font-bold text-neutral-900 text-sm">Cambiar Contraseña</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>¡Contraseña modificada correctamente en la base de datos!</span>
            </div>
          )}

          <p className="text-xs text-neutral-500">
            Cambiando contraseña para la cuenta <span className="font-semibold text-neutral-800">{userName}</span>.
          </p>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-700">Contraseña Actual</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-blue-800 font-mono"
              placeholder="••••••••••••"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-700">Nueva Contraseña (mínimo 6 caracteres)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-blue-800 font-mono"
              placeholder="••••••••••••"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-700">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-blue-800 font-mono"
              placeholder="••••••••••••"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
