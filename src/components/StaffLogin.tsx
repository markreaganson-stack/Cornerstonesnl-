import React, { useState } from 'react';
import { ShieldCheck, LogIn, Lock, Mail, Eye, EyeOff, Key, Sparkles } from 'lucide-react';

interface StaffLoginProps {
  onLoginSuccess: () => void;
  onSwitchToClient: () => void;
  staffAccounts?: { id: string; email: string; password: string }[];
}

export default function StaffLogin({
  onLoginSuccess,
  onSwitchToClient,
  staffAccounts = []
}: StaffLoginProps) {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const emailTrimmed = emailInput.trim().toLowerCase();
    const passwordTrimmed = passwordInput.trim();

    // Standard credential matching
    setTimeout(() => {
      setIsLoading(false);
      
      const isOfficial = (
        (emailTrimmed === 'officer@cornerstone.com' || emailTrimmed === 'admin@cornerstone.com' || emailTrimmed === 'admin') &&
        (passwordTrimmed === 'staff123' || passwordTrimmed === 'admin123')
      );

      const isCustomCustom = staffAccounts.some(
        acc => acc.email.toLowerCase() === emailTrimmed && acc.password === passwordTrimmed
      );

      if (isOfficial || isCustomCustom) {
        onLoginSuccess();
      } else {
        setErrorMessage('Invalid authentication parameters. Please review your administrative credentials or contact Cornerstone cyber security.');
      }
    }, 800);
  };

  return (
    <div className="w-full max-w-md mx-auto my-12 animate-fade-in text-left">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-white">
        
        {/* Bank Security Premium Vault Header */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-950 p-6 text-center relative border-b border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <div className="w-12 h-12 bg-indigo-650 rounded-xl mx-auto flex items-center justify-center shadow-lg border border-indigo-500/30">
            <Lock className="w-6 h-6 text-indigo-200" />
          </div>
          <h2 className="text-lg font-sans font-black mt-3 tracking-tight">Cornerstone Terminal Access</h2>
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 block mt-1 font-bold">Administrative Portal</span>
          <p className="text-[11px] text-slate-400 mt-1">
            Sign-in using your official security token credentials.
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/55 border border-rose-800 rounded-xl text-xs font-semibold text-rose-300 leading-normal flex items-start gap-2.5">
              <span className="text-base select-none">⚠️</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="staff-email" className="block text-xs font-bold text-slate-350">
              Staff Email / Directory Login
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                id="staff-email"
                type="text"
                required
                placeholder="officer@cornerstone.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950/75 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-semibold font-sans text-slate-100 placeholder-slate-600 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="staff-password" className="block text-xs font-bold text-slate-350">
                Administrative Passcode
              </label>
              <span className="text-[9px] text-indigo-400 font-mono">Vault Encrypted</span>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-slate-950/75 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-bold font-mono text-slate-100 placeholder-slate-650 transition tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="staff-login-btn"
            disabled={isLoading}
            className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/50 hover:scale-[1.01] transition disabled:opacity-50 select-none"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 animate-pulse text-indigo-300" /> Autherizing Directory Token...
              </span>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Connect to Cornerstone Ledger
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToClient}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition font-bold"
            >
              ← Go to Client Account Portal instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
