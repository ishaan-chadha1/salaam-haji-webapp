import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { load, remove, save } from '../lib/storage'

export type AppUser = {
  id: string
  email: string | null
  name: string | null
  metadata: Record<string, unknown>
  /** Preview mode: signed in locally without Supabase. */
  isPreview: boolean
}

type Status = 'loading' | 'signedOut' | 'signedIn'

type AuthState = {
  status: Status
  user: AppUser | null
  init: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    email: string
    password: string
    fullName?: string
    dateOfBirth?: string
    gender?: string
    countryOfResidence?: string
  }) => Promise<{ needsConfirmation: boolean }>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  /** Opened from a reset-password email: ask for a new password before the app. */
  recovering: boolean
  setNewPassword: (password: string) => Promise<void>
  endRecovery: () => void
  resendConfirmation: (email: string) => Promise<void>
  enterPreview: (name: string) => void
  signOut: () => Promise<void>
}

const PREVIEW_KEY = 'preview_user_v1'

/** Reset emails link back to /?reset=1 (see resetPassword). Read before
 *  Supabase tidies the URL, so it does not depend on event timing. */
const RESET_PARAM = 'reset'
const openedFromResetLink = () =>
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).has(RESET_PARAM) || /type=recovery/.test(window.location.hash))

function clearResetParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete(RESET_PARAM)
  window.history.replaceState(null, '', url.pathname + url.search)
}

function nameFrom(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null
  for (const k of ['full_name', 'name', 'display_name', 'given_name']) {
    const v = meta[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function toUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AppUser {
  return {
    id: u.id,
    email: u.email ?? null,
    name: nameFrom(u.user_metadata),
    metadata: u.user_metadata ?? {},
    isPreview: false,
  }
}

/** Name to show family members (AuthService.preferredNameForFamilySignup). */
export function preferredName(user: AppUser | null): string {
  if (user?.name) return user.name
  if (user?.email?.includes('@')) return user.email.split('@')[0]
  return 'Member'
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  recovering: openedFromResetLink(),

  init: () => {
    if (!supabase) {
      const preview = load<AppUser | null>(PREVIEW_KEY, null)
      set(preview ? { status: 'signedIn', user: preview } : { status: 'signedOut', user: null })
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      set(u ? { status: 'signedIn', user: toUser(u) } : { status: 'signedOut', user: null })
    })
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') set({ recovering: true })
      const u = session?.user
      set(u ? { status: 'signedIn', user: toUser(u) } : { status: 'signedOut', user: null })
    })
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Sign-in needs Supabase. Use preview mode instead.')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      if (/confirm/i.test(error.message)) throw new Error('Please confirm your email first. Check your inbox for the link.')
      if (/invalid/i.test(error.message)) throw new Error('Wrong email or password.')
      throw error
    }
  },

  signUp: async ({ email, password, fullName, dateOfBirth, gender, countryOfResidence }) => {
    if (!supabase) throw new Error('Sign-up needs Supabase. Use preview mode instead.')
    const data: Record<string, string> = {}
    if (fullName?.trim()) data.full_name = fullName.trim()
    if (dateOfBirth?.trim()) data.date_of_birth = dateOfBirth.trim()
    if (gender?.trim()) data.gender = gender.trim()
    if (countryOfResidence?.trim()) data.country_of_residence = countryOfResidence.trim()
    const res = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data, emailRedirectTo: window.location.origin },
    })
    if (res.error) throw res.error
    return { needsConfirmation: !res.data.session }
  },

  signInWithGoogle: async () => {
    if (!supabase) throw new Error('Google sign-in needs Supabase.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  },

  resetPassword: async (email) => {
    if (!supabase) throw new Error('Password reset needs Supabase.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/?${RESET_PARAM}=1`,
    })
    if (error) throw error
  },

  setNewPassword: async (password) => {
    if (!supabase) return
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      if (/different from the old/i.test(error.message)) throw new Error('Choose a password different from your old one.')
      throw error
    }
    clearResetParam()
    set({ recovering: false })
  },

  endRecovery: () => {
    clearResetParam()
    set({ recovering: false })
  },

  resendConfirmation: async (email) => {
    if (!supabase) return
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    if (error) throw error
  },

  enterPreview: (name) => {
    const user: AppUser = {
      id: 'preview-user',
      email: null,
      name: name.trim() || 'Guest',
      metadata: {},
      isPreview: true,
    }
    save(PREVIEW_KEY, user)
    set({ status: 'signedIn', user })
  },

  signOut: async () => {
    remove(PREVIEW_KEY)
    if (supabase) await supabase.auth.signOut()
    set({ status: 'signedOut', user: null })
  },
}))
