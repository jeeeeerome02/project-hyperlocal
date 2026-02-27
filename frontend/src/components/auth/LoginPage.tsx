// ============================================================================
// HyperLocal — Login / Onboarding Page
// ============================================================================
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, ShieldCheck, Sparkles, MapPin, Users, Zap } from 'lucide-react';
import { authApi, setAccessToken, setRefreshToken, getAccessToken } from '@/lib/api';
import { useAuthStore } from '@/store';
import Logo from '@/components/brand/Logo';

interface LoginPageProps {
  onComplete: () => void;
}

const features = [
  { icon: MapPin, label: 'Real-time neighborhood events', color: 'from-violet-500 to-fuchsia-500' },
  { icon: Users, label: 'Connect with neighbors nearby', color: 'from-fuchsia-500 to-orange-400' },
  { icon: Zap, label: 'Instant alerts & community buzz', color: 'from-orange-400 to-amber-400' },
];

export default function LoginPage({ onComplete }: LoginPageProps) {
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<'welcome' | 'phone' | 'otp'>('welcome');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-skip if already logged in
  useEffect(() => {
    if (getAccessToken()) onComplete();
  }, [onComplete]);

  const handleSendOtp = useCallback(async () => {
    if (!phone || phone.length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await authApi.sendOtp(phone);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  }, [phone]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp(phone, otp);
      setAccessToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      setUser(res.data.user);
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  }, [otp, phone, setUser, onComplete]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col relative overflow-hidden">
      {/* Mesh-gradient background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-violet-400/30 to-fuchsia-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 bg-gradient-to-br from-orange-400/20 to-amber-300/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-br from-fuchsia-400/15 to-violet-300/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {/* ─── WELCOME SCREEN ─── */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center max-w-sm w-full"
            >
              <Logo size="xl" className="mb-6" />

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Your neighborhood,
                <br />
                <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
                  in real time
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-10 max-w-xs">
                See what&apos;s happening around you — street food drops, safety alerts, lost pets, and more.
              </p>

              {/* Feature pills */}
              <div className="w-full space-y-3 mb-10">
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                    className="flex items-center gap-3 px-4 py-3 bg-white/70 dark:bg-white/5 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-white/10"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg`}>
                      <f.icon size={18} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{f.label}</span>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => setStep('phone')}
                className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 shadow-xl shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 transition-all active:scale-[0.98]"
              >
                Get Started
              </button>
              <button
                onClick={onComplete}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Continue as guest
              </button>
            </motion.div>
          )}

          {/* ─── PHONE SCREEN ─── */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center max-w-sm w-full"
            >
              <Logo size="md" className="mb-8" />

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 shadow-xl shadow-violet-500/20">
                <Phone size={28} className="text-white" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">What&apos;s your number?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">We&apos;ll text you a verification code</p>

              <div className="w-full relative mb-4">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(''); }}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full px-5 py-4 bg-white/80 dark:bg-white/5 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-2xl text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 transition-all"
                  autoFocus
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs mb-3">
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 shadow-lg shadow-fuchsia-500/20 hover:shadow-fuchsia-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send Code <ArrowRight size={16} /></>
                )}
              </button>

              <button onClick={() => setStep('welcome')} className="mt-4 text-sm text-gray-400 hover:text-gray-600">
                ← Back
              </button>
            </motion.div>
          )}

          {/* ─── OTP SCREEN ─── */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center max-w-sm w-full"
            >
              <Logo size="md" className="mb-8" />

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-orange-400 flex items-center justify-center mb-6 shadow-xl shadow-orange-500/20">
                <ShieldCheck size={28} className="text-white" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Enter verification code</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                Sent to <span className="font-medium text-gray-700 dark:text-gray-300">{phone}</span>
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="••••••"
                className="w-full text-center text-3xl font-mono tracking-[0.6em] px-5 py-4 bg-white/80 dark:bg-white/5 backdrop-blur-lg border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 transition-all mb-4"
                autoFocus
              />

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs mb-3">
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 shadow-lg shadow-fuchsia-500/20 hover:shadow-fuchsia-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Verify & Enter <Sparkles size={16} /></>
                )}
              </button>

              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600"
              >
                Change number
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <p className="relative z-10 text-center text-xs text-gray-400 pb-8">
        By continuing you agree to our Terms & Privacy Policy
      </p>
    </div>
  );
}
