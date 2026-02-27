// ============================================================================
// Hyperlocal Radar — Countdown Timer Hook
// ============================================================================
'use client';

import { useState, useEffect } from 'react';

export function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();

    function tick() {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1_000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }

      setIsUrgent(diff < 600_000); // < 10 minutes
    }

    tick();
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { timeLeft, isUrgent };
}
