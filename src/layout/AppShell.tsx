import clsx from 'clsx'
import { BookOpenText, Home, LayoutGrid, MessageCircle, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

// Same five tabs as TabBloc: Home, Ritual, Family, More, Chat.
const tabs = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/ritual', label: 'Ritual', icon: BookOpenText },
  { to: '/family', label: 'Family', icon: Users },
  { to: '/more', label: 'More', icon: LayoutGrid },
  { to: '/chat', label: 'Mutawwif', icon: MessageCircle },
]

export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src="/icons/icon-192.png" alt="" className="size-9 rounded-xl" />
          <span className="text-lg font-bold text-ink">Salaam Haji</span>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-primary text-on-primary' : 'text-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <t.icon className="size-5" />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg justify-around px-2 py-1.5">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                clsx('flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted')
              }
            >
              <t.icon className="size-6" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
