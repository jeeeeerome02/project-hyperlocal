// ============================================================================
// Hyperlocal Radar — Auth Modal (Phone OTP)
// ============================================================================
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { authApi, setAccessToken, setRefreshToken } from '@/lib/api';
import { useAuthStore } from '@/store';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  }, [otp, phone, setUser, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-1/3 z-50 bg-white rounded-3xl p-6 shadow-2xl max-w-md mx-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck size={24} className="text-primary" />
                <h2 className="text-lg font-bold text-gray-800">
                  {step === 'phone' ? 'Sign in' : 'Verify OTP'}
                </h2>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {step === 'phone' ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Enter your phone number to get a verification code.
                </p>
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-2xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <Phone size={18} className="text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="flex-1 text-sm focus:outline-none"
                    autoFocus
                  />
                </div>
                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                <button
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full mt-4 py-3 bg-primary text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : (
                    <>
                      Send Code <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  We sent a 6-digit code to <span className="font-medium text-gray-700">{phone}</span>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading}
                  className="w-full mt-4 py-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError('');
                  }}
                  className="w-full mt-2 text-sm text-gray-500 hover:text-primary"
                >
                  Change number
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
