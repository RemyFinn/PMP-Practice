import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as Select from '@radix-ui/react-select'
import { cva } from 'class-variance-authority'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  FilePenLine,
  GraduationCap,
  Layers3,
  ListChecks,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Shuffle,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react'
import { cn } from './lib/utils'
import './styles.css'

const EXAM_ORDER = ['sim7', 'sim8', 'sim9', 'sim10']
const EXAM_LABELS = {
  sim7: '模拟七',
  sim8: '模拟八',
  sim9: '模拟九',
  sim10: '模拟十',
}
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
const FONT_OPTIONS = [
  { value: 'default', label: '默认' },
  { value: 'system', label: '粗体' },
]
const FIELD_BASE =
  'rounded-md border border-ink-950/[0.055] bg-white/68 shadow-hairline outline-none transition focus:border-ink-950/[0.13] focus:bg-white focus:ring-2 focus:ring-ink-950/[0.035]'
const PANEL_RING = 'ring-1 ring-ink-950/[0.035]'

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold leading-none transition disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-800/15',
  {
    variants: {
      variant: {
        primary: 'bg-ink-950 px-4 text-paper-50 shadow-hairline hover:bg-ink-800',
        secondary: 'border border-ink-950/[0.055] bg-white/68 px-4 text-ink-800 hover:bg-white',
        ghost: 'px-3 text-ink-600 hover:bg-ink-950/[0.04] hover:text-ink-950',
        danger: 'bg-[#8e3f3f] px-4 text-white hover:bg-[#743333]',
        icon: 'min-h-0 size-10 rounded-full border border-ink-950/[0.055] bg-white/68 text-ink-700 hover:bg-white hover:text-ink-950',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(detail.detail || response.statusText)
  }
  return response.json()
}

function letters(value) {
  return Array.from(new Set(String(value || '').toUpperCase().match(/[A-F]/g) || [])).sort()
}

function formatElapsed(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function formatSpent(seconds) {
  if (seconds === null || seconds === undefined) return '未记录'
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  if (safeSeconds < 60) return `${safeSeconds} 秒`
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分`
}

function formatDateTime(value) {
  if (!value) return '暂无'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Button({ variant, className, type = 'button', ...props }) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />
}

function Badge({ tone = 'neutral', className, children }) {
  return (
    <div
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold leading-none tracking-[0.01em]',
        tone === 'neutral' && 'bg-ink-950/[0.045] text-ink-600',
        tone === 'accent' && 'bg-brass-100 text-brass-600',
        tone === 'success' && 'bg-[#e7efe6] text-[#496a45]',
        tone === 'danger' && 'bg-[#f0dfdc] text-[#8e4940]',
        tone === 'blue' && 'bg-slateblue-100 text-slateblue-700',
        className,
      )}
    >
      {children}
    </div>
  )
}

function TextField({ label, children, className }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-2 text-sm font-semibold text-ink-700', className)}>
      {label}
      {children}
    </label>
  )
}

function inputClass(extra) {
  return cn(
    FIELD_BASE,
    'min-h-11 w-full px-3 text-sm text-ink-950 placeholder:text-ink-400',
    extra,
  )
}

function panelClass(extra) {
  return cn('rounded-xl bg-white/62 shadow-quiet', PANEL_RING, extra)
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

function SelectControl({ value, onValueChange, options, ariaLabel, placeholder = '请选择', prefix, className, triggerClassName }) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        className={cn(
          FIELD_BASE,
          'inline-flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-semibold leading-none text-ink-950 hover:bg-white data-[placeholder]:text-ink-400',
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
        <Select.Icon className="grid size-4 place-items-center text-ink-400">
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
          <Select.Viewport>
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
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function CheckboxControl({ checked, onCheckedChange, children, className }) {
  return (
    <label
      className={cn(
        FIELD_BASE,
        'group flex min-h-11 cursor-pointer items-center gap-2.5 self-end px-3 text-[15px] font-semibold text-ink-800 hover:bg-white hover:text-ink-950',
        className,
      )}
    >
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-ink-950/[0.12] bg-paper-50 text-paper-50 outline-none transition group-hover:border-ink-950/[0.2] focus:ring-2 focus:ring-ink-950/[0.045] data-[state=checked]:border-ink-950 data-[state=checked]:bg-ink-950"
      >
        <Checkbox.Indicator>
          <Check size={13} strokeWidth={2.4} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      <div className="leading-none">{children}</div>
    </label>
  )
}

function AnswerLettersControl({ value, isMulti, onChange }) {
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

function CountStepper({ label, value, tone = 'danger', onDecrease, onIncrease }) {
  const count = Number(value) || 0
  const toneClass =
    tone === 'neutral'
      ? 'bg-ink-950/[0.045] text-ink-600'
      : 'bg-[#f0dfdc] text-[#8e4940]'
  const hoverClass = tone === 'neutral' ? 'hover:bg-ink-950/[0.06]' : 'hover:bg-[#8e4940]/10'

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

function Screen({ children, className }) {
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

function App() {
  const [view, setView] = useState('home')
  const [exams, setExams] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState(null)
  const [submitted, setSubmitted] = useState(new Map())
  const [fontMode, setFontMode] = useState(() => {
    const saved = localStorage.getItem('pmp-font-mode')
    return saved === 'system' ? 'system' : 'default'
  })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)

  const currentQuestion = questions[currentIndex]
  const submittedElapsed = useMemo(() => {
    let total = 0
    submitted.forEach((item) => {
      total += Math.max(0, Number(item.elapsed_seconds) || 0)
    })
    return total
  }, [submitted])
  const totals = useMemo(() => {
    return exams.reduce(
      (acc, exam) => ({
        questions: acc.questions + exam.total_questions,
        wrong: acc.wrong + exam.wrong_questions,
        attempts: acc.attempts + exam.attempts,
      }),
      { questions: 0, wrong: 0, attempts: 0 },
    )
  }, [exams])

  async function loadExams() {
    const data = await api('/api/exams')
    data.sort((a, b) => EXAM_ORDER.indexOf(a.code) - EXAM_ORDER.indexOf(b.code))
    setExams(data)
  }

  async function run(action, successMessage) {
    setLoading(true)
    try {
      const result = await action()
      if (successMessage) setNotice({ type: 'success', text: successMessage })
      return result
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function startPractice(nextMode) {
    await run(async () => {
      let path = `/api/questions?mode=${nextMode.type}`
      if (nextMode.type === 'exam') path += `&exam=${encodeURIComponent(nextMode.examCode)}`
      if (nextMode.type === 'mixed') path += '&shuffle=1'
      const data = await api(path)
      if (data.length === 0) {
        setNotice({ type: 'info', text: '当前模式暂时没有题目。' })
        return
      }
      setQuestions(data)
      setSubmitted(new Map())
      setCurrentIndex(0)
      setMode(nextMode)
      setView('practice')
    })
  }

  function startPracticeFromQuestions(nextQuestions, startIndex = 0, nextMode = { type: 'wrong', label: '错题集' }) {
    if (nextQuestions.length === 0) {
      setNotice({ type: 'info', text: '当前没有可练习的题目。' })
      return
    }
    setQuestions(nextQuestions)
    setSubmitted(new Map())
    setCurrentIndex(Math.max(0, Math.min(startIndex, nextQuestions.length - 1)))
    setMode(nextMode)
    setView('practice')
  }

  async function refreshEverything() {
    await run(loadExams, '统计已刷新')
  }

  useEffect(() => {
    loadExams().catch((error) => setNotice({ type: 'error', text: error.message }))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.font = fontMode
    localStorage.setItem('pmp-font-mode', fontMode)
  }, [fontMode])

  return (
    <div className="min-h-dvh bg-paper-50 text-ink-950">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[236px_minmax(0,1fr)]">
        <Sidebar view={view} setView={setView} totals={totals} />
        <main id="main" className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
          <TopBar onRefresh={refreshEverything} loading={loading} fontMode={fontMode} setFontMode={setFontMode} />
          <AnimatePresence>{notice && <Notice notice={notice} onClose={() => setNotice(null)} />}</AnimatePresence>
          <AnimatePresence mode="wait">
            {view === 'home' && <HomeView key="home" exams={exams} totals={totals} onStart={startPractice} />}
            {view === 'practice' && currentQuestion && (
              <PracticeView
                key="practice"
                question={currentQuestion}
                index={currentIndex}
                total={questions.length}
                mode={mode}
                result={submitted.get(currentQuestion.id)}
                submittedElapsed={submittedElapsed}
                onBack={() => setView(mode?.backView || 'home')}
                onPrevious={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                onNext={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}
                onSubmit={async (selectedOptions, elapsedSeconds) => {
                  const result = await run(async () => {
                    const response = await api('/api/attempts', {
                      method: 'POST',
                      body: JSON.stringify({
                        question_id: currentQuestion.id,
                        selected_options: selectedOptions,
                        mode: mode?.type || 'practice',
                        elapsed_seconds: elapsedSeconds,
                      }),
                    })
                    setSubmitted((previous) => new Map(previous).set(currentQuestion.id, response))
                    setQuestions((previous) =>
                      previous.map((item) =>
                        item.id === currentQuestion.id
                          ? {
                              ...item,
                              is_wrong_active: response.is_wrong_active,
                              wrong_count: response.wrong_count,
                              attempt_count: response.attempt_count,
                              last_wrong_at: response.last_wrong_at,
                            }
                          : item,
                      ),
                    )
                    await loadExams()
                    return response
                  })
                  return result
                }}
                onLearned={async () => {
                  await run(async () => {
                    await api(`/api/wrong-items/${currentQuestion.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ learned: true }),
                    })
                    setQuestions((previous) => {
                      const next =
                        mode?.type === 'wrong'
                          ? previous.filter((item) => item.id !== currentQuestion.id)
                          : previous.map((item) =>
                              item.id === currentQuestion.id ? { ...item, is_wrong_active: false } : item,
                            )
                      setCurrentIndex((value) => Math.max(0, Math.min(value, next.length - 1)))
                      if (mode?.type === 'wrong' && next.length === 0) {
                        setView(mode?.backView || 'home')
                        setNotice({ type: 'success', text: '错题集已清空。' })
                      }
                      return next
                    })
                    await loadExams()
                  }, '已移出错题集')
                }}
              />
            )}
            {view === 'admin' && (
              <AdminView key="admin" exams={exams} reloadExams={loadExams} notify={setNotice} run={run} />
            )}
            {view === 'wrong' && (
              <WrongItemsView
                key="wrong"
                exams={exams}
                reloadExams={loadExams}
                notify={setNotice}
                run={run}
                onStartPractice={startPracticeFromQuestions}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function Sidebar({ view, setView, totals }) {
  return (
    <aside className="relative border-b border-white/25 bg-[radial-gradient(circle_at_30%_0%,rgba(138,112,77,0.06),transparent_34%),linear-gradient(180deg,rgba(251,250,247,0.64),rgba(245,241,234,0.48))] px-4 py-4 backdrop-blur-2xl after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-gradient-to-r after:from-transparent after:via-ink-950/[0.07] after:to-transparent lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:px-5 lg:after:bottom-6 lg:after:left-auto lg:after:right-0 lg:after:top-6 lg:after:h-auto lg:after:w-px lg:after:bg-gradient-to-b">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-ink-950 text-paper-50">
          <GraduationCap size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">PMP 练习系统</h1>
          <p className="text-xs font-medium text-ink-400">Local trainer</p>
        </div>
      </div>

      <nav className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1">
        <Button variant={view === 'home' ? 'primary' : 'ghost'} className="justify-start" onClick={() => setView('home')}>
          <BookOpen size={17} />
          练习
        </Button>
        <Button variant={view === 'wrong' ? 'primary' : 'ghost'} className="justify-start" onClick={() => setView('wrong')}>
          <Target size={17} />
          错题
        </Button>
        <Button variant={view === 'admin' ? 'primary' : 'ghost'} className="justify-start" onClick={() => setView('admin')}>
          <Database size={17} />
          题库
        </Button>
      </nav>

      <div className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1">
        <Metric label="题目" value={totals.questions} icon={<Layers3 size={15} />} />
        <Metric label="错题" value={totals.wrong} icon={<Target size={15} />} />
        <Metric label="记录" value={totals.attempts} icon={<ListChecks size={15} />} />
      </div>
    </aside>
  )
}

function Metric({ label, value, icon }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.28] bg-white/24 px-2.5 py-2.5 shadow-[0_8px_22px_rgba(42,35,28,0.045)] backdrop-blur-2xl ring-1 ring-white/20">
      <div className="hidden size-7 place-items-center rounded-lg border border-white/20 bg-white/20 text-ink-500 backdrop-blur-xl sm:grid">{icon}</div>
      <div className="min-w-0">
        <strong className="block font-latin text-[15px] leading-none tabular-nums text-ink-950">{value}</strong>
        <div className="mt-1 text-[11px] font-semibold leading-none text-ink-500">{label}</div>
      </div>
    </div>
  )
}

