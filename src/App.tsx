import React, { Component, useState, useEffect } from 'react';
import { Loan, ReminderLog, ReminderRule, PaymentRecord, InterestType, PaymentFrequency } from './types';
import { getHydratedLoans, INITIAL_REMINDER_LOGS } from './utils/mockData';
import { calculaterepaymentEffects } from './utils/loanCalculations';
import { collection, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection, cleanUndefined, setDoc } from './firebase';
import DashboardStats from './components/DashboardStats';
import InterestCalculator from './components/InterestCalculator';
import RemindersSim from './components/RemindersSim';
import LoanForm from './components/LoanForm';
import ActiveLoanCard from './components/ActiveLoanCard';
import ClientLogin from './components/ClientLogin';
import ClientOverview from './components/ClientOverview';
import StaffLogin from './components/StaffLogin';
import StaffManagement from './components/StaffManagement';

import { 
  PiggyBank, 
  HelpCircle, 
  Layers, 
  Coins, 
  LineChart, 
  Smartphone, 
  Settings, 
  MessageSquare, 
  ChevronRight, 
  ShieldAlert, 
  PlusCircle, 
  BookOpen, 
  CheckCircle,
  Bell,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  X,
  Compass,
  Briefcase,
  Lock,
  LogOut
} from 'lucide-react';

const serializeStateToUrl = (loans: Loan[], logs: ReminderLog[], simDate: string) => {
  // Disabled state serialization in the URL parameters to prevent "Webpage not available" (431 Request Header Fields Too Large / 414 Request-URI Too Large) errors on reload.
  // Standard full-fidelity state persistence is handled dynamically by Firebase and localStorage.
};

const getInitialStateFromUrl = (): { loans: Loan[]; reminderLogs: ReminderLog[]; currentSimDate: string } | null => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const stateParam = urlParams.get('state');
    if (stateParam) {
      const decodedPayload = decodeURIComponent(escape(atob(stateParam)));
      const parsed = JSON.parse(decodedPayload);
      if (parsed && Array.isArray(parsed.l)) {
        return {
          loans: parsed.l as Loan[],
          reminderLogs: (parsed.g || []) as ReminderLog[],
          currentSimDate: (parsed.d || '2026-05-24') as string
        };
      }
    }
  } catch (e) {
    console.warn('Could not load initial state from URL query parameter:', e);
  }
  return null;
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border border-slate-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 font-sans">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              An unexpected error occurred. No worries — fallback safety guards are active.
            </p>
            <div className="mt-4 p-3 bg-slate-50 pb-2.5 rounded-lg text-left font-mono text-[10px] text-slate-600 max-h-40 overflow-y-auto border border-slate-100">
              {this.state.error?.message || "Render Error"}
            </div>
            <button
              onClick={this.handleReset}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
            >
              Reset State & Restart Application
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

