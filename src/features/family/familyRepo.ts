import type { SupabaseClient } from '@supabase/supabase-js'
import { friendlyError, supabase } from '../../lib/supabase'

// Port of lib/src/core/repository/family_repository.dart and
// home_finder_repository.dart. Same tables, same rules.

export type FamilyGroup = { id: string; name: string; headId: string; inviteCode: string; description: string | null; createdAt: string }
export type FamilyMember = {
  userId: string
  name: string
  role: 'head' | 'member' | string
  joinedAt: string
  isLocationSharingEnabled: boolean
  lastActiveAt: string | null
}
export type JoinRequest = { id: string; familyGroupId: string; requesterUserId: string; requesterName: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string }
export type MessageType = 'text' | 'location' | 'progressUpdate' | 'system'
export type FamilyMessage = {
  id: string
  familyGroupId: string
  senderId: string
  senderName: string
  message: string
  timestamp: string
  type: MessageType
  metadata: Record<string, unknown> | null
  readBy: string[]
}
export type MemberLocation = { lat: number; lng: number; accuracy: number | null; timestamp: string }
export type MemberProgress = { userId: string; stage: string | null; isActive: boolean; ritualSessionId: string | null; updatedAt: string | null }
export type SavedPlace = { id: string; userId: string; label: string; category: string | null; note: string | null; lat: number; lng: number; address: string | null; updatedAt: string }

export class FamilyError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

export const ALREADY_MEMBER = 'already_member'

function db(): SupabaseClient {
  if (!supabase) throw new FamilyError('Family needs an account. Sign in to create or join a family.')
  return supabase
}

function wrap(e: unknown): never {
  if (e instanceof FamilyError) throw e
  const code = (e as { code?: string })?.code
  throw new FamilyError(friendlyError(e), code)
}

/** Same alphabet as the app: no 0/O/1/I so codes read aloud cleanly. */
export function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => chars[n % chars.length]).join('')
}

/** Letters and digits only, uppercased: "Code: ab-12 3" → "AB123" (invite_code_util.dart). */
export function normalizeInviteCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

const toGroup = (j: Record<string, unknown>): FamilyGroup => ({
  id: j.id as string,
  name: j.name as string,
  headId: j.head_id as string,
  inviteCode: j.invite_code as string,
  description: (j.description as string) ?? null,
  createdAt: j.created_at as string,
})

const toMember = (j: Record<string, unknown>): FamilyMember => ({
  userId: j.user_id as string,
  name: (j.name as string) ?? 'User',
  role: j.role as string,
  joinedAt: j.joined_at as string,
  isLocationSharingEnabled: (j.is_location_sharing_enabled as boolean) ?? false,
  lastActiveAt: (j.last_active_at as string) ?? null,
})

const toRequest = (j: Record<string, unknown>): JoinRequest => ({
  id: j.id as string,
  familyGroupId: j.family_group_id as string,
  requesterUserId: j.requester_user_id as string,
  requesterName: (j.requester_name as string) ?? 'User',
  status: ((j.status as string) ?? 'pending') as JoinRequest['status'],
  createdAt: j.created_at as string,
})

export const toMessage = (j: Record<string, unknown>, names: Record<string, string>): FamilyMessage => ({
  id: j.id as string,
  familyGroupId: j.family_group_id as string,
  senderId: j.sender_id as string,
  senderName: names[j.sender_id as string] ?? (j.sender_name as string) ?? 'User',
  message: j.message as string,
  timestamp: j.timestamp as string,
  type: (['text', 'location', 'progressUpdate', 'system'].includes(j.message_type as string) ? j.message_type : 'text') as MessageType,
  metadata: (j.metadata as Record<string, unknown>) ?? null,
  readBy: (j.read_by as string[]) ?? [],
})

const toPlace = (j: Record<string, unknown>): SavedPlace => ({
  id: j.id as string,
  userId: j.user_id as string,
  label: j.label as string,
  category: (j.category as string) ?? null,
  note: (j.note as string) ?? null,
  lat: Number(j.latitude),
  lng: Number(j.longitude),
  address: (j.address as string) ?? null,
  updatedAt: j.updated_at as string,
})

async function membershipOf(userId: string): Promise<{ family_group_id: string; role: string; family_groups: { name?: string } | null } | null> {
  const { data, error } = await db().from('family_members').select('family_group_id, role, family_groups(name)').eq('user_id', userId).limit(1)
  if (error) throw error
  return (data?.[0] as never) ?? null
}

const quotedName = (m: { family_groups: { name?: string } | null } | null) => {
  const n = m?.family_groups?.name?.trim()
  return n ? ` ("${n}")` : ''
}

async function addMember(familyGroupId: string, userId: string, name: string, role: string) {
  const { error } = await db().from('family_members').insert({ family_group_id: familyGroupId, user_id: userId, name, role, is_location_sharing_enabled: false })
  if (error) throw error
}