function TopBar({ onRefresh, loading, fontMode, setFontMode }) {
  return (
    <header className="mx-auto mb-4 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">PMP Practice</p>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">练习</h2>
      </div>
      <div className="flex items-center gap-2">
        <SelectControl
          value={fontMode}
          onValueChange={setFontMode}
          options={FONT_OPTIONS}
          ariaLabel="选择界面字体"
          prefix="字体"
          triggerClassName="min-h-10 w-[128px] border-0 bg-white/50 shadow-hairline hover:bg-white/65"
        />
        <Button variant="ghost" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          刷新
        </Button>
      </div>
    </header>
  )
}

function Notice({ notice, onClose }) {
  const Icon = notice.type === 'error' ? AlertCircle : CheckCircle2
  return (
    <motion.div
      className={cn(
        'mx-auto mb-4 flex max-w-6xl items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-quiet',
        notice.type === 'error'
          ? 'border-[#b36a5c]/[0.12] bg-[#f5e7e3] text-[#7f3e36]'
          : 'border-[#708b68]/[0.12] bg-[#edf4e8] text-[#496a45]',
      )}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      role="status"
      aria-live="polite"
    >
      <Icon size={17} />
      <div className="min-w-0 flex-1 leading-5">{notice.text}</div>
      <button type="button" onClick={onClose} aria-label="关闭提示" className="text-current">
        <XCircle size={17} />
      </button>
    </motion.div>
  )
}

