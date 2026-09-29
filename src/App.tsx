import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from './components/ui'
import { LoginScreen } from './features/auth/LoginScreen'
import { HomeScreen } from './features/home/HomeScreen'
import { MoreScreen } from './features/more/MoreScreen'
import { AppShell } from './layout/AppShell'
import { useAuth } from './store/auth'
import { useLocation } from './store/location'
import { useSettings } from './store/settings'
// Keeps family_progress in step with live rituals, whichever screen is open.
import './features/family/familyStore'

// Screens load on demand so the first paint stays small.
const page = (loader: () => Promise<Record<string, unknown>>, name: string) =>
  lazy(async () => ({ default: (await loader())[name] as ComponentType }))

const routes: { path: string; Component: ComponentType }[] = [
  { path: '/ritual', Component: page(() => import('./features/ritual/RitualScreen'), 'RitualScreen') },
  { path: '/ritual/umrah', Component: page(() => import('./features/ritual/UmrahChecklistScreen'), 'UmrahChecklistScreen') },
  { path: '/ritual/track/:stage', Component: page(() => import('./features/ritual/TrackingScreen'), 'TrackingScreen') },
  { path: '/ritual/history', Component: page(() => import('./features/ritual/HistoryScreen'), 'HistoryScreen') },
  { path: '/family', Component: page(() => import('./features/family/FamilyScreen'), 'FamilyScreen') },
  { path: '/family/map', Component: page(() => import('./features/family/FamilyMapScreen'), 'FamilyMapScreen') },
  { path: '/family/chat', Component: page(() => import('./features/family/FamilyChatScreen'), 'FamilyChatScreen') },
  { path: '/food', Component: page(() => import('./features/food/FoodOrderScreen'), 'FoodOrderScreen') },
  { path: '/transport', Component: page(() => import('./features/transport/TransportOrderScreen'), 'TransportOrderScreen') },
  { path: '/orders', Component: page(() => import('./features/orders/OrdersScreen'), 'OrdersScreen') },
  { path: '/quran', Component: page(() => import('./features/quran/QuranScreen'), 'QuranScreen') },
  { path: '/quran/:surah', Component: page(() => import('./features/quran/SurahScreen'), 'SurahScreen') },
  { path: '/dua', Component: page(() => import('./features/dua/DuaScreen'), 'DuaScreen') },
  { path: '/adhkar', Component: page(() => import('./features/dua/AdhkarScreen'), 'AdhkarScreen') },
  { path: '/tasbih', Component: page(() => import('./features/tasbih/TasbihScreen'), 'TasbihScreen') },
  { path: '/qibla', Component: page(() => import('./features/qibla/QiblaScreen'), 'QiblaScreen') },
  { path: '/names', Component: page(() => import('./features/names/NamesScreen'), 'NamesScreen') },
  { path: '/prayer', Component: page(() => import('./features/prayer/PrayerScreen'), 'PrayerScreen') },
  { path: '/fasting', Component: page(() => import('./features/prayer/FastingScreen'), 'FastingScreen') },
  { path: '/home-finder', Component: page(() => import('./features/homeFinder/HomeFinderScreen'), 'HomeFinderScreen') },
  { path: '/currency', Component: page(() => import('./features/currency/CurrencyScreen'), 'CurrencyScreen') },
  { path: '/bookmarks', Component: page(() => import('./features/quran/BookmarksScreen'), 'BookmarksScreen') },
  { path: '/download', Component: page(() => import('./features/quran/DownloadScreen'), 'DownloadScreen') },
  { path: '/settings', Component: page(() => import('./features/settings/SettingsScreen'), 'SettingsScreen') },
  { path: '/chat', Component: page(() => import('./features/chat/ChatScreen'), 'ChatScreen') },
]

export default function App() {
  const status = useAuth((s) => s.status)
  const init = useAuth((s) => s.init)
  const theme = useSettings((s) => s.theme)
  const locate = useLocation((s) => s.locate)

  useEffect(() => init(), [init])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#04291f' : '#064E3B')
  }, [theme])
  // Only uses location if already allowed; never prompts at launch.
  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') locate() }).catch(() => {})
  }, [locate])

  if (status === 'loading') return <Spinner label="Loading…" />
  if (status === 'signedOut') return <LoginScreen />

  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomeScreen />} />
            <Route path="/more" element={<MoreScreen />} />
            {routes.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
