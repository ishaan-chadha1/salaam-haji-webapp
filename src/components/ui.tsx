import clsx from 'clsx'
import { ArrowLeft, X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'block w-full rounded-2xl border border-line bg-surface p-4 text-left shadow-sm',
        onClick && 'transition hover:border-primary/50 active:scale-[0.99]',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export function Button({
  variant = 'primary',
  className,
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-on-primary hover:brightness-110',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-surface-2',
        variant === 'ghost' && 'text-primary hover:bg-surface-2',
        variant === 'danger' && 'bg-danger text-white hover:brightness-110',
        className,
      )}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  error,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        {...rest}
        className={clsx(
          'w-full rounded-xl border bg-surface px-3 py-2.5 text-ink outline-none placeholder:text-muted/70 focus:border-primary',
          error ? 'border-danger' : 'border-line',
        )}
      />
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function PageHeader({ title, subtitle, back = true, action }: { title: string; subtitle?: string; back?: boolean; action?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="mb-4 flex items-center gap-3">
      {back && (
        <button
          aria-label="Back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2"
        >
          <ArrowLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mx-auto w-full max-w-3xl px-4 pt-4 pb-28 lg:pb-10', className)}>{children}</div>
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      className={clsx(
        'rounded-xl border px-3 py-2 text-sm',
        tone === 'info' && 'border-line bg-surface-2 text-ink',
        tone === 'warn' && 'border-gold/40 bg-gold-soft text-ink',
        tone === 'error' && 'border-danger/40 bg-danger/10 text-danger',
        tone === 'success' && 'border-primary/40 bg-primary/10 text-ink',
      )}
    >
      {children}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <span className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
