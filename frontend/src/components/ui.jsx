import * as Checkbox from '@radix-ui/react-checkbox'
import * as Select from '@radix-ui/react-select'
import * as Switch from '@radix-ui/react-switch'
import { cva } from 'class-variance-authority'
import { motion } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'
import { OPTION_LABELS } from '../constants'
import { cn } from '../lib/utils'
import { letters } from '../utils/format'

const FIELD_BASE =
  'rounded-md border border-ink-950/[0.055] bg-paper-50/68 outline-none transition focus:border-ink-950/[0.13] focus:bg-paper-50 focus:ring-2 focus:ring-ink-950/[0.025]'

export const PANEL_RING = 'ring-1 ring-ink-950/[0.035]'

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold leading-none transition disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-800/15',
  {
    variants: {
      variant: {
        primary: 'bg-ink-950 px-4 text-paper-50 shadow-hairline hover:bg-ink-800',
        secondary: 'border border-ink-950/[0.055] bg-paper-50/68 px-4 text-ink-800 hover:bg-paper-100',
        ghost: 'px-3 text-ink-600 hover:bg-ink-950/[0.04] hover:text-ink-950',
        danger: 'bg-danger-strong px-4 text-white hover:opacity-90',
        icon: 'min-h-0 size-10 rounded-full border border-ink-950/[0.055] bg-paper-50/68 text-ink-700 hover:bg-paper-100 hover:text-ink-950',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

export function Button({ as: Component = 'button', variant, className, type = 'button', ...props }) {
  const componentProps = Component === 'button' ? { type } : {}
  return <Component className={cn(buttonVariants({ variant }), className)} {...componentProps} {...props} />
}

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <div
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold leading-none tracking-[0.01em]',
        tone === 'neutral' && 'bg-ink-950/[0.045] text-ink-600',
        tone === 'accent' && 'bg-brass-100 text-brass-600',
        tone === 'success' && 'bg-success-surface text-success-text',
        tone === 'danger' && 'bg-danger-surface text-danger-text',
        tone === 'blue' && 'bg-slateblue-100 text-slateblue-700',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TextField({ label, children, className }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-2 text-sm font-semibold text-ink-700', className)}>
      {label}
      {children}
    </label>
  )
}

export function inputClass(extra) {
  return cn(
    FIELD_BASE,
    'min-h-11 w-full px-3 text-sm text-ink-950 placeholder:text-ink-400',
    extra,
  )
}

export function panelClass(extra) {
  return cn('rounded-xl bg-paper-50/62 shadow-quiet', PANEL_RING, extra)
}

function TogglePillButton({ children, active, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-latin text-sm font-medium leading-none tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-800/15',
        active
          ? 'bg-ink-950 text-paper-50'
          : 'bg-ink-950/[0.045] text-ink-600 hover:bg-ink-950/[0.07] hover:text-ink-950',
        className,
      )}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  )
}

export function SelectControl({ value, onValueChange, options, ariaLabel, placeholder = '请选择', prefix, className, triggerClassName }) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        className={cn(
          FIELD_BASE,
          'inline-flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-semibold leading-none text-ink-950 hover:bg-paper-100 data-[placeholder]:text-ink-400',
          triggerClassName,
        )}
        aria-label={ariaLabel}
      >
        {prefix ? (
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 text-ink-600">{prefix}</div>
            <Select.Value placeholder={placeholder} />
          </div>
        ) : (
          <Select.Value placeholder={placeholder} />
        )}
        <Select.Icon className="grid size-4 shrink-0 place-items-center text-ink-400">
          <ChevronDown size={15} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className={cn(
            'z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-ink-950/[0.055] bg-paper-50/95 p-1 text-sm text-ink-900 shadow-quiet backdrop-blur-xl',
            className,
          )}
          position="popper"
          align="start"
          sideOffset={6}
        >
          <Select.ScrollUpButton className="grid h-7 cursor-default place-items-center rounded-md text-ink-400">
            <ChevronUp size={15} />
          </Select.ScrollUpButton>
          <Select.Viewport className="max-h-64 overflow-y-auto">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-9 cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 font-medium outline-none transition data-[highlighted]:bg-ink-950/[0.055] data-[highlighted]:text-ink-950"
              >
                <Select.ItemIndicator className="absolute left-2 grid size-4 place-items-center text-ink-800">
                  <Check size={14} />
                </Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="grid h-7 cursor-default place-items-center rounded-md text-ink-400">
            <ChevronDown size={15} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export function SwitchControl({ checked, onCheckedChange, label, checkedLabel, uncheckedLabel, ariaLabel, className }) {
  return (
    <div className={cn('inline-flex min-h-10 items-center gap-2 rounded-full bg-paper-50/50 px-3 text-sm font-semibold text-ink-700', className)}>
      {label && <span className="leading-none text-ink-600">{label}</span>}
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={ariaLabel}
        className="relative h-5 w-9 shrink-0 rounded-full bg-ink-950/[0.12] outline-none transition focus-visible:ring-2 focus-visible:ring-ink-800/15 data-[state=checked]:bg-ink-950"
      >
        <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-paper-50 shadow-hairline transition-transform data-[state=checked]:translate-x-[18px]" />
      </Switch.Root>
      <span className="min-w-[2.5rem] leading-none text-ink-950">{checked ? checkedLabel : uncheckedLabel}</span>
    </div>
  )
}

