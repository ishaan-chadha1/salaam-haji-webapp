import { create } from 'zustand'
import { load, save } from '../lib/storage'

export type Theme = 'light' | 'dark'

type Settings = {
  theme: Theme
  use24h: boolean
  /** Prayer-time calculation method id (Aladhan). 4 = Umm al-Qura, Makkah. */
  calcMethod: number
  /** Asr juristic school: 0 = Shafi'i/standard, 1 = Hanafi. */
  asrSchool: 0 | 1
  quranFontSize: number
  showTranslation: boolean
  setTheme: (t: Theme) => void
  set: (patch: Partial<Omit<Settings, 'set' | 'setTheme'>>) => void
}

const KEY = 'settings_v1'
const initial = load(KEY, {
  theme: 'light' as Theme,
  use24h: false,
  calcMethod: 4,
  asrSchool: 0 as 0 | 1,
  quranFontSize: 28,
  showTranslation: true,
})

function persist(s: Settings) {
  const { theme, use24h, calcMethod, asrSchool, quranFontSize, showTranslation } = s
  save(KEY, { theme, use24h, calcMethod, asrSchool, quranFontSize, showTranslation })
}

export const useSettings = create<Settings>((set, get) => ({
  ...initial,
  setTheme: (theme) => {
    set({ theme })
    persist(get())
  },
  set: (patch) => {
    set(patch)
    persist(get())
  },
}))
