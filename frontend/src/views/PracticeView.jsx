import { useEffect, useState } from 'react'
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
  const [jumpValue, setJumpValue] = useState(String(index + 1))
  const progress = Math.round(((index + 1) / total) * 100)
  const currentElapsed = result?.elapsed_seconds ?? Math.max(0, Math.floor((timerNow - questionStartedAt) / 1000))
  const sessionElapsed = submittedElapsed + (result ? 0 : currentElapsed)

  useEffect(() => {
    const now = Date.now()
    setQuestionStartedAt(now)
    setTimerNow(now)
    setJumpValue(String(index + 1))
  }, [question.id, result])

  useEffect(() => {
    setJumpValue(String(index + 1))
  }, [index])

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

  function submitJump(event) {
    event.preventDefault()
    const target = Number(jumpValue)
    if (!Number.isFinite(target)) {
      setJumpValue(String(index + 1))
      return
    }
    onJump(Math.max(1, Math.min(total, Math.trunc(target))) - 1)
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
          <form className="flex items-center justify-end gap-2" onSubmit={submitJump}>
            <label className="sr-only" htmlFor="practice-jump-index">跳转到题号</label>
            <input
              id="practice-jump-index"
              className="h-9 w-20 rounded-md border border-ink-950/[0.055] bg-paper-50/68 px-2 text-center font-latin text-sm font-semibold tabular-nums text-ink-950 outline-none transition focus:border-ink-950/[0.13] focus:bg-paper-50 focus:ring-2 focus:ring-ink-950/[0.025]"
              type="number"
              min="1"
              max={total}
              value={jumpValue}
              onChange={(event) => setJumpValue(event.target.value)}
            />
            <Button variant="secondary" className="min-h-9 px-3" type="submit">跳题</Button>
          </form>
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
