import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { EXAM_LABELS } from '../constants'
import { cn } from '../lib/utils'
import { formatElapsed, formatSpent, letters } from '../utils/format'
import { Badge, Button, Screen, PANEL_RING, panelClass } from '../components/ui'

export function PracticeView({
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