function HomeView({ exams, totals, onStart }) {
  return (
    <Screen className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className={panelClass('bg-white/58 p-4 sm:p-5')}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">选择练习</h2>
            <p className="mt-1 text-sm text-ink-400">按套卷练习，或混合打乱后复盘错题。</p>
          </div>
          <Badge tone="blue">SQLite · 本地题库</Badge>
        </div>
      <div className="divide-y divide-ink-950/[0.035]">
          {exams.map((exam) => (
            <ModeRow
              key={exam.code}
              title={exam.title.replace('PMP 仿真', '')}
              meta={`${exam.total_questions} 题`}
              extra={`${exam.wrong_questions} 错题`}
              icon={<BookOpen size={18} />}
              onClick={() => onStart({ type: 'exam', examCode: exam.code, label: exam.title })}
            />
          ))}
          <ModeRow
            title="混合随机"
            meta="720 题"
            extra="打乱顺序"
            icon={<Shuffle size={18} />}
            onClick={() => onStart({ type: 'mixed', label: '混合随机' })}
          />
          <ModeRow
            title="错题集"
            meta={`${totals.wrong} 题`}
            extra="动态维护"
            icon={<Target size={18} />}
            onClick={() => onStart({ type: 'wrong', label: '错题集' })}
          />
        </div>
      </section>

      <aside className="rounded-xl bg-ink-950 p-5 text-paper-50 shadow-quiet">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-paper-200/65">Overview</p>
        <div className="mt-6 grid gap-5">
          <DashboardNumber label="题目" value={totals.questions} />
          <DashboardNumber label="错题" value={totals.wrong} />
          <DashboardNumber label="作答记录" value={totals.attempts} />
        </div>
      </aside>
    </Screen>
  )
}

