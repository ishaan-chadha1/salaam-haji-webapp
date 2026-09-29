import clsx from 'clsx'
import { Check, ClipboardPaste, Copy, Inbox, MessageCircle, Plus, Search, Share2, Trash2, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Field, Notice, Page, PageHeader, Segmented, Sheet, Spinner } from '../../components/ui'
import { useAuth } from '../../store/auth'
import { DuaRepo, loadLibrary, PARSE_FAILED, parseSharedDua, shareText, type DuaShare, type LibraryDua, type UserDua } from './duaRepo'

type Tab = 'library' | 'mine' | 'inbox'

async function share(text: string) {
  if (navigator.share) return navigator.share({ text }).catch(() => {})
  await navigator.clipboard?.writeText(text)
}
const openWhatsApp = (text: string) => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')

export function DuaScreen() {
  const [tab, setTab] = useState<Tab>('library')
  const [mine, setMine] = useState<UserDua[] | null>(null)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  async function refresh() {
    try {
      setMine(await DuaRepo.myItems())
    } catch (e) {
      setMine([])
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Could not load your list' })
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  async function add(item: Parameters<typeof DuaRepo.add>[0]) {
    try {
      await DuaRepo.add(item, (mine?.length ?? 0) + 1)
      setMsg({ tone: 'success', text: `Added "${item.title}" to your list` })
      refresh()
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Could not add' })
    }
  }

  return (
    <Page>
      <PageHeader title="Dua" subtitle="Library, your checklist and shared duas" />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'library', label: 'Library' },
          { value: 'mine', label: `My list${mine?.length ? ` · ${mine.length}` : ''}` },
          { value: 'inbox', label: 'Inbox · share' },
        ]}
      />
      {msg && (
        <div className="mt-3" onClick={() => setMsg(null)}>
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}
      <div className="mt-3">
        {tab === 'library' && <LibraryTab onAdd={add} />}
        {tab === 'mine' && <MyListTab items={mine} onChange={refresh} onAdd={add} onMessage={setMsg} />}
        {tab === 'inbox' && <InboxTab onChange={refresh} onMessage={setMsg} />}
      </div>
    </Page>
  )
}

