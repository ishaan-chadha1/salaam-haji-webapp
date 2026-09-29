import clsx from 'clsx'
import { Plus, RotateCcw, Star, Trash2, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { Button, Field, Page, PageHeader, Sheet } from '../../components/ui'
import { load, save } from '../../lib/storage'

type Dhikr = { id: string; name: string; arabic?: string; target: number; count: number; total: number; favorite: boolean; custom?: boolean }

const PRESETS: Dhikr[] = [
  { id: 'subhanallah', name: 'SubhanAllah', arabic: 'سُبْحَانَ اللَّهِ', target: 33, count: 0, total: 0, favorite: true },
  { id: 'alhamdulillah', name: 'Alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', target: 33, count: 0, total: 0, favorite: true },
  { id: 'allahuakbar', name: 'Allahu Akbar', arabic: 'اللَّهُ أَكْبَرُ', target: 34, count: 0, total: 0, favorite: true },
  { id: 'astaghfirullah', name: 'Astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', target: 100, count: 0, total: 0, favorite: false },
  { id: 'tahlil', name: 'La ilaha illallah', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 100, count: 0, total: 0, favorite: false },
  { id: 'salawat', name: 'Salawat', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', target: 100, count: 0, total: 0, favorite: false },
  { id: 'talbiyah', name: 'Talbiyah', arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ', target: 100, count: 0, total: 0, favorite: false },
]

const KEY = 'tasbih_v1'

let audio: AudioContext | null = null
function click() {
  try {
    audio ??= new AudioContext()
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.08, audio.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.06)
    o.connect(g).connect(audio.destination)
    o.start()
    o.stop(audio.currentTime + 0.07)
  } catch {
    // no audio
  }
}

export function TasbihScreen() {
  const [list, setList] = useState<Dhikr[]>(() => load(KEY, PRESETS))
  const [activeId, setActiveId] = useState(list[0].id)
  const [sound, setSound] = useState(() => load('tasbih_sound', false))
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', target: '33' })
  const active = list.find((d) => d.id === activeId) ?? list[0]

  const update = (next: Dhikr[]) => {
    setList(next)
    save(KEY, next)
  }

  function tap() {
    const count = active.count + 1
    const done = count >= active.target
    update(list.map((d) => (d.id === active.id ? { ...d, count: done ? 0 : count, total: d.total + 1 } : d)))
    if (sound) click()
    try {
      navigator.vibrate?.(done ? [120, 60, 120] : 12)
    } catch {
      // unsupported
    }
  }

  const pct = active.count / active.target
  const r = 110
  const circ = 2 * Math.PI * r

  return (
    <Page>
      <PageHeader
        title="Tasbih"
        subtitle="Tap anywhere on the circle"
        action={
          <button aria-label={sound ? 'Sound off' : 'Sound on'} onClick={() => { setSound(!sound); save('tasbih_sound', !sound) }} className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
        }
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {[...list].sort((a, b) => Number(b.favorite) - Number(a.favorite)).map((d) => (
          <button key={d.id} onClick={() => setActiveId(d.id)} className={clsx('shrink-0 rounded-full border px-3 py-1.5 text-sm', d.id === active.id ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink')}>
            {d.favorite && '★ '}{d.name}
          </button>
        ))}
        <button onClick={() => setAddOpen(true)} className="grid shrink-0 place-items-center rounded-full border border-dashed border-line px-3 text-muted" aria-label="Add dhikr"><Plus className="size-4" /></button>
      </div>

      <div className="mt-4 flex flex-col items-center">
        <button onClick={tap} aria-label={`Count ${active.name}`} className="relative grid size-72 place-items-center rounded-full select-none active:scale-[0.98]">
          <svg viewBox="0 0 260 260" className="absolute inset-0 size-full -rotate-90">
            <circle cx="130" cy="130" r={r} fill="var(--surface)" stroke="var(--surface-2)" strokeWidth="16" />
            <circle cx="130" cy="130" r={r} fill="none" stroke="var(--primary)" strokeWidth="16" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} className="transition-all duration-150" />
          </svg>
          <span className="relative text-center">
            {active.arabic && <span className="arabic block text-2xl text-gold">{active.arabic}</span>}
            <span className="block text-6xl font-bold text-ink tabular-nums">{active.count}</span>
            <span className="block text-sm text-muted">of {active.target}</span>
          </span>
        </button>
        <p className="mt-4 text-sm text-muted">{active.name} · {active.total.toLocaleString()} all time</p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => update(list.map((d) => (d.id === active.id ? { ...d, count: 0 } : d)))}><RotateCcw className="size-4" /> Reset</Button>
          <Button variant="secondary" onClick={() => update(list.map((d) => (d.id === active.id ? { ...d, favorite: !d.favorite } : d)))}>
            <Star className={clsx('size-4', active.favorite && 'fill-current text-gold')} /> {active.favorite ? 'Favourite' : 'Favourite'}
          </Button>
          {active.custom && (
            <Button variant="secondary" className="text-danger" onClick={() => { update(list.filter((d) => d.id !== active.id)); setActiveId(list[0].id) }}><Trash2 className="size-4" /></Button>
          )}
        </div>
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="New dhikr">
        <div className="space-y-3">
          <Field label="Name" placeholder="e.g. SubhanAllahi wa bihamdihi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Target" type="number" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
          <Button
            className="w-full"
            disabled={!form.name.trim() || !(Number(form.target) > 0)}
            onClick={() => {
              const d: Dhikr = { id: crypto.randomUUID(), name: form.name.trim(), target: Math.round(Number(form.target)), count: 0, total: 0, favorite: true, custom: true }
              update([...list, d])
              setActiveId(d.id)
              setForm({ name: '', target: '33' })
              setAddOpen(false)
            }}
          >
            Add
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
