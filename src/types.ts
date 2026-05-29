export type InterestType = 'amortized' | 'simple' | 'compound' | 'flat';

export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export type LoanStatus = 'active' | 'paid' | 'overdue' | 'defaulted';

export interface PaymentRecord {
  id: string;
  paymentDate: string;
  amountPaid: number;
  principalPortion: number;
  interestPortion: number;
  additionalPrincipal: number;
  notes?: string;
}

export interface AmortizationRow {
  paymentNumber: number;
  dueDate: string;
  paymentAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
  isPaid: boolean;
  paidDetails?: PaymentRecord;
}

export interface ReminderRule {
  id: string;
  daysBeforeDue: number; // negative means after due date
  channel: 'sms' | 'email' | 'push';
  isEnabled: boolean;
  customTemplate?: string;
}

export interface ReminderLog {
  id: string;
  loanId: string;
  loanName: string;
  borrowerName: string;
  dateSent: string;
  message: string;
  channel: 'sms' | 'email' | 'push';
  status: 'sent' | 'delivered' | 'failed';
  paymentAmount: number;
  dueDate: string;
}

export interface LoanDocument {
  id: string;
  name: string;
  type: 'id_proof' | 'income_proof' | 'address_proof' | 'promissory_note' | 'other';
  status: 'approved' | 'pending_review' | 'missing' | 'rejected';
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
}

export interface Loan {
  id: string;
  borrowerName: string;
  borrowerContact: string; // phone or email
  borrowerEmail?: string;
  loanName: string; // e.g., Car Loan, Student Loan
  category: 'personal' | 'business' | 'mortgage' | 'auto' | 'microfinance' | 'custom';
  principal: number;
  interestRate: number; // Annual rate as percentage (e.g., 5.5 representing 5.5%)
  termMonths: number;
  interestType: InterestType;
  compoundingFrequency?: 'monthly' | 'quarterly' | 'annually'; // For compound type
  paymentFrequency: PaymentFrequency;
  startDate: string;
  status: LoanStatus;
  notes?: string;
  reminderRules: ReminderRule[];
  repayments: PaymentRecord[];
  schedule: AmortizationRow[];
  documents?: LoanDocument[];
}

export interface CalculatorInputs {
  principal: number;
  annualRate: number;
  termMonths: number;
  interestType: InterestType;
  paymentFrequency: PaymentFrequency;
  compoundingFrequency: 'monthly' | 'quarterly' | 'annually';
}
