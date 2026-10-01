import { useState, type FormEvent } from 'react'
import { Button, Field, Notice } from '../../components/ui'
import { useAuth } from '../../store/auth'

/** Shown after opening a reset-password email link: the link signs you in,
 *  so ask for the new password before showing the app. */
export function SetPasswordScreen() {
  const auth = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setBusy(true)
    setError(null)
    try {
      await auth.setNewPassword(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-hero-from to-hero-to px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <img src="/icons/icon-192.png" alt="" className="mb-3 size-20 rounded-3xl shadow-lg" />
          <h1 className="text-3xl font-bold">Choose a new password</h1>
          {auth.user?.email && <p className="mt-1 text-white/75">for {auth.user.email}</p>}
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-3xl bg-surface p-5 shadow-xl">
          <Field label="New password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
          <Field label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" loading={busy} className="w-full">Save new password</Button>
          <button type="button" onClick={auth.endRecovery} className="w-full py-1 text-sm font-semibold text-muted">
            Not now
          </button>
        </form>
      </div>
    </div>
  )
}
