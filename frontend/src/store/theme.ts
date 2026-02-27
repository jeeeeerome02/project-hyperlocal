// ============================================================================
// HyperLocal — Theme Store (Dark/Light Mode)
// ============================================================================
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        isDark: false,
        toggle: () =>
          set((s) => {
            const next = !s.isDark;
            if (typeof document !== 'undefined') {
              document.documentElement.classList.toggle('dark', next);
            }
            return { isDark: next };
          }),
        setDark: (dark) => {
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', dark);
          }
          set({ isDark: dark });
        },
      }),
      {
        name: 'hyperlocal-theme',
        onRehydrateStorage: () => (state) => {
          // Apply theme on rehydration
          if (state?.isDark && typeof document !== 'undefined') {
            document.documentElement.classList.add('dark');
          }
        },
      },
    ),
    { name: 'theme-store' },
  ),
);
