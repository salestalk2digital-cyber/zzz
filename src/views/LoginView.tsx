import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogleAuth } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      await login(usernameOrEmail, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage('');
    try {
      await loginWithGoogleAuth();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in could not be completed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F6] flex flex-col justify-between p-4 sm:p-6 font-sans">
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md space-y-6">
          {/* Authentic Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F4B6A0] to-[#FCE4D9] shadow-sm border border-[#F4B6A0]/50 mb-1">
              <span className="text-xl font-black text-[#302A28] tracking-tighter">ZZ</span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-[#302A28]">
                ZigZagZoh
              </h1>
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-[#FCE4D9] text-[#302A28] border border-[#F4B6A0]/40">
                CRM
              </span>
            </div>

            <h2 className="text-base font-bold text-[#302A28]">
              Welcome to ZigZagZoh CRM
            </h2>
            <p className="text-xs text-[#7B706B] font-medium">
              Manage leads. Build relationships. Fill your slots.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#F0E4DF] shadow-xs space-y-5">
            {errorMessage && (
              <div className="p-3 bg-[#FEECEB] border border-[#D9534F]/30 rounded-xl text-[#D9534F] text-xs leading-relaxed">
                {errorMessage}
              </div>
            )}

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-[#FFF9F6] text-[#302A28] font-bold text-xs rounded-xl border border-[#F0E4DF] hover:border-[#F4B6A0] shadow-xs transition-all flex items-center justify-center gap-3 active:scale-98 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting Google Account...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#F0E4DF]" />
              <span className="px-3 bg-white text-[11px] font-semibold text-[#7B706B] absolute">
                or sign in with password
              </span>
            </div>

            {/* Standard Username/Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
              <div>
                <label className="block font-bold text-[#302A28] mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7B706B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your username or email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl text-xs text-[#302A28] focus:outline-hidden focus:border-[#F4B6A0] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#302A28] mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7B706B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#FFF9F6] border border-[#F0E4DF] rounded-xl text-xs text-[#302A28] focus:outline-hidden focus:border-[#F4B6A0] focus:bg-white transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7B706B] hover:text-[#302A28]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full py-2.5 bg-[#F4B6A0] hover:bg-[#EFA48A] text-[#302A28] font-black text-xs rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="text-center py-2 text-xs text-[#7B706B] space-y-0.5">
        <p className="font-semibold tracking-wide uppercase text-[10px]">
          Powered by Supreme Ads
        </p>
        <p className="text-[10px] text-[#7B706B]/80">
          Serving ZigZagZoh Gurgaon & Faridabad Outlets
        </p>
      </footer>
    </div>
  );
};
