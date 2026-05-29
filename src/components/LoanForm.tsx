import React, { useState, useEffect } from 'react';
import { Loan, InterestType, PaymentFrequency, LoanStatus } from '../types';
import { generateAmortizationSchedule } from '../utils/loanCalculations';
import { X, Calendar, DollarSign, Percent, AlertCircle, FileText, CheckCircle2, ChevronRight, PlusCircle, Sparkles } from 'lucide-react';

interface LoanFormProps {
  loanToEdit?: Loan | null;
  onSave: (loan: Loan) => void;
  onCancel: () => void;
  prefillCalculatorData?: {
    principal: number;
    interestRate: number;
    termMonths: number;
    interestType: InterestType;
    paymentFrequency: PaymentFrequency;
  } | null;
}

export default function LoanForm({ loanToEdit, onSave, onCancel, prefillCalculatorData }: LoanFormProps) {
  const [formData, setFormData] = useState({
    borrowerName: '',
    borrowerContact: '',
    borrowerEmail: '',
    loanName: '',
    category: 'personal' as Loan['category'],
    principal: 10000,
    interestRate: 7.5,
    termMonths: 12,
    interestType: 'amortized' as InterestType,
    paymentFrequency: 'monthly' as PaymentFrequency,
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'active' as LoanStatus
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Prefill or load defaults
  useEffect(() => {
    if (loanToEdit) {
      setFormData({
        borrowerName: loanToEdit.borrowerName,
        borrowerContact: loanToEdit.borrowerContact,
        borrowerEmail: loanToEdit.borrowerEmail || '',
        loanName: loanToEdit.loanName,
        category: loanToEdit.category,
        principal: loanToEdit.principal,
        interestRate: loanToEdit.interestRate,
        termMonths: loanToEdit.termMonths,
        interestType: loanToEdit.interestType,
        paymentFrequency: loanToEdit.paymentFrequency,
        startDate: loanToEdit.startDate,
        notes: loanToEdit.notes || '',
        status: loanToEdit.status
      });
    } else if (prefillCalculatorData) {
      setFormData(prev => ({
        ...prev,
        principal: prefillCalculatorData.principal,
        interestRate: prefillCalculatorData.interestRate,
        termMonths: prefillCalculatorData.termMonths,
        interestType: prefillCalculatorData.interestType,
        paymentFrequency: prefillCalculatorData.paymentFrequency
      }));
    }
  }, [loanToEdit, prefillCalculatorData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate
    if (!formData.borrowerName.trim()) {
      setValidationError('Borrower name is required.');
      return;
    }
    if (!formData.loanName.trim()) {
      setValidationError('Loan reference name is required.');
      return;
    }
    if (formData.principal <= 0) {
      setValidationError('Loan principal must be greater than $0.');
      return;
    }
    if (formData.interestRate < 0) {
      setValidationError('Interest rate cannot be negative.');
      return;
    }
    if (formData.termMonths <= 0) {
      setValidationError('Loan term must be 1 month or longer.');
      return;
    }

    // Generate schedule
    const generatedSchedule = generateAmortizationSchedule({
      principal: formData.principal,
      annualRate: formData.interestRate,
      termMonths: formData.termMonths,
      interestType: formData.interestType,
      paymentFrequency: formData.paymentFrequency,
      startDate: formData.startDate
    });

    const newLoan: Loan = {
      id: loanToEdit ? loanToEdit.id : `loan-${Date.now()}`,
      borrowerName: formData.borrowerName.trim(),
      borrowerContact: formData.borrowerContact.trim(),
      borrowerEmail: formData.borrowerEmail.trim() || undefined,
      loanName: formData.loanName.trim(),
      category: formData.category,
      principal: formData.principal,
      interestRate: formData.interestRate,
      termMonths: formData.termMonths,
      interestType: formData.interestType,
      paymentFrequency: formData.paymentFrequency,
      startDate: formData.startDate,
      notes: formData.notes.trim() || undefined,
      status: formData.status,
      reminderRules: loanToEdit ? loanToEdit.reminderRules : [
        { id: `rule-added-1-${Date.now()}`, daysBeforeDue: 3, channel: 'sms', isEnabled: true },
        { id: `rule-added-2-${Date.now()}`, daysBeforeDue: 0, channel: 'push', isEnabled: true }
      ],
      repayments: loanToEdit ? loanToEdit.repayments : [],
      schedule: generatedSchedule
    };

    onSave(newLoan);
  };

  // Live schedule projection aggregates
  const projectedSchedule = generateAmortizationSchedule({
    principal: formData.principal,
    annualRate: formData.interestRate,
    termMonths: formData.termMonths,
    interestType: formData.interestType,
    paymentFrequency: formData.paymentFrequency,
    startDate: formData.startDate
  });

  const projectedInterestSum = projectedSchedule.reduce((acc, row) => acc + row.interestPortion, 0);
  const totalCost = formData.principal + projectedInterestSum;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-md max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-150 pb-3">
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-slate-900 text-indigo-300 px-2 py-0.5 rounded-md font-mono border border-slate-800">
            {loanToEdit ? 'Revision Mode' : 'New Contract'}
          </span>
          <h2 className="text-base md:text-lg font-sans font-bold text-slate-900 mt-1">
            {loanToEdit ? `Edit Loan: ${loanToEdit.borrowerName}` : 'Originate New Loan Agreement'}
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Form: Field Inputs */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Agreement Parameters
          </h3>

          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              {validationError}
            </div>
          )}

          {/* Borrower details */}
          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Borrower Full Name</label>
              <input
                id="loanform-borrower-name"
                type="text"
                required
                value={formData.borrowerName}
                onChange={(e) => handleInputChange('borrowerName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                placeholder="Jane Connor"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Contact Number</label>
                <input
                  id="loanform-borrower-contact"
                  type="text"
                  required
                  value={formData.borrowerContact}
                  onChange={(e) => handleInputChange('borrowerContact', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Email Address (Opt)</label>
                <input
                  id="loanform-borrower-email"
                  type="email"
                  value={formData.borrowerEmail}
                  onChange={(e) => handleInputChange('borrowerEmail', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
                  placeholder="jane@email.co"
                />
              </div>
            </div>
          </div>

          {/* Reference Name & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Loan Title Reference</label>
              <input
                id="loanform-title"
                type="text"
                required
                value={formData.loanName}
                onChange={(e) => handleInputChange('loanName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                placeholder="Business Equipment or Auto"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Classification</label>
              <select
                id="loanform-category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="personal">Personal Loan</option>
                <option value="business">Business Expansion</option>
                <option value="mortgage">Mortgage Real-estate</option>
                <option value="auto">Auto / Transportation</option>
                <option value="microfinance">Micro-finance / Seed</option>
                <option value="custom">Custom Portfolio Code</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-150 pt-3.5 space-y-3.5">
            {/* Rates matrix inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Principal (GH₵)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    id="loanform-principal"
                    type="number"
                    min="1"
                    required
                    value={formData.principal}
                    onChange={(e) => handleInputChange('principal', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-7 pr-2 py-1.5 text-xs font-bold font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Annual Rate %</label>
                <div className="relative">
                  <Percent className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    id="loanform-rate"
                    type="number"
                    min="0"
                    step="0.05"
                    required
                    value={formData.interestRate}
                    onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-7 pr-2 py-1.5 text-xs font-bold font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500 font-sans">Term (Months)</label>
                <input
                  id="loanform-term"
                  type="number"
                  min="1"
                  required
                  value={formData.termMonths}
                  onChange={(e) => handleInputChange('termMonths', parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-bold font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Accounting Model</label>
                <select
                  id="loanform-interest-type"
                  value={formData.interestType}
                  onChange={(e) => handleInputChange('interestType', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="amortized">Standard Installment (Amortizing)</option>
                  <option value="flat">Flat Rate Interest</option>
                  <option value="simple">Simple Reducing Interest</option>
                  <option value="compound">Compound Interest (Monthly)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Repayment Period</label>
                <select
                  id="loanform-frequency"
                  value={formData.paymentFrequency}
                  onChange={(e) => handleInputChange('paymentFrequency', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value="weekly">Weekly Payments</option>
                  <option value="biweekly">Bi-weekly Payments</option>
                  <option value="monthly">Monthly Payments</option>
                  <option value="quarterly">Quarterly Payments</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Disbursement Date</label>
                <input
                  id="loanform-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold font-mono text-slate-800"
                />
              </div>

              {loanToEdit && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Agreement Status</label>
                  <select
                    id="loanform-status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                  >
                    <option value="active">Active Standing</option>
                    <option value="overdue">Overdue / Past Due</option>
                    <option value="paid">Settled / Closed</option>
                    <option value="defaulted">Written-off Defaults</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Securities, Private Notes & Collateral</label>
            <textarea
              id="loanform-notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-3 text-xs font-medium text-slate-700 h-16 resize-none"
              placeholder="e.g. Registered mortgage on secondary commercial garage. Personal guarantor declared."
            />
          </div>
        </div>

        {/* Right Form: Complete Live projection visualization */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150 pb-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-650" />
              Agreement Projection Review
            </h3>

            {/* Live summary numbers */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-150 font-mono">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase font-sans">Total Payments</span>
                <span className="text-sm font-bold text-slate-900 block">{projectedSchedule.length} cycles</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase font-sans">Instalment (PMT)</span>
                <span className="text-sm font-bold text-indigo-600 block">${(projectedSchedule[0]?.paymentAmount || 0).toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase font-sans">Interest Cost</span>
                <span className="text-sm font-bold text-slate-800 block">${projectedInterestSum.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-indigo-950 rounded-lg border border-indigo-950 text-white">
                <span className="text-[10px] text-indigo-200 font-semibold block uppercase font-sans">Total Outlay</span>
                <span className="text-sm font-bold text-indigo-300 block">${totalCost.toFixed(2)}</span>
              </div>
            </div>

            {/* Projection Schedule Table */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Agreement Instalment Projection</label>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 py-1.5 font-mono text-slate-500 select-none font-sans">
                      <th className="px-2.5 py-1.5 text-center font-bold">No.</th>
                      <th className="px-2.5 py-1.5 font-bold">Due Date</th>
                      <th className="px-2.5 py-1.5 text-right font-bold">Total Amount</th>
                      <th className="px-2.5 py-1.5 text-right font-bold">Interest Pt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {projectedSchedule.slice(0, 10).map((row) => (
                      <tr key={row.paymentNumber} className="hover:bg-slate-50/50">
                        <td className="px-2.5 py-1.5 text-slate-400 text-center">{row.paymentNumber}</td>
                        <td className="px-2.5 py-1.5 font-sans font-semibold text-slate-700">{row.dueDate}</td>
                        <td className="px-2.5 py-1.5 text-right text-slate-900 font-bold">${row.paymentAmount.toFixed(2)}</td>
                        <td className="px-2.5 py-1.5 text-right text-slate-505">${row.interestPortion.toFixed(2)}</td>
                      </tr>
                    ))}
                    {projectedSchedule.length > 10 && (
                      <tr className="bg-slate-55/40 text-[9px] font-medium text-slate-500 select-none">
                        <td colSpan={4} className="px-2.5 py-1.5 text-center italic">
                          ... and {projectedSchedule.length - 10} rest schedule repayments generated automatically ...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 mt-4.5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-1.5 px-4 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-755 hover:bg-slate-50 transition text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="loanform-save-btn"
              type="submit"
              className="flex-1 py-1.5 px-4 rounded-lg text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 transition text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              Save Loan Agreement
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
