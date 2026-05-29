import React, { useState } from 'react';
import { Loan, AmortizationRow, PaymentRecord, ReminderRule } from '../types';
import { 
  ShieldCheck, 
  LogOut, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Info, 
  Bell, 
  Activity, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ArrowUpRight, 
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import ClientProfile from './ClientProfile';
import { exportLoanStatementPDF, sendLoanStatementEmail } from '../utils/statementExporter';

interface ClientOverviewProps {
  loan: Loan;
  currentSimDate: string;
  onRecordPayment: (loanId: string, record: PaymentRecord) => void;
  onUpdateReminderRules: (loanId: string, rules: ReminderRule[]) => void;
  onLogout: () => void;
  onUpdateLoan: (updatedLoan: Loan) => void;
}

export default function ClientOverview({
  loan,
  currentSimDate,
  onRecordPayment,
  onUpdateReminderRules,
  onLogout,
  onUpdateLoan
}: ClientOverviewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'repayments' | 'profile'>('repayments');
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // Email statement dialog states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSendingState, setEmailSendingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailFeedbackText, setEmailFeedbackText] = useState('');

  // Amortization progress mechanics matching main algorithms
  const nextUnpaidRow = loan.schedule.find(row => !row.isPaid);
  const totalRepayAmount = loan.schedule.reduce((sum, row) => sum + row.paymentAmount, 0);
  const totalAmountPaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalPrincipalPaid = loan.schedule.reduce(
    (sum, row) => sum + (row.isPaid ? row.principalPortion : (row.paidDetails?.principalPortion || 0)), 
    0
  );
  const totalInterestPaid = totalAmountPaid;
  const balanceRemaining = Math.max(0, totalRepayAmount - totalAmountPaid);
  const paymentsMadeCount = loan.schedule.filter(r => r.isPaid).length;
  const ratioPaid = totalRepayAmount > 0 ? (totalAmountPaid / totalRepayAmount) * 100 : 0;
  const isOverdue = loan.status === 'overdue' || (nextUnpaidRow && new Date(nextUnpaidRow.dueDate) < new Date(currentSimDate));

  const handleToggleReminderRule = (ruleId: string) => {
    const updatedRules = loan.reminderRules.map(r => 
      r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r
    );
    onUpdateReminderRules(loan.id, updatedRules);
  };

  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setEmailSendingState('loading');
    sendLoanStatementEmail(loan, emailInput, balanceRemaining, totalInterestPaid, totalRepayAmount)
      .then(res => {
        if (res.success) {
          setEmailSendingState('success');
          setEmailFeedbackText(`${res.message} [Carrier: ${res.relay || 'SMTP'}]`);
          setTimeout(() => {
            setShowEmailModal(false);
            setEmailSendingState('idle');
          }, 3500);
        } else {
          setEmailSendingState('error');
          setEmailFeedbackText(res.message);
        }
      })
      .catch(err => {
        setEmailSendingState('error');
        setEmailFeedbackText(err?.message || 'SMTP network channel connectivity issue.');
      });
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Banner Message Header */}
      <div className={`rounded-2xl text-white p-6 relative overflow-hidden shadow-md ${isOverdue ? 'bg-gradient-to-r from-red-900 to-rose-950' : balanceRemaining <= 0.05 ? 'bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950' : 'bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950'}`}>
        <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono bg-white/10 uppercase tracking-widest border border-white/10">
                {loan.category} Contract
              </span>
              
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-red-500 text-white animate-pulse">
                  ⚠️ Action Required: Overdue
                </span>
              )}
              {balanceRemaining <= 0.05 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-505 text-white bg-indigo-600">
                  🎉 Account Settled
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-sans font-black tracking-tight leading-none mt-2">
              Hello, {loan.borrowerName}!
            </h2>
            <p className="text-xs text-indigo-100/70 font-medium font-sans max-w-lg">
              Here's the real-time overview of your active agreement: <strong className="text-white">{loan.loanName}</strong>. 
              Our records are synced to the simulated database timeline.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto md:ml-auto">
            <button
              onClick={() => exportLoanStatementPDF(loan, balanceRemaining, totalInterestPaid, totalRepayAmount)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 rounded-xl text-[11px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-white"
              title="Download detailed statement as PDF"
            >
              📥 Export Statement (PDF)
            </button>
            <button
              onClick={() => {
                setEmailInput(loan.borrowerEmail || '');
                setShowEmailModal(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 rounded-xl text-[11px] font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-white"
              title="Dispatch statement copy via email"
            >
              ✉️ Email Statement
            </button>
            <button
              id="client-logout-btn"
              onClick={onLogout}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout Portal
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Sub-Navigation for Client Portal */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('repayments')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition select-none cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'repayments'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-150 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          💳 Repayments & Balance Ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('profile')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition select-none cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'profile'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-150 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          👤 My Account Profile
        </button>
      </div>

      {activeSubTab === 'profile' ? (
        <ClientProfile
          loan={loan}
          onUpdateLoan={onUpdateLoan}
          onViewRepaymentStatus={() => setActiveSubTab('repayments')}
        />
      ) : (
        <>
          {/* Primary KPI overview blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Remaining Principal */}
        <div className="bg-white rounded-xl p-5 border border-slate-205 shadow-sm relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 select-none opacity-40">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase font-sans tracking-wide">Remaining Balance</span>
          <span className="text-xl font-mono font-extrabold text-slate-900 block mt-1.5">
            GH₵ {balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 font-medium block mt-1 font-mono">
            Original Principal: GH₵ {loan.principal.toLocaleString()}
          </span>
        </div>

        {/* Next payment due stats */}
        <div className="bg-white rounded-xl p-5 border border-slate-205 shadow-sm relative overflow-hidden">
          <div className="absolute -right-3 -top-3 w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 select-none opacity-40">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase font-sans tracking-wide">Next Installment</span>
          {nextUnpaidRow ? (
            <>
              <span className="text-xl font-mono font-extrabold text-emerald-700 block mt-1.5">
                GH₵ {nextUnpaidRow.paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] font-bold block mt-1 font-mono ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
                Due Date: {nextUnpaidRow.dueDate}
              </span>
            </>
          ) : (
            <>
              <span className="text-xl font-sans font-black text-slate-500 block mt-1.5">Fully Repaid</span>
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">Excellent account status</span>
            </>
          )}
        </div>

        {/* Progress percent details */}
        <div className="bg-white rounded-xl p-5 border border-slate-205 shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase font-sans tracking-wide">Repayment Progress</span>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-lg font-mono font-extrabold text-indigo-650 text-indigo-700">{ratioPaid.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-400 font-sans font-medium">principal paid off</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-200">
            <div 
              style={{ width: `${Math.min(100, ratioPaid)}%` }} 
              className={`h-full rounded-full transition-all duration-300 ${isOverdue ? 'bg-rose-500' : ratioPaid >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
            ></div>
          </div>
        </div>

        {/* Amortization parameters meta */}
        <div className="bg-white rounded-xl p-5 border border-slate-205 shadow-sm">
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase font-sans tracking-wide">Terms Config</span>
          <span className="text-xl font-mono font-extrabold text-slate-800 block mt-1.5">
            {loan.interestRate}% <span className="text-[10px] text-slate-400 font-sans uppercase">p.a.</span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold block mt-1 capitalize">
            {loan.paymentFrequency} frequency • {loan.interestType} model
          </span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column options: core simulation action, schedule status, lists */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Interactive Amortization Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-sans font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Your Legal Repayment Amortization Schedule
                </h3>
                <p className="text-[11px] text-slate-400">Shows breakdown of principal and interest per scheduled installment</p>
              </div>
              
              <button
                type="button"
                onClick={() => setShowFullSchedule(!showFullSchedule)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 transition cursor-pointer"
              >
                {showFullSchedule ? 'Collapse Table' : `Show Entire List (${loan.schedule.length} rows)`}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold tracking-wide border-b border-slate-150">
                    <th className="py-2.5 px-3">Inst No</th>
                    <th className="py-2.5 px-3">Calendar Due</th>
                    <th className="py-2.5 px-3 text-right">Payment Size</th>
                    <th className="py-2.5 px-3 text-right">Principal</th>
                    <th className="py-2.5 px-3 text-right">Interest</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-center">Receipt Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loan.schedule
                    .slice(0, showFullSchedule ? loan.schedule.length : 6)
                    .map((row) => (
                      <tr 
                        key={row.paymentNumber} 
                        className={`hover:bg-slate-50/50 transition ${row.isPaid ? 'bg-slate-50/30' : ''}`}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-500">#{row.paymentNumber}</td>
                        <td className="py-2 px-3 text-slate-700">{row.dueDate}</td>
                        <td className="py-2 px-3 text-right text-slate-900 font-bold">GH₵ {row.paymentAmount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-slate-600">GH₵ {row.principalPortion.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-slate-600">GH₵ {row.interestPortion.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-slate-400">GH₵ {row.remainingBalance.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">
                          {row.isPaid ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              ✓ Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-slate-100 text-slate-700">
                              Unpaid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {!showFullSchedule && loan.schedule.length > 6 && (
                <div className="text-center pt-3 text-[10px] text-slate-400 italic">
                  Showing first 6 installments. Click "Show Entire List" above to expand the full legal schedule.
                </div>
              )}
            </div>
          </div>

          {/* Collapsible historically settled repayment ledgers list */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-sans font-bold text-slate-800">Historic Payment Ledger Credits</h3>
              <p className="text-[11px] text-slate-400">Chronological verification history for all cleared wire transfers on this account</p>
            </div>

            {loan.repayments.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-slate-150 border-dashed rounded-lg">
                <Info className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                <p className="text-[10px] font-bold">No historic ledger credits found for contract.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                {loan.repayments.map((rep) => (
                  <div key={rep.id} className="py-2.5 flex justify-between items-center text-xs hover:bg-slate-50/50 px-1 font-mono">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 block">GH₵ {rep.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-slate-400 block font-sans">Logged: {rep.paymentDate} • ID: {rep.id}</span>
                    </div>

                    <div className="text-right space-y-0.5 font-sans">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-indigo-50 text-indigo-700">
                        Cleared
                      </span>
                      {rep.notes && <span className="text-[9px] text-slate-400 block max-w-xs truncate">{rep.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right sidebars column: alert configurations and feedback support query */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Interactive settings config panel */}
          <div className="bg-white rounded-xl border border-slate-205 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-sans font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-indigo-600" />
                My Reminder Settings
              </h3>
              <p className="text-[11px] text-slate-400">Configure your automated alert subscription flags directly</p>
            </div>

            <div className="space-y-2.5">
              {loan.reminderRules.map((rule) => (
                <div 
                  key={rule.id} 
                  className={`p-3 rounded-xl border transition ${rule.isEnabled ? 'bg-indigo-50/30 border-indigo-200' : 'bg-slate-50/50 border-slate-200'}`}
                >
                  <label className="flex items-start justify-between cursor-pointer group">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600">
                        {Math.abs(rule.daysBeforeDue)} {rule.daysBeforeDue === 0 ? 'Same Day' : rule.daysBeforeDue > 0 ? 'Days Before' : 'Days After'} Due
                      </span>
                      <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">
                        Triggers over {rule.channel} channel
                      </span>
                    </div>
                    
                    <input
                      type="checkbox"
                      checked={rule.isEnabled}
                      onChange={() => handleToggleReminderRule(rule.id)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-350 rounded transition cursor-pointer"
                    />
                  </label>
                </div>
              ))}
            </div>

            <p className="text-[9px] text-slate-400 leading-normal italic pl-1">
              * Note: Toggling these configurations saves states directly into the offline secure storage container.
            </p>
          </div>

        </div>

      </div>
      </>
      )}

      {/* Email Statement Modal Overlay */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 relative">
            <button 
              onClick={() => {
                setShowEmailModal(false);
                setEmailSendingState('idle');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition text-sm font-bold"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-sm font-sans font-extrabold text-slate-900">Email Account Statement</h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Generates a detailed summary ledger of your Cornerstone Savings & Loans agreement and delivers it through SMTP.
              </p>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Recipient Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>

              {emailSendingState === 'loading' && (
                <div className="text-[10px] font-bold text-indigo-600 animate-pulse py-1">
                  ⏳ Launching SMTP connection handshakes & sending ledger stats...
                </div>
              )}

              {emailSendingState === 'success' && (
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg p-2 leading-relaxed">
                  ✨ Dispatch completed successfully!<br/>
                  <span className="text-[9px] font-semibold text-slate-500">{emailFeedbackText}</span>
                </div>
              )}

              {emailSendingState === 'error' && (
                <div className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 leading-relaxed">
                  ❌ Dispatch failed: {emailFeedbackText}
                </div>
              )}

              <div className="flex gap-2 pt-1.5 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailSendingState('idle');
                  }}
                  className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-extrabold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailSendingState === 'loading'}
                  className="flex-1 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-extrabold disabled:opacity-50 transition cursor-pointer"
                >
                  {emailSendingState === 'loading' ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
