import { AmortizationRow, InterestType, PaymentFrequency, Loan } from '../types';

/**
 * Returns the frequency factor (number of payments per year) and 
 * the approximate duration multiplier for converting months to payments.
 */
export function getFrequencyDetails(frequency: PaymentFrequency): {
  paymentsPerYear: number;
  periodsPerMonth: number;
} {
  switch (frequency) {
    case 'weekly':
      return { paymentsPerYear: 52, periodsPerMonth: 52 / 12 };
    case 'biweekly':
      return { paymentsPerYear: 26, periodsPerMonth: 26 / 12 };
    case 'monthly':
      return { paymentsPerYear: 12, periodsPerMonth: 1 };
    case 'quarterly':
      return { paymentsPerYear: 4, periodsPerMonth: 4 / 12 };
  }
}

/**
 * Adds date intervals based on payment frequency
 */
export function addPeriodsToDate(dateStr: string, periods: number, frequency: PaymentFrequency): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7 * periods);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14 * periods);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + periods);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3 * periods);
      break;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Generate a full amortization schedule based on loan inputs
 */
export function generateAmortizationSchedule(params: {
  principal: number;
  annualRate: number; // e.g. 12 for 12%
  termMonths: number;
  interestType: InterestType;
  paymentFrequency: PaymentFrequency;
  compoundingFrequency?: 'monthly' | 'quarterly' | 'annually';
  startDate: string;
}): AmortizationRow[] {
  const { principal, annualRate, termMonths, interestType, paymentFrequency, compoundingFrequency, startDate } = params;
  
  const { paymentsPerYear, periodsPerMonth } = getFrequencyDetails(paymentFrequency);
  
  // Total number of payment periods
  const totalPeriods = Math.max(1, Math.round(termMonths * periodsPerMonth));
  
  // Outstanding annual interest rate in decimal
  const rAnnual = annualRate / 100;
  
  // Periodic interest rate
  let rPeriodic = rAnnual / paymentsPerYear;

  const rows: AmortizationRow[] = [];
  let remainingBalance = principal;

  // Let's implement each interest calculation style:
  
  if (interestType === 'amortized') {
    // Standard Amortized (reducing balance, equal payments)
    // Formula: PMT = P * r * (1+r)^N / ((1+r)^N - 1)
    let paymentAmount = 0;
    if (rPeriodic === 0) {
      paymentAmount = principal / totalPeriods;
    } else {
      paymentAmount = principal * (rPeriodic * Math.pow(1 + rPeriodic, totalPeriods)) / (Math.pow(1 + rPeriodic, totalPeriods) - 1);
    }

    for (let i = 1; i <= totalPeriods; i++) {
      const interestPortion = parseFloat((remainingBalance * rPeriodic).toFixed(2));
      let principalPortion = parseFloat((paymentAmount - interestPortion).toFixed(2));
      
      // Keep things accurate on final payment
      if (i === totalPeriods || remainingBalance < principalPortion) {
        principalPortion = remainingBalance;
      }
      
      const currentPayment = parseFloat((principalPortion + interestPortion).toFixed(2));
      remainingBalance = parseFloat((remainingBalance - principalPortion).toFixed(2));

      rows.push({
        paymentNumber: i,
        dueDate: addPeriodsToDate(startDate, i, paymentFrequency),
        paymentAmount: currentPayment,
        principalPortion,
        interestPortion,
        remainingBalance: Math.max(0, remainingBalance),
        isPaid: false
      });
    }

  } else if (interestType === 'flat') {
    // Flat Rate Interest (microloans, constant interest calculated on starting principal)
    // Formula: Total Interest = P * rAnnual * TermYears
    // Monthly Payment = (P + Total Interest) / totalPeriods
    const termYears = termMonths / 12;
    const totalInterest = principal * rAnnual * termYears;
    const periodicInterest = parseFloat((totalInterest / totalPeriods).toFixed(2));
    const periodicPrincipal = parseFloat((principal / totalPeriods).toFixed(2));
    
    let allocatedPrincipal = 0;
    let allocatedInterest = 0;

    for (let i = 1; i <= totalPeriods; i++) {
      let principalPortion = periodicPrincipal;
      let interestPortion = periodicInterest;

      // Adjust last row for rounding errors
      if (i === totalPeriods) {
        principalPortion = parseFloat((principal - allocatedPrincipal).toFixed(2));
        interestPortion = parseFloat((totalInterest - allocatedInterest).toFixed(2));
      } else {
        allocatedPrincipal += principalPortion;
        allocatedInterest += interestPortion;
      }

      const paymentAmount = parseFloat((principalPortion + interestPortion).toFixed(2));
      remainingBalance = parseFloat((remainingBalance - principalPortion).toFixed(2));

      rows.push({
        paymentNumber: i,
        dueDate: addPeriodsToDate(startDate, i, paymentFrequency),
        paymentAmount,
        principalPortion,
        interestPortion,
        remainingBalance: Math.max(0, remainingBalance),
        isPaid: false
      });
    }

  } else if (interestType === 'simple') {
    // Simple Interest (reducing balance, equal principal portions, variable interest)
    // Base periodic principal payment = Principal / totalPeriods
    // Periodic Interest = Outstanding Balance * rPeriodic
    // PaymentAmount = Periodic Principal + Periodic Interest (reduces over time)
    const periodicPrincipal = parseFloat((principal / totalPeriods).toFixed(2));
    let allocatedPrincipal = 0;

    for (let i = 1; i <= totalPeriods; i++) {
      let principalPortion = periodicPrincipal;
      if (i === totalPeriods) {
        principalPortion = parseFloat((principal - allocatedPrincipal).toFixed(2));
      } else {
        allocatedPrincipal += principalPortion;
      }

      const interestPortion = parseFloat((remainingBalance * rPeriodic).toFixed(2));
      const paymentAmount = parseFloat((principalPortion + interestPortion).toFixed(2));
      remainingBalance = parseFloat((remainingBalance - principalPortion).toFixed(2));

      rows.push({
        paymentNumber: i,
        dueDate: addPeriodsToDate(startDate, i, paymentFrequency),
        paymentAmount,
        principalPortion,
        interestPortion,
        remainingBalance: Math.max(0, remainingBalance),
        isPaid: false
      });
    }

  } else if (interestType === 'compound') {
    // Compound interest with regular repayments
    // Compounding occurs monthly, quarterly or annually. Let's map frequency
    let compoundTimesPerYear = 12;
    if (compoundingFrequency === 'quarterly') compoundTimesPerYear = 4;
    else if (compoundingFrequency === 'annually') compoundTimesPerYear = 1;
    
    // Convert annual rate to effective interest rate per payment period
    // e_rate = (1 + r_annual/c_freq)^(c_freq/pmt_freq) - 1
    const parts = 1 + rAnnual / compoundTimesPerYear;
    const exponent = compoundTimesPerYear / paymentsPerYear;
    const rCompoundPeriodic = Math.pow(parts, exponent) - 1;

    let paymentAmount = 0;
    if (rCompoundPeriodic === 0) {
      paymentAmount = principal / totalPeriods;
    } else {
      paymentAmount = principal * (rCompoundPeriodic * Math.pow(1 + rCompoundPeriodic, totalPeriods)) / (Math.pow(1 + rCompoundPeriodic, totalPeriods) - 1);
    }

    for (let i = 1; i <= totalPeriods; i++) {
      const interestPortion = parseFloat((remainingBalance * rCompoundPeriodic).toFixed(2));
      let principalPortion = parseFloat((paymentAmount - interestPortion).toFixed(2));
      
      if (i === totalPeriods || remainingBalance < principalPortion) {
        principalPortion = remainingBalance;
      }
      
      const currentPayment = parseFloat((principalPortion + interestPortion).toFixed(2));
      remainingBalance = parseFloat((remainingBalance - principalPortion).toFixed(2));

      rows.push({
        paymentNumber: i,
        dueDate: addPeriodsToDate(startDate, i, paymentFrequency),
        paymentAmount: currentPayment,
        principalPortion,
        interestPortion,
        remainingBalance: Math.max(0, remainingBalance),
        isPaid: false
      });
    }
  }

  return rows;
}

