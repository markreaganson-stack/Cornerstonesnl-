import React, { useState } from 'react';
import { Loan, LoanStatus } from '../types';
import { TrendingUp, Award, AlertTriangle, CheckCircle, Calendar, ShieldAlert, ArrowUpRight, DollarSign, Clock, LayoutGrid, Smartphone, ChevronRight } from 'lucide-react';

interface DashboardStatsProps {
  loans: Loan[];
  currentSimDate: string;
  onSelectLoan: (loanId: string) => void;
  onTimeLeap: (days: number) => void;
}

export default function DashboardStats({ loans, currentSimDate, onSelectLoan, onTimeLeap }: DashboardStatsProps) {
  // Compute portfolio KPIs
  const totalLent = loans.reduce((sum, loan) => sum + loan.principal, 0);
  
  // Calculate remaining principal and interest earned
  let totalRemainingPrincipal = 0;
  let totalInterestEarned = 0;
  let paidCount = 0;
  let overdueCount = 0;
  let activeCount = 0;

  loans.forEach(loan => {
    // Total repayment
    const totalRepayAmount = loan.schedule.reduce((sum, r) => sum + r.paymentAmount, 0);
    // Total amount paid
    const totalAmountPaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
    
    totalRemainingPrincipal += Math.max(0, totalRepayAmount - totalAmountPaid);
    totalInterestEarned += totalAmountPaid;

    if (loan.status === 'paid') paidCount++;
    else if (loan.status === 'overdue') overdueCount++;
    else if (loan.status === 'active') activeCount++;
  });

  const totalOutstanding = totalRemainingPrincipal;
  const portfolioHealth = totalLent > 0 
    ? Math.round(((totalLent - totalRemainingPrincipal) / totalLent) * 100) 
    : 100;

  // Group monthly forecasted collections (upcoming unpaid rows)
  const incomingPayments: { loan: Loan; dueDate: string; amount: number; num: number }[] = [];
  loans.forEach(loan => {
    loan.schedule.forEach(row => {
      if (!row.isPaid && new Date(row.dueDate) >= new Date(currentSimDate)) {
        incomingPayments.push({
          loan,
          dueDate: row.dueDate,
          amount: row.paymentAmount,
          num: row.paymentNumber
        });
      }
    });
  });

  // Sort upcoming payments by date
  incomingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const next30DaysPayments = incomingPayments.slice(0, 5);

  // Group outstanding capital by category
  const categoryTotals: Record<string, number> = {
    personal: 0,
    business: 0,
    mortgage: 0,
    auto: 0,
    microfinance: 0,
    custom: 0
  };
  
  loans.forEach(loan => {
    const totalRepayAmount = loan.schedule.reduce((sum, r) => sum + r.paymentAmount, 0);
    const totalAmountPaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
    const remaining = Math.max(0, totalRepayAmount - totalAmountPaid);
    categoryTotals[loan.category] = (categoryTotals[loan.category] || 0) + remaining;
  });

  const maxVal = Math.max(...Object.values(categoryTotals), 1);

  // For the bar chart: Cash Flow Forecast for next 6 months
  const monthlyCashflowForecast: Record<string, number> = {};
  loans.forEach(loan => {
    loan.schedule.forEach(row => {
      if (!row.isPaid) {
        const date = new Date(row.dueDate);
        const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyCashflowForecast[monthYear] = (monthlyCashflowForecast[monthYear] || 0) + row.paymentAmount;
      }
    });
  });

  const forecastData = Object.entries(monthlyCashflowForecast)
    .sort((a, b) => {
      const dateA = new Date(a[0] + " 01");
      const dateB = new Date(b[0] + " 01");
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 6);

  const maxForecastVal = Math.max(...forecastData.map(d => d[1]), 1);

  return (
    <div className="space-y-6">
      {/* Simulation Controls Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-indigo-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-700/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Time Engine Active
            </span>
            <h2 className="text-xl md:text-2xl font-sans font-bold mt-2">Active Simulated Portfolio Date</h2>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-mono font-bold text-indigo-300">
                {new Date(currentSimDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <p className="text-xs text-indigo-200/70 mt-1 max-w-xl">
              Simulate the flow of time to test automated reminders, interest accumulation, payments processing dynamics, and past-due aging.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="time-step-1"
              onClick={() => onTimeLeap(1)}
              className="px-3.5 py-2 text-xs font-semibold font-mono bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-lg transition duration-150 text-indigo-100 flex items-center gap-1 cursor-pointer"
            >
              +1 Day
            </button>
            <button
              id="time-step-15"
              onClick={() => onTimeLeap(15)}
              className="px-3.5 py-2 text-xs font-semibold font-mono bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-lg transition duration-150 text-indigo-100 flex items-center gap-1 cursor-pointer"
            >
              +15 Days
            </button>
            <button
              id="time-step-30"
              onClick={() => onTimeLeap(30)}
              className="px-4 py-2 text-xs font-semibold font-mono bg-indigo-600 hover:bg-indigo-500 hover:text-white shadow-sm rounded-lg transition duration-200 text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              🚀 Fast Forward 1 Month
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Principal Lent */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Total Portfolio Principal</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-2 font-mono">
            GH₵ {totalLent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-400">
            <span className="font-semibold text-indigo-600 font-mono">{loans.length}</span> individual accounts
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Active Outstanding Principal</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-2 font-mono">
            GH₵ {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-3 flex items-center gap-1">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (totalOutstanding / (totalLent || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Interest Earned */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-150 group-hover:scale-105 transition-transform">
            <Award className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Interest Collected To-Date</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-2 font-mono">
            GH₵ {totalInterestEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" /> Direct yield contribution
          </div>
        </div>

        {/* Portfolio Status Mix */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-tight">Risk & Overdue Accounts</p>
          <p className="text-xl md:text-2xl font-bold text-slate-900 mt-2 font-mono">
            {overdueCount} <span className="text-sm font-normal text-slate-400">/ {loans.filter(l => l.status !== 'paid').length} active</span>
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px]">
            {overdueCount > 0 ? (
              <span className="text-rose-600 font-semibold flex items-center gap-0.5 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-500" /> Late payments identified
              </span>
            ) : (
              <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                <CheckCircle className="w-3 h-3 text-indigo-500" /> 100% healthy portfolio state
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Graphical Insights Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Collections Cash Flow Forecast Chart (Custom SVG) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-sans font-bold text-slate-900">Collections Cash Flow Forecast</h3>
              <p className="text-xs text-slate-400">Expected unpaid loan receipts in future months</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono px-2 py-0.5 rounded font-bold">Next 6 Months</span>
          </div>

          {forecastData.length > 0 ? (
            <div className="h-60 mt-6 flex flex-col justify-between relative pl-10">
              {/* Y Axis gridlines and values */}
              <div className="absolute inset-y-0 left-0 w-8 flex flex-col justify-between text-[10px] text-slate-400 font-mono text-right pb-8 select-none">
                <span>${Math.round(maxForecastVal / 1000)}k</span>
                <span>${Math.round((maxForecastVal * 0.7) / 1000)}k</span>
                <span>${Math.round((maxForecastVal * 0.3) / 1000)}k</span>
                <span>$0k</span>
              </div>

              {/* Gridlines */}
              <div className="absolute left-10 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none z-0">
                <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                <div className="border-b border-dashed border-slate-100 w-full h-0"></div>
                <div className="border-b border-slate-200 w-full h-0"></div>
              </div>

              {/* Bars Row */}
              <div className="flex items-end h-full justify-around pl-4 pb-8 z-10">
                {forecastData.map(([month, value], index) => {
                  const percentage = (value / maxForecastVal) * 100;
                  return (
                    <div key={month} className="flex flex-col items-center w-full max-w-[50px] group/bar relative">
                      {/* Tooltip */}
                      <div className="absolute -top-12 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded shadow-md z-30 pointer-events-none whitespace-nowrap">
                        ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                      
                      {/* Dynamic Bar */}
                      <div 
                        className="w-8 bg-gradient-to-t from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 rounded-t-sm transition-all duration-700 shadow-sm cursor-help"
                        style={{ height: `${Math.max(6, percentage)}%` }}
                      ></div>
                      
                      {/* Label */}
                      <span className="absolute -bottom-6 text-[10px] font-bold text-slate-400 font-mono pt-1 text-center">
                        {month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl mt-6">
              <ShieldAlert className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs">No upcoming forecasts available. Create active loans.</p>
            </div>
          )}
        </div>

        {/* Portfolio Distribution Category Allocation SVG */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-sm font-sans font-bold text-slate-900 mb-1">Exposure by Category</h3>
          <p className="text-xs text-slate-400 mb-4">Outstanding principal allocation details</p>
          
          <div className="space-y-3.5 mt-6">
            {Object.entries(categoryTotals).map(([cat, amount]) => {
              const perc = totalOutstanding > 0 ? (amount / totalOutstanding) * 100 : 0;
              const colorClass = 
                cat === 'business' ? 'bg-indigo-600' :
                cat === 'auto' ? 'bg-blue-500' :
                cat === 'personal' ? 'bg-amber-500' :
                cat === 'mortgage' ? 'bg-rose-500' :
                cat === 'microfinance' ? 'bg-emerald-500' : 'bg-slate-500';

              const iconBgClass = 
                cat === 'business' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' :
                cat === 'auto' ? 'text-blue-500 bg-blue-50 border-blue-100' :
                cat === 'personal' ? 'text-amber-500 bg-amber-50 border-amber-100' :
                cat === 'mortgage' ? 'text-rose-500 bg-rose-50 border-rose-100' :
                cat === 'microfinance' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-slate-500 bg-slate-50 border-slate-100';

              return (
                <div key={cat} className="group relative">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="capitalize font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
                      {cat}
                    </span>
                    <span className="font-mono text-slate-900 font-bold">
                      ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`${colorClass} h-full rounded-full transition-all duration-500`} 
                      style={{ width: `${perc}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Next Up Repayment Action Board */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-sans font-bold text-slate-900">Upcoming Scheduled Repayments</h3>
            <p className="text-xs text-slate-400">Track and log client repayments on schedules</p>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-500" /> Sorted by Due Date
          </span>
        </div>

        {next30DaysPayments.length > 0 ? (
          <div className="divide-y divide-slate-150">
            {next30DaysPayments.map((item, idx) => {
              const isOverdue = new Date(item.dueDate) < new Date(currentSimDate);
              return (
                <div key={`${item.loan.id}-${item.num}-${idx}`} className="flex flex-col md:flex-row md:items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border flex-shrink-0 ${isOverdue ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment #{item.num} of {item.loan.termMonths}</span>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 cursor-pointer flex items-center gap-1" onClick={() => onSelectLoan(item.loan.id)}>
                        {item.loan.borrowerName} <span className="text-xs font-normal text-slate-400 font-mono">({item.loan.loanName})</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Due: <span className={isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-650'}>{item.dueDate}</span>
                        {isOverdue && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                            PAST DUE
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-slate-900">GH₵ {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-slate-400 font-medium tracking-tight">Amt Scheduled</p>
                    </div>
                    <button
                      id={`pay-btn-${item.loan.id}-${item.num}`}
                      onClick={() => onSelectLoan(item.loan.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer"
                    >
                      Process <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl mt-2">
            <CheckCircle className="w-10 h-10 text-indigo-200 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">All Loan Payments are Settled Up!</p>
            <p className="text-xs text-slate-400 mt-0.5">There are no unpaid scheduled repayments remaining as of this date.</p>
          </div>
        )}
      </div>
    </div>
  );
}
