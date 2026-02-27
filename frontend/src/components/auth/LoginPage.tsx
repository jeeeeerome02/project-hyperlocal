// ============================================================================
// HyperLocal — Login / Onboarding Page (2026 Enterprise — Responsive)
// ============================================================================
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, ShieldCheck, Sparkles, MapPin, Users, Zap, Radio } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex relative overflow-hidden">
      {/* ─── Desktop Left Panel (Illustration/Branding) ─── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 p-12 flex-col justify-between overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-orange-300/10 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center">
              <Radio size={24} className="text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white tracking-tight">HyperLocal</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl xl:text-6xl font-display font-bold text-white leading-tight">
            Your neighborhood,<br />
            <span className="text-white/80">in real time.</span>
          </h1>
          <p className="text-lg text-white/60 max-w-md leading-relaxed">
            See what&apos;s happening around you — street food drops, safety alerts, lost pets, community events, and more. All within walking distance.
          </p>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full" /> 2.4k active users</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-amber-400 rounded-full" /> 847 posts today</span>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-sm text-white/30">© 2026 HyperLocal. Built for communities.</p>
      </div>

      {/* ─── Right Panel (Mobile: Full screen, Desktop: Right side) ─── */}
      <div className="flex-1 flex flex-col relative">
        {/* Mobile mesh-gradient background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-violet-400/20 to-fuchsia-400/15 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-24 w-80 h-80 bg-gradient-to-br from-orange-400/15 to-amber-300/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-br from-fuchsia-400/10 to-violet-300/5 rounded-full blur-3xl" />
        </div>

        {/* Desktop subtle bg */}
        <div className="hidden lg:block pointer-events-none absolute inset-0 mesh-gradient" />

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
                <div className="lg:hidden">
                  <Logo size="xl" className="mb-6" />
                </div>
                <div className="hidden lg:block mb-8">
                  <Logo size="lg" className="mb-2" />
                </div>

                <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
                  <span className="lg:hidden">Your neighborhood,<br /></span>
                  <span className="hidden lg:inline">Welcome back<br /></span>
                  <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
                    {typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'Sign in to continue' : 'in real time'}
                  </span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-10 max-w-xs">
                  See what&apos;s happening around you — street food drops, safety alerts, lost pets, and more.
                </p>

                {/* Feature pills (mobile only) */}
                <div className="w-full space-y-3 mb-10 lg:hidden">
                  {features.map((f, i) => (
                    <motion.div
                      key={f.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.1 }}
                      className="flex items-center gap-3 px-4 py-3 card"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg`}>
                        <f.icon size={18} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{f.label}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Desktop feature list */}
                <div className="hidden lg:flex items-center gap-4 mb-10">
                  {features.map((f) => (
                    <div key={f.label} className="flex items-center gap-2 text-sm text-gray-500">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center`}>
                        <f.icon size={14} className="text-white" />
                      </div>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setStep('phone')}
                  className="btn-primary w-full py-4 rounded-2xl text-base"
                >
                  Get Started
                </button>
                <button
                  onClick={onComplete}
                  className="mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 shadow-xl shadow-primary-500/20">
                  <Phone size={28} className="text-white" />
                </div>

                <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-1">What&apos;s your number?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">We&apos;ll text you a verification code</p>

                <div className="w-full relative mb-4">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(''); }}
                    placeholder="+63 9XX XXX XXXX"
                    className="input text-center text-lg font-medium py-4"
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
                  className="btn-primary w-full py-4 rounded-2xl text-base"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Send Code <ArrowRight size={16} /></>
                  )}
                </button>

                <button onClick={() => setStep('welcome')} className="mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
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

                <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-1">Enter verification code</h2>
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
                  className="input text-center text-3xl font-mono tracking-[0.6em] py-4 mb-4"
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
                  className="btn-primary w-full py-4 rounded-2xl text-base"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Verify & Enter <Sparkles size={16} /></>
                  )}
                </button>

                <button
                  onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                  className="mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Change number
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-center text-xs text-gray-400 dark:text-gray-500 pb-8">
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
