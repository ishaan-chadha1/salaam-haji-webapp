import type { RealtimeChannel } from '@supabase/supabase-js'
import { create } from 'zustand'
import { distanceMeters } from '../../lib/geo'
import { supabase } from '../../lib/supabase'
import { preferredName, useAuth } from '../../store/auth'
import { useRitual } from '../ritual/ritualStore'
import {
  FamilyRepo,
  toMessage,
  type FamilyGroup,
  type FamilyMember,
  type FamilyMessage,
  type JoinRequest,
  type MemberLocation,
  type MemberProgress,
  type SavedPlace,
} from './familyRepo'

type Status = 'idle' | 'loading' | 'ready' | 'error'

type FamilyState = {
  status: Status
  error: string | null
  info: string | null
  family: FamilyGroup | null
  members: FamilyMember[]
  requests: JoinRequest[]
  hasPendingRequest: boolean
  pendingFamilyName: string | null
  locations: Record<string, MemberLocation>
  progress: Record<string, MemberProgress>
  places: SavedPlace[]
  messages: FamilyMessage[]
  sharing: boolean
  sharingError: string | null
  busy: boolean

  load: () => Promise<void>
  refresh: () => Promise<void>
  create: (name: string) => Promise<void>
  join: (code: string) => Promise<void>
  leave: () => Promise<void>
  rename: (name: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  approve: (id: string) => Promise<void>
  reject: (id: string) => Promise<void>
  sendMessage: (text: string) => Promise<void>
  shareMyLocationOnce: () => Promise<void>
  setSharing: (on: boolean) => Promise<void>
  clearNotices: () => void
}

let channels: RealtimeChannel[] = []
let watchId: number | null = null
let lastSent: { lat: number; lng: number; at: number } | null = null

const uid = () => useAuth.getState().user?.id ?? null
const PENDING_KEY = 'family_pending_name'

function unsubscribe() {
  channels.forEach((c) => supabase?.removeChannel(c))
  channels = []
}

function stopWatch() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId)
  watchId = null
}

