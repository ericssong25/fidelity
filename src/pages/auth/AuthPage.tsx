import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import PhoneInput from '../../components/PhoneInput';
import AvatarSelector from '../../components/AvatarSelector';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
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
    
    setLoginLoading(true);
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
    } finally {
      setLoginLoading(false);
    }
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
      errors.push('El número de teléfono no es válido. Completa los 7 dígitos después del prefijo.');
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
    
    setRegisterLoading(true);
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
      showToast(err.message || 'Error al registrarse. Intenta de nuevo.', 'error');
    } finally {
      setRegisterLoading(false);
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

              <button
                type="submit"
                disabled={isLoading || loginLoading}
                className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm hover:bg-[#6B3FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : (
                  'Iniciar Sesión'
                )}
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
                    onChange={e => setSignUpUsername(e.target.value.replace(/^@+/, ''))}
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
                disabled={isLoading || registerLoading}
                className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm hover:bg-[#6B3FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registerLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando cuenta...
                  </span>
                ) : (
                  'Crear Cuenta'
                )}
              </button>
            </form>
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
