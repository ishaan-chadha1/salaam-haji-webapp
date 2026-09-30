import clsx from 'clsx'
import { Check, ChevronRight, Copy, Crown, Hourglass, LogOut, Map, MessageSquare, Pencil, Share2, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Empty, Field, Notice, Page, PageHeader, Sheet, Spinner } from '../../components/ui'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../store/auth'
import { stageLabel } from '../ritual/ritualStore'
import { useFamily } from './familyStore'

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

export function FamilyScreen() {
  const user = useAuth((s) => s.user)
  const f = useFamily()
  useEffect(() => {
    f.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (!isSupabaseConfigured || user?.isPreview) {
    return (
      <Page>
        <PageHeader title="Family" back={false} />
        <Empty icon={<Users className="size-12" />} title="Family needs an account">
          Families, live locations and messages are shared through your Salaam Haji account, so they are off in preview mode. Sign in with the same account as the phone app to see your family here.
        </Empty>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader title="Family" subtitle={f.family?.name} back={false} />
      <div className="space-y-3">
        {f.error && <Notice tone="error">{f.error}</Notice>}
        {f.info && <Notice tone="success">{f.info}</Notice>}
        {f.status === 'loading' ? <Spinner label="Loading your family…" /> : f.family ? <FamilyHome /> : <NoFamily />}
      </div>
    </Page>
  )
}

function NoFamily() {
  const f = useFamily()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  if (f.hasPendingRequest) {
    return (
      <Card className="text-center">
        <Hourglass className="mx-auto size-10 text-gold" />
        <p className="mt-2 font-bold text-ink">Waiting for approval</p>
        <p className="mt-1 text-sm text-muted">
          Your request to join {f.pendingFamilyName ? `“${f.pendingFamilyName}”` : 'the family'} was sent. You'll be let in as soon as the family head approves it.
        </p>
        <Button variant="secondary" className="mt-3" onClick={f.load} loading={f.busy}>Check again</Button>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <p className="font-bold text-ink">Create a family</p>
        <p className="mt-1 text-sm text-muted">You'll be the head. Share the invite code so others can ask to join.</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) f.create(name)
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chadha Family" className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-primary" />
          <Button type="submit" loading={f.busy} disabled={!name.trim()}>Create</Button>
        </form>
      </Card>
      <Card>
        <p className="font-bold text-ink">Join a family</p>
        <p className="mt-1 text-sm text-muted">Enter the 6-character code from your family head.</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) f.join(code)
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={20} className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 font-mono tracking-widest text-ink uppercase outline-none focus:border-primary" />
          <Button type="submit" loading={f.busy} disabled={!code.trim()}>Request</Button>
        </form>
      </Card>
    </>
  )
}

function FamilyHome() {
  const navigate = useNavigate()
  const me = useAuth((s) => s.user?.id)
  const f = useFamily()
  const fam = f.family!
  const isHead = fam.headId === me
  const [copied, setCopied] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(fam.name)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const mine = f.members.find((m) => m.userId === me)

  async function share() {
    const text = `Join my family "${fam.name}" on Salaam Haji with invite code ${fam.inviteCode}`
    if (navigator.share) navigator.share({ title: 'Salaam Haji family', text }).catch(() => {})
    else {
      await navigator.clipboard?.writeText(fam.inviteCode)
      setCopied(true)
    }
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-[#064e3b] to-[#065f46] text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-white/70">{isHead ? 'You lead this family' : 'Your family'}</p>
            <p className="truncate text-2xl font-bold">{fam.name}</p>
            <p className="text-sm text-white/70">{f.members.length} member{f.members.length === 1 ? '' : 's'}</p>
          </div>
          {isHead && (
            <button aria-label="Rename family" onClick={() => setRenameOpen(true)} className="grid size-9 place-items-center rounded-full bg-white/15">
              <Pencil className="size-4" />
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-black/25 p-2 pl-3">
          <span className="text-xs text-white/70">Invite code</span>
          <span className="flex-1 font-mono text-lg font-bold tracking-[0.3em]">{fam.inviteCode}</span>
          <button
            aria-label="Copy code"
            onClick={async () => {
              await navigator.clipboard?.writeText(fam.inviteCode)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
            className="grid size-9 place-items-center rounded-lg bg-white/15"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
          <button aria-label="Share" onClick={share} className="grid size-9 place-items-center rounded-lg bg-white/15">
            <Share2 className="size-4" />
          </button>
        </div>
      </Card>

      {isHead && f.requests.length > 0 && (
        <Card className="border-gold/50">
          <p className="mb-2 font-bold text-ink">Join requests</p>
          <div className="space-y-2">
            {f.requests.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <Avatar name={r.requesterName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{r.requesterName}</p>
                  <p className="text-xs text-muted">{timeAgo(r.createdAt)}</p>
                </div>
                <button aria-label="Reject" onClick={() => f.reject(r.id)} className="grid size-9 place-items-center rounded-full border border-line text-danger"><X className="size-4" /></button>
                <button aria-label="Approve" onClick={() => f.approve(r.id)} className="grid size-9 place-items-center rounded-full bg-primary text-on-primary"><Check className="size-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => navigate('/family/map')}><Map className="size-4" /> Family map</Button>
        <Button variant="secondary" onClick={() => navigate('/family/chat')}><MessageSquare className="size-4" /> Messages</Button>
      </div>

      <Card>
        <label className="flex cursor-pointer items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-ink">Share my location</p>
            <p className="text-sm text-muted">
              {f.sharing ? 'Your family can see you on the map while this page is open.' : mine?.isLocationSharingEnabled ? 'On — reopen to resume in this browser.' : 'Off'}
            </p>
            {f.sharingError && <p className="text-xs text-danger">{f.sharingError}</p>}
          </div>
          <input type="checkbox" className="size-6 accent-[var(--primary)]" checked={!!mine?.isLocationSharingEnabled && f.sharing} onChange={(e) => f.setSharing(e.target.checked)} />
        </label>
      </Card>

      <div>
        <p className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Members</p>
        <div className="space-y-2">
          {f.members.map((m) => {
            const p = f.progress[m.userId]
            const loc = f.locations[m.userId]
            return (
              <Card key={m.userId} onClick={() => navigate(`/family/member/${m.userId}`)}>
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} head={m.role === 'head'} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate font-semibold text-ink">
                      {m.name} {m.userId === me && <span className="text-xs font-normal text-muted">(you)</span>}
                      {m.role === 'head' && <Crown className="size-4 text-gold" />}
                    </p>
                    <p className="text-xs text-muted">
                      {p?.isActive && p.stage ? (
                        <span className="font-semibold text-primary">Doing {stageLabel(p.stage as 'tawaf' | 'sai')} now</span>
                      ) : (
                        <>Active {timeAgo(m.lastActiveAt)}</>
                      )}
                      {m.isLocationSharingEnabled && loc && <> · 📍 {timeAgo(loc.timestamp)}</>}
                    </p>
                  </div>
                  {/* The whole row opens the profile (Remove is there). */}
                  <span className="flex shrink-0 items-center text-xs font-semibold text-gold">
                    View profile <ChevronRight className="size-4" />
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <Button variant="secondary" className="w-full text-danger" onClick={() => setLeaveOpen(true)}>
        <LogOut className="size-4" /> {isHead ? 'Disband family' : 'Leave family'}
      </Button>

      <Sheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename family">
        <Field label="Family name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button className="mt-3 w-full" disabled={!newName.trim()} onClick={() => { f.rename(newName); setRenameOpen(false) }}>Save</Button>
      </Sheet>
      <Sheet open={leaveOpen} onClose={() => setLeaveOpen(false)} title={isHead ? 'Disband family?' : 'Leave family?'}>
        <p className="text-muted">{isHead ? 'Everyone will be removed and the family deleted. This cannot be undone.' : 'You will stop seeing your family and they will stop seeing you.'}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setLeaveOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { setLeaveOpen(false); f.leave() }}>{isHead ? 'Disband' : 'Leave'}</Button>
        </div>
      </Sheet>
      <Sheet open={removeId != null} onClose={() => setRemoveId(null)} title="Remove member?">
        <p className="text-muted">{f.members.find((m) => m.userId === removeId)?.name} will be removed from the family.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setRemoveId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { if (removeId) f.removeMember(removeId); setRemoveId(null) }}>Remove</Button>
        </div>
      </Sheet>
    </>
  )
}

export function Avatar({ name, head, size = 'md' }: { name: string; head?: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      className={clsx(
        'grid shrink-0 place-items-center rounded-full font-bold',
        size === 'md' ? 'size-10 text-base' : 'size-8 text-sm',
        head ? 'bg-[#d4af37] text-[#064e3b]' : 'bg-[#059669] text-white',
      )}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}
