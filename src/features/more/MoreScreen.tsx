import { Bookmark, ChevronRight, Download, ListChecks, Receipt, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page, PageHeader } from '../../components/ui'
import { services } from '../home/HomeScreen'

const extras = [
  { title: 'My orders', to: '/orders', icon: <Receipt />, color: 'bg-orange-500' },
  { title: 'Bookmarks', to: '/bookmarks', icon: <Bookmark />, color: 'bg-rose-500' },
  { title: 'Ritual history', to: '/ritual/history', icon: <ListChecks />, color: 'bg-green-600' },
  { title: 'Offline Quran', to: '/download', icon: <Download />, color: 'bg-sky-600' },
  { title: 'Settings', to: '/settings', icon: <Settings />, color: 'bg-slate-600' },
]

export function MoreScreen() {
  const navigate = useNavigate()
  return (
    <Page>
      <PageHeader title="More" back={false} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {services.map((s) => (
          <button
            key={s.title}
            onClick={() => navigate(s.to)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-3 text-center transition hover:border-primary/50"
          >
            <span className={`grid size-12 place-items-center rounded-2xl text-white [&>svg]:size-6 ${s.color}`}>{s.icon}</span>
            <span className="text-xs font-medium text-ink">{s.title}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {extras.map((s) => (
          <button
            key={s.title}
            onClick={() => navigate(s.to)}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-primary/50"
          >
            <span className={`grid size-10 place-items-center rounded-xl text-white [&>svg]:size-5 ${s.color}`}>{s.icon}</span>
            <span className="flex-1 font-medium text-ink">{s.title}</span>
            <ChevronRight className="size-5 text-muted" />
          </button>
        ))}
      </div>
    </Page>
  )
}
