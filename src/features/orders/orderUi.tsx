import clsx from 'clsx'
import L from 'leaflet'
import { CheckCircle2, Crosshair, MessageCircle, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Button, Sheet } from '../../components/ui'
import { ENQUIRY_DISCLAIMER } from '../food/foodData'

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mb-4">
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={s} className={clsx('h-1.5 flex-1 rounded-full', i <= current ? 'bg-primary' : 'bg-surface-2')} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        Step {current + 1} of {steps.length} · <span className="font-semibold text-ink">{steps[current]}</span>
      </p>
    </div>
  )
}

export function Counter({ label, value, min = 0, max = 99, onChange, hint }: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <button aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-40">
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center text-lg font-bold text-ink tabular-nums">{value}</span>
      <button aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-full border border-line disabled:opacity-40">
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export function DisclaimerAccept({ accepted, onChange }: { accepted: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="rounded-2xl border border-gold/40 bg-gold-soft p-4">
      <p className="text-sm font-semibold text-ink">By submitting this enquiry, you agree to our terms and conditions:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
        {ENQUIRY_DISCLAIMER.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
        <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={accepted} onChange={(e) => onChange(e.target.checked)} />
        I have read and accept these terms
      </label>
    </div>
  )
}

export function EnquirySubmitted({ open, kind, onClose }: { open: boolean; kind: 'food meal' | 'transport'; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Enquiry submitted">
      <div className="flex gap-3">
        <CheckCircle2 className="size-8 shrink-0 text-primary" />
        <p className="text-ink">
          Your {kind} enquiry was received. Our team will contact you on WhatsApp using the phone number you provided.
          <br />
          <br />
          Please check WhatsApp for confirmation and updates.
        </p>
      </div>
      <Button className="mt-4 w-full" onClick={onClose}>
        <MessageCircle className="size-4" /> Got it
      </Button>
    </Sheet>
  )
}

const pinIcon = L.divIcon({
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#059669;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 15))
  }, [map, lat, lng])
  return null
}

/** Pick a point by tapping the map or using the device location. */
export function LocationPicker({
  value,
  fallback,
  onChange,
  height = 220,
}: {
  value: { lat: number; lng: number } | null
  fallback: { lat: number; lng: number }
  onChange: (lat: number, lng: number) => void
  height?: number
}) {
  const [locating, setLocating] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const center = value ?? fallback
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line" style={{ height }}>
        <MapContainer center={[center.lat, center.lng]} zoom={value ? 16 : 13} className="size-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <ClickToPlace onPick={onChange} />
          {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
          {value && <Recenter lat={value.lat} lng={value.lng} />}
        </MapContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          loading={locating}
          onClick={() => {
            setLocating(true)
            setErr(null)
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setLocating(false)
                onChange(p.coords.latitude, p.coords.longitude)
              },
              (e) => {
                setLocating(false)
                setErr(e.code === e.PERMISSION_DENIED ? 'Location permission is blocked.' : 'Could not get your location.')
              },
              { enableHighAccuracy: true, timeout: 15000 },
            )
          }}
        >
          <Crosshair className="size-4" /> Use current location
        </Button>
        <span className="text-xs text-muted">{value ? `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'or tap the map to drop a pin'}</span>
      </div>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  return (
    <span
      className={clsx(
        'rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
        s === 'pending' && 'bg-gold-soft text-ink',
        (s === 'confirmed' || s === 'assigned' || s === 'ready' || s === 'preparing' || s === 'inprogress') && 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
        s === 'completed' && 'bg-primary/15 text-primary',
        s === 'cancelled' && 'bg-danger/15 text-danger',
      )}
    >
      {s === 'inprogress' ? 'In progress' : status}
    </span>
  )
}
