import clsx from 'clsx'
import { Navigation, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, Empty, Field, Notice, Page, PageHeader, Sheet, Spinner } from '../../components/ui'
import { distanceMeters, formatDistance } from '../../lib/geo'
import { HolySites } from '../../lib/holySites'
import { load, save } from '../../lib/storage'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../store/auth'
import { useLocation } from '../../store/location'
import { FamilyRepo, placeKind, type SavedPlace } from '../family/familyRepo'
import { LocationPicker } from '../orders/orderUi'

const LOCAL_KEY = 'saved_places_v1'
const KINDS = [
  { value: 'home', label: '🏨 Hotel / home' },
  { value: 'mina', label: '⛺ Mina tent' },
  { value: 'washroom', label: '🚻 Washroom' },
  { value: '', label: '📍 Other' },
]

type Draft = { id?: string; label: string; category: string; note: string; address: string; point: { lat: number; lng: number } | null }

/** Save your hotel, tent and other spots, then get walking directions back (home_finder_screen.dart). */
export function HomeFinderScreen() {
  const user = useAuth((s) => s.user)
  const { place, locate } = useLocation()
  const shared = isSupabaseConfigured && !!user && !user.isPreview
  const [places, setPlaces] = useState<SavedPlace[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    if (!shared) return setPlaces(load<SavedPlace[]>(LOCAL_KEY, []))
    try {
      setPlaces(await FamilyRepo.placesFor([user!.id]))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load places')
      setPlaces([])
    }
  }
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared])

  async function submit() {
    if (!draft?.point || !draft.label.trim() || !user) return
    setBusy(true)
    try {
      if (shared) {
        await FamilyRepo.savePlace({ id: draft.id, userId: user.id, label: draft.label, lat: draft.point.lat, lng: draft.point.lng, category: draft.category, note: draft.note, address: draft.address })
      } else {
        const now = new Date().toISOString()
        const row: SavedPlace = { id: draft.id ?? crypto.randomUUID(), userId: user.id, label: draft.label.trim(), category: draft.category || null, note: draft.note.trim() || null, address: draft.address.trim() || null, lat: draft.point.lat, lng: draft.point.lng, updatedAt: now }
        save(LOCAL_KEY, [row, ...load<SavedPlace[]>(LOCAL_KEY, []).filter((p) => p.id !== row.id)])
      }
      setDraft(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (shared) await FamilyRepo.deletePlace(id).catch((e) => setError(e.message))
    else save(LOCAL_KEY, load<SavedPlace[]>(LOCAL_KEY, []).filter((p) => p.id !== id))
    refresh()
  }

  return (
    <Page>
      <PageHeader title="Home Finder" subtitle="Save places, find your way back" />
      {!shared && <div className="mb-3"><Notice tone="info">Saved on this device. Sign in to share your places with your family on the Family map.</Notice></div>}
      {error && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <Button
        className="mb-3 w-full"
        onClick={() => {
          locate()
          setDraft({ label: '', category: 'home', note: '', address: '', point: place.isFallback ? null : { lat: place.lat, lng: place.lng } })
        }}
      >
        <Plus className="size-4" /> Save a place
      </Button>
      {!places ? (
        <Spinner />
      ) : places.length === 0 ? (
        <Empty title="No saved places">Save your hotel before you head out to the Haram, so you can always walk back.</Empty>
      ) : (
        <div className="space-y-2">
          {places.map((p) => {
            const k = placeKind(p.category)
            const d = place.isFallback ? null : distanceMeters(place.lat, place.lng, p.lat, p.lng)
            return (
              <Card key={p.id}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl text-xl" style={{ background: k.color }}>{k.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{p.label}</p>
                    <p className="text-xs text-muted">{k.label}{d != null ? ` · ${formatDistance(d)} away` : ''}</p>
                    {p.address && <p className="text-sm text-muted">{p.address}</p>}
                    {p.note && <p className="text-sm text-ink">{p.note}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-sm font-semibold text-on-primary"
                      >
                        <Navigation className="size-4" /> Directions
                      </a>
                      <Button variant="ghost" onClick={() => setDraft({ id: p.id, label: p.label, category: p.category ?? '', note: p.note ?? '', address: p.address ?? '', point: { lat: p.lat, lng: p.lng } })}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                      <Button variant="ghost" className="text-danger" onClick={() => remove(p.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Sheet open={draft != null} onClose={() => setDraft(null)} title={draft?.id ? 'Edit place' : 'Save a place'}>
        {draft && (
          <div className="space-y-3">
            <Field label="Name" placeholder="e.g. Hilton Suites, room 812" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <button key={k.value} onClick={() => setDraft({ ...draft, category: k.value })} className={clsx('rounded-xl border px-2 py-2 text-sm', draft.category === k.value ? 'border-primary bg-primary/10 text-ink' : 'border-line text-muted')}>
                  {k.label}
                </button>
              ))}
            </div>
            <LocationPicker value={draft.point} fallback={place.isFallback ? HolySites.kaaba : place} onChange={(lat, lng) => setDraft({ ...draft, point: { lat, lng } })} height={200} />
            <Field label="Address (optional)" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            <Field label="Note (optional)" placeholder="e.g. Gate 79, turn left" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            <Button className="w-full" loading={busy} disabled={!draft.label.trim() || !draft.point} onClick={submit}>Save</Button>
          </div>
        )}
      </Sheet>
    </Page>
  )
}
