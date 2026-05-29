import { Loan, ReminderLog } from '../types';
import { generateAmortizationSchedule } from './loanCalculations';

export const INITIAL_LOANS: Loan[] = [
  {
    id: 'loan-1',
    borrowerName: 'Sarah Jenkins',
    borrowerContact: '+1 (555) 381-0294',
    borrowerEmail: 'sarah.jenkins@business.co',
    loanName: 'Web Agency Expansion Capital',
    category: 'business',
    principal: 25000,
    interestRate: 8.5,
    termMonths: 12,
    interestType: 'amortized',
    paymentFrequency: 'monthly',
    startDate: '2026-02-15',
    status: 'active',
    notes: 'Approved for expansion of local web agency. Collateralized with company servers and assets.',
    reminderRules: [
      { id: 'rule-s1', daysBeforeDue: 3, channel: 'sms', isEnabled: true },
      { id: 'rule-s2', daysBeforeDue: 0, channel: 'email', isEnabled: true }
    ],
    repayments: [
      {
        id: 'rep-1-1',
        paymentDate: '2026-03-14',
        amountPaid: 2180.75, // approximate sum of payment 1
        principalPortion: 2003.88,
        interestPortion: 176.87,
        additionalPrincipal: 0,
        notes: 'First payment made via wire transfer. Clear.'
      },
      {
        id: 'rep-1-2',
        paymentDate: '2026-04-14',
        amountPaid: 2180.75,
        principalPortion: 2018.07,
        interestPortion: 162.68,
        additionalPrincipal: 0,
        notes: 'On time payment.'
      },
      {
        id: 'rep-1-3',
        paymentDate: '2026-05-15',
        amountPaid: 2180.75,
        principalPortion: 2032.37,
        interestPortion: 148.38,
        additionalPrincipal: 0,
        notes: 'Paid late in afternoon.'
      }
    ],
    schedule: [] // will be populated in React initialization
  },
  {
    id: 'loan-2',
    borrowerName: 'Marcus Chen',
    borrowerContact: '+1 (555) 912-4433',
    borrowerEmail: 'mchen.designs@gmail.com',
    loanName: 'Delivery Van Purchase',
    category: 'auto',
    principal: 14000,
    interestRate: 6.2,
    termMonths: 18,
    interestType: 'compound',
    compoundingFrequency: 'monthly',
    paymentFrequency: 'monthly',
    startDate: '2026-04-01',
    status: 'active',
    notes: 'Used delivery vehicle loan. Excellent credit history.',
    reminderRules: [
      { id: 'rule-m1', daysBeforeDue: 5, channel: 'sms', isEnabled: true },
      { id: 'rule-m2', daysBeforeDue: 1, channel: 'push', isEnabled: true }
    ],
    repayments: [
      {
        id: 'rep-2-1',
        paymentDate: '2026-05-01',
        amountPaid: 816.50,
        principalPortion: 744.17,
        interestPortion: 72.33,
        additionalPrincipal: 0
      }
    ],
    schedule: [] // will be initialized dynamically
  },
  {
    id: 'loan-3',
    borrowerName: 'Elena Rostova',
    borrowerContact: '+1 (555) 203-9911',
    borrowerEmail: 'elena.rostova@gmail.com',
    loanName: 'Emergency Home Repairs',
    category: 'personal',
    principal: 3500,
    interestRate: 15.0,
    termMonths: 6,
    interestType: 'flat',
    paymentFrequency: 'biweekly',
    startDate: '2026-04-10',
    status: 'overdue',
    notes: 'Urgent plumbing repair. Struggling to make recent payments.',
    reminderRules: [
      { id: 'rule-e1', daysBeforeDue: 2, channel: 'sms', isEnabled: true },
      { id: 'rule-e2', daysBeforeDue: -2, channel: 'sms', isEnabled: true, customTemplate: 'URGENT: Your payment is overdue by 2 days. Interest of 15% flat continues to accrue. Pay immediately.' }
    ],
    repayments: [
      {
        id: 'rep-3-1',
        paymentDate: '2026-04-24',
        amountPaid: 635.42,
        principalPortion: 583.33,
        interestPortion: 52.09,
        additionalPrincipal: 0
      }
    ],
    schedule: [] // will be initialized dynamically
  },
  {
    id: 'loan-4',
    borrowerName: 'Dr. Bruce Banner',
    borrowerContact: '+1 (555) 000-4733',
    borrowerEmail: 'bruce.gamma@bannerlabs.org',
    loanName: 'Laboratory Equipment Upgrades',
    category: 'mortgage', // high value
    principal: 350000,
    interestRate: 5.4,
    termMonths: 120, // 10 years
    interestType: 'simple',
    paymentFrequency: 'quarterly',
    startDate: '2025-01-01',
    status: 'active',
    notes: 'Spectrometer upgrade collateralized with real estate. Payment made every 3 months regularly.',
    reminderRules: [
      { id: 'rule-b1', daysBeforeDue: 7, channel: 'email', isEnabled: true }
    ],
    repayments: [
      {
        id: 'rep-4-1',
        paymentDate: '2025-04-01',
        amountPaid: 13475.00,
        principalPortion: 8750.00,
        interestPortion: 4725.00,
        additionalPrincipal: 0
      },
      {
        id: 'rep-4-2',
        paymentDate: '2025-07-01',
        amountPaid: 13356.88,
        principalPortion: 8750.00,
        interestPortion: 4606.88,
        additionalPrincipal: 0
      },
      {
        id: 'rep-4-3',
        paymentDate: '2025-10-01',
        amountPaid: 13238.75,
        principalPortion: 8750.00,
        interestPortion: 4488.75,
        additionalPrincipal: 0
      },
      {
        id: 'rep-4-4',
        paymentDate: '2026-01-01',
        amountPaid: 13120.63,
        principalPortion: 8750.00,
        interestPortion: 4370.63,
        additionalPrincipal: 0
      },
      {
        id: 'rep-4-5',
        paymentDate: '2026-04-01',
        amountPaid: 13002.50,
        principalPortion: 8750.00,
        interestPortion: 4252.50,
        additionalPrincipal: 0
      }
    ],
    schedule: [] // will be initialized dynamically
  }
];

