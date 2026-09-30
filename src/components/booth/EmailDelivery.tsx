import React, { useState } from 'react';
import { isValidEmail } from '../../services/emailService';
import { ArrowLeft, Mail, Send, Download, AlertCircle, CheckSquare, Square } from 'lucide-react';

interface EmailDeliveryProps {
  eventName: string;
  onSendEmail: (email: string) => void;
  onSkipAndDownload: () => void;
  onBack: () => void;
}

export const EmailDelivery: React.FC<EmailDeliveryProps> = ({
  eventName,
  onSendEmail,
  onSkipAndDownload,
  onBack,
}) => {
  const [email, setEmail] = useState('');
  const [optIn, setOptIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please enter your email address to receive your photo.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    setError(null);
    onSendEmail(cleanEmail);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white overflow-hidden">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-transform"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-semibold text-slate-100">Send Souvenir</h2>
          <p className="text-[11px] text-slate-400">{eventName}</p>
        </div>

        <button
          onClick={onSkipAndDownload}
          className="min-h-[44px] px-2 flex items-center justify-center text-xs font-medium text-slate-400 hover:text-amber-300 active:scale-95 transition-transform"
        >
          Skip
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Almost there!</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Where should we deliver your high-resolution event photo?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="participant-email" className="block text-xs font-semibold text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <input
                id="participant-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="visitor@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full h-12 px-4 bg-slate-900 border rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none transition-colors ${
                  error
                    ? 'border-red-500/80 focus:border-red-500'
                    : 'border-slate-800 focus:border-amber-400'
                }`}
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 pt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Consent Checkbox */}
          <button
            type="button"
            onClick={() => setOptIn(!optIn)}
            className="flex items-center gap-2.5 text-left py-1 text-xs text-slate-300 cursor-pointer select-none"
          >
            {optIn ? (
              <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span>Send me my souvenir photo and occasional event highlights</span>
          </button>

          {/* Large Primary Submit Button */}
          <button
            type="submit"
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-transform pt-0.5"
          >
            <Send className="w-4 h-4" />
            <span>SEND PHOTO</span>
          </button>
        </form>

        {/* Alternative handover option */}
        <div className="mt-8 text-center pt-4 border-t border-slate-900">
          <button
            type="button"
            onClick={onSkipAndDownload}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Download directly or scan QR code without email</span>
          </button>
        </div>
      </div>
    </div>
  );
};