function App() {
  // Load or set states
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [currentSimDate, setCurrentSimDate] = useState('2026-05-24'); // system anchor date matching system metadata
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loans' | 'calculator' | 'reminders' | 'staff_mgmt'>('dashboard');
  const [layoutMode, setLayoutMode] = useState<'desktop' | 'android'>('desktop');

  // Pull-To-Refresh State Tracker
  const [startY, setStartY] = useState<number | null>(null);
  const [pullY, setPullY] = useState<number>(0);
  const [refreshState, setRefreshState] = useState<'idle' | 'pull' | 'release' | 'refreshing' | 'completed'>('idle');

  const triggerAppRefresh = async () => {
    setRefreshState('refreshing');
    setPullY(65); // Lock pull distance at refreshing state height
    try {
      await testConnection();
      await new Promise((resolve) => setTimeout(resolve, 1400));
      setRefreshState('completed');
      setSystemToast({
        title: '🔄 Ledger Synced Successfully',
        desc: 'All active agreements and payment journals pulled fresh from Europe-west2 Firestore DB.'
      });
      setTimeout(() => setSystemToast(null), 3500);
    } catch (err) {
      console.error("Refresh sync failed:", err);
    } finally {
      setTimeout(() => {
        setPullY(0);
        setRefreshState('idle');
      }, 500);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, isInnerSimulator: boolean = false) => {
    const target = e.currentTarget as HTMLElement;
    const isAtTop = isInnerSimulator ? target.scrollTop === 0 : (window.scrollY === 0 || document.documentElement.scrollTop === 0);
    
    if (isAtTop && refreshState === 'idle') {
      setStartY(e.touches[0].clientY);
      setRefreshState('pull');
    }
  };

  const handleTouchMove = (e: React.TouchEvent, isInnerSimulator: boolean = false) => {
    if (startY === null || refreshState === 'refreshing' || refreshState === 'completed') return;
    
    const target = e.currentTarget as HTMLElement;
    const isAtTop = isInnerSimulator ? target.scrollTop === 0 : (window.scrollY === 0 || document.documentElement.scrollTop === 0);
    
    if (!isAtTop) {
      setStartY(null);
      setPullY(0);
      setRefreshState('idle');
      return;
    }
    
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      // Prevent browser native refresh so sandbox iframe doesn't crash on pull-down
      if (e.cancelable) e.preventDefault();
      
      const resistancePull = Math.min(85, Math.pow(deltaY, 0.85));
      setPullY(resistancePull);
      
      if (resistancePull >= 60) {
        setRefreshState('release');
      } else {
        setRefreshState('pull');
      }
    }
  };

  const handleTouchEnd = () => {
    if (startY === null) return;
    if (pullY >= 60 && (refreshState === 'pull' || refreshState === 'release')) {
      triggerAppRefresh();
    } else {
      setPullY(0);
      setRefreshState('idle');
    }
    setStartY(null);
  };
  
  // Custom client access states
  const [portalRole, setPortalRole] = useState<'staff' | 'client'>('staff');
  const [loggedInLoanId, setLoggedInLoanId] = useState<string | null>(null);
  const [staffAuthenticated, setStaffAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('cornerstone_staff_authenticated') === 'true';
  });

  // Staff account credentials management
  const [staffAccounts, setStaffAccounts] = useState<{ id: string; email: string; password: string; createdAt: string }[]>(() => {
    const saved = localStorage.getItem('cornerstone_staff_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Form controls
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
  const [prefillCalculatorData, setPrefillCalculatorData] = useState<{
    principal: number;
    interestRate: number;
    termMonths: number;
    interestType: InterestType;
    paymentFrequency: PaymentFrequency;
  } | null>(null);

  // Selected details
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  // Search/Filters for Loans List
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Interactive System Notifications (simulates popups)
  const [systemToast, setSystemToast] = useState<{ title: string; desc: string } | null>(null);

  // Load from local storage, URL state on startup & real-time Firestore sync
  useEffect(() => {
    testConnection();

    // Check if there is an initial state in the URL to ingest/migrate
    const urlState = getInitialStateFromUrl();
    if (urlState) {
      if (urlState.currentSimDate) {
        localStorage.setItem('lendflow_sim_date', urlState.currentSimDate);
        setCurrentSimDate(urlState.currentSimDate);
      }
      urlState.loans.forEach(async (loan) => {
        try {
          await setDoc(doc(db, 'loans', loan.id), loan);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `loans/${loan.id}`);
        }
      });
      urlState.reminderLogs.forEach(async (log) => {
        try {
          await setDoc(doc(db, 'reminderLogs', log.id), log);
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `reminderLogs/${log.id}`);
        }
      });
      // Clear the massive URL parameter immediately so manual refreshes are lightning fast and standard sized
      try {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      } catch (e) {
        console.error('Failed to clear state query parameter:', e);
      }
    }

    const savedClientId = localStorage.getItem('lendflow_client_id');
    const savedPortalRole = localStorage.getItem('lendflow_portal_role') as 'staff' | 'client' | null;
    const savedDate = localStorage.getItem('lendflow_sim_date') || '2026-05-24';
    setCurrentSimDate(savedDate);

    if (savedClientId) {
      setLoggedInLoanId(savedClientId);
    }
    if (savedPortalRole) {
      setPortalRole(savedPortalRole);
    }

    // Subscribe to loans
    const unsubscribeLoans = onSnapshot(collection(db, 'loans'), (snapshot) => {
      const fbLoans: Loan[] = [];
      snapshot.forEach((docSnap) => {
        fbLoans.push(docSnap.data() as Loan);
      });
      if (fbLoans.length > 0) {
        setLoans(fbLoans);
        serializeStateToUrl(fbLoans, reminderLogs, savedDate);
      } else {
        // Seed default loans if Firestore is currently empty
        const initial = getHydratedLoans();
        initial.forEach(async (loan) => {
          try {
            await setDoc(doc(db, 'loans', loan.id), loan);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `loans/${loan.id}`);
          }
        });
        setLoans(initial);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'loans');
    });

    // Subscribe to reminderLogs
    const unsubscribeLogs = onSnapshot(collection(db, 'reminderLogs'), (snapshot) => {
      const fbLogs: ReminderLog[] = [];
      snapshot.forEach((docSnap) => {
        fbLogs.push(docSnap.data() as ReminderLog);
      });
      if (fbLogs.length > 0) {
        setReminderLogs(fbLogs);
      } else {
        // Seed initial reminder logs if empty
        INITIAL_REMINDER_LOGS.forEach(async (log) => {
          try {
            await setDoc(doc(db, 'reminderLogs', log.id), log);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `reminderLogs/${log.id}`);
          }
        });
        setReminderLogs(INITIAL_REMINDER_LOGS);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reminderLogs');
    });

    // Subscribe to staffAccounts
    const unsubscribeStaff = onSnapshot(collection(db, 'staffAccounts'), (snapshot) => {
      const fbStaff: any[] = [];
      snapshot.forEach((docSnap) => {
        fbStaff.push(docSnap.data());
      });
      setStaffAccounts(fbStaff);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'staffAccounts');
    });

    return () => {
      unsubscribeLoans();
      unsubscribeLogs();
      unsubscribeStaff();
    };
  }, []);

  // Sync to database localStorage helper & URL string rep
  const saveStateToLocalStorage = (newLoans: Loan[], newLogs: ReminderLog[], newDate: string) => {
    localStorage.setItem('lendflow_loans', JSON.stringify(newLoans));
    localStorage.setItem('lendflow_logs', JSON.stringify(newLogs));
    localStorage.setItem('lendflow_sim_date', newDate);
    serializeStateToUrl(newLoans, newLogs, newDate);
  };

  const handlePortalRoleChange = (role: 'staff' | 'client') => {
    setPortalRole(role);
    localStorage.setItem('lendflow_portal_role', role);
  };

  const handleStaffLoginSuccess = () => {
    setStaffAuthenticated(true);
    localStorage.setItem('cornerstone_staff_authenticated', 'true');
    setSystemToast({ title: '🔑 Staff Access Granted', desc: 'Secure staff session initialized.' });
    setTimeout(() => setSystemToast(null), 3500);
  };

  const handleStaffLogout = () => {
    setStaffAuthenticated(false);
    localStorage.removeItem('cornerstone_staff_authenticated');
    setSystemToast({ title: '🔒 Staff Session Locked', desc: 'Securely logged out from administration terminal.' });
    setTimeout(() => setSystemToast(null), 3500);
  };

  const handleCreateStaff = async (email: string, password: string) => {
    const newStaff = {
      id: `staff-${Date.now()}`,
      email,
      password,
      createdAt: currentSimDate
    };
    try {
      await setDoc(doc(db, 'staffAccounts', newStaff.id), newStaff);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `staffAccounts/${newStaff.id}`);
    }
  };

  const handleUpdateStaffPassword = async (id: string, newPass: string) => {
    const acc = staffAccounts.find(a => a.id === id);
    if (acc) {
      const updated = { ...acc, password: newPass };
      try {
        await setDoc(doc(db, 'staffAccounts', id), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `staffAccounts/${id}`);
      }
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'staffAccounts', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `staffAccounts/${id}`);
    }
  };

  const handleSimulateEmailDispatch = async (email: string, message: string) => {
    const newLog: ReminderLog = {
      id: `log-staff-email-${Date.now()}`,
      loanId: 'staff-sys',
      loanName: 'Administrative Security',
      borrowerName: `Staff Account (${email})`,
      dateSent: new Date().toISOString(),
      message,
      channel: 'email',
      status: 'sent',
      paymentAmount: 0,
      dueDate: currentSimDate
    };
    try {
      await setDoc(doc(db, 'reminderLogs', newLog.id), newLog);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `reminderLogs/${newLog.id}`);
    }

    // Send real-time outbound email via our secure server SMTP carrier (finance@cornerstonesnl.com)
    fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        subject: `🔒 Cornerstone Savings & Loans Terminal Access: ${email}`,
        message: message
      })
    })
    .then(r => r.json())
    .then(data => {
      console.log('Server email dispatch feedback:', data);
    })
    .catch(err => {
      console.error('Failed to proxy SMTP email dispatch via backend server:', err);
    });

    setSystemToast({
      title: '📧 Outbound Mail Routed',
      desc: `Auth credentials dispatched dynamically to ${email}`
    });
    setTimeout(() => setSystemToast(null), 4005);
  };

  const handleLoginSuccess = (loan: Loan) => {
    setLoggedInLoanId(loan.id);
    localStorage.setItem('lendflow_client_id', loan.id);
    setSystemToast({ title: '🔓 Portal Access Authorized', desc: `Welcome back, ${loan.borrowerName}!` });
    setTimeout(() => setSystemToast(null), 3500);
  };

  const handleLogout = () => {
    setLoggedInLoanId(null);
    localStorage.removeItem('lendflow_client_id');
    setSystemToast({ title: '🔒 Session Terminated', desc: 'Securely logged out from client account portal.' });
    setTimeout(() => setSystemToast(null), 3500);
  };

  // Time Engine forward traveler
  const handleTimeLeap = (days: number) => {
    const oldDate = new Date(currentSimDate);
    const newDate = new Date(currentSimDate);
    newDate.setDate(newDate.getDate() + days);

    const oldDateStr = oldDate.toISOString().split('T')[0];
    const newDateStr = newDate.toISOString().split('T')[0];

    const dispatchedLogs: ReminderLog[] = [];

    const updatedLoans = loans.map(loan => {
      // Evaluate each unpaid row schedule
      loan.schedule.forEach(row => {
        if (!row.isPaid) {
          loan.reminderRules.forEach(rule => {
            if (rule.isEnabled) {
              const ruleTriggerDate = new Date(row.dueDate);
              ruleTriggerDate.setDate(ruleTriggerDate.getDate() - rule.daysBeforeDue);
              
              // Validate if trigger date elapsed in this leap interval
              if (ruleTriggerDate > oldDate && ruleTriggerDate <= newDate) {
                const message = rule.customTemplate
                  ? rule.customTemplate
                      .replace(/\{\{BORROWER\}\}/g, loan.borrowerName)
                      .replace(/\{\{AMOUNT\}\}/g, row.paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }))
                      .replace(/\{\{LOAN_NAME\}\}/g, loan.loanName)
                      .replace(/\{\{DAYS\}\}/g, Math.abs(rule.daysBeforeDue).toString())
                      .replace(/\{\{DUE_DATE\}\}/g, row.dueDate)
                  : `Hi ${loan.borrowerName}, a periodic repayment of $${row.paymentAmount.toFixed(2)} for ${loan.loanName} is due soon on ${row.dueDate}. Thank you.`;

                dispatchedLogs.push({
                  id: `auto-${loan.id}-${row.paymentNumber}-${rule.id}-${Date.now()}`,
                  loanId: loan.id,
                  loanName: loan.loanName,
                  borrowerName: loan.borrowerName,
                  dateSent: ruleTriggerDate.toISOString(),
                  message,
                  channel: rule.channel,
                  status: 'delivered',
                  paymentAmount: row.paymentAmount,
                  dueDate: row.dueDate
                });
              }
            }
          });
        }
      });

      // Recalculate status updates due to elapsed dates without payments
      const totalRepayAmount = loan.schedule.reduce((sum, r) => sum + r.paymentAmount, 0);
      const totalAmountPaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
      const balanceRemaining = Math.max(0, totalRepayAmount - totalAmountPaid);
      
      let status = loan.status;
      if (balanceRemaining <= 0.05) {
        status = 'paid';
      } else {
        const hasOverdueInstallment = loan.schedule.some(row => !row.isPaid && new Date(row.dueDate) < newDate);
        if (hasOverdueInstallment) {
          status = 'overdue';
        } else {
          status = 'active';
        }
      }

      return {
        ...loan,
        status
      };
    });

    const concatenatedLogs = [...dispatchedLogs, ...reminderLogs];
    setLoans(updatedLoans);
    setReminderLogs(concatenatedLogs);
    setCurrentSimDate(newDateStr);
    saveStateToLocalStorage(updatedLoans, concatenatedLogs, newDateStr);

    // Sync state to Firestore!
    updatedLoans.forEach(async (loan) => {
      try {
        await setDoc(doc(db, 'loans', loan.id), loan);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `loans/${loan.id}`);
      }
    });

    dispatchedLogs.forEach(async (log) => {
      try {
        await setDoc(doc(db, 'reminderLogs', log.id), log);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `reminderLogs/${log.id}`);
      }
    });

    if (dispatchedLogs.length > 0) {
      setSystemToast({
        title: '📣 Automated Alerts Dispatched!',
        desc: `Autonomous temporal scan fired ${dispatchedLogs.length} simulated campaign notices to elapsed client queues.`
      });
      setTimeout(() => setSystemToast(null), 6000);
    } else {
      setSystemToast({
        title: '📅 Simulated Calendar Advanced',
        desc: `System moved forward ${days} days into the future. Active date: ${newDateStr}`
      });
      setTimeout(() => setSystemToast(null), 3000);
    }
  };

  // Instant Manual Message Override
  const handleInstantReminder = async (selectedLoan: Loan, rule: ReminderRule) => {
    const nextUnpaid = selectedLoan.schedule.find(row => !row.isPaid);
    const amount = nextUnpaid ? nextUnpaid.paymentAmount : selectedLoan.principal / selectedLoan.termMonths;
    const dueDate = nextUnpaid ? nextUnpaid.dueDate : selectedSimDateString();

    const textContent = rule.customTemplate
      ? rule.customTemplate
          .replace(/\{\{BORROWER\}\}/g, selectedLoan.borrowerName)
          .replace(/\{\{AMOUNT\}\}/g, amount.toLocaleString('en-US', { minimumFractionDigits: 2 }))
          .replace(/\{\{LOAN_NAME\}\}/g, selectedLoan.loanName)
          .replace(/\{\{DAYS\}\}/g, Math.abs(rule.daysBeforeDue).toString())
          .replace(/\{\{DUE_DATE\}\}/g, dueDate)
      : `Notification Notice: Settle payment of GH₵${amount.toFixed(2)} on your active ${selectedLoan.loanName} contract. Due date: ${dueDate}.`;

    const newLogEntry: ReminderLog = {
      id: `manual-${selectedLoan.id}-${Date.now()}`,
      loanId: selectedLoan.id,
      loanName: selectedLoan.loanName,
      borrowerName: selectedLoan.borrowerName,
      dateSent: new Date().toISOString(),
      message: textContent,
      channel: rule.channel,
      status: 'delivered',
      paymentAmount: amount,
      dueDate
    };

    try {
      await setDoc(doc(db, 'reminderLogs', newLogEntry.id), newLogEntry);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `reminderLogs/${newLogEntry.id}`);
    }

    // Send a real-time notification email over secure SMTP channel (co-sponsored by finance@cornerstonesnl.com)
    fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'markreaganson@gmail.com',
        subject: `📢 Cornerstone Client Reminder Dispatched: ${selectedLoan.borrowerName}`,
        message: `Dear Administrator,\n\nA simulated ${rule.channel.toUpperCase()} reminder notification was dispatched successfully in the Cornerstone Portal.\n\n------------------------------\nRECIPIENT: ${selectedLoan.borrowerName}\nLOAN CONTRACT: ${selectedLoan.loanName}\nRECONCILIATION AMOUNT: GH₵${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\nDUE DATE: ${dueDate}\nTRIGGER CHANNEL: ${rule.channel.toUpperCase()}\n------------------------------\n\nMESSAGE DRAFT DISPATCH:\n"${textContent}"\n\n- system-automations-mailer@cornerstonesavings.com`
      })
    })
    .then(r => r.json())
    .then(data => {
      console.log('Real-time notification routed over server SMTP:', data);
    })
    .catch(err => {
      console.error('Failed to route client notification:', err);
    });

    setSystemToast({
      title: '📢 Notification Sent',
      desc: `Simulated ${rule.channel.toUpperCase()} routed to ${selectedLoan.borrowerName} (Real-time tracking email sent via SMTP)`
    });
    setTimeout(() => setSystemToast(null), 3000);
  };

  const selectedSimDateString = () => currentSimDate;

  // Insert/Update Loan from creation form
  const handleSaveLoan = async (updatedLoan: Loan) => {
    try {
      await setDoc(doc(db, 'loans', updatedLoan.id), updatedLoan);
      if (loans.some(l => l.id === updatedLoan.id)) {
        setSystemToast({ title: '📁 Agreement Revision Saved', desc: `${updatedLoan.borrowerName}'s legal loan configuration was updated.` });
      } else {
        setSystemToast({ title: '✨ Portfolio Asset Added', desc: `New loan generated for client ${updatedLoan.borrowerName} successfully.` });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `loans/${updatedLoan.id}`);
    }
    
    // Close form drawers
    setShowLoanForm(false);
    setLoanToEdit(null);
    setPrefillCalculatorData(null);
    setSelectedLoanId(updatedLoan.id); // set focus
    setTimeout(() => setSystemToast(null), 3500);
  };

  // Recording repayments (and applying dynamic updates to active schedule)
  const handleRecordRepayment = async (loanId: string, record: PaymentRecord) => {
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
      const withPayment = {
        ...loan,
        repayments: [...loan.repayments, record]
      };
      const effects = calculaterepaymentEffects(withPayment);
      const updatedLoan = {
        ...withPayment,
        schedule: effects.schedule,
        status: effects.isFullyPaid ? 'paid' : loan.status
      };
      try {
        await setDoc(doc(db, 'loans', loanId), updatedLoan);
        setSystemToast({ title: '💰 Payment Ledger Entry Complete', desc: `Logged repayment index of $${record.amountPaid.toLocaleString()} to legal schedule.` });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `loans/${loanId}`);
      }
    }
    setTimeout(() => setSystemToast(null), 3500);
  };

  // Delete Loan Agreement
  const handleDeleteLoan = async (loanId: string) => {
    const targetLoan = loans.find(l => l.id === loanId);
    if (!targetLoan) return;
    
    const isConfirmed = window.confirm(`Are you absolutely sure you want to terminate & erase this asset schedule for ${targetLoan.borrowerName}?`);
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'loans', loanId));
      setSelectedLoanId(null);
      setSystemToast({ title: '🗑️ Loan Schedule Erased', desc: `Agreement details for ${targetLoan.borrowerName} were purged.` });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `loans/${loanId}`);
    }
    setTimeout(() => setSystemToast(null), 3500);
  };

  // Modify individual rules
  const handleUpdateReminderRules = async (loanId: string, rules: ReminderRule[]) => {
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
      const updatedLoan = { ...loan, reminderRules: rules };
      try {
        await setDoc(doc(db, 'loans', loanId), updatedLoan);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `loans/${loanId}`);
      }
    }
  };

  // Link Calculator variables forward into Loan creation form!
  const handleAddFromCalculator = (calcData: any) => {
    setPrefillCalculatorData(calcData);
    setLoanToEdit(null);
    setShowLoanForm(true);
  };

  // Safe navigation trigger helper
  const handleSelectLoanId = (loanId: string) => {
    setSelectedLoanId(loanId);
    setActiveTab('loans');
  };

  // Category statistics/filtering computed on matching list variables
  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          loan.loanName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || loan.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || loan.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeSelectedLoan = loans.find(l => l.id === selectedLoanId);

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between"
      onTouchStart={(e) => handleTouchStart(e, false)}
      onTouchMove={(e) => handleTouchMove(e, false)}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* Dynamic Slide-Down System Toast */}
      {systemToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-705 text-white py-3 px-5 rounded-xl shadow-xl z-50 flex items-start gap-3 w-11/12 max-w-md animate-slide-down">
          <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 pr-2">
            <h4 className="text-xs font-bold font-sans tracking-wide">{systemToast.title}</h4>
            <p className="text-[10px] text-indigo-100/80 leading-relaxed font-semibold mt-0.5">{systemToast.desc}</p>
          </div>
          <button onClick={() => setSystemToast(null)} className="text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Top App Bar */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-650 rounded flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-sans font-bold tracking-tight flex items-center gap-1.5 leading-none text-slate-800">
                Cornerstone Savings & Loans
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 uppercase font-extrabold">
                  GHC Portal
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5 uppercase tracking-wide">
                Enterprise Ledger & Notifications Vault
              </p>
            </div>
          </div>

          {/* Interactive Layout View & Client Portal Selector */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {portalRole === 'staff' && staffAuthenticated && (
              <button
                id="staff-logout-btn"
                onClick={handleStaffLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg transition select-none cursor-pointer"
                title="Lock Administrative Dashboard"
              >
                <LogOut className="w-3.5 h-3.5" /> Lock Console
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 hidden xl:inline">Role:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  id="portal-btn-staff"
                  onClick={() => handlePortalRoleChange('staff')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-md transition select-none cursor-pointer ${portalRole === 'staff' ? 'bg-white text-slate-800 shadow-sm border border-slate-150' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  💼 Staff Portal
                </button>
                <button
                  id="portal-btn-client"
                  onClick={() => handlePortalRoleChange('client')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-md transition select-none cursor-pointer ${portalRole === 'client' ? 'bg-white text-slate-805 shadow-sm border border-slate-150' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  👤 Client Portal
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 hidden xl:inline">Viewport:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  id="layout-btn-desktop"
                  onClick={() => setLayoutMode('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-md transition select-none cursor-pointer ${layoutMode === 'desktop' ? 'bg-white text-slate-800 shadow-sm border border-slate-150' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  🖥️ Standard View
                </button>
                <button
                  id="layout-btn-android"
                  onClick={() => setLayoutMode('android')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-md transition select-none cursor-pointer ${layoutMode === 'android' ? 'bg-white text-slate-800 shadow-sm border border-slate-150' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile View
                </button>
              </div>
            </div>

            {/* Quick Simulation/Actual Pull-Down Trigger Button */}
            <button
              id="header-manual-sync-btn"
              onClick={triggerAppRefresh}
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-extrabold rounded-lg border transition select-none cursor-pointer ${
                refreshState === 'refreshing' 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 animate-pulse shadow-sm' 
                  : 'bg-indigo-600 border-indigo-700 hover:bg-indigo-500 text-white shadow-sm'
              }`}
              title="Click to Simulate Pull-To-Refresh Sync"
            >
              <span className={`inline-block ${refreshState === 'refreshing' ? 'animate-spin' : ''}`}>🔄</span>
              {refreshState === 'refreshing' ? 'Syncing...' : 'Sync Database'}
            </button>
          </div>

        </div>
      </header>

      {/* Pull to refresh visual drawer for standard/desktop */}
      {pullY > 0 && layoutMode === 'desktop' && (
        <div 
          style={{ height: `${pullY}px` }}
          className="overflow-hidden flex items-center justify-center transition-all bg-indigo-50 text-indigo-700 font-sans border-b border-indigo-150 relative text-xs w-full shadow-inner"
        >
          <div className="flex items-center gap-2">
            {refreshState === 'pull' && (
              <>
                <span className="animate-bounce text-sm">↓</span>
                <span>Pull down to synchronize database ({Math.round(pullY)}px)...</span>
              </>
            )}
            {refreshState === 'release' && (
              <>
                <span className="animate-pulse">✨</span>
                <span className="font-bold text-indigo-805">Release now to sync ledger!</span>
              </>
            )}
            {refreshState === 'refreshing' && (
              <>
                <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                <span className="font-bold">Contacting Europe-west2 Cloud Run region cluster databases...</span>
              </>
            )}
            {refreshState === 'completed' && (
              <>
                <span className="text-emerald-650 font-bold">✓</span>
                <span className="font-bold text-emerald-700">Sync complete! Ledger profiles cached safely.</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Core Dual mode Wrapper */}
      <main className="flex-1 flex flex-col">
        {layoutMode === 'desktop' ? (
          /* ==================== DESKTOP WORKSPACE LAYOUT ==================== */
          portalRole === 'client' ? (
            <div className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
              {loggedInLoanId && loans.some(l => l.id === loggedInLoanId) ? (
                <ClientOverview
                  loan={loans.find(l => l.id === loggedInLoanId)!}
                  currentSimDate={currentSimDate}
                  onRecordPayment={handleRecordRepayment}
                  onUpdateReminderRules={handleUpdateReminderRules}
                  onLogout={handleLogout}
                  onUpdateLoan={handleSaveLoan}
                />
              ) : (
                <ClientLogin
                  loans={loans}
                  onLoginSuccess={handleLoginSuccess}
                  onBackToStaff={() => handlePortalRoleChange('staff')}
                />
              )}
            </div>
          ) : !staffAuthenticated ? (
            <div className="max-w-md mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-center">
              <StaffLogin
                onLoginSuccess={handleStaffLoginSuccess}
                onSwitchToClient={() => handlePortalRoleChange('client')}
                staffAccounts={staffAccounts}
              />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
            
            {/* Sidebar Columns */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Navigation Panels</span>
                <nav className="space-y-1 mt-2">
                  {[
                    { id: 'dashboard', label: 'Dashboard & Metrics', icon: Layers },
                    { id: 'loans', label: 'Client Portfolios', icon: Briefcase },
                    { id: 'calculator', label: 'Sandbox Calculator', icon: Sliders },
                    { id: 'reminders', label: 'Reminder Campaign Center', icon: MessageSquare },
                    { id: 'staff_mgmt', label: 'Staff Accounts & Vault', icon: Lock }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        id={`sidebar-tab-${tab.id}`}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          if (tab.id !== 'loans') setSelectedLoanId(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer group ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                          {tab.label}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Quick statistics Summary box */}
              <div className="bg-slate-800 text-slate-200 rounded-xl p-5 shadow-sm border border-slate-700 space-y-4">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">System Chronology Details</span>
                <div className="font-mono space-y-2">
                  <div className="flex justify-between text-xs pb-2 border-b border-slate-700/50">
                    <span className="text-slate-400">Ledgers Tracked:</span>
                    <span className="font-bold text-white">{loans.length} Accounts</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-slate-400">Simulated Date:</span>
                    <span className="font-bold text-indigo-300">{currentSimDate}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-700/40 border border-slate-600/50 rounded-lg text-[10px] text-slate-300 leading-normal flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span>
                    Advance simulated portfolio date under "Dashboard" to test automatic notifications.
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Columns */}
            <div className="lg:col-span-9 space-y-6">
              
              {/* Conditional Display Form */}
              {showLoanForm ? (
                <div className="animate-fade-in">
                  <LoanForm
                    loanToEdit={loanToEdit}
                    onSave={handleSaveLoan}
                    onCancel={() => {
                      setShowLoanForm(false);
                      setLoanToEdit(null);
                      setPrefillCalculatorData(null);
                    }}
                    prefillCalculatorData={prefillCalculatorData}
                  />
                </div>
              ) : (
                /* Main tab states views */
                <table className="w-full text-left table-fixed border-none">
                  <tbody>
                    <tr>
                      <td className="p-0 border-none">
                        {activeTab === 'dashboard' && (
                          <div className="animate-fade-in">
                            <DashboardStats
                              loans={loans}
                              currentSimDate={currentSimDate}
                              onSelectLoan={handleSelectLoanId}
                              onTimeLeap={handleTimeLeap}
                            />
                          </div>
                        )}

                        {activeTab === 'calculator' && (
                          <div className="animate-fade-in">
                            <InterestCalculator onAddFromCalculator={handleAddFromCalculator} />
                          </div>
                        )}

                        {activeTab === 'reminders' && (
                          <div className="animate-fade-in">
                            <RemindersSim
                              loans={loans}
                              reminderLogs={reminderLogs}
                              onManualTrigger={(loanId, rule) => {
                                const targetLoan = loans.find(l => l.id === loanId);
                                if (targetLoan) handleInstantReminder(targetLoan, rule);
                              }}
                              currentSimDate={currentSimDate}
                            />
                          </div>
                        )}

                        {activeTab === 'staff_mgmt' && (
                          <div className="animate-fade-in">
                            <StaffManagement
                              staffAccounts={staffAccounts}
                              onCreateStaff={handleCreateStaff}
                              onUpdateStaffPassword={handleUpdateStaffPassword}
                              onDeleteStaff={handleDeleteStaff}
                              onSimulateEmailDispatch={handleSimulateEmailDispatch}
                            />
                          </div>
                        )}

                        {activeTab === 'loans' && (
                          <div className="space-y-6 animate-fade-in">
                            {/* If an active loan ID is selected, display focus card details */}
                            {activeSelectedLoan ? (
                              <div className="space-y-4">
                                <button
                                  id="back-list-btn"
                                  onClick={() => setSelectedLoanId(null)}
                                  className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
                                >
                                  ← Back to Client Directory
                                </button>
                                
                                <ActiveLoanCard
                                  loan={activeSelectedLoan}
                                  currentSimDate={currentSimDate}
                                  onEdit={(loan) => {
                                    setLoanToEdit(loan);
                                    setShowLoanForm(true);
                                  }}
                                  onDelete={handleDeleteLoan}
                                  onRecordPayment={handleRecordRepayment}
                                  onUpdateReminderRules={handleUpdateReminderRules}
                                  onInstantReminder={handleInstantReminder}
                                />
                              </div>
                            ) : (
                              /* Otherwise display entire list directory */
                              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3.5">
                                  <div>
                                    <h2 className="text-base font-sans font-bold text-slate-900">Client Repayment Directory</h2>
                                    <p className="text-xs text-slate-500">Search profiles, filter overdue contracts or create new accounts</p>
                                  </div>
                                  <button
                                    id="originate-loan-btn"
                                    onClick={() => {
                                      setLoanToEdit(null);
                                      setShowLoanForm(true);
                                    }}
                                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <PlusCircle className="w-4 h-4 text-indigo-200" /> Originate New Agreement
                                  </button>
                                </div>

                                {/* Filters Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <input
                                    id="search-loans-input"
                                    type="text"
                                    placeholder="Search client index (e.g. Jenkins, Elena)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs font-semibold"
                                  />
                                  <select
                                    id="filter-loans-category"
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                                  >
                                    <option value="all">Categories (All)</option>
                                    <option value="personal">Personal Loan</option>
                                    <option value="business">Business Capital</option>
                                    <option value="auto">Auto Vehicle</option>
                                    <option value="mortgage">Mortgage</option>
                                    <option value="microfinance">Micro-finance</option>
                                  </select>
                                  <select
                                    id="filter-loans-status"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                                  >
                                    <option value="all">Repay Status (All)</option>
                                    <option value="active">Active Standing</option>
                                    <option value="overdue">Overdue Outstanding</option>
                                    <option value="paid">Accounts Paid</option>
                                    <option value="defaulted">Written-off Defaults</option>
                                  </select>
                                </div>

                                {/* Directory Output Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                  {filteredLoans.map(loan => {
                                    // Compute statistics
                                    const totalRepayAmount = loan.schedule.reduce((sum, r) => sum + r.paymentAmount, 0);
                                    const totalAmountPaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
                                    const remainingPrincipal = Math.max(0, totalRepayAmount - totalAmountPaid);

                                    return (
                                      <div
                                        key={loan.id}
                                        id={`dir-card-${loan.id}`}
                                        onClick={() => setSelectedLoanId(loan.id)}
                                        className="bg-white border border-slate-200 hover:border-indigo-600/30 rounded-xl p-4 text-left transition hover:bg-slate-50/50 cursor-pointer flex flex-col justify-between h-40 shadow-sm relative group select-none"
                                      >
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase text-slate-400">{loan.category} Model</span>
                                            
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${loan.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : loan.status === 'overdue' ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                                              {loan.status === 'paid' ? 'Settled' : loan.status}
                                            </span>
                                          </div>

                                          <h4 className="text-sm font-bold text-slate-800 mt-2.5 truncate group-hover:text-indigo-600">
                                            {loan.borrowerName}
                                          </h4>
                                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{loan.loanName}</p>
                                        </div>

                                        <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-3 font-mono">
                                          <div>
                                            <span className="text-[9px] text-slate-400 block font-sans">Remaining Principal</span>
                                            <span className="text-xs font-bold text-slate-900">${remainingPrincipal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                                          </div>

                                          <div className="text-right">
                                            <span className="text-[9px] text-slate-400 block font-sans">Yearly Rate</span>
                                            <span className="text-xs font-bold text-slate-700">{loan.interestRate}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {filteredLoans.length === 0 && (
                                    <div className="p-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl md:col-span-2">
                                      <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                      <p className="text-xs font-bold">No matching loan agreements found in database.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
            
          </div>
          )
        ) : (
          /* ==================== ANDROID DEVICE SIMULATOR VIEWPORT ==================== */
          <div className="max-w-[420px] mx-auto w-full px-4 py-8 flex flex-col items-center justify-center flex-1">
            
            {/* Highly customized Android Hardware Framing Accent */}
            <div className="bg-slate-950 rounded-[48px] p-4.5 shadow-2xl border-[10px] border-slate-900 w-full relative overflow-hidden aspect-[9/19] flex flex-col justify-between max-w-[365px]">
              {/* Camera Notch Panel */}
              <div className="absolute top-3 left-1/2 -track-x-1/2 -translate-x-1/2 w-28 h-5.5 bg-slate-950 rounded-full z-40 flex items-center justify-center border border-slate-900/40 select-none">
                <span className="w-3.5 h-1 bg-slate-800 rounded-full mr-1.5 shadow-inner"></span>
                <span className="w-2 h-2 bg-slate-900 rounded-full border border-slate-800"></span>
              </div>

              {/* Top System Bar Widgets */}
              <div className="flex justify-between items-center text-[10px] text-white font-mono font-bold px-3 pt-4.5 z-30 select-none">
                <span>9:41 AM <span className="text-[8px] text-emerald-400">●</span></span>
                <div className="flex items-center gap-1">
                  <span>📶</span>
                  <span>🔋 99%</span>
                </div>
              </div>

              {/* Dynamic device alerts simulator popup sliding down */}
              {systemToast && (
                <div className="absolute top-12 left-3 right-3 bg-slate-900/95 border border-slate-800 text-white p-2.5 rounded-2xl shadow-xl z-50 flex items-start gap-2.5 text-left select-none animate-slide-down">
                  <div className="p-1 bg-emerald-600/30 text-emerald-400 rounded-lg text-[9px] font-bold">LFlow</div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-[9px] font-bold">{systemToast.title}</h5>
                    <p className="text-[8.5px] text-slate-300 leading-tight mt-0.5 line-clamp-2">{systemToast.desc}</p>
                  </div>
                </div>
              )}

              {/* Simulated Phone Screen Inner Contents */}
              <div className="flex-1 bg-white mt-3.5 rounded-[24px] overflow-hidden flex flex-col justify-between border border-slate-900/20 relative">
                
                {/* Header widget */}
                <div className="bg-slate-950 text-white p-3 pt-3 flex items-center justify-between border-b border-slate-900 select-none">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-display font-black tracking-wide leading-none uppercase">
                      {portalRole === 'client' ? 'Client Access' : 'Cornerstone Savings'}
                    </span>
                  </div>

                  <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                    {portalRole === 'client' ? 'SECURE' : 'TERMINAL'}
                  </span>
                </div>

                {/* Pull to refresh visual drawer inside phone simulator */}
                {pullY > 0 && layoutMode === 'android' && (
                  <div 
                    style={{ height: `${pullY}px` }}
                    className="overflow-hidden flex items-center justify-center transition-all bg-indigo-50 text-indigo-700 font-sans border-b border-indigo-150 relative text-[10px] w-full shadow-inner select-none"
                  >
                    <div className="flex flex-col items-center justify-center px-4 py-1 text-center leading-tight">
                      {refreshState === 'pull' && (
                        <span className="animate-bounce">↓ Pull to sync ({Math.round(pullY)}px)</span>
                      )}
                      {refreshState === 'release' && (
                        <span className="font-bold text-indigo-805">✨ Release to sync</span>
                      )}
                      {refreshState === 'refreshing' && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                          Syncing ledger...
                        </span>
                      )}
                      {refreshState === 'completed' && (
                        <span className="text-emerald-700 font-bold">✓ Complete</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Simulated Content scrolling center pane */}
                <div 
                  className="flex-1 overflow-y-auto bg-slate-50/50 p-3 scrollbar-none"
                  onTouchStart={(e) => handleTouchStart(e, true)}
                  onTouchMove={(e) => handleTouchMove(e, true)}
                  onTouchEnd={handleTouchEnd}
                >
                  {portalRole === 'client' ? (
                    loggedInLoanId && loans.some(l => l.id === loggedInLoanId) ? (
                      <ClientOverview
                        loan={loans.find(l => l.id === loggedInLoanId)!}
                        currentSimDate={currentSimDate}
                        onRecordPayment={handleRecordRepayment}
                        onUpdateReminderRules={handleUpdateReminderRules}
                        onLogout={handleLogout}
                        onUpdateLoan={handleSaveLoan}
                      />
                    ) : (
                      <ClientLogin
                        loans={loans}
                        onLoginSuccess={handleLoginSuccess}
                        onBackToStaff={() => handlePortalRoleChange('staff')}
                      />
                    )
                  ) : !staffAuthenticated ? (
                    <StaffLogin
                      onLoginSuccess={handleStaffLoginSuccess}
                      onSwitchToClient={() => handlePortalRoleChange('client')}
                      staffAccounts={staffAccounts}
                    />
                  ) : showLoanForm ? (
                    <div className="animate-fade-in text-left">
                      <LoanForm
                        loanToEdit={loanToEdit}
                        onSave={handleSaveLoan}
                        onCancel={() => {
                          setShowLoanForm(false);
                          setLoanToEdit(null);
                          setPrefillCalculatorData(null);
                        }}
                        prefillCalculatorData={prefillCalculatorData}
                      />
                    </div>
                  ) : (
                    <div className="text-left">
                      {activeTab === 'dashboard' && (
                        <div className="space-y-4">
                          {/* Simulated mini dashboard KPIs */}
                          <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-xl p-3.5 shadow">
                            <span className="text-[9px] text-teal-300 font-mono font-semibold block">Simulated Active Date:</span>
                            <span className="text-xs font-extrabold font-mono block mt-0.5">{currentSimDate}</span>
                            
                            <div className="flex items-center gap-1.5 mt-2">
                              <button onClick={() => handleTimeLeap(1)} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-[9px] font-bold font-mono cursor-pointer">+1d</button>
                              <button onClick={() => handleTimeLeap(15)} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-[9px] font-bold font-mono cursor-pointer">+15d</button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[8px] text-slate-400 font-bold block">Portfolio Principal</span>
                              <span className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
                                ${loans.reduce((s, l) => s + l.principal, 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[8px] text-slate-400 font-bold block">Active standing</span>
                              <span className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
                                {loans.filter(l => l.status !== 'paid').length} Files
                              </span>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Client list directory</h4>
                            <div className="divide-y divide-slate-100">
                              {loans.map(loan => (
                                <div key={loan.id} onClick={() => handleSelectLoanId(loan.id)} className="py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer select-none">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-800 truncate">{loan.borrowerName}</p>
                                    <p className="text-[8px] text-slate-400 truncate">{loan.loanName}</p>
                                  </div>
                                  <span className={`px-1 rounded text-[7px] font-bold ${loan.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {loan.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'loans' && (
                        <div className="space-y-4">
                          {activeSelectedLoan ? (
                            <div className="space-y-3">
                              <button onClick={() => setSelectedLoanId(null)} className="text-[9px] text-indigo-600 font-bold underline cursor-pointer">← Back list</button>
                              <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2">
                                <h4 className="text-xs font-bold text-slate-900 leading-tight">{activeSelectedLoan.borrowerName}</h4>
                                <p className="text-[9px] text-slate-400 font-mono">ID: {activeSelectedLoan.id}</p>
                                <div className="p-2 bg-slate-50 rounded border text-[9px] font-mono leading-normal">
                                  Principal: ${activeSelectedLoan.principal} / Overdue: {activeSelectedLoan.status}
                                </div>

                                <div className="space-y-1 pt-2">
                                  <p className="text-[8px] font-bold text-slate-500 uppercase">Upcoming Scheduled Instalments</p>
                                  <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 border rounded bg-white">
                                    {activeSelectedLoan.schedule.slice(0, 5).map(row => (
                                      <div key={row.paymentNumber} className="p-1.5 flex justify-between text-[9px] font-mono">
                                        <span>#{row.paymentNumber}</span>
                                        <span>{row.dueDate}</span>
                                        <span className="font-bold text-slate-900">${row.paymentAmount.toFixed(0)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl p-3 border border-slate-100 text-center space-y-3">
                              <p className="text-[11px] text-slate-500">Selected an active loan in your Dashboard listing to load specialized payment logs / templates here on Mobile viewer.</p>
                              <button
                                onClick={() => {
                                  setLoanToEdit(null);
                                  setShowLoanForm(true);
                                }}
                                className="w-full py-1.5 rounded-lg bg-slate-900 font-bold text-white text-[10px] cursor-pointer"
                              >
                                Originate Loan Agreement
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'calculator' && (
                        <div className="space-y-4">
                          <InterestCalculator onAddFromCalculator={handleAddFromCalculator} />
                        </div>
                      )}

                      {activeTab === 'reminders' && (
                        <div className="space-y-4">
                          <RemindersSim
                            loans={loans}
                            reminderLogs={reminderLogs}
                            onManualTrigger={(loanId, rule) => {
                              const targetLoan = loans.find(l => l.id === loanId);
                              if (targetLoan) handleInstantReminder(targetLoan, rule);
                            }}
                            currentSimDate={currentSimDate}
                          />
                        </div>
                      )}

                      {activeTab === 'staff_mgmt' && (
                        <div className="space-y-4">
                          <StaffManagement
                            staffAccounts={staffAccounts}
                            onCreateStaff={handleCreateStaff}
                            onUpdateStaffPassword={handleUpdateStaffPassword}
                            onDeleteStaff={handleDeleteStaff}
                            onSimulateEmailDispatch={handleSimulateEmailDispatch}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Bottom Android Navigation Tab Bar bar */}
                {portalRole !== 'client' && (
                  <div className="bg-slate-950 text-white border-t border-slate-900 p-2 grid grid-cols-5 select-none z-30">
                    {[
                      { id: 'dashboard', label: 'Dashboard', char: '📊' },
                      { id: 'loans', label: 'Directory', char: '📁' },
                      { id: 'calculator', label: 'Calc', char: '🧮' },
                      { id: 'reminders', label: 'Reminders', char: '💬' },
                      { id: 'staff_mgmt', label: 'Staff', char: '🔐' }
                    ].map(mobTab => {
                      const isActive = activeTab === mobTab.id;
                      return (
                        <button
                          key={mobTab.id}
                          id={`mobtab-${mobTab.id}`}
                          onClick={() => {
                            setActiveTab(mobTab.id as any);
                            if (mobTab.id !== 'loans') setSelectedLoanId(null);
                            setShowLoanForm(false);
                          }}
                          className={`flex flex-col items-center justify-center transition cursor-pointer scale-95 ${isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
                        >
                          <span className="text-xs">{mobTab.char}</span>
                          <span className="text-[8px] mt-0.5 leading-none">{mobTab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

              </div>

              {/* Hardware Home Indicator Pill */}
              <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-2 z-30 select-none"></div>
            </div>

          </div>
        )}
      </main>

      {/* Small design footer accent with standard Human, descriptive info */}
      <footer className="bg-white border-t border-slate-150 py-3 px-6 text-center select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono font-medium text-slate-400">
          <span>📅 SIMULATION SYSTEM TIMELINE ACTIVE</span>
          <span>Crafted for Loan Portfolios & Interest Amortization Ledger System</span>
          <span>CURRENT TIME UTC: 2026-05-24</span>
        </div>
      </footer>

    </div>
  );
}

// Global tracking styles in App.tsx file for extra transitions support
const formStateTemplate = {
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
  status: 'active' as Loan['status']
};

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