function DashboardNumber({ label, value }) {
  return (
    <div>
      <strong className="block font-latin text-3xl font-semibold leading-none tabular-nums">{value}</strong>
      <div className="mt-1 text-sm leading-5 text-paper-200/65">{label}</div>
    </div>
  )
}

function ModeRow({ title, meta, extra, icon, onClick }) {
  return (
    <motion.button
      className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3.5 text-left"
      onClick={onClick}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="grid size-9 place-items-center rounded-md bg-ink-950/[0.045] text-ink-600 transition group-hover:bg-ink-950 group-hover:text-paper-50">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-sm text-ink-400">{meta} · {extra}</p>
      </div>
      <ArrowRight size={18} className="text-ink-400 transition group-hover:text-ink-950" />
    </motion.button>
  )
}

function PracticeView({
  question,
  index,
  total,
  mode,
  result,
  submittedElapsed,
  onBack,
  onPrevious,
  onNext,
  onSubmit,
  onLearned,
}) {
  const [selected, setSelected] = useState([])
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now())
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const progress = Math.round(((index + 1) / total) * 100)
  const currentElapsed = result?.elapsed_seconds ?? Math.max(0, Math.floor((timerNow - questionStartedAt) / 1000))
  const sessionElapsed = submittedElapsed + (result ? 0 : currentElapsed)

  useEffect(() => {
    const now = Date.now()
    setSelected(result ? letters(result.selected_answer) : [])
    setQuestionStartedAt(now)
    setTimerNow(now)
  }, [question.id, result])

  useEffect(() => {
    if (result) return undefined
    const timer = window.setInterval(() => setTimerNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [question.id, result])

  function getCurrentElapsed() {
    if (result) return result.elapsed_seconds ?? 0
    return Math.max(0, Math.floor((Date.now() - questionStartedAt) / 1000))
  }

  function clearQuestionTimer() {
    if (result) return
    const now = Date.now()
    setQuestionStartedAt(now)
    setTimerNow(now)
  }

  async function submit() {
    if (selected.length === 0 || result) return
    await onSubmit(selected, getCurrentElapsed())
  }

  function toggle(label) {
    if (result) return
    if (question.is_multi) {
      setSelected((previous) =>
        previous.includes(label) ? previous.filter((item) => item !== label) : [...previous, label].sort(),
      )
    } else {
      setSelected([label])
      onSubmit([label], getCurrentElapsed())
    }
  }

  return (
    <Screen className="pb-14">
      <div className={panelClass('mb-4 bg-white/54 p-3 shadow-hairline')}>
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft size={16} />
              返回
            </Button>
            <Badge>{mode?.label || '练习'}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-600">
            <div className="font-latin leading-none tabular-nums">本次 {formatElapsed(sessionElapsed)}</div>
            <div className="leading-none text-ink-300">/</div>
            <div className="font-latin leading-none tabular-nums">本题 {formatElapsed(currentElapsed)}</div>
            <Button
              variant="icon"
              className="size-8"
              onClick={clearQuestionTimer}
              disabled={Boolean(result)}
              aria-label="清除当前题计时"
              title="清除当前题计时"
            >
              <RefreshCw size={15} />
            </Button>
          </div>
          <div className="grid min-w-[180px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
            <strong className="font-latin text-sm tabular-nums">{index + 1}/{total}</strong>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-950/10" aria-label={`进度 ${progress}%`}>
              <motion.div
                className="h-full rounded-full bg-ink-950"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      <motion.article
        key={question.id}
        className={cn('rounded-2xl bg-white/72 px-4 py-4 shadow-quiet sm:px-6 sm:py-5', PANEL_RING)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 leading-none">
            <Badge tone="blue">
              {EXAM_LABELS[question.exam_code] || question.exam_code.toUpperCase()} · 第 <div className="font-latin">{question.number}</div> 题
            </Badge>
            <Badge tone={question.is_multi ? 'accent' : 'neutral'}>{question.is_multi ? '多选' : '单选'}</Badge>
            {question.is_wrong_active && <Badge tone="danger">错题</Badge>}
            {Number(question.wrong_count) > 0 && <Badge tone="neutral">错 <div className="font-latin">{question.wrong_count}</div> 次</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="icon" onClick={onPrevious} disabled={index === 0} aria-label="上一题">
              <ArrowLeft size={18} />
            </Button>
            {question.is_wrong_active && (
              <Button variant="icon" onClick={onLearned} aria-label="学会了，移出错题集" title="学会了">
                <CheckCircle2 size={18} />
              </Button>
            )}
            <Button variant="icon" onClick={onNext} disabled={index >= total - 1} aria-label="下一题">
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>

        <h1 className="max-w-4xl whitespace-pre-wrap font-serif text-[22px] leading-[1.6] tracking-tight text-ink-950 sm:text-[26px]">
          {question.stem}
        </h1>

        <div className="mt-2.5 grid gap-1" role="group" aria-label="题目选项">
          {question.options.map((option) => {
            const checked = selected.includes(option.label)
            return (
              <motion.button
                key={option.label}
                type="button"
                className={cn(
                  'group/option grid min-h-11 grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-transparent py-2 text-left transition duration-150',
                  !result && 'hover:text-ink-950',
                  result && 'cursor-default',
                )}
                onClick={() => toggle(option.label)}
                aria-pressed={checked}
                whileTap={!result ? { scale: 0.998 } : undefined}
              >
                <div
                  className={cn(
                    'grid size-8 place-items-center rounded-md font-latin text-sm font-semibold leading-none transition duration-150 group-hover/option:bg-ink-950/[0.07] group-hover/option:text-ink-950',
                    checked ? 'bg-ink-950 text-paper-50 group-hover/option:bg-ink-950 group-hover/option:text-paper-50' : 'bg-ink-950/[0.055] text-ink-600',
                  )}
                >
                  {option.label}
                </div>
                <div className={cn('flex min-h-8 min-w-0 items-center text-ink-800 transition-colors duration-150', checked && 'text-ink-950')}>
                  <div className="text-[15px] font-normal leading-[1.42] underline-offset-[5px] decoration-ink-950 decoration-[0.45px] transition-colors duration-150 group-hover/option:text-ink-950 group-hover/option:underline">{option.text}</div>
                </div>
                {checked && <Check size={17} className="text-ink-500" />}
              </motion.button>
            )
          })}
        </div>

        {question.is_multi && !result && (
          <div className="mt-4 flex justify-end border-t border-ink-950/[0.035] pt-4">
            <Button variant="primary" onClick={submit} disabled={selected.length === 0} className="w-full sm:w-auto">
              提交答案
            </Button>
          </div>
        )}

        <AnimatePresence>
          {result && <ResultPanel key={`${question.id}-${result.is_correct ? 'correct' : 'wrong'}`} result={result} />}
        </AnimatePresence>
      </motion.article>
    </Screen>
  )
}

function ResultPanel({ result }) {
  return (
    <motion.section
      className={cn(
        'mt-5 rounded-xl border p-4',
        result.is_correct
          ? 'border-[#708b68]/[0.12] bg-[#edf4e8] text-[#314b2f]'
          : 'border-[#b36a5c]/[0.12] bg-[#f5e7e3] text-[#733c35]',
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {result.is_correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
        <strong>{result.is_correct ? '正确' : '错误'}</strong>
        <div className="text-sm leading-5 opacity-75">用时 {formatSpent(result.elapsed_seconds)}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm leading-6">
        <div className="text-current/60">
          已选 <div className="inline font-latin font-medium tabular-nums text-current/75">{result.selected_answer || '未选'}</div>
        </div>
        <div className="h-3 w-px bg-current/[0.08]" aria-hidden="true" />
        <div className="flex items-center gap-1.5">
          <div className="text-current/60">答案</div>
          <div
            className={cn(
              'inline-flex h-7 items-center rounded-md px-2 font-latin text-sm font-semibold leading-none tabular-nums',
              result.is_correct ? 'bg-white/20 text-current' : 'bg-white/52 text-[#314b2f] ring-1 ring-[#708b68]/[0.13]',
            )}
          >
            {result.correct_answer}
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-current/[0.055] pt-4">
        <strong className="text-sm">解析</strong>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7">{result.explanation || '暂无解析'}</p>
      </div>
    </motion.section>
  )
}

function WrongItemsView({ exams, reloadExams, notify, run, onStartPractice }) {
  const [questions, setQuestions] = useState([])
  const [examFilter, setExamFilter] = useState('')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  async function loadWrongQuestions() {
    setIsLoading(true)
    let path = '/api/questions?mode=wrong'
    if (examFilter) path += `&exam=${encodeURIComponent(examFilter)}`
    if (search.trim()) path += `&search=${encodeURIComponent(search.trim())}`
    try {
      const data = await api(path)
      setQuestions(data)
      setHasLoaded(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWrongQuestions().catch((error) => notify({ type: 'error', text: error.message }))
  }, [examFilter])

  async function markLearned(questionId) {
    await run(async () => {
      await api(`/api/wrong-items/${questionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ learned: true }),
      })
      setQuestions((previous) => previous.filter((question) => question.id !== questionId))
      await reloadExams()
    }, '已移出错题集')
  }

  async function adjustWrongCount(question, delta) {
    const nextCount = Math.max(0, (Number(question.wrong_count) || 0) + delta)
    await run(async () => {
      const updated = await api(`/api/questions/${question.id}/wrong-count`, {
        method: 'PATCH',
        body: JSON.stringify({ wrong_count: nextCount }),
      })
      setQuestions((previous) =>
        nextCount === 0
          ? previous.filter((item) => item.id !== question.id)
          : previous
              .map((item) => (item.id === question.id ? updated : item))
              .sort((a, b) => {
                const wrongDiff = (Number(b.wrong_count) || 0) - (Number(a.wrong_count) || 0)
                if (wrongDiff !== 0) return wrongDiff
                return String(b.last_wrong_at || '').localeCompare(String(a.last_wrong_at || ''))
              }),
      )
      await reloadExams()
    }, nextCount === 0 ? '已从错题统计中移除' : '错题次数已调整')
  }

  async function adjustAttemptCount(question, delta) {
    const nextCount = Math.max(0, (Number(question.attempt_count) || 0) + delta)
    await run(async () => {
      const updated = await api(`/api/questions/${question.id}/attempt-count`, {
        method: 'PATCH',
        body: JSON.stringify({ attempt_count: nextCount }),
      })
      setQuestions((previous) => previous.map((item) => (item.id === question.id ? updated : item)))
      await reloadExams()
    }, '作答次数已调整')
  }

  function startFrom(index) {
    onStartPractice(questions, index, { type: 'wrong', label: '错题集', backView: 'wrong' })
  }

  const totalWrongAttempts = questions.reduce((sum, question) => sum + (Number(question.wrong_count) || 0), 0)

  return (
    <Screen>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">错题管理</h2>
          <p className="mt-1 text-sm text-ink-400">按错误次数复盘，学会后从错题集中移除。</p>
        </div>
        <Button variant="primary" onClick={() => startFrom(0)} disabled={isLoading || questions.length === 0}>
          <Target size={16} />
          开始错题练习
        </Button>
      </div>

      <section className={panelClass('p-4')}>
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">
          <TextField label="套卷">
            <SelectControl
              value={examFilter || 'all'}
              onValueChange={(value) => setExamFilter(value === 'all' ? '' : value)}
              options={[{ value: 'all', label: '全部套卷' }, ...exams.map((exam) => ({ value: exam.code, label: exam.title }))]}
              ariaLabel="筛选错题套卷"
            />
          </TextField>
          <TextField label="搜索">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                className={inputClass('pl-9')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="题干、解析或答案"
              />
            </div>
          </TextField>
          <Button variant="secondary" onClick={() => run(loadWrongQuestions)} disabled={isLoading}>
            搜索
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink-500">
          <Badge tone="danger">{hasLoaded ? questions.length : '...' } 道错题</Badge>
          <Badge tone="neutral">累计错 <div className="font-latin">{hasLoaded ? totalWrongAttempts : '...'}</div> 次</Badge>
          <Badge tone="blue">错得多的优先</Badge>
        </div>

        <div className="mt-4 divide-y divide-ink-950/[0.035]">
          {isLoading && !hasLoaded && (
            <div className="grid gap-3 py-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-lg bg-ink-950/[0.025] px-3 py-4">
                  <div className="h-3 w-40 rounded-full bg-ink-950/[0.055]" />
                  <div className="mt-3 h-3 w-full max-w-2xl rounded-full bg-ink-950/[0.045]" />
                  <div className="mt-2 h-3 w-2/3 rounded-full bg-ink-950/[0.035]" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && hasLoaded && questions.length === 0 && (
            <div className="py-12 text-center">
              <CheckCircle2 size={26} className="mx-auto text-ink-300" />
              <p className="mt-3 text-sm font-semibold text-ink-700">当前没有错题</p>
              <p className="mt-1 text-sm text-ink-400">继续练习后，答错的题会自动回到这里。</p>
            </div>
          )}

          {hasLoaded && questions.map((question, index) => (
            <div key={question.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="blue">
                    {EXAM_LABELS[question.exam_code] || question.exam_code.toUpperCase()} · 第 <div className="font-latin">{question.number}</div> 题
                  </Badge>
                  <Badge tone={question.is_multi ? 'accent' : 'neutral'}>{question.is_multi ? '多选' : '单选'}</Badge>
                  <CountStepper
                    label="错"
                    value={question.wrong_count}
                    onDecrease={() => adjustWrongCount(question, -1)}
                    onIncrease={() => adjustWrongCount(question, 1)}
                  />
                  <CountStepper
                    label="作答"
                    value={question.attempt_count}
                    tone="neutral"
                    onDecrease={() => adjustAttemptCount(question, -1)}
                    onIncrease={() => adjustAttemptCount(question, 1)}
                  />
                </div>
                <button
                  type="button"
                  className="group block w-full text-left"
                  onClick={() => startFrom(index)}
                >
                  <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-ink-950 underline-offset-[5px] decoration-[0.6px] group-hover:underline">
                    {question.stem}
                  </h3>
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-400">
                  <div>答案 <div className="inline font-latin font-semibold text-ink-700">{question.correct_answer}</div></div>
                  <div>最近错题 {formatDateTime(question.last_wrong_at)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="secondary" onClick={() => startFrom(index)}>
                  <ArrowRight size={16} />
                  练这题
                </Button>
                <Button variant="ghost" onClick={() => markLearned(question.id)}>
                  <CheckCircle2 size={16} />
                  学会了
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Screen>
  )
}

function AdminView({ exams, reloadExams, notify, run }) {
  const [questions, setQuestions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [examFilter, setExamFilter] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyQuestion(exams[0]?.code || 'sim7'))

  const selectedQuestion = questions.find((item) => item.id === selectedId)

  async function loadQuestions() {
    let path = examFilter ? `/api/questions?mode=exam&exam=${encodeURIComponent(examFilter)}` : '/api/questions?mode=admin'
    if (search.trim()) path += `&search=${encodeURIComponent(search.trim())}`
    const data = await api(path)
    setQuestions(data)
  }

  useEffect(() => {
    loadQuestions().catch((error) => notify({ type: 'error', text: error.message }))
  }, [examFilter])

  useEffect(() => {
    if (selectedQuestion) setForm(questionToForm(selectedQuestion))
  }, [selectedQuestion])

  function resetForm() {
    setSelectedId(null)
    setForm(emptyQuestion(exams[0]?.code || 'sim7'))
  }

  async function save(event) {
    event.preventDefault()
    const payload = formToPayload(form)
    if (!payload.correct_answer.trim()) {
      notify({ type: 'error', text: '请选择标准答案。' })
      return
    }
    if (payload.options.length < 2) {
      notify({ type: 'error', text: '至少保留两个选项。' })
      return
    }
    await run(async () => {
      if (selectedId) {
        await api(`/api/questions/${selectedId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await api('/api/questions', { method: 'POST', body: JSON.stringify(payload) })
      }
      await loadQuestions()
      await reloadExams()
    }, selectedId ? '题目已保存' : '题目已新增')
  }

  async function remove() {
    if (!selectedId) return
    if (!confirm('确认删除？')) return
    await run(async () => {
      await api(`/api/questions/${selectedId}`, { method: 'DELETE' })
      resetForm()
      await loadQuestions()
      await reloadExams()
    }, '题目已删除')
  }

  return (
    <Screen>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">题库管理</h2>
          <p className="mt-1 text-sm text-ink-400">筛选、编辑和维护本地题库。</p>
        </div>
        <Button variant="primary" onClick={resetForm}>
          <FilePenLine size={16} />
          新增题目
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <section className={panelClass('p-4')}>
          <div className="grid gap-3">
            <TextField label="套卷">
              <SelectControl
                value={examFilter || 'all'}
                onValueChange={(value) => setExamFilter(value === 'all' ? '' : value)}
                options={[{ value: 'all', label: '全部套卷' }, ...exams.map((exam) => ({ value: exam.code, label: exam.title }))]}
                ariaLabel="筛选套卷"
              />
            </TextField>
            <TextField label="搜索">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input className={inputClass('pl-9')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="关键词" />
              </div>
            </TextField>
            <Button variant="secondary" onClick={() => run(loadQuestions)}>
              搜索
            </Button>
          </div>

          <div className="mt-4 grid max-h-[64vh] gap-2 overflow-auto pr-1" aria-label="题目列表">
            {questions.map((question) => (
              <button
                key={question.id}
                className={cn(
                  'rounded-lg border border-transparent bg-paper-50/72 px-3 py-2.5 text-left transition hover:border-ink-950/[0.055] hover:bg-white',
                  selectedId === question.id && 'border-ink-950/[0.1] bg-white shadow-hairline',
                )}
                onClick={() => setSelectedId(question.id)}
              >
                <strong className="block font-latin text-sm tabular-nums">
                  {question.exam_code.toUpperCase()}-{question.number} · {question.correct_answer}
                </strong>
                <div className="mt-1 line-clamp-2 text-sm leading-6 text-ink-400">{question.stem}</div>
              </button>
            ))}
          </div>
        </section>

        <QuestionEditor
          exams={exams}
          form={form}
          setForm={setForm}
          selectedId={selectedId}
          onSave={save}
          onDelete={remove}
          onClear={resetForm}
        />
      </div>
    </Screen>
  )
}

function emptyQuestion(examCode) {
  return {
    exam_code: examCode,
    number: '',
    stem: '',
    is_multi: false,
    correct_answer: '',
    explanation: '',
    options: OPTION_LABELS.map((label) => ({ label, text: '' })),
  }
}

function questionToForm(question) {
  const optionMap = new Map(question.options.map((option) => [option.label, option.text]))
  return {
    exam_code: question.exam_code,
    number: question.number,
    stem: question.stem,
    is_multi: question.is_multi,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    options: OPTION_LABELS.map((label) => ({ label, text: optionMap.get(label) || '' })),
  }
}

function formToPayload(form) {
  return {
    ...form,
    number: Number(form.number),
    options: form.options.filter((option) => option.text.trim()),
  }
}

function QuestionEditor({ exams, form, setForm, selectedId, onSave, onDelete, onClear }) {
  function setOption(label, text) {
    setForm((previous) => ({
      ...previous,
      options: previous.options.map((option) => (option.label === label ? { ...option, text } : option)),
    }))
  }

  return (
    <form className={panelClass('p-4')} onSubmit={onSave}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{selectedId ? '编辑题目' : '新增题目'}</h3>
          <p className="text-sm text-ink-400">{selectedId ? `ID ${selectedId}` : 'New'}</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="套卷">
            <SelectControl
              value={form.exam_code}
              onValueChange={(value) => setForm({ ...form, exam_code: value })}
              options={exams.map((exam) => ({ value: exam.code, label: exam.title }))}
              ariaLabel="选择题目套卷"
            />
          </TextField>
          <TextField label="题号">
            <input
              className={inputClass()}
              type="number"
              min="1"
              value={form.number}
              onChange={(event) => setForm({ ...form, number: event.target.value })}
              required
            />
          </TextField>
        </div>

        <TextField label="题干">
          <textarea className={inputClass('min-h-[170px] resize-y py-3 leading-7')} value={form.stem} onChange={(event) => setForm({ ...form, stem: event.target.value })} required />
        </TextField>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <TextField label="标准答案">
            <AnswerLettersControl
              value={form.correct_answer}
              isMulti={form.is_multi}
              onChange={(value) => setForm({ ...form, correct_answer: value })}
            />
          </TextField>
          <CheckboxControl checked={form.is_multi} onCheckedChange={(checked) => setForm({ ...form, is_multi: checked })}>
            多选题
          </CheckboxControl>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {form.options.map((option) => (
            <TextField key={option.label} label={option.label}>
              <input className={inputClass()} value={option.text} onChange={(event) => setOption(option.label, event.target.value)} />
            </TextField>
          ))}
        </div>

        <TextField label="解析">
          <textarea
            className={inputClass('min-h-[190px] resize-y py-3 leading-7')}
            value={form.explanation}
            onChange={(event) => setForm({ ...form, explanation: event.target.value })}
          />
        </TextField>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" type="submit">
          保存
        </Button>
        <Button variant="secondary" onClick={onClear}>
          清空
        </Button>
        {selectedId && (
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={16} />
            删除
          </Button>
        )}
      </div>
    </form>
  )
}

createRoot(document.getElementById('root')).render(<App />)
