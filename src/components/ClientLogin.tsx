import React, { useState } from 'react';
import { Loan } from '../types';
import { ShieldCheck, LogIn, Sparkles, HelpCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react';

interface ClientLoginProps {
  loans: Loan[];
  onLoginSuccess: (loan: Loan) => void;
  onBackToStaff: () => void;
}

export default function ClientLogin({
  loans,
  onLoginSuccess,
  onBackToStaff
}: ClientLoginProps) {
  const [emailInput, setEmailInput] = useState('');
  const [loanIdInput, setLoanIdInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = emailInput.trim().toLowerCase();
    const loanIdTrimmed = loanIdInput.trim();

    if (!emailTrimmed || !loanIdTrimmed) {
      setErrorMessage('Please enter both your registered Email and your Loan ID.');
      return;
    }

    // Match loan against registered borrowers
    const matchedLoan = loans.find(loan => {
      const dbEmail = (loan.borrowerEmail || '').trim().toLowerCase();
      const dbId = loan.id.trim();
      return dbEmail === emailTrimmed && dbId === loanIdTrimmed;
    });

    if (matchedLoan) {
      onLoginSuccess(matchedLoan);
    } else {
      setErrorMessage('Authentication failed. No loan agreement matched those credentials. Please check your credentials or contact Cornerstone support.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-8 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Visual Brand Header */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 text-white text-center relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-505/10 rounded-full blur-xl"></div>
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center shadow-lg border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-sans font-extrabold mt-3 tracking-tight">Client Account Portal</h2>
          <p className="text-[11px] text-indigo-200/80 font-semibold mt-1">
            Securely authenticate to access your outstanding ledger and repayments
          </p>
        </div>

        {/* Login Form Container */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-xs font-semibold text-rose-700 leading-relaxed flex items-start gap-2">
              <span className="text-base select-none">⚠️</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="client-email" className="block text-xs font-bold text-slate-700">
              Registered Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">✉️</span>
              <input
                id="client-email"
                type="email"
                required
                placeholder="email@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-semibold transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="client-loan-id" className="block text-xs font-bold text-slate-700">
                Cornerstone Loan ID Code
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Format: loan-*</span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">🔑</span>
              <input
                id="client-loan-id"
                type="text"
                required
                placeholder="loan-xxxx"
                value={loanIdInput}
                onChange={(e) => setLoanIdInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-semibold transition"
              />
            </div>
          </div>

          <button
            type="submit"
            id="client-login-btn"
            className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-200/50 transition-all select-none"
          >
            <LogIn className="w-4 h-4" /> Secure Authentication
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToStaff}
              className="text-[11px] text-slate-400 hover:text-indigo-600 transition font-bold"
            >
              ← Switch back to Staff Dashboard Portal
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
