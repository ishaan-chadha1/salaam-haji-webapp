import { load, save } from '../../lib/storage'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/auth'

// Port of dua_checklist_repository.dart: the library ships with the app
// (assets/data/dua_library.json); "My list" and shares live in Supabase
// (user_dua_items, dua_shares), or on this device in preview mode.

export type LibraryDua = { id: string; category: string; title: string; arabic?: string; transliteration?: string; translation?: string }
export type UserDua = {
  id: string
  title: string
  arabicText: string | null
  translation: string | null
  transliteration: string | null
  notes: string | null
  libraryId: string | null
  checked: boolean
  sortOrder: number
  createdAt: string
}
export type DuaShare = { id: string; fromUserId: string; toUserId: string; title: string; arabicText: string | null; translation: string | null; transliteration: string | null; notes: string | null; status: string; createdAt: string }
export type Adhkar = { order: number; content: string; translation: string; transliteration: string; count: number; count_description: string; fadl: string; source: string; type: number }

let library: Promise<LibraryDua[]> | null = null
export function loadLibrary(): Promise<LibraryDua[]> {
  library ??= fetch('/data/dua_library.json').then((r) => r.json())
  return library
}

let adhkar: Promise<Adhkar[]> | null = null
export function loadAdhkar(): Promise<Adhkar[]> {
  adhkar ??= fetch('/data/hisnul_morning_evening_en.json').then((r) => r.json())
  return adhkar
}

const LOCAL_KEY = 'user_duas_v1'
const uid = () => {
  const u = useAuth.getState().user
  return u && !u.isPreview ? u.id : null
}
const remote = () => (supabase && uid() ? supabase : null)
const clean = (s?: string | null) => (s?.trim() ? s.trim() : null)

const toItem = (r: Record<string, unknown>): UserDua => ({
  id: r.id as string,
  title: r.title as string,
  arabicText: (r.arabic_text as string) ?? null,
  translation: (r.translation as string) ?? null,
  transliteration: (r.transliteration as string) ?? null,
  notes: (r.notes as string) ?? null,
  libraryId: (r.library_id as string) ?? null,
  checked: !!r.checked,
  sortOrder: Number(r.sort_order ?? 0),
  createdAt: r.created_at as string,
})

const toShare = (r: Record<string, unknown>): DuaShare => ({
  id: r.id as string,
  fromUserId: r.from_user_id as string,
  toUserId: r.to_user_id as string,
  title: r.title as string,
  arabicText: (r.arabic_text as string) ?? null,
  translation: (r.translation as string) ?? null,
  transliteration: (r.transliteration as string) ?? null,
  notes: (r.notes as string) ?? null,
  status: (r.status as string) ?? 'pending',
  createdAt: r.created_at as string,
})