/**
 * Recalculates loan status, paid, and outstanding amounts based on repayment records logged
 */
export function calculaterepaymentEffects(loan: Loan): {
  repaidAmount: number;
  remainingPrincipal: number;
  interestPaid: number;
  nextPaymentAmount: number;
  nextPaymentDate: string;
  isFullyPaid: boolean;
  schedule: AmortizationRow[];
} {
  const scheduleCopy = loan.schedule.map(row => ({ ...row }));
  const sortedrepayments = [...loan.repayments].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  
  let totalRepaidAmount = 0;
  let totalInterestPaidVal = 0;

  // Track payments and apply them sequentially to the schedule items
  // First update each row's status based on logged payments.
  let remainingPaymentAmount = sortedrepayments.reduce((acc, current) => acc + current.amountPaid, 0);
  totalRepaidAmount = remainingPaymentAmount;

  for (let idx = 0; idx < scheduleCopy.length; idx++) {
    const row = scheduleCopy[idx];
    if (remainingPaymentAmount >= row.paymentAmount) {
      row.isPaid = true;
      row.paidDetails = {
        id: `auto-${idx}`,
        paymentDate: sortedrepayments[0]?.paymentDate || row.dueDate,
        amountPaid: row.paymentAmount,
        principalPortion: row.principalPortion,
        interestPortion: row.interestPortion,
        additionalPrincipal: 0
      };
      totalInterestPaidVal += row.interestPortion;
      remainingPaymentAmount -= row.paymentAmount;
    } else if (remainingPaymentAmount > 0) {
      // Partial payment
      row.isPaid = false;
      row.paidDetails = {
        id: `auto-partial-${idx}`,
        paymentDate: sortedrepayments[0]?.paymentDate || row.dueDate,
        amountPaid: remainingPaymentAmount,
        principalPortion: Math.min(row.principalPortion, remainingPaymentAmount),
        interestPortion: Math.max(0, remainingPaymentAmount - row.principalPortion),
        additionalPrincipal: 0
      };
      totalInterestPaidVal += Math.max(0, remainingPaymentAmount - row.principalPortion);
      remainingPaymentAmount = 0;
    } else {
      row.isPaid = false;
      row.paidDetails = undefined;
    }
  }

  // Calculate standard remaining figures
  const totalRepaymentAmount = scheduleCopy.reduce((sum, row) => sum + row.paymentAmount, 0);
  const totalAmountPaid = sortedrepayments.reduce((sum, r) => sum + r.amountPaid, 0);
  const remainingPrincipal = Math.max(0, totalRepaymentAmount - totalAmountPaid);
  const interestPaid = totalAmountPaid;

  // Find next unpaid payment
  const nextUnpaid = scheduleCopy.find(row => !row.isPaid);
  const isFullyPaid = remainingPrincipal <= 0.05 || !nextUnpaid;

  return {
    repaidAmount: totalRepaidAmount,
    remainingPrincipal,
    interestPaid: totalInterestPaidVal,
    nextPaymentAmount: nextUnpaid ? (nextUnpaid.paymentAmount - (nextUnpaid.paidDetails?.amountPaid || 0)) : 0,
    nextPaymentDate: nextUnpaid ? nextUnpaid.dueDate : 'Fully Paid',
    isFullyPaid,
    schedule: scheduleCopy
  };
}
