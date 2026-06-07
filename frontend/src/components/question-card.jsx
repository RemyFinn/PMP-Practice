import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCircle2, Lightbulb, XCircle } from 'lucide-react'
import { EXAM_LABELS } from '../constants'
import { cn } from '../lib/utils'
import { formatSpent, letters } from '../utils/format'
import { StrategyText } from './strategy-text'
import { Badge, Button, PANEL_RING } from './ui'

export function QuestionCard({
  question,
  result,
  onSubmit,
  actions,
  className,
  variant = 'page',
  resultKey,
}) {
  const [selected, setSelected] = useState([])
  const [showStrategies, setShowStrategies] = useState(false)
  const isDialog = variant === 'dialog'

  useEffect(() => {
    setSelected(result ? letters(result.selected_answer) : [])
    setShowStrategies(false)
  }, [question.id, result])

  async function submit(nextSelected = selected) {
    if (nextSelected.length === 0 || result) return
    await onSubmit(nextSelected)
  }

  function toggle(label) {
    if (result) return
    if (question.is_multi) {
      setSelected((previous) =>
        previous.includes(label) ? previous.filter((item) => item !== label) : [...previous, label].sort(),
      )
    } else {
      const next = [label]
      setSelected(next)
      submit(next)
    }
  }

  return (
    <motion.article
      key={question.id}
      className={cn(
        isDialog ? 'bg-transparent p-0' : 'rounded-2xl bg-white/72 px-4 py-4 shadow-quiet sm:px-6 sm:py-5',
        !isDialog && PANEL_RING,
        className,
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className={cn('flex flex-wrap items-center justify-between gap-3', isDialog ? 'mb-3' : 'mb-4')}>
        <QuestionMeta
          question={question}
          showStrategies={showStrategies}
          onToggleStrategies={() => setShowStrategies((value) => !value)}
        />
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <h1
        className={cn(
          'whitespace-pre-wrap font-serif tracking-tight text-ink-950',
          isDialog
            ? 'max-w-none text-[19px] leading-[1.55] sm:text-[21px]'
            : 'max-w-4xl text-[22px] leading-[1.6] sm:text-[26px]',
        )}
      >
        {question.stem}
      </h1>

      {showStrategies && question.strategies?.length > 0 && <StrategyPanel strategies={question.strategies} />}

      <div className={cn('grid gap-1', isDialog ? 'mt-3' : 'mt-2.5')} role="group" aria-label="题目选项">
        {question.options.map((option) => {
          const checked = selected.includes(option.label)
          return (
            <motion.button
              key={option.label}
              type="button"
              className={cn(
                'group/option grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-transparent text-left transition duration-150',
                isDialog ? 'min-h-10 py-1.5' : 'min-h-11 py-2',
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
                  checked
                    ? 'bg-ink-950 text-paper-50 group-hover/option:bg-ink-950 group-hover/option:text-paper-50'
                    : 'bg-ink-950/[0.055] text-ink-600',
                )}
              >
                {option.label}
              </div>
              <div
                className={cn(
                  'flex min-h-8 min-w-0 items-center text-ink-800 transition-colors duration-150',
                  checked && 'text-ink-950',
                )}
              >
                <div className="text-[15px] font-normal leading-[1.42] underline-offset-[5px] decoration-ink-950 decoration-[0.45px] transition-colors duration-150 group-hover/option:text-ink-950 group-hover/option:underline">
                  {option.text}
                </div>
              </div>
              {checked && <Check size={17} className="text-ink-500" />}
            </motion.button>
          )
        })}
      </div>

      {question.is_multi && !result && (
        <div className="mt-4 flex justify-end border-t border-ink-950/[0.035] pt-4">
          <Button variant="primary" onClick={() => submit()} disabled={selected.length === 0} className="w-full sm:w-auto">
            提交答案
          </Button>
        </div>
      )}

      <AnimatePresence>
        {result && <ResultPanel key={resultKey || `${question.id}-${result.is_correct ? 'correct' : 'wrong'}`} result={result} />}
      </AnimatePresence>
    </motion.article>
  )
}

function QuestionMeta({ question, showStrategies, onToggleStrategies }) {
  return (
    <div className="flex flex-wrap items-center gap-2 leading-none">
      <Badge tone="blue">
        {EXAM_LABELS[question.exam_code] || question.exam_code.toUpperCase()} · 第 <div className="font-latin">{question.number}</div> 题
      </Badge>
      <Badge tone={question.is_multi ? 'accent' : 'neutral'}>{question.is_multi ? '多选' : '单选'}</Badge>
      {question.is_wrong_active && <Badge tone="danger">错题</Badge>}
      {Number(question.wrong_count) > 0 && (
        <Badge tone="neutral">
          错 <div className="font-latin">{question.wrong_count}</div> 次
        </Badge>
      )}
      {question.strategies?.length > 0 && (
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-full bg-brass-100 px-2.5 text-xs font-semibold leading-none text-brass-600 transition hover:bg-ink-950 hover:text-paper-50"
          onClick={onToggleStrategies}
          aria-expanded={showStrategies}
          title="查看解题思路"
        >
          <Lightbulb size={13} />
          思路
        </button>
      )}
    </div>
  )
}

function StrategyPanel({ strategies }) {
  return (
    <div className="mt-3 rounded-xl bg-brass-100/60 p-3 text-sm text-ink-700 ring-1 ring-brass-600/[0.08]">
      <div className="mb-2 flex items-center gap-2 font-semibold text-ink-950">
        <Lightbulb size={15} />
        解题思路
      </div>
      <div className="grid gap-2">
        {strategies.map((strategy) => (
          <div key={strategy.id} className="leading-6">
            <span className="font-semibold">{strategy.category}：</span>
            <StrategyText
              text={strategy.title}
              strongClassName="font-semibold text-ink-950"
              restClassName="font-normal text-ink-700"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ResultPanel({ result }) {
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
