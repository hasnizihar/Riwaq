import React, { useState, useEffect } from 'react';
import { RiwaqLogo } from '../common/RiwaqLogo';
import { Lock, ArrowLeft, Delete, KeyRound, AlertCircle } from 'lucide-react';

interface AdminAuthGateProps {
  children: React.ReactNode;
  onExit: () => void;
  adminPin?: string;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  children,
  onExit,
  adminPin,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Expected PIN: configured via prop, env, or default '1926' (Al-Thaqafa heritage year)
  const EXPECTED_PIN = adminPin || import.meta.env.VITE_ADMIN_PIN || '1926';

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('riwaq_admin_authenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 6) return;
    setErrorMsg(null);
    const next = pinInput + digit;
    setPinInput(next);

    // Auto-check on 4 digits
    if (next.length === EXPECTED_PIN.length) {
      if (next === EXPECTED_PIN) {
        sessionStorage.setItem('riwaq_admin_authenticated', 'true');
        setIsAuthenticated(true);
      } else {
        setErrorMsg('Incorrect PIN. Please check with the booth operator.');
        setTimeout(() => setPinInput(''), 600);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg(null);
    setPinInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === EXPECTED_PIN) {
      sessionStorage.setItem('riwaq_admin_authenticated', 'true');
      setIsAuthenticated(true);
    } else {
      setErrorMsg('Incorrect PIN.');
      setTimeout(() => setPinInput(''), 600);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('riwaq_admin_authenticated');
    setIsAuthenticated(false);
    setPinInput('');
    onExit();
  };

  useEffect(() => {
    const listener = () => handleLogout();
    window.addEventListener('admin_logout', listener);
    return () => window.removeEventListener('admin_logout', listener);
  }, [onExit]);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen w-full bg-[#FAFAF7] text-[#17201B] flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-white border border-[#E5E9E6] rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col items-center">
        {/* Logo & Security Shield */}
        <div className="mb-4">
          <RiwaqLogo variant="icon" size="md" />
        </div>

        <div className="w-10 h-10 rounded-full bg-[#EAF4EE] text-[#006B3C] flex items-center justify-center mb-3">
          <KeyRound className="w-5 h-5 stroke-[2.5]" />
        </div>

        <h2 className="text-base font-bold text-[#17201B] font-['Manrope'] text-center">
          Organizer & Admin Access
        </h2>
        <p className="text-xs text-[#66706A] text-center mt-1 mb-6">
          Enter the event PIN to manage templates, export history, and kiosk settings.
        </p>

        {/* PIN Dots Indicator */}
        <div className="flex items-center gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                i < pinInput.length
                  ? 'bg-[#006B3C] scale-110 shadow-sm'
                  : 'bg-[#E5E9E6] border border-[#D0D5DD]'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="w-full p-2.5 mb-4 bg-[#FEF3F2] border border-[#FECDCA] rounded-xl text-[11px] text-[#B42318] flex items-center gap-1.5 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric PIN Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-xl bg-[#FAFAF7] hover:bg-[#EAF4EE] border border-[#E5E9E6] text-base font-semibold text-[#17201B] hover:text-[#006B3C] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 border border-[#E5E9E6] text-xs font-semibold text-[#66706A] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-[#FAFAF7] hover:bg-[#EAF4EE] border border-[#E5E9E6] text-base font-semibold text-[#17201B] hover:text-[#006B3C] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 border border-[#E5E9E6] text-[#66706A] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            aria-label="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Back to Booth Mode Link */}
        <button
          onClick={onExit}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#66706A] hover:text-[#17201B] transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Photo Booth</span>
        </button>
      </div>
    </div>
  );
};