export function CheckboxControl({ checked, onCheckedChange, children, className }) {
  return (
    <label
      className={cn(
        FIELD_BASE,
        'group flex min-h-11 cursor-pointer items-center gap-2.5 self-end px-3 text-[15px] font-semibold text-ink-800 hover:bg-paper-100 hover:text-ink-950',
        className,
      )}
    >
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-ink-950/[0.12] bg-paper-100 text-paper-50 outline-none transition group-hover:border-ink-950/[0.2] focus:ring-2 focus:ring-ink-950/[0.045] data-[state=checked]:border-ink-950 data-[state=checked]:bg-ink-950"
      >
        <Checkbox.Indicator>
          <Check size={13} strokeWidth={2.4} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <div className="leading-none">{children}</div>
    </label>
  )
}

export function AnswerLettersControl({ value, isMulti, onChange }) {
  const selected = letters(value)

  function toggle(label) {
    if (!isMulti) {
      onChange(selected.length === 1 && selected.includes(label) ? '' : label)
      return
    }
    const next = selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label].sort()
    onChange(next.join(''))
  }

  return (
    <div className={cn(FIELD_BASE, 'flex min-h-11 flex-wrap items-center gap-1.5 px-2 py-1.5')}>
      {OPTION_LABELS.map((label) => (
        <TogglePillButton key={label} active={selected.includes(label)} onClick={() => toggle(label)}>
          {label}
        </TogglePillButton>
      ))}
      <div className="ml-auto flex h-8 items-center rounded-md bg-ink-950/[0.035] px-2 font-latin text-xs font-medium leading-none text-ink-500 tabular-nums">
        {value || '未选'}
      </div>
    </div>
  )
}

export function CountStepper({ label, value, tone = 'danger', onDecrease, onIncrease }) {
  const count = Number(value) || 0
  const toneClass =
    tone === 'neutral'
      ? 'bg-ink-950/[0.045] text-ink-600'
      : 'bg-danger-surface text-danger-text'
  const hoverClass = tone === 'neutral' ? 'hover:bg-ink-950/[0.06]' : 'hover:bg-danger-text/10'

  return (
    <div className={cn('inline-flex h-7 items-center overflow-hidden rounded-full text-xs font-semibold leading-none', toneClass)}>
      <button
        type="button"
        className={cn('grid size-7 place-items-center transition disabled:cursor-not-allowed disabled:opacity-35', hoverClass)}
        onClick={onDecrease}
        disabled={count <= 0}
        aria-label={`${label}次数减一`}
        title={`${label}次数减一`}
      >
        <Minus size={13} />
      </button>
      <div className="flex h-7 items-center gap-1 px-1.5">
        {label} <div className="font-latin tabular-nums">{count}</div> 次
      </div>
      <button
        type="button"
        className={cn('grid size-7 place-items-center transition', hoverClass)}
        onClick={onIncrease}
        aria-label={`${label}次数加一`}
        title={`${label}次数加一`}
      >
        <Plus size={13} />
      </button>
    </div>
  )
}

export function Screen({ children, className }) {
  return (
    <motion.section
      className={cn('mx-auto w-full max-w-6xl', className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}
