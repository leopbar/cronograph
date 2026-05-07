import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  timezone: string;
  setTimezone: (timezone: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      timezone: "UTC",
      setTimezone: (timezone) => set({ timezone }),
    }),
    {
      name: "cronograph-settings",
    }
  )
);
