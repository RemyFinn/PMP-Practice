import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react'
import { QuestionCard } from '../components/question-card'
import { formatElapsed } from '../utils/format'
import { Badge, Button, Screen, panelClass } from '../components/ui'

export function PracticeView({
  question,
  index,
  total,
  mode,
  result,
  submittedElapsed,
  questionStatuses = [],
  autoExpandStrategies,
  keyboardShortcuts,
  onBack,
  onPrevious,
  onNext,
  onJump,
  onSubmit,
  onLearned,
}) {
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now())
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const [locatorOpen, setLocatorOpen] = useState(false)
  const progress = Math.round(((index + 1) / total) * 100)
  const currentElapsed = result?.elapsed_seconds ?? Math.max(0, Math.floor((timerNow - questionStartedAt) / 1000))
  const sessionElapsed = submittedElapsed + (result ? 0 : currentElapsed)

  useEffect(() => {
    const now = Date.now()
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

  return (
    <Screen className="pb-14">
      <div className={panelClass('mb-4 bg-paper-50/54 p-3 shadow-hairline')}>
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
          <QuestionLocator
            index={index}
            total={total}
            progress={progress}
            statuses={questionStatuses}
            open={locatorOpen}
            onOpenChange={setLocatorOpen}
            onJump={onJump}
          />
        </div>
      </div>

      <QuestionCard
        question={question}
        result={result}
        onSubmit={(selectedOptions) => onSubmit(selectedOptions, getCurrentElapsed())}
        autoExpandStrategies={autoExpandStrategies}
        keyboardShortcuts={keyboardShortcuts}
        onShortcutPrevious={onPrevious}
        onShortcutNext={onNext}
        actions={
          <>
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
          </>
        }
      />
    </Screen>
  )
}

function QuestionLocator({ index, total, progress, statuses, open, onOpenChange, onJump }) {
  const [draftIndex, setDraftIndex] = useState(index)
  const rootRef = useRef(null)

  useEffect(() => {
    setDraftIndex(index)
  }, [index])

  useEffect(() => {
    if (!open) return undefined
    setDraftIndex(index)

    function closeOnPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) onOpenChange(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') onOpenChange(false)
    }

    window.addEventListener('pointerdown', closeOnPointerDown)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDown)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [index, onOpenChange, open])

  function openPanel() {
    setDraftIndex(index)
    onOpenChange(true)
  }

  function jumpTo(nextIndex, close = false) {
    const safeIndex = Math.max(0, Math.min(total - 1, nextIndex))
    setDraftIndex(safeIndex)
    onJump(safeIndex)
    if (close) onOpenChange(false)
  }

  return (
    <div ref={rootRef} className="relative grid min-w-[180px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
      <strong className="font-latin text-sm tabular-nums">{index + 1}/{total}</strong>
      <button
        type="button"
        className="group h-5 min-w-0 rounded-full py-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-800/15"
        onClick={openPanel}
        title="点击调整题号"
        aria-label={`打开题号面板，当前进度 ${progress}%`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="block h-1.5 overflow-hidden rounded-full bg-ink-950/10 transition group-hover:bg-ink-950/15 group-hover:shadow-[0_0_0_4px_rgb(var(--ink-950)/0.035)]">
          <motion.span
            className="block h-full rounded-full bg-ink-950 transition group-hover:bg-slateblue-700"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </span>
      </button>

      {open && (
        <motion.div
          className="absolute right-0 top-full z-40 mt-2 w-[min(88vw,360px)] rounded-xl border border-ink-950/[0.055] bg-paper-50/95 p-3 text-sm shadow-quiet ring-1 ring-ink-950/[0.035] backdrop-blur-xl"
          initial={{ opacity: 0, y: -4, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.985 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          role="dialog"
          aria-label="题号面板"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-semibold text-ink-950">
              第 <span className="font-latin tabular-nums">{draftIndex + 1}</span> / <span className="font-latin tabular-nums">{total}</span> 题
            </div>
            <div className="text-xs font-medium text-ink-400">当前队列序号</div>
          </div>

          <input
            className="h-6 w-full accent-ink-950"
            type="range"
            min="1"
            max={total}
            value={draftIndex + 1}
            onChange={(event) => setDraftIndex(Number(event.target.value) - 1)}
            onPointerUp={(event) => jumpTo(Number(event.currentTarget.value) - 1)}
            onKeyUp={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
                jumpTo(Number(event.currentTarget.value) - 1)
              }
            }}
            aria-label="拖动定位题号"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={draftIndex + 1}
          />

          <div className="question-locator-scroll mt-2 grid max-h-56 grid-cols-8 gap-1.5 overflow-y-auto p-1 sm:grid-cols-10" aria-label="题号列表">
            {Array.from({ length: total }, (_, itemIndex) => {
              const status = statuses[itemIndex]
              const current = itemIndex === index
              return (
                <button
                  key={itemIndex}
                  type="button"
                  className={[
                    'grid h-8 min-w-0 place-items-center rounded-md font-latin text-xs font-semibold leading-none tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-800/15',
                    status === true ? 'bg-success-surface text-success-text ring-1 ring-success-border/25' : '',
                    status === false ? 'bg-danger-surface text-danger-text ring-1 ring-danger-border/20' : '',
                    status === undefined ? 'bg-ink-950/[0.045] text-ink-600 hover:bg-ink-950/[0.07] hover:text-ink-950' : '',
                    current ? 'ring-2 ring-brass-600/55 shadow-[0_0_0_3px_rgb(var(--brass-100)/0.72),0_5px_12px_rgb(var(--brass-600)/0.16)]' : '',
                  ].join(' ')}
                  onClick={() => jumpTo(itemIndex, true)}
                  aria-current={current ? 'true' : undefined}
                >
                  {itemIndex + 1}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
