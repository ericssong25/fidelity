import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors: string[] = [];
    if (!password) errors.push('La nueva contraseña es obligatoria.');
    else if (password.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres.');
    if (!confirmPassword) errors.push('La confirmación de contraseña es obligatoria.');
    else if (password !== confirmPassword) errors.push('Las contraseñas no coinciden.');

    if (errors.length > 0) {
      showToast(errors.join('. '), 'error');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      showToast('Error al actualizar la contraseña. Intenta de nuevo.', 'error');
    } else {
      showToast('Contraseña actualizada exitosamente', 'success');
      navigate('/home', { replace: true });
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#F4F3FB] flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7546ED] to-[#DC89FF] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">Z</span>
          </div>
          <h1 className="font-extrabold text-[#12173B] text-2xl mb-2">Zuma</h1>
          <p className="text-[#B1A9E5] text-sm">
            {ready ? 'Crea una nueva contraseña' : 'Verificando enlace...'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#B1A9E5]/10 p-6">
          {!ready ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-8 h-8 border-2 border-[#7546ED]/30 border-t-[#7546ED] rounded-full animate-spin" />
              <span className="text-[#B1A9E5] text-sm">Verificando enlace de recuperación...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Nueva contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Ingresa tu nueva contraseña"
                    className="w-full pl-10 pr-12 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B1A9E5] hover:text-[#7546ED] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Confirmar contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirma tu nueva contraseña"
                    className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm hover:bg-[#6B3FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
