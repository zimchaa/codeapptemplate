import { useId, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/cn.ts'

const control =
  'w-full rounded border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-[invalid=true]:border-danger'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-10', className)} {...props} />
}

export function Textarea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(control, 'py-2 leading-relaxed', className)} {...props} />
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: readonly SelectOption[]
  placeholder?: string
}

/** Native <select>: accessible, mobile friendly, no portal. */
export function Select({ className, options, placeholder, ...props }: SelectProps) {
  return (
    <select className={cn(control, 'h-10 pr-8', className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-semibold text-foreground', className)} {...props} />
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input id={inputId} type="checkbox" className="size-4 rounded border-border accent-[rgb(var(--ws-primary))]" {...props} />
      <label htmlFor={inputId} className="text-sm text-foreground">
        {label}
      </label>
    </div>
  )
}

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-border',
      )}
    >
      <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  )
}

export interface FieldProps {
  label: string
  /** Render prop receives the id to put on the control. */
  children: (id: string) => ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  className?: string
}

/** Label + control + hint/error, wired up with ids for accessibility. */
export function Field({ label, children, hint, error, required, className }: FieldProps) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </Label>
      {children(id)}
      {error ? (
        <p className="text-xs text-danger" role="alert">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}