export const INITIAL_REMINDER_LOGS: ReminderLog[] = [
  {
    id: 'log-1',
    loanId: 'loan-1',
    loanName: 'Web Agency Expansion Capital',
    borrowerName: 'Sarah Jenkins',
    dateSent: '2026-05-12T09:00:00Z',
    message: 'Friendly reminder: Your upcoming payment of $2,180.75 for Web Agency Expansion Capital is due on 2026-05-15. Please ensure funds are available.',
    channel: 'sms',
    status: 'delivered',
    paymentAmount: 2180.75,
    dueDate: '2026-05-15'
  },
  {
    id: 'log-2',
    loanId: 'loan-3',
    loanName: 'Emergency Home Repairs',
    borrowerName: 'Elena Rostova',
    dateSent: '2026-05-06T08:30:00Z',
    message: 'Friendly reminder: Your bi-weekly payment of $635.42 for Emergency Home Repairs is due on 2026-05-08.',
    channel: 'sms',
    status: 'delivered',
    paymentAmount: 635.42,
    dueDate: '2026-05-08'
  },
  {
    id: 'log-3',
    loanId: 'loan-3',
    loanName: 'Emergency Home Repairs',
    borrowerName: 'Elena Rostova',
    dateSent: '2026-05-10T14:15:00Z',
    message: 'URGENT: Your Emergency Home Repairs payment due on 2026-05-08 ($635.42) is past due by 2 days. Contact support immediately to avoid default penalties.',
    channel: 'sms',
    status: 'delivered',
    paymentAmount: 635.42,
    dueDate: '2026-05-08'
  }
];

// Hydrate schedule on load
export function getHydratedLoans(): Loan[] {
  return INITIAL_LOANS.map(loan => {
    const defaultSchedule = generateAmortizationSchedule({
      principal: loan.principal,
      annualRate: loan.interestRate,
      termMonths: loan.termMonths,
      interestType: loan.interestType,
      paymentFrequency: loan.paymentFrequency,
      compoundingFrequency: loan.compoundingFrequency,
      startDate: loan.startDate
    });
    
    // Wire up paid rows on dynamic mapping
    let paidWeight = loan.repayments.reduce((acc, rep) => acc + rep.amountPaid, 0);
    const hydratedSchedule = defaultSchedule.map((row, index) => {
      if (paidWeight >= row.paymentAmount) {
        paidWeight -= row.paymentAmount;
        return {
          ...row,
          isPaid: true,
          paidDetails: {
            id: `seed-rep-${loan.id}-${index}`,
            paymentDate: row.dueDate, // seed payment
            amountPaid: row.paymentAmount,
            principalPortion: row.principalPortion,
            interestPortion: row.interestPortion,
            additionalPrincipal: 0
          }
        };
      } else if (paidWeight > 0) {
        const actualPaid = paidWeight;
        paidWeight = 0;
        return {
          ...row,
          isPaid: false,
          paidDetails: {
            id: `seed-rep-partial-${loan.id}-${index}`,
            paymentDate: row.dueDate,
            amountPaid: actualPaid,
            principalPortion: Math.min(row.principalPortion, actualPaid),
            interestPortion: Math.max(0, actualPaid - row.principalPortion),
            additionalPrincipal: 0
          }
        };
      }
      return row;
    });

    // Check status
    const totalRepayAmount = hydratedSchedule.reduce((sum, row) => sum + row.paymentAmount, 0);
    const totalAmountPaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
    const balanceRemaining = Math.max(0, totalRepayAmount - totalAmountPaid);
    const status = balanceRemaining <= 0.05 ? 'paid' : loan.status;

    return {
      ...loan,
      schedule: hydratedSchedule,
      status
    };
  });
}
