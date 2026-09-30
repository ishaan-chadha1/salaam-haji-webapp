import clsx from 'clsx'
import { MessageSquarePlus, Mic, MicOff, Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Page } from '../../components/ui'
import { stageLabel, useRitual } from '../ritual/ritualStore'
import { BotText } from './BotText'
import { askHajjBot } from './hajjBot'

type Msg = { id: string; role: 'user' | 'assistant'; content: string; error?: boolean }

const SUGGESTIONS = [
  { text: 'Find nearest gate', icon: '📍' },
  { text: 'Dua for Ihram', icon: '🤲' },
  { text: 'Next prayer time', icon: '🕌' },
  { text: 'Ritual guidance', icon: '📿' },
  { text: 'Qibla direction', icon: '🧭' },
]

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition

/** Digital Mutawwif (chat_screen.dart): answers come from the Hajj bot. */
export function ChatScreen() {
  const session = useRitual((s) => s.session)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const rec = useRef<SpeechRec | null>(null)
  const end = useRef<HTMLDivElement>(null)
  // Braces matter: newer Chrome returns a Promise from scrollIntoView, and an
  // effect that returns it crashes React ("destroy is not a function").
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function send(content: string) {
    const q = content.trim()
    if (!q || thinking) return
    setText('')
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', content: q }])
    setThinking(true)
    const reply = await askHajjBot(q, conversationId, session)
    if (reply.conversationId) setConversationId(reply.conversationId)
    if (!reply.ok && reply.resetConversation) setConversationId(null)
    setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: reply.text, error: !reply.ok }])
    setThinking(false)
  }

  function toggleMic() {
    if (!SpeechRecognition) return
    if (listening) {
      rec.current?.stop()
      return
    }
    const r = new SpeechRecognition()
    r.lang = navigator.language || 'en-US'
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => setText(Array.from(e.results).map((res) => res[0].transcript).join(' '))
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    rec.current = r
    setListening(true)
    r.start()
  }

  return (
    <Page className="flex min-h-dvh flex-col">
      <header className="mb-3 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#065f46] to-black p-4 text-white">
        <span className="grid size-11 place-items-center rounded-2xl bg-white/15"><Sparkles className="size-6 text-[#eab308]" /></span>
        <div className="flex-1">
          <p className="text-lg font-bold">Digital Mutawwif</p>
          <p className="text-sm text-white/70">Your Spiritual Guide</p>
        </div>
        {session && <span className="rounded-full bg-[#eab308] px-2 py-0.5 text-xs font-bold text-[#064e3b]">{stageLabel(session.stage)} active</span>}
        {messages.length > 0 && (
          <button
            aria-label="New chat"
            title="New chat"
            disabled={thinking}
            onClick={() => {
              setMessages([])
              setConversationId(null)
            }}
            className="grid size-9 place-items-center rounded-full bg-white/15 disabled:opacity-40"
          >
            <MessageSquarePlus className="size-4" />
          </button>
        )}
      </header>

      <div className="flex-1 space-y-2 pb-4">
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <p className="arabic text-3xl text-gold">السَّلَامُ عَلَيْكُمْ</p>
            <p className="mt-1 text-xl font-bold text-ink">Where should we start?</p>
            <p className="text-sm text-muted">Ask me anything about your pilgrimage</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s.text} onClick={() => send(s.text)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:border-primary">
                  {s.icon} {s.text}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'user' ? (
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 whitespace-pre-wrap text-on-primary">{m.content}</p>
            ) : (
              <div className={clsx('max-w-[85%] rounded-2xl rounded-bl-md border px-3 py-2', m.error ? 'border-danger/40 bg-danger/10 text-danger' : 'border-line bg-surface text-ink')}>
                <BotText text={m.content} />
              </div>
            )}
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 px-2 text-sm text-muted">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
            Thinking… this can take up to 30 seconds
          </div>
        )}
        <div ref={end} />
      </div>

      <form
        className="sticky bottom-20 flex items-center gap-2 rounded-full border border-line bg-surface p-1.5 shadow-lg lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        {SpeechRecognition && (
          <button type="button" aria-label={listening ? 'Stop listening' : 'Speak'} onClick={toggleMic} className={clsx('grid size-10 place-items-center rounded-full', listening ? 'bg-danger text-white' : 'text-primary hover:bg-surface-2')}>
            {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        )}
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? 'Listening…' : 'Ask Digital Mutawwif…'} className="min-w-0 flex-1 bg-transparent px-2 text-ink outline-none" />
        <button type="submit" aria-label="Send" disabled={!text.trim() || thinking} className="grid size-10 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-40">
          <Send className="size-5" />
        </button>
      </form>
    </Page>
  )
}
