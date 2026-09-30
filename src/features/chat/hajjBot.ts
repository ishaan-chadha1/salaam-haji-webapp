import { supabase } from '../../lib/supabase'
import type { Session } from '../ritual/ritualStore'

/** The Hajj bot (github.com/ishaan-chadha1/hajj-bot). It signs users in with the
 *  same Supabase project, keeps the conversation server-side and asks an n8n
 *  workflow for the answer (~20 s). Override with VITE_HAJJ_BOT_URL. */
export const HAJJ_BOT_URL =
  (import.meta.env.VITE_HAJJ_BOT_URL as string | undefined) ?? 'https://hajjgpt.salaamhaji.com/api/chat'

export type BotReply =
  | { ok: true; text: string; conversationId?: string }
  | { ok: false; text: string; conversationId?: string; resetConversation?: boolean }

function context(session: Session | null) {
  if (!session) return { source: 'salaam_haji_web' }
  return {
    source: 'salaam_haji_web',
    ritual: {
      stage: session.stage,
      lap: session.laps,
      total_laps: session.totalLaps,
      paused: session.pauseStart != null,
      demo: session.isDemo,
    },
  }
}

export async function askHajjBot(message: string, conversationId: string | null, session: Session | null): Promise<BotReply> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (!token) return { ok: false, text: 'Please sign in to use the Digital Mutawwif.' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch(HAJJ_BOT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, ...(conversationId ? { conversationId } : {}), context: context(session) }),
      signal: controller.signal,
    })
    const body = (await res.json().catch(() => ({}))) as { response?: string; error?: string; conversationId?: string }
    if (res.ok && typeof body.response === 'string') {
      return { ok: true, text: body.response, conversationId: body.conversationId }
    }
    if (res.status === 401) return { ok: false, text: 'Your session has expired. Please sign out and sign in again.' }
    if (res.status === 404 && conversationId) {
      return { ok: false, text: 'That conversation is no longer available. Please ask again.', resetConversation: true }
    }
    return { ok: false, text: body.error ?? 'The assistant is unavailable right now. Please try again.', conversationId: body.conversationId }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return { ok: false, text: 'The assistant is taking too long. Please try again.' }
    return { ok: false, text: 'Could not reach the assistant. Check your internet connection.' }
  } finally {
    clearTimeout(timer)
  }
}