export const DuaRepo = {
  isShared: () => remote() != null,

  async myItems(): Promise<UserDua[]> {
    const db = remote()
    if (!db) return load<UserDua[]>(LOCAL_KEY, [])
    const { data, error } = await db.from('user_dua_items').select().eq('user_id', uid()!).order('sort_order', { ascending: true }).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(toItem)
  },

  async add(item: { title: string; arabicText?: string | null; translation?: string | null; transliteration?: string | null; notes?: string | null; libraryId?: string | null }, sortOrder: number): Promise<UserDua> {
    const now = new Date().toISOString()
    const row = {
      id: crypto.randomUUID(),
      title: item.title.trim(),
      arabic_text: clean(item.arabicText),
      translation: clean(item.translation),
      transliteration: clean(item.transliteration),
      notes: clean(item.notes),
      library_id: item.libraryId ?? null,
      source_share_id: null,
      checked: false,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    }
    const db = remote()
    if (!db) {
      const created = toItem(row)
      save(LOCAL_KEY, [...load<UserDua[]>(LOCAL_KEY, []), created])
      return created
    }
    const { data, error } = await db.from('user_dua_items').insert({ ...row, user_id: uid() }).select().single()
    if (error) throw error
    return toItem(data)
  },

  async setChecked(id: string, checked: boolean) {
    const db = remote()
    if (!db) return save(LOCAL_KEY, load<UserDua[]>(LOCAL_KEY, []).map((i) => (i.id === id ? { ...i, checked } : i)))
    const { error } = await db.from('user_dua_items').update({ checked, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', uid()!)
    if (error) throw error
  },

  async remove(id: string) {
    const db = remote()
    if (!db) return save(LOCAL_KEY, load<UserDua[]>(LOCAL_KEY, []).filter((i) => i.id !== id))
    const { error } = await db.from('user_dua_items').delete().eq('id', id).eq('user_id', uid()!)
    if (error) throw error
  },

  async incoming(): Promise<DuaShare[]> {
    const db = remote()
    if (!db) return []
    const { data } = await db.from('dua_shares').select().eq('to_user_id', uid()!).order('created_at', { ascending: false })
    return (data ?? []).map(toShare)
  },

  async shareTo(toUserId: string, d: UserDua) {
    const db = remote()
    if (!db) throw new Error('Sharing needs an account.')
    if (toUserId === uid()) throw new Error('Cannot share with yourself')
    const { error } = await db.from('dua_shares').insert({
      from_user_id: uid(),
      to_user_id: toUserId,
      title: d.title,
      arabic_text: d.arabicText,
      translation: d.translation,
      transliteration: d.transliteration,
      notes: d.notes,
      status: 'pending',
    })
    if (error) throw error
  },

  async accept(shareId: string) {
    const { error } = await remote()!.rpc('accept_dua_share', { p_share_id: shareId })
    if (error) throw error
  },

  async decline(shareId: string) {
    const { error } = await remote()!.rpc('decline_dua_share', { p_share_id: shareId })
    if (error) throw error
  },

  /** 8-character code, single use, expires server-side after 7 days. */
  async createCode(d: UserDua): Promise<string> {
    const db = remote()
    if (!db) throw new Error('Share codes need an account.')
    const { data, error } = await db.rpc('create_dua_share_code', {
      p_payload: { title: d.title, arabic_text: d.arabicText, translation: d.translation, transliteration: d.transliteration, notes: d.notes },
    })
    if (error) throw error
    return data as string
  },

  async redeemCode(code: string) {
    const db = remote()
    if (!db) throw new Error('Share codes need an account.')
    const { error } = await db.rpc('redeem_dua_share_code', { p_code: code.trim() })
    if (error) throw error
  },
}

export function shareText(d: { title: string; arabic?: string | null; transliteration?: string | null; translation?: string | null; notes?: string | null }): string {
  const parts = [d.title, d.arabic, d.transliteration, d.translation].filter((x) => x && x.trim())
  if (d.notes?.trim()) parts.push(`Note: ${d.notes.trim()}`)
  parts.push('— Shared from Salaam Haji')
  return parts.join('\n\n')
}

// ---- Pasted text parser (dua_shared_text_parser.dart) ----

export type ParsedDua = { title: string; arabicText?: string; transliteration?: string; translation?: string; notes?: string }
export const PARSE_FAILED = 'Could not read that text. Paste the full message, or remove forwards and extra lines at the top.'

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/
const hasArabic = (s: string) => ARABIC.test(s)
const shorten = (s: string) => (s.trim().length <= 120 ? s.trim() : `${s.trim().slice(0, 117)}…`)
const titleFromArabic = (a: string) => {
  const first = a.split('\n')[0].trim()
  return first.length <= 56 ? first : `${first.slice(0, 53)}…`
}

export function normalizeWhitespace(raw: string): string {
  return raw.replace(/﻿/g, '').replace(/[​‌‍]/g, '').replace(/\r\n?/g, '\n').trim()
}

function isFooter(line: string) {
  const t = line.trim()
  if (!t) return false
  const l = t.toLowerCase()
  if (l.includes('shared from')) return true
  if (l.includes('salaam haji') && t.length < 80) return true
  return /^[—–-]/.test(t) && l.includes('shared')
}

function isNoise(line: string) {
  const t = line.trim()
  if (!t) return false
  const l = t.toLowerCase()
  return l.startsWith('forwarded') || l.startsWith('forward message') || /^={3,}$/.test(t) || /^-{3,}$/.test(t)
}

function looksLikeTranslation(s: string) {
  const t = s.trim()
  if (t.length < 28) return false
  const l = t.toLowerCase()
  return ['we ', 'the ', 'our ', 'o ', 'glory ', 'praise ', 'you ', 'i ', 'grant ', 'may '].some((p) => l.startsWith(p))
}

export function parseSharedDua(raw: string): ParsedDua | null {
  const text = normalizeWhitespace(raw)
  if (!text) return null
  let lines = text.split('\n').map((l) => l.trimEnd())
  while (lines.length && (isNoise(lines[0]) || !lines[0].trim())) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  while (lines.length && isFooter(lines[lines.length - 1])) {
    lines.pop()
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  }
  const notes: string[] = []
  lines = lines.filter((line) => {
    const m = /^\s*notes?\s*:\s*(.*)$/i.exec(line.trim())
    if (!m) return true
    if (m[1].trim()) notes.push(m[1].trim())
    return false
  })
  const t = lines.map((l) => l.trim()).filter(Boolean)
  if (!t.length) return null
  const note = notes.length ? notes.join('\n') : undefined

  if (!t.some(hasArabic)) {
    return t.length === 1 ? { title: shorten(t[0]), notes: note } : { title: shorten(t[0]), translation: t.slice(1).join('\n'), notes: note }
  }

  let i = 0
  let title = 'Imported dua'
  if (!hasArabic(t[0])) {
    title = shorten(t[0])
    i = 1
  }
  const arabic: string[] = []
  while (i < t.length && hasArabic(t[i])) arabic.push(t[i++])
  const arabicText = arabic.join('\n') || undefined
  if (title === 'Imported dua' && arabicText) title = titleFromArabic(arabicText)
  const latin: string[] = []
  while (i < t.length && !hasArabic(t[i])) latin.push(t[i++])
  const rest = t.slice(i).join('\n')

  let transliteration: string | undefined
  let translation: string | undefined
  if (!latin.length) translation = rest || undefined
  else if (latin.length === 1 && !rest && looksLikeTranslation(latin[0])) translation = latin[0]
  else {
    transliteration = latin[0]
    translation = [latin.slice(1).join('\n'), rest].filter(Boolean).join('\n') || undefined
  }
  return { title: title.trim(), arabicText, transliteration, translation, notes: note }
}
