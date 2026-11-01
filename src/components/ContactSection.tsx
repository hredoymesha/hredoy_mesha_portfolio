import React, { useState, useEffect } from 'react';
import { Send, Shield, User, AlertCircle, CheckCircle } from 'lucide-react';

interface ContactSectionProps {
  email: string;
  activeTab?: 'direct' | 'anonymous';
  onTabChange?: (tab: 'direct' | 'anonymous') => void;
}

export function ContactSection({ email, activeTab, onTabChange }: ContactSectionProps) {
  const [tab, setTab] = useState<'direct' | 'anonymous'>(activeTab || 'direct');
  const [formData, setFormData] = useState({
    name: '',
    senderEmail: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'warning' | 'error'>('idle');
  // Honeypot: hidden from people, but bots tend to fill it in. A filled value makes the server drop the message.
  const [trap, setTrap] = useState(''); // hidden spam-trap field
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (activeTab) {
      setTab(activeTab);
    }
  }, [activeTab]);

  const handleTabSwitch = (newTab: 'direct' | 'anonymous') => {
    setTab(newTab);
    setStatus('idle');
    if (onTabChange) {
      onTabChange(newTab);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setStatusMessage('Transmitting message...');

    const payload = {
      isAnonymous: tab === 'anonymous',
      name: tab === 'anonymous' ? 'Anonymous Sender' : formData.name || 'Not provided',
      senderEmail: tab === 'anonymous' ? 'anonymous@portfolio-visitor.local' : formData.senderEmail,
      subject: formData.subject || (tab === 'anonymous' ? 'Anonymous Inquiry' : 'Portfolio Inquiry'),
      message: formData.message,
      hp: trap,
      submittedAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data: { success?: boolean; delivered?: boolean; message?: string; error?: string; debug?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Non-JSON answer: handled as an error below.
      }

      if (res.ok && data.success && data.delivered !== false) {
        setStatus('success');
        setStatusMessage(`Your message has been delivered to ${email}. Thank you!`);
        setFormData({ name: '', senderEmail: '', subject: '', message: '' });
        setTrap('');
      } else if (res.ok && data.success) {
        // Saved on the server, but the e-mail could not be sent: say so instead of claiming delivery.
        setStatus('warning');
        setStatusMessage(`${data.message || 'Your message was saved, but it could not be e-mailed right now.'} (${email})${data.debug ? ` (Local test: ${data.debug})` : ''}`);
        setFormData({ name: '', senderEmail: '', subject: '', message: '' });
        setTrap('');
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Failed to send the message. Please try again or write directly.');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Network connection failed. Please write directly to ' + email);
    }
  };

  return (
    <div className="print-hide border border-[var(--line-strong)] rounded-2xl bg-[var(--panel)] p-5 sm:p-7 shadow-sm">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-[var(--line)]">
        <div>
          <h3 className="text-xl font-bold font-serif text-[var(--ink)]">Send a Message</h3>
        </div>

        {/* Tab Switcher - "Protocol" removed per Point 9 */}
        <div className="inline-flex max-w-full flex-wrap items-center bg-[var(--panel-2)] p-1 rounded-xl border border-[var(--line)] self-start font-[var(--ui)] text-xs">
          <button
            type="button"
            aria-pressed={tab === 'direct'}
            onClick={() => handleTabSwitch('direct')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              tab === 'direct'
                ? 'bg-[var(--panel)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Direct</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === 'anonymous'}
            onClick={() => handleTabSwitch('anonymous')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              tab === 'anonymous'
                ? 'bg-[var(--panel)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Anonymous Message</span>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 font-[var(--ui)] text-sm">
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="hp_extra">Leave this field empty</label>
          <input id="hp_extra" name="hp_extra" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>
        {tab === 'direct' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  maxLength={120}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Alex Smith"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                Your Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.senderEmail}
                  maxLength={254}
                  onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                  placeholder="e.g. alex.smith@university.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="subject" className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
            Subject / Discussion Area
          </label>
          <input
            id="subject"
            type="text"
            required
            value={formData.subject}
                  maxLength={200}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder={
              tab === 'anonymous'
                ? 'e.g. Research inquiry or public feedback'
                : 'e.g. Doctoral Research Collaboration / Data & IT Role'
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
            Message
          </label>
          <textarea
            id="message"
            rows={5}
            required
            value={formData.message}
                  maxLength={5000}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder={
              tab === 'anonymous'
                ? 'Write your feedback or inquiry here...'
                : 'Briefly describe your research question, position, or collaboration topic...'
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line-strong)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus:border-[var(--accent)] transition-colors resize-y"
          />
        </div>

        {/* Status Display */}
        {status === 'success' && (
          <div role="status" className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {status === 'warning' && (
          <div role="status" className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-ink)] text-[var(--on-accent)] text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{status === 'sending' ? 'Transmitting...' : 'Send Message'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
