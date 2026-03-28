import { useState, useEffect, useCallback } from 'react';
import { saveUsage, loadUsage } from '../utils/storage';

export interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  plan: 'free' | 'pro';
  resetDate: string; // YYYY-MM-DD
}

export interface UseUsageTrackerReturn {
  usage: UsageData;
  canSend: boolean;
  incrementUsage: () => void;
  resetIfNewDay: () => void;
}

const FREE_LIMIT = 20;

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDefaultUsage(): UsageData {
  return {
    used: 0,
    limit: FREE_LIMIT,
    remaining: FREE_LIMIT,
    plan: 'free',
    resetDate: getTodayDate(),
  };
}

export function useUsageTracker(): UseUsageTrackerReturn {
  const [usage, setUsage] = useState<UsageData>(createDefaultUsage());

  // Load saved usage on mount
  useEffect(() => {
    (async () => {
      const saved = await loadUsage();
      if (saved) {
        // Check if it's a new day
        if (saved.resetDate !== getTodayDate()) {
          const fresh = createDefaultUsage();
          setUsage(fresh);
          saveUsage(fresh);
        } else {
          setUsage(saved);
        }
      }
    })();
  }, []);

  const resetIfNewDay = useCallback(() => {
    const today = getTodayDate();
    if (usage.resetDate !== today) {
      const fresh = createDefaultUsage();
      setUsage(fresh);
      saveUsage(fresh);
    }
  }, [usage.resetDate]);

  const incrementUsage = useCallback(() => {
    setUsage((prev) => {
      const newUsed = prev.used + 1;
      const updated: UsageData = {
        ...prev,
        used: newUsed,
        remaining: Math.max(0, prev.limit - newUsed),
      };
      saveUsage(updated);
      return updated;
    });
  }, []);

  const canSend = usage.remaining > 0;

  return { usage, canSend, incrementUsage, resetIfNewDay };
}
