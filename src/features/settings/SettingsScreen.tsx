import { LogOut, MapPin, Moon, Sun } from 'lucide-react'
import { Button, Card, Page, PageHeader, Segmented } from '../../components/ui'
import { isSupabaseConfigured } from '../../lib/supabase'
import { preferredName, useAuth } from '../../store/auth'
import { useLocation } from '../../store/location'
import { useSettings } from '../../store/settings'
import { CALC_METHODS } from '../prayer/prayerTimes'

export function SettingsScreen() {
  const settings = useSettings()
  const { user, signOut } = useAuth()
  const { place, status, locate } = useLocation()

  return (
    <Page>
      <PageHeader title="Settings" />
      <div className="space-y-3">
        <Card>
          <p className="text-sm text-muted">Signed in as</p>
          <p className="font-semibold text-ink">{preferredName(user)}</p>
          {user?.email && <p className="text-sm text-muted">{user.email}</p>}
          {user?.isPreview && <p className="mt-1 text-xs text-gold">Preview mode{isSupabaseConfigured ? '' : ' (Supabase not configured)'}</p>}
        </Card>

        <Card>
          <p className="mb-2 font-semibold text-ink">Appearance</p>
          <Segmented
            value={settings.theme}
            onChange={settings.setTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            {settings.theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />} Applies across the whole app.
          </div>
        </Card>

        <Card>
          <p className="mb-2 font-semibold text-ink">Prayer times</p>
          <label className="block text-sm text-muted">
            Calculation method
            <select
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink"
              value={settings.calcMethod}
              onChange={(e) => settings.set({ calcMethod: Number(e.target.value) })}
            >
              {CALC_METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <p className="mt-3 mb-1 text-sm text-muted">Asr time</p>
          <Segmented
            value={String(settings.asrSchool) as '0' | '1'}
            onChange={(v) => settings.set({ asrSchool: v === '1' ? 1 : 0 })}
            options={[
              { value: '0', label: 'Standard' },
              { value: '1', label: 'Hanafi' },
            ]}
          />
          <p className="mt-3 mb-1 text-sm text-muted">Clock</p>
          <Segmented
            value={settings.use24h ? '24' : '12'}
            onChange={(v) => settings.set({ use24h: v === '24' })}
            options={[
              { value: '12', label: '12-hour' },
              { value: '24', label: '24-hour' },
            ]}
          />
        </Card>

        <Card>
          <p className="mb-1 font-semibold text-ink">Location</p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin className="size-4" /> {place.label}
          </p>
          {status === 'denied' && <p className="mt-1 text-xs text-danger">Location is blocked. Allow it in the browser's site settings.</p>}
          <Button variant="secondary" className="mt-3" onClick={locate} loading={status === 'locating'}>
            Update my location
          </Button>
        </Card>

        <Card>
          <p className="mb-1 font-semibold text-ink">About</p>
          <p className="text-sm text-muted">Salaam Haji for the web · shares your account, family and orders with the mobile app.</p>
          <a className="mt-2 inline-block text-sm font-semibold text-primary" href="/privacy-policy.html" target="_blank" rel="noreferrer">
            Privacy policy
          </a>
        </Card>

        <Button variant="danger" className="w-full" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </Page>
  )
}
