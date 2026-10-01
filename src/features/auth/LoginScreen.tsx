import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Notice, Segmented, Sheet } from '../../components/ui'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../store/auth'

type Mode = 'signin' | 'signup'

const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim())

export function LoginScreen() {
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [country, setCountry] = useState('')
  const [previewName, setPreviewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  // Back from a reset link but not signed in: it expired or was already used.
  const [staleReset] = useState(auth.recovering)
  useEffect(() => {
    if (staleReset) auth.endRecovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!emailOk(email)) return setError('Please enter a valid email')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (mode === 'signin') return run(() => auth.signIn(email, password))
    if (password !== confirm) return setError('Passwords do not match')
    run(async () => {
      const { needsConfirmation } = await auth.signUp({ email, password, fullName, dateOfBirth: dob, gender, countryOfResidence: country })
      if (needsConfirmation) {
        setInfo(`Please check your email (${email.trim()}) and click the confirmation link to activate your account.`)
        setMode('signin')
      }
    })
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-hero-from to-hero-to px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <img src="/icons/icon-192.png" alt="" className="mb-3 size-20 rounded-3xl shadow-lg" />
          <h1 className="text-3xl font-bold">Salaam Haji</h1>
          <p className="mt-1 text-white/75">Your Umrah companion</p>
        </div>

        <div className="rounded-3xl bg-surface p-5 shadow-xl">
          {isSupabaseConfigured ? (
            <>
              <Segmented
                value={mode}
                onChange={(m) => {
                  setMode(m)
                  setError(null)
                }}
                options={[
                  { value: 'signin', label: 'Sign in' },
                  { value: 'signup', label: 'Sign up' },
                ]}
              />
              <form onSubmit={submit} className="mt-4 space-y-3">
                {mode === 'signup' && (
                  <>
                    <Field label="Full name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-ink">Gender</span>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink"
                        >
                          <option value="">Select</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Prefer not to say</option>
                        </select>
                      </label>
                    </div>
                    <Field label="Country of residence" placeholder="e.g. India" value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country-name" />
                  </>
                )}
                <Field label="Email address" type="email" placeholder="your.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                <Field
                  label="Password"
                  type="password"
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                {mode === 'signup' && (
                  <Field label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                )}
                {mode === 'signin' && (
                  <button type="button" onClick={() => { setResetEmail(email); setResetOpen(true) }} className="text-sm font-semibold text-gold">
                    Forgot password?
                  </button>
                )}
                {staleReset && !error && !info && (
                  <Notice tone="warn">That reset link has expired or was already used. Tap Forgot password to get a new one.</Notice>
                )}
                {error && <Notice tone="error">{error}</Notice>}
                {info && (
                  <Notice tone="success">
                    {info}{' '}
                    <button type="button" className="font-semibold underline" onClick={() => run(() => auth.resendConfirmation(email))}>
                      Resend email
                    </button>
                  </Notice>
                )}
                <Button type="submit" loading={busy} className="w-full">
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Button>
              </form>
              <div className="my-4 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" />
                OR
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button variant="secondary" className="w-full" onClick={() => run(auth.signInWithGoogle)} disabled={busy}>
                <GoogleMark /> Continue with Google
              </Button>
            </>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                auth.enterPreview(previewName)
              }}
            >
              <Notice tone="warn">
                <strong>Preview mode.</strong> Supabase keys are not set for this build, so sign-in and shared data (family, orders) are off. Everything else works and is saved on this device.
              </Notice>
              <Field label="Your name" placeholder="Guest" value={previewName} onChange={(e) => setPreviewName(e.target.value)} />
              <Button type="submit" className="w-full">Continue in preview mode</Button>
            </form>
          )}
        </div>
      </div>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Reset password">
        <div className="space-y-3">
          <Field label="Email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
          <Button
            className="w-full"
            loading={busy}
            onClick={() =>
              run(async () => {
                await auth.resetPassword(resetEmail)
                setResetOpen(false)
                setInfo('Password reset email sent. Open the link in it to choose a new password.')
              })
            }
          >
            Send reset link
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