function LibraryTab({ onAdd }: { onAdd: (i: Parameters<typeof DuaRepo.add>[0]) => void }) {
  const [lib, setLib] = useState<LibraryDua[] | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  useEffect(() => {
    loadLibrary().then(setLib).catch(() => setLib([]))
  }, [])
  const cats = useMemo(() => ['All', ...new Set((lib ?? []).map((d) => d.category))], [lib])
  if (!lib) return <Spinner />
  const shown = lib.filter((d) => (cat === 'All' || d.category === cat) && `${d.title} ${d.translation} ${d.transliteration}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <div className="relative mb-2">
        <Search className="absolute top-3 left-3 size-5 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search duas" className="w-full rounded-full border border-line bg-surface py-2.5 pr-3 pl-10 text-ink outline-none focus:border-primary" />
      </div>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={clsx('shrink-0 rounded-full border px-3 py-1.5 text-sm', cat === c ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink')}>
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {shown.map((d) => (
          <DuaCard
            key={d.id}
            category={d.category}
            title={d.title}
            arabic={d.arabic}
            transliteration={d.transliteration}
            translation={d.translation}
            actions={
              <>
                <Button variant="secondary" onClick={() => onAdd({ title: d.title, arabicText: d.arabic, transliteration: d.transliteration, translation: d.translation, libraryId: d.id })}>
                  <Plus className="size-4" /> My list
                </Button>
                <Button variant="ghost" onClick={() => share(shareText(d))}><Share2 className="size-4" /> Share</Button>
                <Button variant="ghost" onClick={() => openWhatsApp(shareText(d))}><MessageCircle className="size-4" /> WhatsApp</Button>
              </>
            }
          />
        ))}
        {shown.length === 0 && <Empty title="No duas match" />}
      </div>
    </>
  )
}

function MyListTab({ items, onChange, onAdd, onMessage }: { items: UserDua[] | null; onChange: () => void; onAdd: (i: Parameters<typeof DuaRepo.add>[0]) => void; onMessage: (m: { tone: 'success' | 'error'; text: string }) => void }) {
  const [customOpen, setCustomOpen] = useState(false)
  const [shareItem, setShareItem] = useState<UserDua | null>(null)
  const [f, setF] = useState({ title: '', arabicText: '', transliteration: '', translation: '', notes: '' })
  if (!items) return <Spinner />
  const done = items.filter((i) => i.checked).length
  return (
    <>
      {!DuaRepo.isShared() && <div className="mb-3"><Notice tone="info">Saved on this device. Sign in to keep your list in sync with the phone app.</Notice></div>}
      {items.length > 0 && (
        <p className="mb-2 text-sm text-muted">{done} of {items.length} made</p>
      )}
      <div className="space-y-2">
        {items.map((i) => (
          <Card key={i.id} className={clsx(i.checked && 'opacity-75')}>
            <div className="flex gap-3">
              <button
                aria-label={i.checked ? 'Mark not made' : 'Mark made'}
                onClick={async () => {
                  await DuaRepo.setChecked(i.id, !i.checked)
                  onChange()
                }}
                className={clsx('mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2', i.checked ? 'border-primary bg-primary text-on-primary' : 'border-line')}
              >
                {i.checked && <Check className="size-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={clsx('font-semibold text-ink', i.checked && 'line-through decoration-muted')}>{i.title}</p>
                {i.arabicText && <p className="arabic mt-1 text-right text-xl text-ink">{i.arabicText}</p>}
                {i.transliteration && <p className="mt-1 text-sm text-ink italic">{i.transliteration}</p>}
                {i.translation && <p className="mt-1 text-sm text-muted">{i.translation}</p>}
                {i.notes && <p className="mt-1 text-sm text-gold">Note: {i.notes}</p>}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button variant="ghost" onClick={() => setShareItem(i)}><Share2 className="size-4" /> Share</Button>
                  <Button
                    variant="ghost"
                    className="text-danger"
                    onClick={async () => {
                      await DuaRepo.remove(i.id)
                      onChange()
                    }}
                  >
                    <Trash2 className="size-4" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Empty title="Your list is empty">Add duas from the Library, write your own, or paste one a friend sent you.</Empty>}
      </div>
      <Button className="mt-3 w-full" onClick={() => setCustomOpen(true)}><Plus className="size-4" /> Custom dua</Button>

      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Custom dua">
        <div className="space-y-3">
          <Field label="Title *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Field label="Arabic (optional)" dir="rtl" value={f.arabicText} onChange={(e) => setF({ ...f, arabicText: e.target.value })} />
          <Field label="Transliteration (optional)" value={f.transliteration} onChange={(e) => setF({ ...f, transliteration: e.target.value })} />
          <Field label="Translation (optional)" value={f.translation} onChange={(e) => setF({ ...f, translation: e.target.value })} />
          <Field label="Notes (optional)" placeholder="e.g. for my parents" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <Button
            className="w-full"
            disabled={!f.title.trim()}
            onClick={() => {
              onAdd(f)
              setF({ title: '', arabicText: '', transliteration: '', translation: '', notes: '' })
              setCustomOpen(false)
            }}
          >
            Add to my list
          </Button>
        </div>
      </Sheet>
      <ShareSheet item={shareItem} onClose={() => setShareItem(null)} onMessage={onMessage} />
    </>
  )
}

function ShareSheet({ item, onClose, onMessage }: { item: UserDua | null; onClose: () => void; onMessage: (m: { tone: 'success' | 'error'; text: string }) => void }) {
  const me = useAuth((s) => s.user?.id)
  const [code, setCode] = useState<string | null>(null)
  const [members, setMembers] = useState<{ userId: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setCode(null)
    if (!item || !DuaRepo.isShared()) return
    import('../family/familyStore').then(({ useFamily }) => {
      const f = useFamily.getState()
      if (!f.family) f.load().then(() => setMembers(useFamily.getState().members))
      else setMembers(f.members)
    })
  }, [item])
  if (!item) return null
  const text = shareText({ title: item.title, arabic: item.arabicText, transliteration: item.transliteration, translation: item.translation, notes: item.notes })
  const others = members.filter((m) => m.userId !== me)
  return (
    <Sheet open onClose={onClose} title={`Share “${item.title}”`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => share(text)}><Share2 className="size-4" /> Share text</Button>
          <Button variant="secondary" onClick={() => openWhatsApp(text)}><MessageCircle className="size-4" /> WhatsApp</Button>
        </div>
        {DuaRepo.isShared() && (
          <>
            <div>
              <p className="text-sm font-semibold text-ink">Share code</p>
              <p className="text-xs text-muted">Someone else opens Dua → Inbox · share and enters this code. It works once and expires in 7 days.</p>
              {code ? (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-2 p-3">
                  <span className="flex-1 font-mono text-xl font-bold tracking-widest text-ink">{code}</span>
                  <button aria-label="Copy code" onClick={() => navigator.clipboard?.writeText(code)} className="grid size-9 place-items-center rounded-lg border border-line"><Copy className="size-4" /></button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="mt-2"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      setCode(await DuaRepo.createCode(item))
                    } catch (e) {
                      onMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not create a code' })
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Create code
                </Button>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Send to family member</p>
              {others.length === 0 ? (
                <p className="text-xs text-muted">No other members in your family group. Join or create a family on the Family tab.</p>
              ) : (
                <div className="mt-1 space-y-1">
                  {others.map((m) => (
                    <button
                      key={m.userId}
                      onClick={async () => {
                        try {
                          await DuaRepo.shareTo(m.userId, item)
                          onMessage({ tone: 'success', text: `Shared with ${m.name}` })
                          onClose()
                        } catch (e) {
                          onMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not share' })
                        }
                      }}
                      className="flex w-full items-center gap-2 rounded-xl border border-line p-2.5 text-left hover:bg-surface-2"
                    >
                      <UserRound className="size-5 text-primary" /> <span className="text-ink">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

function InboxTab({ onChange, onMessage }: { onChange: () => void; onMessage: (m: { tone: 'success' | 'error'; text: string }) => void }) {
  const [shares, setShares] = useState<DuaShare[] | null>(null)
  const [code, setCode] = useState('')
  const [paste, setPaste] = useState('')
  const parsed = paste.trim() ? parseSharedDua(paste) : null
  const refresh = () => DuaRepo.incoming().then(setShares).catch(() => setShares([]))
  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="space-y-3">
      <Card>
        <p className="flex items-center gap-2 font-semibold text-ink"><ClipboardPaste className="size-5 text-primary" /> Paste a dua</p>
        <p className="text-sm text-muted">Paste text from WhatsApp or notes — we split out the Arabic, transliteration and translation.</p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder="Paste here" className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-ink outline-none focus:border-primary" />
        {paste.trim() && !parsed && <p className="text-sm text-danger">{PARSE_FAILED}</p>}
        {parsed && (
          <div className="mt-2 rounded-xl bg-surface-2 p-3 text-sm">
            <p className="font-semibold text-ink">{parsed.title}</p>
            {parsed.arabicText && <p className="arabic text-right text-lg text-ink">{parsed.arabicText}</p>}
            {parsed.transliteration && <p className="text-ink italic">{parsed.transliteration}</p>}
            {parsed.translation && <p className="text-muted">{parsed.translation}</p>}
            {parsed.notes && <p className="text-gold">Note: {parsed.notes}</p>}
            <Button
              className="mt-2"
              onClick={async () => {
                await DuaRepo.add(parsed, 999)
                setPaste('')
                onMessage({ tone: 'success', text: `Added "${parsed.title}" to your list` })
                onChange()
              }}
            >
              <Plus className="size-4" /> Add to my list
            </Button>
          </div>
        )}
      </Card>

      {DuaRepo.isShared() ? (
        <>
          <Card>
            <p className="font-semibold text-ink">Enter a share code</p>
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  await DuaRepo.redeemCode(code)
                  setCode('')
                  onMessage({ tone: 'success', text: 'Dua added to your list' })
                  onChange()
                } catch (err) {
                  onMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Invalid or expired code' })
                }
              }}
            >
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD1234" className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 font-mono tracking-widest text-ink outline-none focus:border-primary" />
              <Button type="submit" disabled={!code.trim()}>Redeem</Button>
            </form>
          </Card>
          <p className="flex items-center gap-2 text-sm font-semibold text-muted uppercase"><Inbox className="size-4" /> Sent to you</p>
          {!shares ? (
            <Spinner />
          ) : shares.length === 0 ? (
            <Empty title="Nothing here yet">Duas your family sends you appear here.</Empty>
          ) : (
            shares.map((s) => (
              <DuaCard
                key={s.id}
                title={s.title}
                arabic={s.arabicText ?? undefined}
                transliteration={s.transliteration ?? undefined}
                translation={s.translation ?? undefined}
                category={s.status === 'pending' ? 'New' : s.status}
                actions={
                  s.status === 'pending' ? (
                    <>
                      <Button onClick={async () => { await DuaRepo.accept(s.id); refresh(); onChange() }}><Check className="size-4" /> Accept</Button>
                      <Button variant="ghost" className="text-danger" onClick={async () => { await DuaRepo.decline(s.id); refresh() }}>Decline</Button>
                    </>
                  ) : undefined
                }
              />
            ))
          )}
        </>
      ) : (
        <Notice tone="info">Share codes and family sharing need an account. Pasting works in preview mode.</Notice>
      )}
    </div>
  )
}

export function DuaCard({ category, title, arabic, transliteration, translation, actions }: { category?: string; title: string; arabic?: string; transliteration?: string; translation?: string; actions?: React.ReactNode }) {
  return (
    <Card>
      {category && <p className="text-xs font-semibold tracking-wide text-gold uppercase">{category}</p>}
      <p className="font-semibold text-ink">{title}</p>
      {arabic && <p className="arabic mt-2 text-right text-2xl leading-loose text-ink">{arabic}</p>}
      {transliteration && <p className="mt-1 text-sm text-ink italic">{transliteration}</p>}
      {translation && <p className="mt-1 text-sm text-muted">{translation}</p>}
      {actions && <div className="mt-2 flex flex-wrap gap-1">{actions}</div>}
    </Card>
  )
}