async function memberName(familyGroupId: string, userId: string): Promise<string> {
  const { data } = await db().from('family_members').select('name').eq('family_group_id', familyGroupId).eq('user_id', userId).maybeSingle()
  return (data?.name as string) ?? 'User'
}

export const FamilyRepo = {
  /** The user's family, or null. Throws if the lookup fails (never reads as "no family"). */
  async findFamilyForUser(userId: string): Promise<FamilyGroup | null> {
    try {
      const m = await membershipOf(userId)
      if (!m) return null
      const { data, error } = await db().from('family_groups').select().eq('id', m.family_group_id).maybeSingle()
      if (error) throw error
      if (!data) throw new FamilyError('Your family could not be loaded. Please try again.')
      return toGroup(data)
    } catch (e) {
      wrap(e)
    }
  },

  async createFamily(name: string, headId: string, headName: string, description?: string): Promise<FamilyGroup> {
    try {
      const existing = await membershipOf(headId)
      if (existing) throw new FamilyError(`You are already in a family${quotedName(existing)}. Leave it before creating a new one.`, ALREADY_MEMBER)
      // A family this user heads without being in it is left from a half-failed create: reuse it.
      const { data: orphans } = await db().from('family_groups').select().eq('head_id', headId).limit(1)
      if (orphans && orphans.length) {
        await addMember(orphans[0].id, headId, headName, 'head')
        const { data, error } = await db().from('family_groups').update({ name }).eq('id', orphans[0].id).select().single()
        if (error) throw error
        return toGroup(data)
      }
      let created: Record<string, unknown> | null = null
      for (let attempt = 0; !created; attempt++) {
        const { data, error } = await db()
          .from('family_groups')
          .insert({ name, head_id: headId, invite_code: randomInviteCode(), description: description ?? null })
          .select()
          .single()
        if (error) {
          if (error.code === '23505' && error.message.includes('invite_code') && attempt < 4) continue
          throw error
        }
        created = data
      }
      try {
        await addMember(created.id as string, headId, headName, 'head')
      } catch (e) {
        await db().from('family_groups').delete().eq('id', created.id)
        throw e
      }
      return toGroup(created)
    } catch (e) {
      wrap(e)
    }
  },

  /** Returns the family's name to show while the request waits. */
  async requestToJoin(inviteCode: string, userId: string, userName: string): Promise<string | null> {
    try {
      const code = normalizeInviteCode(inviteCode)
      let family: { id: string; name: string } | null = null
      const rpc = await db().rpc('find_family_by_invite_code', { p_code: code })
      if (rpc.error) {
        if (rpc.error.code !== 'PGRST202' && rpc.error.code !== '42883') throw rpc.error
        const { data } = await db().from('family_groups').select('id, name').ilike('invite_code', code).maybeSingle()
        family = data
      } else {
        family = (rpc.data as { id: string; name: string }[])?.[0] ?? null
      }
      if (!family) throw new FamilyError('Invalid invite code. Please check and try again.')
      const existing = await membershipOf(userId)
      if (existing) {
        if (existing.family_group_id === family.id) throw new FamilyError('You are already a member of this family.', ALREADY_MEMBER)
        throw new FamilyError(`You are already in a family${quotedName(existing)}. Leave it before joining another.`, ALREADY_MEMBER)
      }
      const { data: pending } = await db()
        .from('family_join_requests')
        .select('id')
        .eq('family_group_id', family.id)
        .eq('requester_user_id', userId)
        .eq('status', 'pending')
        .maybeSingle()
      if (pending) throw new FamilyError('A join request is already pending.')
      const { error } = await db().from('family_join_requests').insert({ family_group_id: family.id, requester_user_id: userId, requester_name: userName, status: 'pending' })
      if (error) throw error
      return family.name
    } catch (e) {
      wrap(e)
    }
  },

  async ownPendingRequest(userId: string): Promise<boolean> {
    if (!supabase) return false
    const { data } = await db().from('family_join_requests').select('id').eq('requester_user_id', userId).eq('status', 'pending').limit(1)
    return (data?.length ?? 0) > 0
  },

  async pendingRequests(familyGroupId: string): Promise<JoinRequest[]> {
    const { data } = await db().from('family_join_requests').select().eq('family_group_id', familyGroupId).eq('status', 'pending').order('created_at', { ascending: true })
    return (data ?? []).map(toRequest)
  },

  async approveRequest(requestId: string, headId: string): Promise<void> {
    try {
      const { data: req, error } = await db().from('family_join_requests').select().eq('id', requestId).single()
      if (error) throw error
      if ((req.status ?? 'pending') !== 'pending') throw new FamilyError('This request is no longer pending.')
      const { data: fam } = await db().from('family_groups').select('head_id').eq('id', req.family_group_id).single()
      if (fam?.head_id !== headId) throw new FamilyError('Only the family head can approve join requests.')
      const name = (req.requester_name as string) ?? 'User'
      const existing = await membershipOf(req.requester_user_id)
      if (existing && existing.family_group_id !== req.family_group_id)
        throw new FamilyError(`${name} is already in another family. They need to leave it before they can join yours.`, ALREADY_MEMBER)
      if (!existing) {
        try {
          await addMember(req.family_group_id, req.requester_user_id, name, 'member')
        } catch (e) {
          const pe = e as { code?: string; message?: string }
          if (pe.code === '23505' && pe.message?.includes('one_family_per_user'))
            throw new FamilyError(`${name} is already in another family. They need to leave it before they can join yours.`, ALREADY_MEMBER)
          throw e
        }
      }
      await db().from('family_join_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: headId }).eq('id', requestId)
      try {
        await FamilyRepo.sendMessage(req.family_group_id, headId, `${name} joined the family`, 'system')
      } catch {
        // The member is in; a failed notice must not report the approval as failed.
      }
    } catch (e) {
      wrap(e)
    }
  },

  async rejectRequest(requestId: string, headId: string): Promise<void> {
    try {
      const { data: req, error } = await db().from('family_join_requests').select('family_group_id, status').eq('id', requestId).single()
      if (error) throw error
      if ((req.status ?? 'pending') !== 'pending') throw new FamilyError('This request is no longer pending.')
      const { data: fam } = await db().from('family_groups').select('head_id').eq('id', req.family_group_id).single()
      if (fam?.head_id !== headId) throw new FamilyError('Only the family head can reject join requests.')
      await db().from('family_join_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: headId }).eq('id', requestId)
    } catch (e) {
      wrap(e)
    }
  },

  /** A head leaving disbands the family. */
  async leaveFamily(familyGroupId: string, userId: string): Promise<void> {
    try {
      const { data: m } = await db().from('family_members').select('family_group_id, role').eq('family_group_id', familyGroupId).eq('user_id', userId).maybeSingle()
      if (!m) throw new FamilyError('You are not a member of this family.')
      const { data: fam, error } = await db().from('family_groups').select().eq('id', familyGroupId).single()
      if (error) throw error
      if (fam.head_id === userId) {
        const { data: deleted, error: delErr } = await db().from('family_groups').delete().eq('id', familyGroupId).select('id')
        if (delErr) throw delErr
        if (!deleted?.length) throw new FamilyError('Could not disband the family. Please try again later.')
      } else {
        const name = await memberName(familyGroupId, userId)
        await db().from('family_members').delete().eq('family_group_id', familyGroupId).eq('user_id', userId)
        await FamilyRepo.sendMessage(familyGroupId, userId, 'Left the family', 'system', undefined, name)
      }
    } catch (e) {
      wrap(e)
    }
  },

  async updateFamilyName(familyGroupId: string, name: string, headId: string) {
    const { error } = await db().from('family_groups').update({ name }).eq('id', familyGroupId).eq('head_id', headId)
    if (error) wrap(error)
  },

  async removeMember(familyGroupId: string, memberId: string, headId: string) {
    try {
      const { error } = await db().from('family_members').delete().eq('family_group_id', familyGroupId).eq('user_id', memberId)
      if (error) throw error
      await FamilyRepo.sendMessage(familyGroupId, headId, 'Member removed', 'system', { removed_user_id: memberId })
    } catch (e) {
      wrap(e)
    }
  },

  async members(familyGroupId: string): Promise<FamilyMember[]> {
    const { data } = await db().from('family_members').select().eq('family_group_id', familyGroupId).order('joined_at', { ascending: true })
    return (data ?? []).map(toMember)
  },

  async setLocationSharing(familyGroupId: string, userId: string, enabled: boolean) {
    const { error } = await db()
      .from('family_members')
      .update({ is_location_sharing_enabled: enabled, last_active_at: new Date().toISOString() })
      .eq('family_group_id', familyGroupId)
      .eq('user_id', userId)
    if (error) wrap(error)
  },

  async updateLocation(userId: string, familyGroupId: string, lat: number, lng: number, accuracy: number | null) {
    const { data: m } = await db().from('family_members').select('is_location_sharing_enabled').eq('family_group_id', familyGroupId).eq('user_id', userId).maybeSingle()
    if (!m?.is_location_sharing_enabled) return
    await db().from('family_locations').insert({ user_id: userId, family_group_id: familyGroupId, latitude: lat, longitude: lng, accuracy, timestamp: new Date().toISOString() })
    db().rpc('cleanup_old_locations').then(() => {}, () => {})
    await db().from('family_members').update({ last_active_at: new Date().toISOString() }).eq('family_group_id', familyGroupId).eq('user_id', userId)
  },

  /** Latest position per member from the last 24 hours. */
  async memberLocations(familyGroupId: string): Promise<Record<string, MemberLocation>> {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data } = await db().from('family_locations').select().eq('family_group_id', familyGroupId).gte('timestamp', since).order('timestamp', { ascending: false })
    const out: Record<string, MemberLocation> = {}
    for (const row of data ?? []) {
      if (out[row.user_id]) continue
      out[row.user_id] = { lat: Number(row.latitude), lng: Number(row.longitude), accuracy: row.accuracy == null ? null : Number(row.accuracy), timestamp: row.timestamp }
    }
    return out
  },

  async sendMessage(familyGroupId: string, senderId: string, message: string, type: MessageType, metadata?: Record<string, unknown>, senderName?: string): Promise<FamilyMessage> {
    const { data, error } = await db()
      .from('family_messages')
      .insert({ family_group_id: familyGroupId, sender_id: senderId, message, message_type: type, metadata: metadata ?? null, timestamp: new Date().toISOString(), read_by: [] })
      .select()
      .single()
    if (error) wrap(error)
    return toMessage(data, senderName ? { [senderId]: senderName } : {})
  },

  async messages(familyGroupId: string, names: Record<string, string>, limit = 50): Promise<FamilyMessage[]> {
    const { data } = await db().from('family_messages').select().eq('family_group_id', familyGroupId).order('timestamp', { ascending: false }).range(0, limit - 1)
    return (data ?? []).map((j) => toMessage(j, names)).reverse()
  },

  async markRead(messageId: string, userId: string) {
    const { data } = await db().from('family_messages').select('read_by').eq('id', messageId).single()
    const readBy: string[] = data?.read_by ?? []
    if (!readBy.includes(userId)) await db().from('family_messages').update({ read_by: [...readBy, userId] }).eq('id', messageId)
  },

  async updateProgress(userId: string, familyGroupId: string, p: { ritualSessionId: string | null; stage: string | null; isActive: boolean }) {
    await db()
      .from('family_progress')
      .upsert(
        { user_id: userId, family_group_id: familyGroupId, ritual_session_id: p.ritualSessionId, current_stage: p.stage, is_active: p.isActive, last_progress_update: new Date().toISOString() },
        { onConflict: 'user_id,family_group_id' },
      )
  },

  async memberProgress(familyGroupId: string): Promise<Record<string, MemberProgress>> {
    const { data } = await db().from('family_progress').select().eq('family_group_id', familyGroupId)
    const out: Record<string, MemberProgress> = {}
    for (const r of data ?? [])
      out[r.user_id] = { userId: r.user_id, stage: r.current_stage, isActive: r.is_active ?? false, ritualSessionId: r.ritual_session_id, updatedAt: r.last_progress_update }
    return out
  },

  // --- Saved places (Home Finder) ---

  async placesFor(userIds: string[]): Promise<SavedPlace[]> {
    if (!supabase || !userIds.length) return []
    const { data, error } = await db().from('saved_locations').select().in('user_id', userIds).order('updated_at', { ascending: false })
    if (error) wrap(error)
    return (data ?? []).map(toPlace)
  },

  async savePlace(p: { id?: string; userId: string; label: string; lat: number; lng: number; category?: string | null; note?: string | null; address?: string | null }): Promise<SavedPlace> {
    const now = new Date().toISOString()
    const clean = (s?: string | null) => (s?.trim() ? s.trim() : null)
    const payload: Record<string, unknown> = {
      id: p.id ?? crypto.randomUUID(),
      user_id: p.userId,
      label: p.label.trim(),
      category: clean(p.category),
      note: clean(p.note),
      latitude: p.lat,
      longitude: p.lng,
      address: clean(p.address),
      updated_at: now,
    }
    if (!p.id) payload.created_at = now
    const { data, error } = await db().from('saved_locations').upsert(payload, { onConflict: 'id' }).select().single()
    if (error) wrap(error)
    return toPlace(data)
  },

  async deletePlace(id: string) {
    const { error } = await db().from('saved_locations').delete().eq('id', id)
    if (error) wrap(error)
  },
}

/** Place kinds for saved pins (map_marker_icons.dart PlaceKind). */
export function placeKind(category: string | null): { label: string; color: string; emoji: string } {
  const c = (category ?? '').trim().toLowerCase()
  if (c === 'home' || c.includes('hotel')) return { label: 'Home', color: '#F59E0B', emoji: '🏨' }
  if (c === 'mina' || c.includes('tent')) return { label: 'Mina', color: '#8B5CF6', emoji: '⛺' }
  if (c.includes('washroom') || c.includes('toilet') || c === 'wc') return { label: 'Washroom', color: '#0EA5E9', emoji: '🚻' }
  return { label: 'Place', color: '#EC4899', emoji: '📍' }
}
