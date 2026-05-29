import React, { useState } from 'react';
import { Loan, ReminderLog, ReminderRule } from '../types';
import { Bell, Heart, Mail, MessageSquare, Send, CheckCircle, Smartphone, AlertCircle, Settings, Trash2, Edit2, Play, Save, ChevronRight, FileText } from 'lucide-react';

interface RemindersSimProps {
  loans: Loan[];
  reminderLogs: ReminderLog[];
  onManualTrigger: (loanId: string, rule: ReminderRule) => void;
  onUpdateGlobalTemplates?: (newTemplates: any) => void;
  currentSimDate: string;
}

export default function RemindersSim({ loans, reminderLogs, onManualTrigger, currentSimDate }: RemindersSimProps) {
  const [selectedLog, setSelectedLog] = useState<ReminderLog | null>(reminderLogs[0] || null);
  const [testSelectedLoanId, setTestSelectedLoanId] = useState<string>(loans[0]?.id || '');
  const [reminderConfig, setReminderConfig] = useState({
    daysBefore: 3,
    channel: 'sms' as 'sms' | 'email' | 'push',
    messageTemplate: 'Hi {{BORROWER}}, a dynamic instalment of GH₵{{AMOUNT}} for your {{LOAN_NAME}} is due in {{DAYS}} days. Please visit cornerstone.com.gh/repay to settle.'
  });

  const [campaignSuccess, setCampaignSuccess] = useState<string | null>(null);

  const selectedLoan = loans.find(l => l.id === testSelectedLoanId) || loans[0];

  const handleTestDispatch = () => {
    if (!selectedLoan) return;
    
    // Find next unpaid instalment
    const nextUnpaid = selectedLoan.schedule.find(row => !row.isPaid);
    const amount = nextUnpaid ? nextUnpaid.paymentAmount : selectedLoan.principal / selectedLoan.termMonths;
    const dueDate = nextUnpaid ? nextUnpaid.dueDate : selectedLoan.startDate;

    const mockRule: ReminderRule = {
      id: `manual-rule-${Date.now()}`,
      daysBeforeDue: reminderConfig.daysBefore,
      channel: reminderConfig.channel,
      isEnabled: true,
      customTemplate: reminderConfig.messageTemplate
    };

    onManualTrigger(selectedLoan.id, mockRule);
    
    setCampaignSuccess(`Manual test reminder initiated for ${selectedLoan.borrowerName}!`);
    setTimeout(() => {
      setCampaignSuccess(null);
    }, 4000);
  };

  const getInterpolatedMessage = (template: string, loan: Loan, days: number, amt: number, due: string) => {
    return template
      .replace(/\{\{BORROWER\}\}/g, loan.borrowerName)
      .replace(/\{\{AMOUNT\}\}/g, amt.toLocaleString('en-US', { minimumFractionDigits: 2 }))
      .replace(/\{\{LOAN_NAME\}\}/g, loan.loanName)
      .replace(/\{\{DAYS\}\}/g, Math.abs(days).toString())
      .replace(/\{\{DUE_DATE\}\}/g, due);
  };

  const currentSelectionPreview = selectedLoan ? getInterpolatedMessage(
    reminderConfig.messageTemplate,
    selectedLoan,
    reminderConfig.daysBefore,
    selectedLoan.schedule.find(r => !r.isPaid)?.paymentAmount || 1200.50,
    selectedLoan.schedule.find(r => !r.isPaid)?.dueDate || '2026-06-15'
  ) : 'Select an active loan account to compile mockup preview...';

  return (
    <div className="space-y-6">
      
      {/* Visual Header */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-sans font-bold text-slate-900">Communication & Automated Reminder Engine</h2>
          <p className="text-xs text-slate-500">Configure text, email, and push templates. Monitor dynamic dispatch logs triggered by chronological progress.</p>
        </div>
        <div className="bg-indigo-50 text-indigo-600 rounded-lg p-2 border border-indigo-100 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Columns - Rules, Template Builder */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Rule Creator & Test Dispatch */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150 pb-2.5 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Dynamic Template Builder & Manual Override
            </h3>

            {campaignSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-1.5 animate-slide-up">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {campaignSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Borrower Reference</label>
                <select
                  id="reminder-test-loan"
                  value={testSelectedLoanId}
                  onChange={(e) => setTestSelectedLoanId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  {loans.filter(l => l.status !== 'paid').map(l => (
                    <option key={l.id} value={l.id}>{l.borrowerName} ({l.loanName})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Select Dispatch Channel</label>
                <div className="flex gap-1.5">
                  {(['sms', 'email', 'push'] as const).map(ch => (
                    <button
                      key={ch}
                      id={`reminder-channel-${ch}`}
                      onClick={() => setReminderConfig(prev => ({ ...prev, channel: ch }))}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border text-center transition capitalize cursor-pointer select-none ${reminderConfig.channel === ch ? 'bg-indigo-650 border-indigo-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/65'}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Relative Scheduling (Days Before Due)</label>
                <input
                  id="reminder-test-days"
                  type="number"
                  value={reminderConfig.daysBefore}
                  onChange={(e) => setReminderConfig(prev => ({ ...prev, daysBefore: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 font-mono"
                  placeholder="e.g. 3, 0 or negative for overdue days"
                />
              </div>

              <div className="flex items-end mb-0.5">
                <p className="text-[10px] text-slate-400">
                  Tip: Use absolute numbers like <span className="font-mono font-bold">3</span> for reminders 3 days before, <span className="font-mono font-bold">0</span> for due date, or <span className="font-mono font-bold">-2</span> for past due warnings.
                </p>
              </div>
            </div>

            {/* Template input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-600">Template Customizer Matrix</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReminderConfig(prev => ({
                      ...prev,
                      messageTemplate: 'Hi {{BORROWER}}, your repayment installment of GH₵{{AMOUNT}} for {{LOAN_NAME}} is scheduled for {{DUE_DATE}}. Support: cornerstone.com.gh'
                    }))}
                    className="text-[10px] text-indigo-600 font-semibold bg-indigo-50/20 hover:bg-indigo-50 px-2 py-0.5 rounded cursor-pointer border border-indigo-100 transition"
                  >
                    Set Standard Template
                  </button>
                  <button
                    onClick={() => setReminderConfig(prev => ({
                      ...prev,
                      messageTemplate: 'URGENT: Outstanding balance of GH₵{{AMOUNT}} on {{LOAN_NAME}} is now PAST DUE since {{DUE_DATE}}. Settle online at cornerstone.com.gh/repay.'
                    }))}
                    className="text-[10px] text-slate-600 font-semibold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer border border-slate-250 transition"
                  >
                    Set Overdue Warning
                  </button>
                </div>
              </div>
              <textarea
                id="reminder-input-template"
                value={reminderConfig.messageTemplate}
                onChange={(e) => setReminderConfig(prev => ({ ...prev, messageTemplate: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-3 text-xs font-medium text-slate-705 h-24 font-mono leading-relaxed"
                placeholder="Write your template..."
              />
              <div className="flex flex-wrap gap-1 mt-1 text-[10px] font-mono select-none">
                {['{{BORROWER}}', '{{AMOUNT}}', '{{LOAN_NAME}}', '{{DAYS}}', '{{DUE_DATE}}'].map(tag => (
                  <span key={tag} className="bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-widest block">Live Evaluated Preview</span>
              <p className="text-xs font-medium text-slate-800 leading-relaxed font-sans italic">
                "{currentSelectionPreview}"
              </p>
            </div>

            <button
              id="reminder-test-send-btn"
              onClick={handleTestDispatch}
              className="w-full py-2 px-4 rounded-lg text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer select-none"
            >
              <Send className="w-4 h-4" />
              Dispatch Simulated Test Reminder Now
            </button>
          </div>

          {/* Core System Configuration Rules */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-150 pb-2 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-600" />
              Autonomous Portfolio Trigger Settings
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-normal">
              Cornerstone Savings & Loans monitors payment schedules on every simulated date. These trigger actions execute automatically when scheduling guidelines match client balances:
            </p>
            
            <div className="space-y-3">
              {[
                { label: '3-Day SMS Friendly Reminder', channel: 'sms', sched: '3 Days Before Due', desc: 'Pre-reminds non-overdue status accounts of oncoming debits to prevent delinquency.' },
                { label: 'Due Date Direct Push Prompt', channel: 'push', sched: 'On Due Date', desc: 'A device notification dispatched to borrower phone direct check link.' },
                { label: '2-Day Email Incarceration Settle', channel: 'email', sched: '2 Days After Due (Overdue)', desc: 'Fires warnings dynamically, attaching full unpaid principal and interest invoices.' }
              ].map((sys, idx) => (
                <div key={idx} className="flex items-start justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex gap-2.5 items-start">
                    <span className="p-1.5 rounded-lg bg-white border border-slate-150 text-indigo-600 mt-0.5">
                      {sys.channel === 'sms' ? <MessageSquare className="w-3.5 h-3.5" /> : sys.channel === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{sys.label}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Cron Period: {sys.sched}</p>
                      <p className="text-[10px] text-slate-505 leading-normal mt-1">{sys.desc}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 font-mono">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Columns: Dispatch logs & Interactive smartphone preview */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Dispatch Logs */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-150 pb-2.5 flex items-center justify-between">
              <span>Dynamic Sent Logs ({reminderLogs.length})</span>
              <span className="text-[10px] font-mono font-medium text-slate-400">Sorted by newest</span>
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {reminderLogs.map(log => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    id={`log-item-${log.id}`}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition flex items-center justify-between gap-2 select-none ${isSelected ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:bg-slate-50 bg-white'}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded bg-slate-100 text-slate-500 border border-slate-150">
                          {log.channel === 'sms' ? <MessageSquare className="w-3 h-3" /> : log.channel === 'email' ? <Mail className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 truncate">{log.borrowerName}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-1">{log.loanName}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[9px] font-mono text-slate-400 block">
                        {new Date(log.dateSent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="inline-flex items-center px-1 rounded text-[8px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-150 uppercase mt-0.5">
                        {log.status}
                      </span>
                    </div>
                  </div>
                );
              })}

              {reminderLogs.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <Play className="w-6 h-6 text-slate-300 mx-auto mb-1.5 animate-pulse" />
                  <p className="text-xs">No notifications sent yet. Fast forward the timeline or trigger a manual simulation test above!</p>
                </div>
              )}
            </div>
          </div>

          {/* Simulated Smartphone Screen (Visualizes Selected Message) */}
          <div className="bg-slate-900 rounded-[35px] p-4.5 shadow-xl border-[6px] border-slate-800 max-w-[325px] mx-auto relative overflow-hidden aspect-[9/18.5] flex flex-col justify-between">
            {/* Phone Notch/Speaker */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-slate-900 rounded-full z-30 flex items-center justify-center">
              <span className="w-3 h-1 bg-slate-800 rounded-full mr-2"></span>
              <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
            </div>

            {/* Static top status bar */}
            <div className="flex justify-between items-center text-[10px] text-white font-mono font-bold px-2.5 pt-4 z-20 select-none">
              <span>9:41 AM</span>
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span>🔋 100%</span>
              </div>
            </div>

            {/* Simulated Phone UI Body */}
            <div className="flex-1 bg-slate-950 mt-3 rounded-2xl overflow-hidden p-3 flex flex-col justify-between border border-slate-800/80 relative">
              
              {/* If SMS Selected */}
              {selectedLog?.channel === 'sms' || (!selectedLog && reminderConfig.channel === 'sms') ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* SMS Conversation Header */}
                  <div className="border-b border-slate-800 pb-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs select-none">
                      CS
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Cornerstone System</h4>
                      <p className="text-[8px] text-slate-500 font-mono flex items-center">Mobile dispatch automated</p>
                    </div>
                  </div>

                  {/* Bubble Container */}
                  <div className="flex-1 overflow-y-auto space-y-3 pt-2 text-left">
                    <p className="text-[8px] font-mono text-center text-slate-500 select-none">Today, 9:41 AM</p>
                    <div className="max-w-[85%] bg-slate-800 border border-slate-700/60 rounded-xl rounded-tl-none p-2.5 text-white shadow-sm flex flex-col">
                      <p className="text-[10px] leading-relaxed font-sans select-all">
                        {selectedLog ? selectedLog.message : currentSelectionPreview}
                      </p>
                      <span className="text-[8px] font-mono text-slate-400 self-end mt-1 select-none">Read 9:41 AM ✓✓</span>
                    </div>
                  </div>

                  {/* SMS Send Field mockup */}
                  <div className="bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500 font-sans mt-auto">
                    <span>Text Message...</span>
                    <button className="text-indigo-400 font-bold text-[10px] cursor-pointer">Send</button>
                  </div>
                </div>
              ) : selectedLog?.channel === 'email' || (!selectedLog && reminderConfig.channel === 'email') ? (
                /* Email View */
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <h5 className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-sans">
                      <Mail className="w-3 h-3 text-indigo-400" /> Mail Sandbox
                    </h5>
                    <span className="text-[8px] text-slate-500 font-mono">Inbox (1)</span>
                  </div>

                  <div className="flex-1 bg-slate-900 text-slate-200 border border-slate-805 rounded-lg p-2.5 space-y-2 mt-1 text-left overflow-y-auto">
                    <p className="text-[9px] font-semibold text-slate-400">From: <span className="text-slate-100 font-mono">alerts@cornerstonesavings.com</span></p>
                    <p className="text-[9px] font-semibold text-slate-400">To: <span className="text-slate-100 font-mono">{selectedLog ? selectedLog.borrowerName : selectedLoan?.borrowerName || 'Client'}</span></p>
                    <p className="text-[9px] font-bold text-white border-b border-slate-800 pb-1.5 mt-1 font-sans">Subject: Upcoming Sched Instalment Repay Reminder</p>
                    
                    <p className="text-[9px] leading-relaxed font-sans pt-1 text-slate-300">
                      {selectedLog ? selectedLog.message : currentSelectionPreview}
                    </p>
                    
                    <div className="border-t border-slate-800 pt-2 mt-4 text-center select-none">
                      <button className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[8px] py-1 px-3 rounded-full cursor-pointer">
                        Secure Repay Link
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Push Notification view */
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="border-b border-slate-800 pb-2">
                    <h5 className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-sans">
                      <Bell className="w-3.5 h-3.5 text-indigo-400" /> Android Push Mockup
                    </h5>
                  </div>

                  <div className="flex-1 flex flex-col justify-center items-center">
                    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-lg flex items-start gap-2.5 text-left animate-slide-up">
                      <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-bold text-white">Cornerstone App</span>
                          <span className="text-[8px] text-slate-550 font-mono">NOW</span>
                        </div>
                        <p className="text-[9px] font-bold text-indigo-300 mt-0.5 truncate uppercase tracking-tight">Schedule Due Warning</p>
                        <p className="text-[8.5px] leading-relaxed text-slate-300 mt-1 line-clamp-3">
                          {selectedLog ? selectedLog.message : currentSelectionPreview}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pb-2 select-none">
                    <p className="text-[8px] text-slate-600">Swipe notification cards to dismiss</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pill shaped navigation bar widget */}
            <div className="w-28 h-1 bg-slate-705 rounded-full mx-auto mt-2.5 z-20 select-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
