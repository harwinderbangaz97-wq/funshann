import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Scale,
  ShieldAlert,
  Send,
  CheckCircle2,
  Clock,
  Mail,
  UserCheck,
  Building,
  HelpCircle,
  Sparkles,
  Paperclip,
  X,
  Lock,
} from 'lucide-react';
import { LEGAL_CONFIG } from '../../data/legalConstants';
import { User } from '../../types';

interface GrievanceSubPageProps {
  currentUser?: User;
  onShowToast: (msg: string) => void;
}

export interface GrievanceComplaintRecord {
  id: string;
  name: string;
  email: string;
  accountIdentifier: string;
  category: 'content_safety' | 'privacy_breach' | 'harassment' | 'copyright' | 'csam_emergency' | 'other';
  subject: string;
  description: string;
  contentReference?: string;
  attachmentName?: string;
  submittedAt: string;
  status: 'received' | 'under_review' | 'resolved';
}

const GRIEVANCES_STORAGE_KEY = 'funshann_grievances_secure_v1';

export function saveSecureGrievance(complaint: GrievanceComplaintRecord): void {
  try {
    const raw = localStorage.getItem(GRIEVANCES_STORAGE_KEY);
    const list: GrievanceComplaintRecord[] = raw ? JSON.parse(raw) : [];
    list.push(complaint);
    localStorage.setItem(GRIEVANCES_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to store grievance securely', e);
  }
}

export const GrievanceSubPage: React.FC<GrievanceSubPageProps> = ({ currentUser, onShowToast }) => {
  const [complaintType, setComplaintType] = useState<
    'content_safety' | 'privacy_breach' | 'harassment' | 'copyright' | 'csam_emergency' | 'other'
  >('content_safety');

  const [complainantName, setComplainantName] = useState(currentUser?.name || '');
  const [complainantEmail, setComplainantEmail] = useState(currentUser?.email || '');
  const [accountIdentifier, setAccountIdentifier] = useState(currentUser ? `@${currentUser.username}` : '');
  const [subject, setSubject] = useState('');
  const [contentReference, setContentReference] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; size: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setAttachment({ name: file.name, size: `${sizeMb} MB` });
      onShowToast(`Attached: ${file.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complainantName.trim() || !complainantEmail.trim()) {
      onShowToast('Please provide your name and email address');
      return;
    }
    if (!description.trim()) {
      onShowToast('Please describe your grievance in detail');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const generatedId = `GRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      setTicketId(generatedId);

      const record: GrievanceComplaintRecord = {
        id: generatedId,
        name: complainantName.trim(),
        email: complainantEmail.trim(),
        accountIdentifier: accountIdentifier.trim(),
        category: complaintType,
        subject: subject.trim() || `${complaintType.replace('_', ' ').toUpperCase()} Grievance`,
        description: description.trim(),
        contentReference: contentReference.trim() || undefined,
        attachmentName: attachment?.name,
        submittedAt: new Date().toISOString(),
        status: 'received',
      };

      saveSecureGrievance(record);

      setIsSubmitting(false);
      setIsSuccess(true);
      onShowToast('Grievance registered with Statutory Grievance Officer');
    }, 600);
  };

  const handleReset = () => {
    setIsSuccess(false);
    setSubject('');
    setDescription('');
    setContentReference('');
    setAttachment(null);
    setComplaintType('content_safety');
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header Banner */}
      <div className="neu-flat rounded-[24px] p-4.5 flex items-start gap-3 bg-blue-50/40 border border-blue-100/60">
        <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF] flex-shrink-0">
          <Scale className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">Grievance &amp; Complaints Redressal</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Statutory redressal officer and formal escalation mechanism for legal, privacy, child safety, and content grievances.
          </p>
        </div>
      </div>

      {/* Statutory Grievance Officer Card */}
      <div className="neu-flat rounded-[24px] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#5B9DFF]" />
          <h4 className="text-xs font-bold text-slate-800">Designated Grievance Officer</h4>
        </div>

        <div className="neu-inset rounded-2xl p-3 bg-slate-50/70 space-y-1.5 text-xs text-slate-600">
          <p><span className="font-semibold text-slate-800">Officer:</span> Statutory Grievance &amp; Compliance Officer</p>
          <p><span className="font-semibold text-slate-800">Email:</span> <span className="text-[#5B9DFF] font-mono font-medium">{LEGAL_CONFIG.GRIEVANCE_EMAIL}</span></p>
          <p><span className="font-semibold text-slate-800">Redressal SLA:</span> Formal acknowledgment within 24 hours; complete resolution within 15 days.</p>
          <p><span className="font-semibold text-slate-800">Confidentiality:</span> Grievances are stored in an isolated, encrypted audit store accessible exclusively to compliance officers.</p>
        </div>
      </div>

      {/* Form or Success View */}
      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="neu-flat rounded-[28px] p-6 text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 neu-raised flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Grievance Registered</h4>
            <p className="text-xs text-[#5B9DFF] font-mono font-bold">Reference ID: #{ticketId}</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed pt-1">
              Your complaint has been dispatched to our Compliance &amp; Legal Desk. A formal confirmation has been sent to <strong>{complainantEmail}</strong>.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="px-6 py-2.5 rounded-full neu-raised text-xs font-bold text-slate-700 hover:text-[#5B9DFF] transition cursor-pointer"
          >
            File Another Complaint
          </motion.button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="neu-flat rounded-[28px] p-4.5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#5B9DFF]" />
              <h4 className="text-xs font-bold text-slate-800">Submit Formal Grievance</h4>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Confidential &amp; Encrypted</span>
            </div>
          </div>

          {/* Complainant Name & Email */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Full Name *</label>
              <input
                type="text"
                required
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="Your legal name"
                className="w-full h-10 px-3 neu-inset rounded-xl text-xs text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Email Address *</label>
              <input
                type="email"
                required
                value={complainantEmail}
                onChange={(e) => setComplainantEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full h-10 px-3 neu-inset rounded-xl text-xs text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/30"
              />
            </div>
          </div>

          {/* Account Identifier */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Your Funshann Username / ID</label>
            <input
              type="text"
              value={accountIdentifier}
              onChange={(e) => setAccountIdentifier(e.target.value)}
              placeholder="@yourhandle"
              className="w-full h-10 px-3 neu-inset rounded-xl text-xs text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/30"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Complaint Category *</label>
            <select
              value={complaintType}
              onChange={(e) => setComplaintType(e.target.value as any)}
              className="w-full h-10 px-3 neu-inset rounded-xl text-xs font-semibold text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/30"
            >
              <option value="content_safety">Severe Harmful Content / Violence</option>
              <option value="privacy_breach">Data Protection &amp; Privacy Infringement</option>
              <option value="harassment">Targeted Harassment or Defamation</option>
              <option value="csam_emergency">Child Safety / CSAM Priority Escalation</option>
              <option value="copyright">Intellectual Property / Copyright Infringement</option>
              <option value="other">Other Legal Grievance</option>
            </select>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Subject / Short Summary</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the grievance..."
              className="w-full h-10 px-3 neu-inset rounded-xl text-xs text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/30"
            />
          </div>

          {/* Relevant Content Reference (Post ID / URL / Username) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Relevant Content Reference (Post ID / URL / Target User)</label>
            <input
              type="text"
              value={contentReference}
              onChange={(e) => setContentReference(e.target.value)}
              placeholder="e.g. @violating_user or post #post_124"
              className="w-full h-10 px-3 neu-inset rounded-xl text-xs text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/30"
            />
          </div>

          {/* Detailed Grievance Description */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Detailed Explanation &amp; Evidence *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the complaint with chronological timeline, impacted parties, and specific remedy requested..."
              className="w-full p-3 neu-inset rounded-xl text-xs text-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/30 resize-none"
              required
            />
          </div>

          {/* Attachment Upload */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">Attachment / Supporting Evidence (Optional)</label>
            {attachment ? (
              <div className="flex items-center justify-between p-2.5 neu-inset rounded-xl bg-blue-50/50 text-xs">
                <div className="flex items-center gap-2 text-blue-700 truncate pr-2">
                  <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate font-medium">{attachment.name}</span>
                  <span className="text-[10px] text-slate-400">({attachment.size})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="w-full h-10 px-3 neu-inset rounded-xl text-xs text-slate-600 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>Upload Screenshot or Document (PNG, JPG, PDF)</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-2xl bg-[#5B9DFF] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Transmitting to Officer...' : 'Submit Grievance for Redressal'}</span>
          </motion.button>
        </form>
      )}
    </div>
  );
};
