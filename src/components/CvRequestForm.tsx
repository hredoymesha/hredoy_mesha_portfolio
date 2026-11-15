import { useState } from 'react';

/**
 * "Request a CV" form. It sends a normal message through the existing contact form (/api/contact),
 * so the request is saved and e-mailed like any other message. Nothing new is stored.
 */
export function CvRequestForm({ cvLabels, email }: { cvLabels: string[]; email: string }) {
  const [form, setForm] = useState({ name: '', senderEmail: '', cv: cvLabels[0] ?? 'Professional CV', reason: '' });
  const [trap, setTrap] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'warning' | 'error'>('idle');
  const [note, setNote] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setNote('Sending your request...');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAnonymous: false,
          name: form.name || 'Not provided',
          senderEmail: form.senderEmail,
          subject: `CV request: ${form.cv}`,
          message: `CV requested: ${form.cv}\n\nReason:\n${form.reason}`,
          hp: trap,
          submittedAt: new Date().toISOString()
        })
      });
      let data: { success?: boolean; delivered?: boolean; message?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Not JSON: handled as an error below.
      }
      if (res.ok && data.success && data.delivered !== false) {
        setStatus('success');
        setNote('Thank you. Your request has been sent, and I will reply by e-mail.');
        setForm({ name: '', senderEmail: '', cv: cvLabels[0] ?? 'Professional CV', reason: '' });
      } else if (res.ok && data.success) {
        setStatus('warning');
        setNote(data.message || `Your request was saved, but it could not be e-mailed right now. You can also write to ${email}.`);
      } else {
        setStatus('error');
        setNote(data.error || `The request could not be sent. Please write to ${email}.`);
      }
    } catch {
      setStatus('error');
      setNote(`Network connection failed. Please write to ${email}.`);
    }
  };

  return (
    <details className="cv-request print-hide">
      <summary>Request a CV by form</summary>
      <form onSubmit={submit} className="cv-request-form">
        <label>
          <span>Your name</span>
          <input type="text" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
        </label>
        <label>
          <span>Your e-mail</span>
          <input type="email" required maxLength={120} value={form.senderEmail} onChange={(e) => setForm({ ...form, senderEmail: e.target.value })} autoComplete="email" />
        </label>
        <label>
          <span>Which CV</span>
          <select value={form.cv} onChange={(e) => setForm({ ...form, cv: e.target.value })}>
            {cvLabels.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Reason for the request</span>
          <textarea required rows={3} maxLength={1000} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </label>
        {/* Spam trap: hidden from people, bots tend to fill it in. */}
        <div className="cv-trap" aria-hidden="true">
          <label>
            <span>Leave this empty</span>
            <input type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending...' : 'Send request'}</button>
        {status !== 'idle' && (
          <p role="status" className={`cv-request-note is-${status}`}>{note}</p>
        )}
      </form>
    </details>
  );
}
