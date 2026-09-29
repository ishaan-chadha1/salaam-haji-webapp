import clsx from 'clsx'
import { MapPin, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Empty, Page, PageHeader } from '../../components/ui'
import { useAuth } from '../../store/auth'
import { FamilyRepo } from './familyRepo'
import { useFamily } from './familyStore'

export function FamilyChatScreen() {
  const f = useFamily()
  const me = useAuth((s) => s.user?.id)
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const marked = useRef(new Set<string>())

  useEffect(() => {
    if (!f.family) f.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' })
    // Mark others' messages read, like FamilyMessageBloc.MarkAsRead.
    if (!me) return
    for (const m of f.messages) {
      if (m.senderId === me || m.readBy.includes(me) || marked.current.has(m.id)) continue
      marked.current.add(m.id)
      FamilyRepo.markRead(m.id, me).catch(() => marked.current.delete(m.id))
    }
  }, [f.messages, me])

  return (
    <Page className="flex min-h-dvh flex-col">
      <PageHeader title="Family messages" subtitle={f.family?.name} />
      {!f.family ? (
        <Empty title="No family yet">Create or join a family on the Family tab.</Empty>
      ) : (
        <>
          <div className="flex-1 space-y-2 pb-4">
            {f.messages.length === 0 && <Empty title="No messages yet">Say salaam to your family.</Empty>}
            {f.messages.map((m) => {
              if (m.type === 'system')
                return (
                  <p key={m.id} className="text-center text-xs text-muted">
                    {m.senderName !== 'User' && m.message === 'Left the family' ? `${m.senderName} left the family` : m.message} · {new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                )
              const mine = m.senderId === me
              const lat = Number(m.metadata?.latitude)
              const lng = Number(m.metadata?.longitude)
              return (
                <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={clsx('max-w-[80%] rounded-2xl px-3 py-2', mine ? 'rounded-br-md bg-primary text-on-primary' : 'rounded-bl-md border border-line bg-surface text-ink')}>
                    {!mine && <p className="text-xs font-semibold text-gold">{m.senderName}</p>}
                    {m.type === 'location' && Number.isFinite(lat) ? (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold underline">
                        <MapPin className="size-4" /> {m.message}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    )}
                    <p className={clsx('mt-0.5 text-right text-[10px]', mine ? 'text-on-primary/70' : 'text-muted')}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={end} />
          </div>
          <form
            className="sticky bottom-20 flex gap-2 rounded-full border border-line bg-surface p-1.5 shadow-lg lg:bottom-4"
            onSubmit={(e) => {
              e.preventDefault()
              f.sendMessage(text)
              setText('')
            }}
          >
            <button type="button" aria-label="Share my location" onClick={f.shareMyLocationOnce} className="grid size-10 place-items-center rounded-full text-primary hover:bg-surface-2">
              <MapPin className="size-5" />
            </button>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your family" className="min-w-0 flex-1 bg-transparent px-2 text-ink outline-none" />
            <button type="submit" aria-label="Send" disabled={!text.trim()} className="grid size-10 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-40">
              <Send className="size-5" />
            </button>
          </form>
        </>
      )}
    </Page>
  )
}
