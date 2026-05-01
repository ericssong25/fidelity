import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const { showToast } = useApp();
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [demoMode, setDemoMode] = useState(false); // Temporal para testing
  
  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign Up form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('@');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    
    if (!signInEmail || !signInPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    // Basic email validation
    if (!signInEmail.includes('@')) {
      showToast('Please enter a valid email', 'error');
      return;
    }
    
    try {
      const success = await login(signInEmail, signInPassword);
      if (success) {
        showToast('Signed in successfully!', 'success');
        navigate('/home');
      } else {
        showToast('Invalid email or password', 'error');
      }
    } catch (error) {
      showToast('Login failed. Please try again.', 'error');
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    
    if (!signUpName || !signUpEmail || !signUpUsername || !signUpPassword || !signUpConfirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    
    // Basic validations
    if (!signUpEmail.includes('@')) {
      showToast('Please enter a valid email', 'error');
      return;
    }
    
    if (signUpPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    
    if (signUpPassword !== signUpConfirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    if (!signUpUsername.startsWith('@') || signUpUsername === '@') {
      showToast('Please enter a valid username after @', 'error');
      return;
    }
    
    try {
      const success = await register({
        name: signUpName,
        email: signUpEmail,
        username: signUpUsername,
        password: signUpPassword
      });
      
      if (success) {
        showToast('Account created successfully! Please check your email to verify your account.', 'success');
        // Don't navigate immediately - let user verify email first
        // Or you can navigate to a "verify email" page
        // navigate('/home');
        
        // Clear form
        setSignUpName('');
        setSignUpEmail('');
        setSignUpUsername('@');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
        
        // Switch to sign in form
        setIsSignIn(true);
      }
    } catch (error: any) {
      if (error.message?.includes('rate limit') || error.message?.includes('Too Many Requests')) {
        // Show demo mode option
        setDemoMode(true);
        showToast('Rate limit exceeded. Try demo mode or wait a few minutes.', 'error');
      } else {
        showToast(error.message || 'Registration failed. Please try again.', 'error');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F3FB] flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7546ED] to-[#DC89FF] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="font-extrabold text-[#12173B] text-2xl mb-2">FidelyApp</h1>
          <p className="text-[#B1A9E5] text-sm">
            {isSignIn ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
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
              Sign In
            </button>
            <button
              onClick={() => setIsSignIn(false)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                !isSignIn 
                  ? 'bg-white text-[#7546ED] shadow-sm' 
                  : 'text-[#B1A9E5] hover:text-[#7546ED]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In Form */}
          {isSignIn ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={e => setSignInEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={e => setSignInPassword(e.target.value)}
                    placeholder="Enter your password"
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
                disabled={isLoading}
                className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm hover:bg-[#6B3FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type="text"
                    value={signUpName}
                    onChange={e => setSignUpName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={e => setSignUpEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type="text"
                    value={signUpUsername}
                    onChange={e => {
                      const value = e.target.value;
                      // Always ensure @ at the beginning
                      if (!value.startsWith('@')) {
                        setSignUpUsername('@' + value);
                      } else {
                        setSignUpUsername(value);
                      }
                    }}
                    placeholder="@username"
                    className="w-full pl-10 pr-4 py-3 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] placeholder-[#B1A9E5] outline-none focus:border-[#7546ED] focus:ring-2 focus:ring-[#7546ED]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signUpPassword}
                    onChange={e => setSignUpPassword(e.target.value)}
                    placeholder="Create a password"
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
                <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B1A9E5]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={signUpConfirmPassword}
                    onChange={e => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm hover:bg-[#6B3FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Demo Account Info */}
          <div className="mt-6 p-4 bg-[#F4F3FB] rounded-xl">
            <p className="text-xs text-[#B1A9E5] font-semibold mb-2">Demo Account:</p>
            <p className="text-xs text-[#12173B]">Email: sofia@email.com</p>
            <p className="text-xs text-[#12173B]">Password: password</p>
          </div>

          {/* Demo Mode for Rate Limiting */}
          {demoMode && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-xs text-yellow-800 font-semibold mb-2">Rate Limit Active</p>
              <p className="text-xs text-yellow-700 mb-3">Supabase rate limiting is active. Try these options:</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    // Simulate successful registration
                    showToast('Demo: Account created! Switching to sign in...', 'success');
                    setDemoMode(false);
                    setIsSignIn(true);
                    setSignUpName('');
                    setSignUpEmail('');
                    setSignUpUsername('@');
                    setSignUpPassword('');
                    setSignUpConfirmPassword('');
                  }}
                  className="w-full py-2 px-3 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors"
                >
                  Continue with Demo Mode
                </button>
                <button
                  onClick={() => setDemoMode(false)}
                  className="w-full py-2 px-3 bg-white text-yellow-800 border border-yellow-300 rounded-lg text-xs font-medium hover:bg-yellow-50 transition-colors"
                >
                  Try Again Later
                </button>
              </div>
              <p className="text-xs text-yellow-600 mt-2">Or wait 5-10 minutes for rate limit to reset.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-[#B1A9E5]">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
