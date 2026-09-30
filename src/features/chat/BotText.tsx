import type { ReactNode } from 'react'

/** Renders the bot's Markdown: ### headings, **bold**, *italic*, bullets and
 *  numbered lists. Enough to read cleanly without a Markdown library. */
function inline(line: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index))
    out.push(m[1] != null ? <strong key={`${key}-${i++}`}>{m[1]}</strong> : <em key={`${key}-${i++}`}>{m[2] ?? m[3]}</em>)
    last = m.index + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

export function BotText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  return (
    <div className="space-y-1">
      {lines.map((raw, n) => {
        const line = raw.trimEnd()
        const key = `l${n}`
        if (!line.trim()) return <div key={key} className="h-1.5" />
        const heading = /^\s*#{1,6}\s+/.exec(line)
        if (heading) return <p key={key} className="text-[15px] font-bold">{inline(line.slice(heading[0].length), key)}</p>
        const bullet = /^\s*([-*•]|\d+\.)\s+/.exec(line)
        if (bullet) {
          const marker = bullet[1].endsWith('.') ? bullet[1] : '•'
          return (
            <p key={key} className="flex gap-2">
              <span className="shrink-0">{marker}</span>
              <span>{inline(line.slice(bullet[0].length), key)}</span>
            </p>
          )
        }
        return <p key={key}>{inline(line, key)}</p>
      })}
    </div>
  )
}
