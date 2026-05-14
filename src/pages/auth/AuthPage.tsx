import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import PhoneInput from '../../components/PhoneInput';
import AvatarSelector from '../../components/AvatarSelector';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AuthPage() {
  const { showToast } = useApp();
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const returnUrl = (location.state as { from?: string })?.from || redirectParam || undefined;
  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [demoMode, setDemoMode] = useState(false); // Temporal para testing
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  
  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign Up form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    
    if (!signInEmail || !signInPassword) {
      showToast('Completa todos los campos', 'error');
      return;
    }
    
    if (!signInEmail.includes('@')) {
      showToast('Ingresa un email válido', 'error');
      return;
    }
    
    try {
      const success = await login(signInEmail, signInPassword);
      if (success) {
        showToast('¡Inicio de sesión exitoso!', 'success');
        navigate(returnUrl || '/home');
      } else {
        showToast('Email o contraseña inválidos', 'error');
      }
    } catch {
      showToast('Error al iniciar sesión. Intenta de nuevo.', 'error');
    }
  }

  async function handleForgotPassword() {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      showToast('Ingresa un email válido', 'error');
      return;
    }

    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + '/reset-password',
    });

    if (error) {
      showToast('Error al enviar el enlace. Intenta de nuevo.', 'error');
    } else {
      showToast('Revisa tu correo. Te enviamos un enlace para restablecer tu contraseña.', 'success');
      setShowForgotForm(false);
      setForgotEmail('');
    }
    setForgotLoading(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    
    const errors: string[] = [];
    
    if (!signUpName.trim()) {
      errors.push('El nombre completo es obligatorio.');
    }
    
    if (!signUpEmail.trim()) {
      errors.push('El correo electrónico es obligatorio.');
    } else if (!signUpEmail.includes('@')) {
      errors.push('El correo electrónico no es válido.');
    }
    
    if (!signUpUsername.trim()) {
      errors.push('El nombre de usuario es obligatorio.');
    }
    
    const phoneDigits = signUpPhone.replace(/\D/g, '');
    if (phoneDigits.length > 3 && phoneDigits.length !== 10) {
      errors.push('El número de teléfono no es válido. Debe tener 7 dígitos.');
    }
    
    if (!signUpPassword) {
      errors.push('La contraseña es obligatoria.');
    } else if (signUpPassword.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres.');
    }
    
    if (!signUpConfirmPassword) {
      errors.push('La confirmación de contraseña es obligatoria.');
    } else if (signUpPassword !== signUpConfirmPassword) {
      errors.push('Las contraseñas no coinciden.');
    }
    
    if (errors.length > 0) {
      showToast(errors.join('. '), 'error');
      return;
    }
    
    try {
      const success = await register({
        name: signUpName,
        email: signUpEmail,
        username: '@' + signUpUsername,
        phone: signUpPhone,
        password: signUpPassword
      });
      
      if (success) {
        showToast('¡Cuenta creada exitosamente!', 'success');
        
        // Auto-login after registration
        const loginSuccess = await login(signUpEmail, signUpPassword);
        if (loginSuccess) {
          setShowAvatarPicker(true);
        } else {
          showToast('Cuenta creada. Por favor inicia sesión.', 'info');
          setIsSignIn(true);
        }
        
        // Clear form
        setSignUpName('');
        setSignUpEmail('');
        setSignUpUsername('');
        setSignUpPhone('');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('rate limit') || err.message?.includes('Too Many Requests')) {
        // Show demo mode option
        setDemoMode(true);
        showToast('Límite de peticiones excedido. Usa modo demo o espera unos minutos.', 'error');
      } else {
        showToast(err.message || 'Error al registrarse. Intenta de nuevo.', 'error');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F3FB] flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7546ED] to-[#DC89FF] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">Z</span>
          </div>
          <h1 className="font-extrabold text-[#12173B] text-2xl mb-2">Zuma</h1>
          <p className="text-[#B1A9E5] text-sm">
            {isSignIn ? '¡Bienvenido de vuelta! Inicia sesión para continuar' : 'Crea tu cuenta para comenzar'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#B1A9E5]/10 p-6">
          {/* Toggle Buttons */}
          <div className="flex bg-[#F4F3FB] rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsSignIn(true)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                isSignIn 
                  ? 'bg-white text-[#7546ED] shadow-sm' 
                  : 'text-[#B1A9E5] hover:text-[#7546ED]'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsSignIn(false)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                !isSignIn 
                  ? 'bg-white text-[#7546ED] shadow-sm' 
                  : 'text-[#B1A9E5] hover:text-[#7546ED]'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Sign In Form */}
          {isSignIn ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Correo electrónico</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={signInEmail}
                    onChange={e => setSignInEmail(e.target.value)}
                    placeholder="Ingresa tu correo"
                    className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={signInPassword}
                    onChange={e => setSignInPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
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

              {showForgotForm ? (
                <div className="space-y-3 pt-1">
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="Ingresa tu correo"
                      className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotForm(false);
                        setForgotEmail('');
                      }}
                      className="flex-1 py-2.5 rounded-btn border border-[#B1A9E5]/40 text-[#B1A9E5] font-semibold text-xs"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                      className="flex-1 py-2.5 rounded-btn bg-[#7546ED] text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar enlace'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowForgotForm(true)}
                  className="text-[#B1A9E5] text-xs font-medium hover:text-[#7546ED] transition-colors text-right w-full"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm hover:bg-[#6B3FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Correo electrónico</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={e => setSignUpEmail(e.target.value)}
                    placeholder="Ingresa tu correo"
                    className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={signUpPassword}
                    onChange={e => setSignUpPassword(e.target.value)}
                    placeholder="Crea una contraseña"
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
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={signUpConfirmPassword}
                    onChange={e => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Confirma tu contraseña"
                    className="w-full pl-10 pr-12 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B1A9E5] hover:text-[#7546ED] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Nombre completo</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type="text"
                    value={signUpName}
                    onChange={e => setSignUpName(e.target.value)}
                    placeholder="Ingresa tu nombre completo"
                    className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Usuario</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-[#12173B] font-semibold text-sm select-none">@</span>
                  <input
                    type="text"
                    value={signUpUsername}
                    onChange={e => setSignUpUsername(e.target.value)}
                    placeholder="username"
                    className="w-full pl-16 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Teléfono</label>
                <PhoneInput
                  value={signUpPhone}
                  onChange={setSignUpPhone}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm hover:bg-[#6B3FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>
          )}

          {/* Demo Mode for Rate Limiting */}
          {demoMode && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-xs text-yellow-800 font-semibold mb-2">Límite de peticiones activo</p>
              <p className="text-xs text-yellow-700 mb-3">Límite de Supabase activo. Prueba estas opciones:</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    // Simulate successful registration
                    showToast('Demo: ¡Cuenta creada! Cambiando a inicio de sesión...', 'success');
                    setDemoMode(false);
                    setIsSignIn(true);
                    setSignUpName('');
                    setSignUpEmail('');
                    setSignUpUsername('');
                    setSignUpPassword('');
                    setSignUpConfirmPassword('');
                  }}
                  className="w-full py-2 px-3 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors"
                >
                  Continuar en Modo Demo
                </button>
                <button
                  onClick={() => setDemoMode(false)}
                  className="w-full py-2 px-3 bg-white text-yellow-800 border border-yellow-300 rounded-lg text-xs font-medium hover:bg-yellow-50 transition-colors"
                >
                  Intentar más tarde
                </button>
              </div>
              <p className="text-xs text-yellow-600 mt-2">O espera 5-10 minutos para que se reinicie el límite.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-[#B1A9E5]">
Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad
          </p>
          <p className="text-xs text-[#B1A9E5]/60 mt-2 font-medium">Beta 1.0.0</p>
        </div>

        {/* Post-registration Avatar Picker */}
        <AvatarSelector
          open={showAvatarPicker}
          onClose={() => {
            setShowAvatarPicker(false);
            navigate(returnUrl || '/home');
          }}
          currentAvatarId={null}
          userName={signUpName}
        />
      </div>
    </div>
  );
}
