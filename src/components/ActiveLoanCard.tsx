import React, { useState } from 'react';
import { Loan, AmortizationRow, PaymentRecord, ReminderRule } from '../types';
import { Trash2, Edit, Calendar, DollarSign, Percent, PlusCircle, ArrowUpRight, HelpCircle, Check, BookOpen, AlertTriangle, CheckCircle, Smartphone, Mail, Bell, ShieldCheck, Bookmark, ArrowDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { calculaterepaymentEffects } from '../utils/loanCalculations';
import { exportLoanStatementPDF, sendLoanStatementEmail } from '../utils/statementExporter';

interface ActiveLoanCardProps {
  loan: Loan;
  currentSimDate: string;
  onEdit: (loan: Loan) => void;
  onDelete: (loanId: string) => void;
  onRecordPayment: (loanId: string, record: PaymentRecord) => void;
  onUpdateReminderRules: (loanId: string, rules: ReminderRule[]) => void;
  onInstantReminder: (loan: Loan, rule: ReminderRule) => void;
}

export default function ActiveLoanCard({
  loan,
  currentSimDate,
  onEdit,
  onDelete,
  onRecordPayment,
  onUpdateReminderRules,
  onInstantReminder
}: ActiveLoanCardProps) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  // Repayment form variables
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(currentSimDate);

  // Email modal dispatch states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSendingState, setEmailSendingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailFeedbackText, setEmailFeedbackText] = useState('');

  // Compute calculated values
  const totalRepaymentAmount = loan.schedule.reduce((sum, row) => sum + row.paymentAmount, 0);
  const totalAmountPaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalPrincipalPaid = loan.schedule.reduce((sum, row) => sum + (row.isPaid ? row.principalPortion : (row.paidDetails?.principalPortion || 0)), 0);
  const totalInterestPaid = totalAmountPaid;
  const balanceRemaining = Math.max(0, totalRepaymentAmount - totalAmountPaid);
  const paymentsMadeCount = loan.schedule.filter(r => r.isPaid).length;
  const ratioPaid = totalRepaymentAmount > 0 ? (totalAmountPaid / totalRepaymentAmount) * 100 : 0;

  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setEmailSendingState('loading');
    sendLoanStatementEmail(loan, emailInput, balanceRemaining, totalInterestPaid, totalRepaymentAmount)
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
        setEmailFeedbackText(err?.message || 'SMTP dispatch connection stalled.');
      });
  };

  // Auto prefill next payment details when payment drawer opens
  const nextUnpaidRow = loan.schedule.find(row => !row.isPaid);
  
  const handleOpenPaymentForm = () => {
    const defaultAmount = nextUnpaidRow ? parseFloat((nextUnpaidRow.paymentAmount - (nextUnpaidRow.paidDetails?.amountPaid || 0)).toFixed(2)) : 0;
    setPaymentAmount(defaultAmount);
    setPaymentNotes(`Scheduled repayment instalment cycle`);
    setPaymentDate(currentSimDate);
    setIsCustomAmount(false);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;

    // Split paid amount into principal portion and interest portion relative to upcoming row
    let principalPortion = 0;
    let interestPortion = 0;
    
    if (nextUnpaidRow) {
      const remainingForThisRow = nextUnpaidRow.paymentAmount - (nextUnpaidRow.paidDetails?.amountPaid || 0);
      if (paymentAmount >= remainingForThisRow) {
        interestPortion = nextUnpaidRow.interestPortion - (nextUnpaidRow.paidDetails?.interestPortion || 0);
        principalPortion = paymentAmount - interestPortion;
      } else {
        // If they paid less, pay off interest first, then principal
        const interestRemaining = nextUnpaidRow.interestPortion - (nextUnpaidRow.paidDetails?.interestPortion || 0);
        if (paymentAmount > interestRemaining) {
          interestPortion = interestRemaining;
          principalPortion = paymentAmount - interestRemaining;
        } else {
          interestPortion = paymentAmount;
          principalPortion = 0;
        }
      }
    } else {
      principalPortion = paymentAmount;
    }

    const payload: PaymentRecord = {
      id: `rep-${Date.now()}`,
      paymentDate,
      amountPaid: parseFloat(paymentAmount.toFixed(2)),
      principalPortion: parseFloat(Math.max(0, principalPortion).toFixed(2)),
      interestPortion: parseFloat(Math.max(0, interestPortion).toFixed(2)),
      additionalPrincipal: isCustomAmount ? parseFloat(paymentAmount.toFixed(2)) : 0,
      notes: paymentNotes || undefined
    };

    onRecordPayment(loan.id, payload);
    setShowPaymentForm(false);
  };

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = loan.reminderRules.map(r => 
      r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r
    );
    onUpdateReminderRules(loan.id, updatedRules);
  };

  const isOverdue = loan.status === 'overdue' || (nextUnpaidRow && new Date(nextUnpaidRow.dueDate) < new Date(currentSimDate));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
      
      {/* Dynamic colored header based on status */}
      <div className={`p-5 text-white relative overflow-hidden ${isOverdue ? 'bg-gradient-to-r from-rose-900 to-red-950 border-b border-rose-850' : balanceRemaining <= 0.05 ? 'bg-gradient-to-r from-indigo-950 to-slate-900' : 'bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-850'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-white/10 uppercase border border-white/20">
                {loan.category} Classification
              </span>
              
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500 text-white animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Overdue Standing
                </span>
              )}
              {balanceRemaining <= 0.05 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-500 text-white">
                  <ShieldCheck className="w-3 h-3" /> Contract Closed
                </span>
              )}
            </div>
            
            <h2 className="text-lg md:text-xl font-sans font-black mt-2 tracking-tight">
              {loan.borrowerName} <span className="font-normal text-white/70">/ {loan.loanName}</span>
            </h2>

            <div className="flex flex-wrap text-xs text-white/70 mt-1 gap-y-1 gap-x-4 font-mono">
              <span>👤 Cust ID: {loan.id}</span>
              <span>☎️ {loan.borrowerContact}</span>
              {loan.borrowerEmail && <span>✉️ {loan.borrowerEmail}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportLoanStatementPDF(loan, balanceRemaining, totalInterestPaid, totalRepaymentAmount)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 rounded-lg transition cursor-pointer text-white flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm"
              title="Download Statement (PDF)"
            >
              📥 Export PDF
            </button>
            <button
              onClick={() => {
                setEmailInput(loan.borrowerEmail || '');
                setShowEmailModal(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-600 rounded-lg transition cursor-pointer text-white flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm"
              title="Send Statement via Email"
            >
              ✉️ Email Statement
            </button>
            <button
              id={`loan-edit-${loan.id}`}
              onClick={() => onEdit(loan)}
              className="p-2 hover:bg-white/10 border border-white/15 rounded-lg transition cursor-pointer text-white flex items-center justify-center gap-1 text-xs font-semibold"
            >
              <Edit className="w-4 h-4" /> Edit Account
            </button>
            <button
              id={`loan-delete-${loan.id}`}
              onClick={() => onDelete(loan.id)}
              className="p-2 hover:bg-rose-600/10 hover:border-rose-500/20 border border-white/15 rounded-lg transition cursor-pointer text-rose-300 hover:text-rose-400 flex items-center justify-center"
              title="Terminate Loan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="px-5 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
            <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Active Outstanding</span>
            <span className="text-lg font-mono font-bold text-slate-900 block mt-1">
              GH₵ {balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
              Original: GH₵ {loan.principal.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Interest Rate</span>
            <span className="text-lg font-mono font-bold text-slate-800 block mt-1">
              {loan.interestRate}% <span className="text-xs text-slate-500">p.a.</span>
            </span>
            <span className="text-[9px] text-slate-400 font-bold block capitalize">
              {loan.interestType} model
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] font-bold text-slate-400 block uppercase font-sans">Collected Interest (Total Paid)</span>
            <span className="text-lg font-mono font-bold text-indigo-700 block mt-1">
              GH₵ {totalInterestPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
              Terms: {loan.termMonths} Months
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Maturity Progress</span>
              <span className="text-lg font-mono font-bold text-slate-800 block mt-1">
                {paymentsMadeCount} <span className="text-xs text-slate-400">/ {loan.schedule.length} pd</span>
              </span>
            </div>
            {/* Horizontal micro bar */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-indigo-650 h-full rounded-full" style={{ width: `${ratioPaid}%` }}></div>
            </div>
          </div>
        </div>

        {/* Action Button: Pay / Dynamic Payment drawer */}
        {balanceRemaining > 0.05 && !showPaymentForm && (
          <div className="bg-indigo-50/50 border border-indigo-100/70 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left w-full sm:w-auto">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Next Instalment Repay Schedule
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-mono font-bold text-slate-900">
                  GH₵ {nextUnpaidRow ? nextUnpaidRow.paymentAmount.toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Due: <span className="font-semibold text-slate-700">{nextUnpaidRow ? nextUnpaidRow.dueDate : 'Settled'}</span>
                </span>
              </div>
            </div>

            <button
              id={`loan-pay-open-${loan.id}`}
              onClick={handleOpenPaymentForm}
              className="w-full sm:w-auto py-2 px-5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Process & Record Repayment
            </button>
          </div>
        )}

        {/* Embedded Add payment Form Drawer */}
        {showPaymentForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4 animate-slide-up">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Add Repayment entry</span>
              <button onClick={() => setShowPaymentForm(false)} className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer">Close</button>
            </h3>

            <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex justify-between">
                  <span>Repayment Size (GH₵)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomAmount(!isCustomAmount);
                      if (isCustomAmount && nextUnpaidRow) {
                        setPaymentAmount(nextUnpaidRow.paymentAmount);
                      }
                    }}
                    className="text-[9px] text-indigo-600 font-semibold uppercase hover:underline cursor-pointer"
                  >
                    {isCustomAmount ? 'Fixed' : 'Custom'}
                  </button>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    id="repay-amount-input"
                    type="number"
                    required
                    min="0.1"
                    step="0.01"
                    disabled={!isCustomAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Actual Settle Date</label>
                <input
                  id="repay-date-input"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1 text-xs font-semibold font-mono text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Settle Note / Reference</label>
                <input
                  id="repay-note-input"
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                  placeholder="Instalment paid via digital wallet"
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-pay-record"
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer"
                >
                  Complete Repay Record
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Automated Reminders Policy Grid for this Loan */}
        <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-lg space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Client Automated Reminder Policies</span>
            <span className="text-[10px] text-slate-400 font-mono">Toggle state for this file</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {loan.reminderRules.map(rule => (
              <div key={rule.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2.5">
                <div className="flex gap-2 items-start text-left">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 mt-0.5 border border-indigo-100">
                    {rule.channel === 'sms' ? <Smartphone className="w-3.5 h-3.5" /> : rule.channel === 'email' ? <Mail className="w-3.5 h-3.5" /> : rule.channel === 'push' ? <Bell className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      {rule.daysBeforeDue === 0 ? 'Due Date Warning' : rule.daysBeforeDue < 0 ? `Overdue Alert (+${Math.abs(rule.daysBeforeDue)}d)` : `Early Reminder (-${rule.daysBeforeDue}d)`}
                    </h4>
                    <p className="text-[9px] text-slate-400 capitalize font-mono mt-0.5">Medium: {rule.channel} channel / templates enabled</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    id={`instant-rule-${rule.id}`}
                    onClick={() => onInstantReminder(loan, rule)}
                    className="p-1 text-[9px] font-bold text-indigo-600 bg-indigo-50/20 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-150 rounded cursor-pointer transition select-none"
                    title="Send instant notification draft"
                  >
                    Test Send
                  </button>
                  {/* Custom Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={rule.isEnabled}
                      onChange={() => handleToggleRule(rule.id)}
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Amortization Table */}
        <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Scheduled Instalments Log</h3>
            <button
              id={`loan-toggle-sched-${loan.id}`}
              onClick={() => setShowFullSchedule(!showFullSchedule)}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              {showFullSchedule ? (
                <>Collapse Schedule <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>Expand Full Schedule ({loan.schedule.length} payments) <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 py-1 font-mono text-slate-500 select-none">
                  <th className="p-2.5 text-center font-bold">No.</th>
                  <th className="p-2.5 font-bold">Cycle Due</th>
                  <th className="p-2.5 text-right font-bold">Total Amount</th>
                  <th className="p-2.5 text-right font-bold">Principal Pt</th>
                  <th className="p-2.5 text-right font-bold">Interest Pt</th>
                  <th className="p-2.5 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loan.schedule.slice(0, showFullSchedule ? undefined : 4).map((row) => (
                  <tr key={row.paymentNumber} className="hover:bg-slate-50/50">
                    <td className="p-2 text-slate-400 text-center">{row.paymentNumber}</td>
                    <td className="p-2 font-sans font-semibold text-slate-750">{row.dueDate}</td>
                    <td className="p-2 text-right font-bold text-slate-900">GH₵ {row.paymentAmount.toFixed(2)}</td>
                    <td className="p-2 text-right text-indigo-650">GH₵ {row.principalPortion.toFixed(2)}</td>
                    <td className="p-2 text-right text-slate-500">GH₵ {row.interestPortion.toFixed(2)}</td>
                    <td className="p-2 text-center">
                      {row.isPaid ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-150">
                          CLEARED
                        </span>
                      ) : row.paidDetails ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50/50 text-slate-700 border border-indigo-100">
                          PARTIAL (GH₵ {row.paidDetails.amountPaid.toFixed(0)})
                        </span>
                      ) : new Date(row.dueDate) < new Date(currentSimDate) ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-150 animate-pulse">
                          OVERDUE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-50 text-slate-400 border border-slate-150">
                          PENDING
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!showFullSchedule && loan.schedule.length > 4 && (
                  <tr className="bg-slate-55/50 text-[10px] text-slate-400 select-none">
                    <td colSpan={6} className="p-2 text-center italic">
                      ... and {loan.schedule.length - 4} payments in rest schedule ...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Private Repayments Record Log */}
        <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-lg space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Repayments ledger Transactions</h3>

          <div className="space-y-2">
            {loan.repayments.map((rep, index) => (
              <div key={rep.id || index} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-left">
                <div className="flex gap-2.5 items-center">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Repayment Settle Entry</h4>
                    <p className="text-[9px] text-slate-400 font-mono">Date Settle: {rep.paymentDate}</p>
                    {rep.notes && <p className="text-[10px] text-slate-500 mt-1">"{rep.notes}"</p>}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-indigo-750 block">+GH₵ {rep.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[9px] text-slate-400 font-medium">Principal Settle: GH₵ {rep.principalPortion.toLocaleString()}</span>
                </div>
              </div>
            ))}

            {loan.repayments.length === 0 && (
              <div className="py-4 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                <p className="text-xs font-medium">No repayments yet entered onto this ledger agreement.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spacing padding */}
      <div className="pb-5"></div>

      {/* Email Statement Modal Overlay */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
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
              <h3 className="text-sm font-sans font-extrabold text-slate-900">Email Customer Statement</h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Generates a detailed summary ledger of {loan.borrowerName}'s agreement and delivers it directly to the customer.
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
                  {emailSendingState === 'loading' ? 'Sending...' : 'Send Statement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
