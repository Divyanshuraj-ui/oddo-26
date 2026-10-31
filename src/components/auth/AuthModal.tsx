import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithGoogle, signup, requestPasswordReset, switchUserRole } = useApp();

  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('signup');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Real-time password requirement checks (Scene 1)
  const isLenValid = password.length > 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = isLenValid && hasUpper && hasLower && hasSpecial;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = login(email, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Login failed.');
      return;
    }

    onClose();
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    const res = await loginWithGoogle();
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Google Sign-In failed');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isPasswordValid) {
      setErrorMsg('Please satisfy all password criteria before submitting.');
      return;
    }

    const res = signup(name, email, password, companyName);
    if (!res.success) {
      setErrorMsg(res.error || 'Signup failed.');
      return;
    }

    onClose();
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = requestPasswordReset(email);
    setSuccessMsg(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {view === 'signup'
                ? 'Create Customer Account'
                : view === 'login'
                ? 'Sign In to Brightloop'
                : 'Reset Password'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scene 1 Authentication & Password Compliance
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        {view !== 'forgot' && (
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 mx-5 mt-5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setView('signup');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg transition-all ${
                view === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Sign Up
            </button>
            <button
              onClick={() => {
                setView('login');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg transition-all ${
                view === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Error / Success Banners */}
        <div className="px-5 pt-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
              {successMsg}
            </div>
          )}
        </div>

        {/* Google Authentication */}
        {view !== 'forgot' && (
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all active:scale-[0.99]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2 text-[10px] uppercase font-semibold text-slate-400 absolute">
                Or with email
              </span>
            </div>
          </div>
        )}

        {/* SIGN UP FORM */}
        {view === 'signup' && (
          <form onSubmit={handleSignup} className="p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rachel Adams"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Shop Name</label>
              <input
                type="text"
                placeholder="e.g. Adams Digital Goods"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email</label>
              <input
                type="email"
                placeholder="rachel@adamsgoods.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                required
              />
            </div>

            {/* Strict Password Checklist (Scene 1) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
              <span className="font-semibold text-slate-700 block text-xs">
                Password Requirements (Enforced):
              </span>
              <div className="grid grid-cols-2 gap-1">
                <div
                  className={`flex items-center gap-1.5 ${
                    isLenValid ? 'text-emerald-700 font-medium' : 'text-slate-400'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px]">
                    {isLenValid ? '✓' : '○'}
                  </span>
                  <span>&gt; 8 characters</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasUpper ? 'text-emerald-700 font-medium' : 'text-slate-400'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px]">
                    {hasUpper ? '✓' : '○'}
                  </span>
                  <span>1 uppercase letter</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasLower ? 'text-emerald-700 font-medium' : 'text-slate-400'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px]">
                    {hasLower ? '✓' : '○'}
                  </span>
                  <span>1 lowercase letter</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-400'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px]">
                    {hasSpecial ? '✓' : '○'}
                  </span>
                  <span>1 special symbol</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isPasswordValid}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
            >
              Create Account & Enter Portal &rarr;
            </button>
          </form>
        )}

        {/* LOGIN FORM */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="admin@brightloop.io or david@apexretail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    setErrorMsg('');
                  }}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                placeholder="Password with uppercase, lowercase & symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              Sign In &rarr;
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="p-5 space-y-3.5">
            <p className="text-xs text-slate-600">
              Enter your registered email address and our system will generate a secure one-time reset link.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Email</label>
              <input
                type="email"
                placeholder="david@apexretail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              Send Reset Link &rarr;
            </button>

            <button
              type="button"
              onClick={() => setView('login')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 pt-2"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Quick Demo Personas Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Instant Hackathon Demo Logins:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                switchUserRole('admin');
                onClose();
              }}
              className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-indigo-600 text-[11px]"
            >
              <div className="font-bold text-slate-900">Admin</div>
              <div className="text-slate-500 truncate text-[10px]">Alex Morgan</div>
            </button>
            <button
              onClick={() => {
                switchUserRole('staff');
                onClose();
              }}
              className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-indigo-600 text-[11px]"
            >
              <div className="font-bold text-slate-900">Staff</div>
              <div className="text-slate-500 truncate text-[10px]">Elena Rostova</div>
            </button>
            <button
              onClick={() => {
                switchUserRole('customer', 'cust-1');
                onClose();
              }}
              className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-indigo-600 text-[11px]"
            >
              <div className="font-bold text-slate-900">Customer</div>
              <div className="text-slate-500 truncate text-[10px]">David Chen</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