export const useFamily = create<FamilyState>((set, get) => {
  async function run(fn: () => Promise<void>, success?: string) {
    set({ busy: true, error: null, info: null })
    try {
      await fn()
      if (success) set({ info: success })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      set({ busy: false })
    }
  }

  const names = () => Object.fromEntries(get().members.map((m) => [m.userId, m.name]))

  async function loadDetails(family: FamilyGroup) {
    const members = await FamilyRepo.members(family.id)
    const me = uid()
    const [locations, progress, places, requests] = await Promise.all([
      FamilyRepo.memberLocations(family.id),
      FamilyRepo.memberProgress(family.id),
      FamilyRepo.placesFor(members.map((m) => m.userId)).catch(() => []),
      family.headId === me ? FamilyRepo.pendingRequests(family.id) : Promise.resolve([]),
    ])
    set({ members, locations, progress, places, requests })
    const messages = await FamilyRepo.messages(family.id, Object.fromEntries(members.map((m) => [m.userId, m.name])))
    set({ messages })
    // Sharing is saved on the member row; pick it back up if the browser already allows location.
    const mine = members.find((m) => m.userId === me)
    if (mine?.isLocationSharingEnabled && !get().sharing) {
      const perm = await navigator.permissions?.query({ name: 'geolocation' }).catch(() => null)
      if (perm?.state === 'granted') startWatch()
    }
  }

  function subscribe(familyId: string) {
    if (!supabase) return
    unsubscribe()
    const on = (table: string, handler: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void) => {
      const ch = supabase!
        .channel(`${table}_${familyId}`)
        .on('postgres_changes' as never, { event: '*', schema: 'public', table, filter: `family_group_id=eq.${familyId}` }, handler as never)
        .subscribe()
      channels.push(ch)
    }
    on('family_members', () => get().refresh())
    on('family_join_requests', () => {
      const f = get().family
      if (f && f.headId === uid()) FamilyRepo.pendingRequests(f.id).then((requests) => set({ requests }))
    })
    on('family_progress', () => {
      const f = get().family
      if (f) FamilyRepo.memberProgress(f.id).then((progress) => set({ progress }))
    })
    on('family_locations', (p) => {
      const r = p.new
      if (!r?.user_id) return
      set({
        locations: {
          ...get().locations,
          [r.user_id as string]: { lat: Number(r.latitude), lng: Number(r.longitude), accuracy: r.accuracy == null ? null : Number(r.accuracy), timestamp: r.timestamp as string },
        },
      })
    })
    on('family_messages', (p) => {
      if (p.eventType !== 'INSERT' || !p.new?.id) return
      if (get().messages.some((m) => m.id === p.new.id)) return
      set({ messages: [...get().messages, toMessage(p.new, names())] })
    })
  }

  function startWatch() {
    const f = get().family
    const me = uid()
    if (!f || !me || !('geolocation' in navigator)) return
    stopWatch()
    set({ sharing: true, sharingError: null })
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        const now = Date.now()
        // Throttle: every 30 s, or sooner after moving 25 m.
        if (lastSent && now - lastSent.at < 30_000 && distanceMeters(lastSent.lat, lastSent.lng, lat, lng) < 25) return
        lastSent = { lat, lng, at: now }
        FamilyRepo.updateLocation(me, f.id, lat, lng, accuracy).catch(() => {})
        set({ locations: { ...get().locations, [me]: { lat, lng, accuracy, timestamp: new Date().toISOString() } } })
      },
      (e) => set({ sharingError: e.code === e.PERMISSION_DENIED ? 'Location is blocked in this browser.' : 'Could not get your location.' }),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 },
    )
  }

  return {
    status: 'idle',
    error: null,
    info: null,
    family: null,
    members: [],
    requests: [],
    hasPendingRequest: false,
    pendingFamilyName: null,
    locations: {},
    progress: {},
    places: [],
    messages: [],
    sharing: false,
    sharingError: null,
    busy: false,

    load: async () => {
      const me = uid()
      if (!me || !supabase) return set({ status: 'ready' })
      set({ status: get().family ? 'ready' : 'loading', error: null })
      try {
        const family = await FamilyRepo.findFamilyForUser(me)
        if (!family) {
          unsubscribe()
          stopWatch()
          const hasPendingRequest = await FamilyRepo.ownPendingRequest(me)
          let pendingFamilyName: string | null = null
          try {
            pendingFamilyName = hasPendingRequest ? localStorage.getItem(PENDING_KEY) : null
          } catch {
            // ignore
          }
          set({ status: 'ready', family: null, members: [], messages: [], hasPendingRequest, pendingFamilyName, sharing: false })
          return
        }
        const wasPending = get().hasPendingRequest
        set({ family, status: 'ready', hasPendingRequest: false, pendingFamilyName: null, info: wasPending ? `You're in! Welcome to ${family.name}.` : get().info })
        subscribe(family.id)
        await loadDetails(family)
        syncProgress()
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    },

    refresh: async () => {
      const f = get().family
      if (!f) return get().load()
      await loadDetails(f).catch(() => {})
      // Removed from the family while the page was open.
      if (!get().members.some((m) => m.userId === uid())) await get().load()
    },

    create: (name) =>
      run(async () => {
        const user = useAuth.getState().user
        if (!user) return
        await FamilyRepo.createFamily(name.trim(), user.id, preferredName(user))
        await get().load()
      }, 'Family created. Share the invite code with your family.'),

    join: (code) =>
      run(async () => {
        const user = useAuth.getState().user
        if (!user) return
        const name = await FamilyRepo.requestToJoin(code, user.id, preferredName(user))
        try {
          if (name) localStorage.setItem(PENDING_KEY, name)
        } catch {
          // ignore
        }
        set({ hasPendingRequest: true, pendingFamilyName: name })
      }, 'Request sent. The family head needs to approve it.'),

    leave: () =>
      run(async () => {
        const f = get().family
        const me = uid()
        if (!f || !me) return
        stopWatch()
        await FamilyRepo.leaveFamily(f.id, me)
        unsubscribe()
        set({ family: null, members: [], messages: [], requests: [], locations: {}, places: [], sharing: false })
      }, 'You left the family.'),

    rename: (name) =>
      run(async () => {
        const f = get().family
        const me = uid()
        if (!f || !me) return
        await FamilyRepo.updateFamilyName(f.id, name.trim(), me)
        set({ family: { ...f, name: name.trim() } })
      }),

    removeMember: (userId) =>
      run(async () => {
        const f = get().family
        const me = uid()
        if (!f || !me) return
        await FamilyRepo.removeMember(f.id, userId, me)
        await get().refresh()
      }),

    approve: (id) =>
      run(async () => {
        const me = uid()
        if (!me) return
        await FamilyRepo.approveRequest(id, me)
        await get().refresh()
      }, 'Request approved.'),

    reject: (id) =>
      run(async () => {
        const me = uid()
        if (!me) return
        await FamilyRepo.rejectRequest(id, me)
        set({ requests: get().requests.filter((r) => r.id !== id) })
      }),

    sendMessage: async (text) => {
      const f = get().family
      const user = useAuth.getState().user
      if (!f || !user || !text.trim()) return
      try {
        const msg = await FamilyRepo.sendMessage(f.id, user.id, text.trim(), 'text', undefined, preferredName(user))
        if (!get().messages.some((m) => m.id === msg.id)) set({ messages: [...get().messages, msg] })
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) })
      }
    },

    shareMyLocationOnce: async () => {
      const f = get().family
      const user = useAuth.getState().user
      if (!f || !user) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          FamilyRepo.sendMessage(f.id, user.id, 'Shared my location', 'location', { latitude: lat, longitude: lng }, preferredName(user))
            .then((msg) => set({ messages: [...get().messages, msg] }))
            .catch((e) => set({ error: e.message }))
        },
        () => set({ error: 'Could not get your location.' }),
        { enableHighAccuracy: true, timeout: 15000 },
      )
    },

    setSharing: async (on) => {
      const f = get().family
      const me = uid()
      if (!f || !me) return
      if (on) {
        await FamilyRepo.setLocationSharing(f.id, me, true)
        startWatch()
      } else {
        stopWatch()
        lastSent = null
        await FamilyRepo.setLocationSharing(f.id, me, false)
        set({ sharing: false })
      }
      set({ members: get().members.map((m) => (m.userId === me ? { ...m, isLocationSharingEnabled: on } : m)) })
    },

    clearNotices: () => set({ error: null, info: null }),
  }
})

// A different account signing in must never see the previous one's family.
let lastUser = useAuth.getState().user?.id ?? null
useAuth.subscribe((a) => {
  const id = a.user?.id ?? null
  if (id === lastUser) return
  lastUser = id
  unsubscribe()
  stopWatch()
  lastSent = null
  useFamily.setState({ status: 'idle', error: null, info: null, family: null, members: [], requests: [], hasPendingRequest: false, pendingFamilyName: null, locations: {}, progress: {}, places: [], messages: [], sharing: false })
})

/** Pushes the local ritual state to family_progress (family_progress_sync.dart). */
function syncProgress() {
  const f = useFamily.getState().family
  const me = uid()
  if (!f || !me) return
  const s = useRitual.getState().session
  const active = !!s && s.pauseStart == null
  FamilyRepo.updateProgress(me, f.id, { ritualSessionId: s?.id ?? null, stage: s?.stage ?? null, isActive: active }).catch(() => {})
}

let lastKey = ''
useRitual.subscribe((st) => {
  const s = st.session
  const key = s ? `${s.id}|${s.stage}|${s.pauseStart == null}` : 'none'
  if (key === lastKey) return
  lastKey = key
  syncProgress()
})
