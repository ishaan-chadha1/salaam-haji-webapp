import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * The same Supabase project the Flutter app uses. Null when the keys are not
 * set, in which case the app runs in preview mode (no sign-in, local data only).
 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true } }) : null

export const isSupabaseConfigured = supabase != null

/** Turns a Postgres error into something a user can act on
 * (mirrors FamilyRepository._userFriendlyError). */
export function friendlyError(e: unknown): string {
  const err = e as { code?: string; message?: string; details?: string }
  const text = `${err?.message ?? ''} ${err?.details ?? ''}`.toLowerCase()
  switch (err?.code) {
    case '23505':
      if (text.includes('one_family_per_user')) return 'Already in another family. Leave it before joining or creating a new one.'
      if (text.includes('family_members')) return 'Already a member of this family.'
      if (text.includes('invite_code')) return 'That invite code was just taken. Please try again.'
      return 'That already exists.'
    case 'P0001':
      return err.message ?? 'Something went wrong.'
    case '42501':
      return 'You do not have permission to do that.'
    case '23503':
      return 'That family or member no longer exists.'
  }
  if (text.includes('row-level security') || text.includes('permission')) return 'You do not have permission to do that.'
  if (text.includes('fetch') || text.includes('network')) return 'Network error. Please check your connection and try again.'
  if (e instanceof Error && e.message) return e.message
  return err?.message || 'Something went wrong. Please try again.'
}
