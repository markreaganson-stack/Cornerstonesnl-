import React, { useState, useMemo } from 'react';
import { generateAmortizationSchedule } from '../utils/loanCalculations';
import { InterestType, PaymentFrequency } from '../types';
import { HelpCircle, Sparkles, Percent, DollarSign, Calendar, Sliders, ChevronDown, ListFilter, PlusCircle, Check } from 'lucide-react';

interface InterestCalculatorProps {
  onAddFromCalculator?: (data: {
    principal: number;
    interestRate: number;
    termMonths: number;
    interestType: InterestType;
    paymentFrequency: PaymentFrequency;
  }) => void;
}

export default function InterestCalculator({ onAddFromCalculator }: InterestCalculatorProps) {
  // Inputs
  const [inputs, setInputs] = useState({
    principal: 10000,
    annualRate: 8,
    termMonths: 12,
    interestType: 'amortized' as InterestType,
    paymentFrequency: 'monthly' as PaymentFrequency,
    compoundingFrequency: 'monthly' as 'monthly' | 'quarterly' | 'annually'
  });

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Generate Schedule on the fly
  const schedule = useMemo(() => {
    return generateAmortizationSchedule({
      principal: inputs.principal,
      annualRate: inputs.annualRate,
      termMonths: inputs.termMonths,
      interestType: inputs.interestType,
      paymentFrequency: inputs.paymentFrequency,
      compoundingFrequency: inputs.compoundingFrequency,
      startDate: startDate
    });
  }, [inputs, startDate]);

  // Aggregate results
  const metrics = useMemo(() => {
    const totalPaymentsCount = schedule.length;
    let totalInterest = 0;
    schedule.forEach(row => {
      totalInterest += row.interestPortion;
    });

    const totalRepayments = inputs.principal + totalInterest;
    const firstPayment = schedule[0] ? schedule[0].paymentAmount : 0;
    const finalPayment = schedule[schedule.length - 1] ? schedule[schedule.length - 1].paymentAmount : 0;

    return {
      totalPaymentsCount,
      totalInterest: parseFloat(totalInterest.toFixed(2)),
      totalRepayments: parseFloat(totalRepayments.toFixed(2)),
      firstPayment,
      finalPayment
    };
  }, [schedule, inputs.principal]);

  const interestPercentage = metrics.totalRepayments > 0 
    ? (metrics.totalInterest / metrics.totalRepayments) * 100 
    : 0;

  const handleInputChange = (field: string, value: any) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddToPortfolio = () => {
    if (onAddFromCalculator) {
      onAddFromCalculator({
        principal: inputs.principal,
        interestRate: inputs.annualRate,
        termMonths: inputs.termMonths,
        interestType: inputs.interestType,
        paymentFrequency: inputs.paymentFrequency
      });
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-sans font-bold text-slate-900">Interest Rate Sandbox & Calculator</h2>
          <p className="text-xs text-slate-500">Experiment with amortization, simple, compounding, and flat rate models side-by-side</p>
        </div>
        <div className="bg-indigo-50 text-indigo-600 rounded-lg p-2 border border-indigo-100">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Input Controls Column */}
        <div className="lg:col-span-5 bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Calculator Parameters</h3>
          </div>

          {/* Principal (Amount) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex justify-between">
              <span>Loan Principal (GH₵)</span>
              <span className="font-mono text-slate-900 font-bold">GH₵ {inputs.principal.toLocaleString()}</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="calc-input-principal"
                type="number"
                min="500"
                max="10000000"
                step="500"
                value={inputs.principal}
                onChange={(e) => handleInputChange('principal', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-9 pr-4 py-2 text-sm font-semibold font-mono text-slate-800"
              />
            </div>
            <input 
              type="range"
              min="1000"
              max="250000"
              step="1000"
              value={inputs.principal}
              onChange={(e) => handleInputChange('principal', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
            />
          </div>

          {/* Interest Rate (%) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex justify-between">
              <span>Annual Interest Rate (%)</span>
              <span className="font-mono text-slate-900 font-bold">{inputs.annualRate}%</span>
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="calc-input-rate"
                type="number"
                min="0.1"
                max="40"
                step="0.1"
                value={inputs.annualRate}
                onChange={(e) => handleInputChange('annualRate', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-9 pr-4 py-2 text-sm font-semibold font-mono text-slate-800"
              />
            </div>
            <input 
              type="range"
              min="1"
              max="30"
              step="0.1"
              value={inputs.annualRate}
              onChange={(e) => handleInputChange('annualRate', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
            />
          </div>

          {/* Term in Months */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex justify-between">
              <span>Term Duration ({Math.floor(inputs.termMonths/12)} Y, {inputs.termMonths%12} M)</span>
              <span className="font-mono text-slate-900 font-bold">{inputs.termMonths} months</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="calc-input-term"
                type="number"
                min="1"
                max="360"
                step="1"
                value={inputs.termMonths}
                onChange={(e) => handleInputChange('termMonths', parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-9 pr-4 py-2 text-sm font-semibold font-mono text-slate-800"
              />
            </div>
            <input 
              type="range"
              min="3"
              max="120"
              step="3"
              value={inputs.termMonths}
              onChange={(e) => handleInputChange('termMonths', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
            />
          </div>

          {/* Interest Method (Radio Selectors) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Interest Accounting Method</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'amortized', label: 'Amortizing', desc: 'Equal monthly rate' },
                { type: 'flat', label: 'Flat Rate', desc: 'Calculated on start value' },
                { type: 'simple', label: 'Simple Rate', desc: 'Reducing principal fee' },
                { type: 'compound', label: 'Compound', desc: 'Interval compounded index' }
              ].map(opt => (
                <button
                  key={opt.type}
                  id={`calc-method-${opt.type}`}
                  onClick={() => handleInputChange('interestType', opt.type)}
                  className={`p-2.5 rounded-lg border text-left transition select-none cursor-pointer ${inputs.interestType === opt.type ? 'border-indigo-650 bg-indigo-50/70 text-indigo-950 shadow-sm' : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 text-slate-750'}`}
                >
                  <p className="text-xs font-bold capitalize">{opt.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 mt-[-1px] font-medium leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Compounding options (Conditional) */}
          {inputs.interestType === 'compound' && (
            <div className="space-y-1.5 p-3 bg-indigo-50/50 rounded-lg border border-indigo-150 relative animate-fade-in">
              <label className="text-xs font-bold text-indigo-900">Compounding Frequency</label>
              <select
                id="calc-input-compound"
                value={inputs.compoundingFrequency}
                onChange={(e) => handleInputChange('compoundingFrequency', e.target.value)}
                className="w-full bg-white border border-indigo-200 focus:border-indigo-500 text-xs font-semibold text-indigo-950 rounded-lg px-2.5 py-1.5 mt-1"
              >
                <option value="monthly">Compounded Monthly</option>
                <option value="quarterly">Compounded Quarterly</option>
                <option value="annually">Compounded Annually</option>
              </select>
            </div>
          )}

          {/* Repayment Frequency */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Instalment Payment Frequency</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 'weekly', label: 'Weekly' },
                { val: 'biweekly', label: 'Bi-wkly' },
                { val: 'monthly', label: 'Monthly' },
                { val: 'quarterly', label: 'Quart' }
              ].map(freq => (
                <button
                  key={freq.val}
                  id={`calc-freq-${freq.val}`}
                  onClick={() => handleInputChange('paymentFrequency', freq.val)}
                  className={`py-1.5 text-xs font-bold rounded-lg border text-center transition cursor-pointer select-none ${inputs.paymentFrequency === freq.val ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">First Installment Starts On</label>
            <input
              id="calc-input-startdate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold font-mono text-slate-800"
            />
          </div>
        </div>

        {/* Right Side: Big Outputs Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6 h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Calculated Repayment Model</h3>
                <span className="text-[10px] text-indigo-750 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 capitalize font-mono">
                  {inputs.interestType} model yields
                </span>
              </div>

              {/* Major Big Number Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold tracking-tight block">Instalment Amount</span>
                  <span className="text-xl font-mono font-bold text-indigo-700 block">
                    GH₵ {metrics.firstPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {inputs.interestType === 'simple' && (
                    <span className="text-[9px] text-indigo-600 font-medium font-mono leading-none">
                      (Max payment, decreases over time)
                    </span>
                  )}
                  {inputs.interestType !== 'simple' && (
                    <span className="text-[9px] text-slate-400 font-normal font-mono leading-none">
                      Constant scheduled payment
                    </span>
                  )}
                </div>

                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold tracking-tight block">Total Cumulative Interest</span>
                  <span className="text-xl font-mono font-bold text-slate-800 block">
                    GH₵ {metrics.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {interestPercentage.toFixed(1)}% of total repay
                  </span>
                </div>

                <div className="bg-indigo-950 text-white rounded-lg p-3 border border-indigo-950">
                  <span className="text-[10px] text-indigo-200 font-semibold tracking-tight block">Total Cost of Capital</span>
                  <span className="text-xl font-mono font-bold text-indigo-300 block">
                    GH₵ {metrics.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    {metrics.totalPaymentsCount} scheduled payments
                  </span>
                </div>
              </div>

              {/* Visual Breakdown of Cost of Capital */}
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Repayments Cost Breakdown</span>
                  <span className="font-mono text-[10px]">{interestPercentage.toFixed(1)}% Interest / {(100 - interestPercentage).toFixed(1)}% Principal</span>
                </div>
                {/* Horizontal cost bar breakdown */}
                <div className="h-4.5 w-full bg-slate-100 rounded-lg overflow-hidden flex font-mono text-[9px] text-center text-white font-bold leading-normal">
                  <div 
                    className="bg-indigo-600 flex items-center justify-center transition-all duration-300"
                    style={{ width: `${100 - interestPercentage}%` }}
                    title={`Principal: GH₵ ${inputs.principal}`}
                  >
                    {100 - interestPercentage > 20 && 'Principal'}
                  </div>
                  <div 
                    className="bg-slate-400 flex items-center justify-center transition-all duration-300"
                    style={{ width: `${interestPercentage}%` }}
                    title={`Interest: GH₵ ${metrics.totalInterest}`}
                  >
                    {interestPercentage > 15 && 'Interest'}
                  </div>
                </div>
              </div>

              {/* Explainer card based on model selected */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/20 text-xs text-slate-600 space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Understanding the {inputs.interestType} Calculation Model
                </h4>
                {inputs.interestType === 'amortized' && (
                  <p>In the amortizing loan, each periodic check remains fixed. During early payments, a higher fraction covers outstanding interest. Near maturity, payment applies mostly to remaining principal reduction.</p>
                )}
                {inputs.interestType === 'flat' && (
                  <p>In flat-rate, interest is calculated upfront based on full starting capital and allocated equally. It features fixed payments but yields higher overall interest compared to a reducing balance model.</p>
                )}
                {inputs.interestType === 'simple' && (
                  <p>In standard simple interest reducing-balance, principal matches equal slices. Periodic interest is charged strictly on the immediate outstanding principal. Consequently, total installment costs diminish each cycle.</p>
                )}
                {inputs.interestType === 'compound' && (
                  <p>Compounded rate accounts for accrued interest charging compounding rates over custom periods (such as monthly compounding), adding marginally higher interest yields onto long term balances.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-150">
              <button
                id="btn-toggle-schedule"
                onClick={() => setShowSchedule(!showSchedule)}
                className="flex-1 py-1.5 px-4 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ListFilter className="w-4 h-4" />
                {showSchedule ? 'Collapse Schedule Log' : 'View Full Schedule'} ({schedule.length} Payments)
              </button>
              
              {onAddFromCalculator && (
                <button
                  id="btn-add-from-calc"
                  onClick={handleAddToPortfolio}
                  className="flex-1 py-1.5 px-4 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-505 transition text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {addedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      Injected to Portfolio Builder!
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 text-indigo-200" />
                      Inject to Portfolio Builder
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Amortization Table Schedule Section */}
      {showSchedule && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-sans font-bold text-slate-900">Projected Payment Schedule Table</h3>
            <span className="text-[10px] font-mono text-slate-400">Values calculated in GH₵</span>
          </div>
          
          <div className="overflow-x-auto max-h-96 rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 select-none font-sans">
                  <th className="p-3 font-semibold text-slate-500 font-mono text-center">No.</th>
                  <th className="p-3 font-semibold text-slate-500">Scheduled Date</th>
                  <th className="p-3 font-semibold text-slate-500 text-right">Payment Amount</th>
                  <th className="p-3 font-semibold text-slate-500 text-right">Principal Portion</th>
                  <th className="p-3 font-semibold text-slate-500 text-right">Interest Portion</th>
                  <th className="p-3 font-semibold text-slate-500 text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-mono">
                {schedule.map((row) => (
                  <tr key={row.paymentNumber} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-400 text-center">{row.paymentNumber}</td>
                    <td className="p-3 font-sans text-slate-750 font-semibold">{row.dueDate}</td>
                    <td className="p-3 text-right font-bold text-slate-900">GH₵ {row.paymentAmount.toFixed(2)}</td>
                    <td className="p-3 text-right text-indigo-650">GH₵ {row.principalPortion.toFixed(2)}</td>
                    <td className="p-3 text-right text-slate-500">GH₵ {row.interestPortion.toFixed(2)}</td>
                    <td className="p-3 text-right text-slate-600">GH₵ {row.remainingBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
