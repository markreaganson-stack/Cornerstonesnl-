import React, { useState } from 'react';
import { Loan, LoanDocument } from '../types';
import { 
  User, 
  Mail, 
  Phone, 
  Compass, 
  Clock,
  Calendar, 
  Info, 
  Save, 
  Edit3, 
  X, 
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  BellRing,
  Upload,
  FileText,
  AlertCircle,
  Trash2,
  Loader2
} from 'lucide-react';

interface ClientProfileProps {
  loan: Loan;
  onUpdateLoan: (updatedLoan: Loan) => void;
  onViewRepaymentStatus: () => void;
}

export default function ClientProfile({
  loan,
  onUpdateLoan,
  onViewRepaymentStatus
}: ClientProfileProps) {
  // Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields with default states
  const [borrowerName, setBorrowerName] = useState(loan.borrowerName);
  const [borrowerEmail, setBorrowerEmail] = useState(loan.borrowerEmail || '');
  const [borrowerContact, setBorrowerContact] = useState(loan.borrowerContact);
  const [notificationPreference, setNotificationPreference] = useState<'all' | 'essential' | 'none'>('all');

  // Success message feedback
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Interactive documents list
  const initialDocuments: LoanDocument[] = [
    { id: 'doc-id', name: 'National Identification Card or passport', type: 'id_proof', status: 'approved', fileName: 'national_id_card_front.jpg', fileSize: '1.2 MB', uploadedAt: '2026-04-10' },
    { id: 'doc-income', name: 'Recent 3-Months Salary Payslip or Income Declaration', type: 'income_proof', status: 'missing' },
    { id: 'doc-address', name: 'Utility Statement or Tenancy Agreement', type: 'address_proof', status: 'approved', fileName: 'electricity_bill_statement.pdf', fileSize: '850 KB', uploadedAt: '2026-04-12' },
    { id: 'doc-agreement', name: 'Signed Promissory Note / Underwriter Agreement', type: 'promissory_note', status: 'pending_review', fileName: 'promissory_note_signed.pdf', fileSize: '420 KB', uploadedAt: '2026-05-18' }
  ];

  const [docs, setDocs] = useState<LoanDocument[]>(() => {
    if (loan.documents && loan.documents.length > 0) {
      return loan.documents;
    }
    return initialDocuments;
  });

  const [dragActiveDocId, setDragActiveDocId] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Recalculations for overview stats
  const totalRepayAmount = loan.schedule.reduce((sum, row) => sum + row.paymentAmount, 0);
  const totalAmountPaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalPrincipalPaid = loan.schedule.reduce(
    (sum, row) => sum + (row.isPaid ? row.principalPortion : (row.paidDetails?.principalPortion || 0)), 
    0
  );
  const totalInterestPaid = totalAmountPaid;
  const balanceRemaining = Math.max(0, totalRepayAmount - totalAmountPaid);
  const ratioPaid = totalRepayAmount > 0 ? (totalAmountPaid / totalRepayAmount) * 100 : 0;

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create the updated loan object
    const updatedLoan: Loan = {
      ...loan,
      borrowerName: borrowerName.trim(),
      borrowerEmail: borrowerEmail.trim(),
      borrowerContact: borrowerContact.trim()
    };

    onUpdateLoan(updatedLoan);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleReset = () => {
    setBorrowerName(loan.borrowerName);
    setBorrowerEmail(loan.borrowerEmail || '');
    setBorrowerContact(loan.borrowerContact);
    setIsEditing(false);
  };

  // Simulated drop/upload interaction logic
  const simulateFileUpload = (docId: string, fileName: string, sizeStr: string) => {
    setUploadingDocId(docId);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const updatedDocs = docs.map(doc => {
              if (doc.id === docId) {
                return {
                  ...doc,
                  status: 'pending_review' as const,
                  fileName: fileName,
                  fileSize: sizeStr,
                  uploadedAt: new Date().toISOString().split('T')[0]
                };
              }
              return doc;
            });
            setDocs(updatedDocs);
            onUpdateLoan({
              ...loan,
              documents: updatedDocs
            });
            setUploadingDocId(null);
            setUploadProgress(null);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3500);
          }, 300);
          return 100;
        }
        return prev + 20;
      });
    }, 120);
  };

  const handleDrag = (e: React.DragEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveDocId(docId);
    } else if (e.type === "dragleave") {
      setDragActiveDocId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveDocId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      simulateFileUpload(docId, file.name, sizeStr);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      simulateFileUpload(docId, file.name, sizeStr);
    }
  };

  const handleRemoveDoc = (docId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const updatedDocs = docs.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'missing' as const,
          fileName: undefined,
          fileSize: undefined,
          uploadedAt: undefined
        };
      }
      return doc;
    });
    setDocs(updatedDocs);
    onUpdateLoan({
      ...loan,
      documents: updatedDocs
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Upper header action with back-button style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-sans font-black text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            My Client Profile & Account Settings
          </h2>
          <p className="text-xs text-slate-400 font-medium">Verify your registered info, check stats, and check compliance status</p>
        </div>

        <button
          onClick={onViewRepaymentStatus}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-bold transition select-none cursor-pointer self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Repayment Ledger
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 text-xs font-semibold leading-relaxed flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Records Synchronized Successfully!</p>
            <p className="text-[10px] text-emerald-650 opacity-90 mt-0.5">Your updated profile and document checklist states have been locally written to the Cornerstone ledger.</p>
          </div>
        </div>
      )}

      {/* Grid container: Left is profile details & editor, Right is high-impact metrics highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Contact Info Editor Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-205 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-sans font-extrabold text-slate-800">
                  {isEditing ? 'Modify Contact Credentials' : 'Profile Identification details'}
                </h3>
                <p className="text-[11px] text-slate-400">Keep your loan credentials accurate to ensure correct alert notification routing</p>
              </div>

              {!isEditing && (
                <button
                  id="profile-edit-toggle"
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow cursor-pointer transition flex items-center gap-1 select-none"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveChanges} className="space-y-4 text-xs font-sans">
                
                <div className="space-y-1.5">
                  <label htmlFor="edit-name" className="block text-xs font-bold text-slate-700">Full Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="edit-name"
                      type="text"
                      required
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-bold font-sans text-xs transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-email" className="block text-xs font-bold text-slate-700">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="edit-email"
                      type="email"
                      required
                      value={borrowerEmail}
                      onChange={(e) => setBorrowerEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-bold font-sans text-xs transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="edit-contact" className="block text-xs font-bold text-slate-700">Mobile Contact Number (SMS Routing)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="edit-contact"
                      type="text"
                      required
                      value={borrowerContact}
                      onChange={(e) => setBorrowerContact(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-bold font-mono text-xs transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <BellRing className="w-3.5 h-3.5 text-indigo-500" />
                    Cornerstone Interactive Alert Stream
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'all', title: 'All Alerts', desc: 'SMS + Email standard trigger' },
                      { value: 'essential', title: 'Critical Only', desc: 'Overdue campaigns only' },
                      { value: 'none', title: 'Muted', desc: 'Unsubscribe warnings' }
                    ].map((pref) => (
                      <button
                        key={pref.value}
                        type="button"
                        onClick={() => setNotificationPreference(pref.value as any)}
                        className={`p-2 border rounded-xl font-medium transition cursor-pointer text-left flex flex-col justify-between ${notificationPreference === pref.value ? 'bg-indigo-50 border-indigo-300 text-indigo-805' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <span className="font-bold text-[11px] font-sans">{pref.title}</span>
                        <span className="text-[9px] text-slate-400 font-sans block leading-none mt-1">{pref.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel Action
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-1 select-none"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Properties
                  </button>
                </div>

              </form>
            ) : (
              <div className="space-y-4">
                
                {/* Visual Read Only Info Grid */}
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 shrink-0">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block font-sans tracking-wide">Legal Registered Name</span>
                      <span className="text-sm font-extrabold text-slate-800 font-sans block mt-0.5">{loan.borrowerName}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 shrink-0">
                      <Mail className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block font-sans tracking-wide">Registered Email Address</span>
                      <span className="text-sm font-semibold text-slate-800 font-sans block mt-0.5">{loan.borrowerEmail || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 shrink-0">
                      <Phone className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block font-sans tracking-wide">Mobile contact verification</span>
                      <span className="text-sm font-semibold text-slate-800 font-mono block mt-0.5">{loan.borrowerContact}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block font-sans">Notification Preference</span>
                      <span className="text-xs font-bold text-slate-750 block mt-0.5 capitalize">
                        {notificationPreference === 'all' ? 'Standard alert campaign broadcasts active' : notificationPreference === 'essential' ? 'Urgent schedule alerts only' : 'Campaigns muted'}
                      </span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 self-center shrink-0"></span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-900 leading-relaxed mt-2 animate-fade-in">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Secure Enrollment ID</strong>: Because your Cornerstone client key is unique to your financial ledger sequence, it is fixed permanently. Contact a branch team if details require physical document replacement.
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Bento Board: High-impact Loan summary highlights Column */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-slate-950 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg border border-slate-800 space-y-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
            
            {/* Header */}
            <div>
              <span className="text-[9px] uppercase font-mono tracking-widest text-indigo-400">Ledger Summary Highlights</span>
              <h3 className="text-lg font-sans font-black tracking-tight mt-1">{loan.loanName}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Agreement properties & settlement scorecard values</p>
            </div>

            {/* Bento highlights fields */}
            <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
              
              <div className="p-3.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition text-left">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block leading-none">Origination Assets</span>
                <span className="text-base font-mono font-extrabold text-slate-100 block mt-1">
                  GH₵ {loan.principal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </span>
                <span className="text-[9px] text-indigo-300 font-semibold block mt-1">GHC Contract</span>
              </div>

              <div className="p-3.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition text-left">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block leading-none">Annual Cost rate</span>
                <span className="text-base font-mono font-extrabold text-indigo-400 block mt-1">
                  {loan.interestRate}% <span className="text-[10px] text-slate-400 lowercase font-sans">p.a.</span>
                </span>
                <span className="text-[9px] text-slate-500 block mt-1 font-mono uppercase">{loan.interestType}</span>
              </div>

              <div className="p-3.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition text-left">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block leading-none">Contract lifecycle</span>
                <span className="text-base font-sans font-black text-slate-100 block mt-1">
                  {loan.termMonths} <span className="text-xs text-slate-400 font-semibold">Months</span>
                </span>
                <span className="text-[9px] text-indigo-300 font-semibold block mt-1 hover:underline cursor-pointer block truncate" onClick={onViewRepaymentStatus}>
                  {loan.paymentFrequency} calendar
                </span>
              </div>

              <div className="p-3.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition text-left">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block leading-none">Origination Date</span>
                <span className="text-sm font-mono font-extrabold text-slate-250 block mt-1 ml-0">{loan.startDate}</span>
                <span className="text-[9px] text-slate-500 block mt-1.5 uppercase font-mono tracking-wide leading-none">Agreement start</span>
              </div>

            </div>

            {/* Outstanding & progress details bar */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              
              <div className="flex justify-between items-center text-xs text-left">
                <div className="space-y-0.5">
                  <span className="text-slate-400 text-[9px] uppercase tracking-wide">Repayment outstanding</span>
                  <span className="text-base font-mono font-black block text-emerald-400">
                    GH₵ {balanceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="text-right space-y-0.5">
                  <span className="text-slate-400 text-[9px] uppercase tracking-wide">Amount Cleared</span>
                  <span className="text-sm font-mono font-extrabold block text-slate-100">
                    GH₵ {totalPrincipalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Cleared Ratio</span>
                  <span className="font-mono font-bold text-white">{ratioPaid.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ratioPaid)}%` }}
                  ></div>
                </div>
              </div>

            </div>

            {/* Quick Link status shortcut action trigger */}
            <button
              id="profile-shortcut-status-link"
              onClick={onViewRepaymentStatus}
              className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md select-none transition"
            >
              <Compass className="w-4 h-4 text-white" />
              Check Live Repayment Schedule & Pay Now
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>

          </div>

          {/* Secure lock metadata compliance details */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-left">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block font-sans">Cornerstone Security Protocol</span>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-1">
              All personal contact updates recorded on this portal conform strictly to legal consumer credit guidelines. Underwriter assets represent legally binding promissory notes signed by Cornerstone Savings & Loans clients.
            </p>
          </div>

        </div>

      </div>

      {/* Required Loan Documents & Secure Uploads Panel */}
      <div className="bg-white border border-slate-205 rounded-xl p-6 shadow-sm mt-4 text-left">
        <div className="border-b border-slate-100 pb-4 mb-5">
          <h3 className="text-sm font-sans font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Required Underwriting Documents Center
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Please upload original files of your identification or proof of salary. Formats allowed: PDF, PNG, JPG (Max size 10MB).
          </p>
        </div>

        {/* Documents Grid / Stack */}
        <div className="space-y-3.5">
          {docs.map((doc) => {
            const isDragActive = dragActiveDocId === doc.id;
            const isUploading = uploadingDocId === doc.id;

            return (
              <div 
                key={doc.id}
                onDragOver={(e) => handleDrag(e, doc.id)}
                onDragEnter={(e) => handleDrag(e, doc.id)}
                onDragLeave={(e) => handleDrag(e, doc.id)}
                onDrop={(e) => handleDrop(e, doc.id)}
                className={`p-4 border rounded-xl transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDragActive 
                    ? 'border-indigo-500 bg-indigo-55/35 bg-indigo-50/50 scale-[1.01]' 
                    : doc.status === 'approved' 
                    ? 'border-emerald-150 bg-emerald-50/10 hover:bg-emerald-50/20' 
                    : doc.status === 'pending_review' 
                    ? 'border-amber-150 bg-amber-50/10 hover:bg-amber-50/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Identification & Badge */}
                <div className="flex items-start gap-3.5 max-w-sm md:max-w-lg">
                  <div className={`p-2.5 rounded-lg border shrink-0 ${
                    doc.status === 'approved'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : doc.status === 'pending_review'
                      ? 'bg-amber-50 border-amber-100 text-amber-600'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 leading-tight flex items-center gap-2">
                      {doc.name}
                      {doc.status === 'approved' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-widest">
                          Approved
                        </span>
                      )}
                      {doc.status === 'pending_review' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold bg-amber-50 text-amber-800 border border-amber-250 animate-pulse uppercase tracking-widest">
                          In Audit
                        </span>
                      )}
                      {doc.status === 'missing' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold bg-rose-50 text-rose-800 border border-rose-150 uppercase tracking-widest">
                          Missing Action
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Category: {doc.type === 'id_proof' ? 'Official Identification' : doc.type === 'income_proof' ? 'Proof of Income' : doc.type === 'address_proof' ? 'Proof of Address' : 'Underwriter Covenant'}
                    </p>

                    {doc.fileName && (
                      <div className="mt-2 flex items-center gap-2 bg-slate-50 border border-slate-150 p-1.5 px-2.5 rounded-lg w-fit text-[10px] font-mono text-slate-650">
                        <span className="font-extrabold text-indigo-700 truncate max-w-[180px]">{doc.fileName}</span>
                        <span className="text-slate-400">({doc.fileSize})</span>
                        <span className="text-slate-350">|</span>
                        <span className="text-slate-400 text-[9px]">Uploaded {doc.uploadedAt}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secure File Interaction Area */}
                <div className="shrink-0 flex items-center gap-3">
                  {isUploading ? (
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-550">
                      <Loader2 className="w-4 h-4 text-indigo-650 animate-spin" />
                      <span>Uploading: {uploadProgress}%</span>
                    </div>
                  ) : doc.status === 'missing' ? (
                    <div className="flex items-center gap-2">
                      <label 
                        className="px-3.5 py-1.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow select-none"
                        id={`upload-label-${doc.id}`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                        <input
                          id={`upload-input-${doc.id}`}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, doc.id)}
                        />
                      </label>
                      <span className="text-[9px] text-slate-400 font-medium hidden md:inline">or drag here</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label 
                        className="px-2.5 py-1 text-[10px] bg-white border border-slate-205 text-slate-650 font-bold rounded-lg hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer flex items-center gap-1 select-none"
                        id={`replace-label-${doc.id}`}
                      >
                        <Upload className="w-3 h-3 text-slate-500" />
                        <span>Update File</span>
                        <input 
                          id={`replace-input-${doc.id}`}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, doc.id)}
                        />
                      </label>
                      <button
                        onClick={(e) => handleRemoveDoc(doc.id, e)}
                        className="p-1 px-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
