import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Columns2, Columns3, Columns4, List, Search, X } from 'lucide-react'
import { api } from '../api/client'
import { EXAM_LABELS } from '../constants'
import { QuestionCard } from '../components/question-card'
import { StrategyText } from '../components/strategy-text'
import { Badge, Button, CheckboxControl, Screen, TextField, inputClass, panelClass } from '../components/ui'
import { cn } from '../lib/utils'

export function StrategyView({ exams, notify, run, reloadExams, onOpenQuestion }) {
  const [strategies, setStrategies] = useState([])
  const [examFilters, setExamFilters] = useState([])
  const [search, setSearch] = useState('')
  const [layoutMode, setLayoutMode] = useState(() => normalizeLayoutMode(localStorage.getItem('pmp-strategy-layout')))
  const [previewQuestion, setPreviewQuestion] = useState(null)
  const [previewResult, setPreviewResult] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  async function loadStrategies() {
    let path = '/api/strategies'
    const params = []
    if (examFilters.length === 1) params.push(`exam=${encodeURIComponent(examFilters[0])}`)
    if (search.trim()) params.push(`search=${encodeURIComponent(search.trim())}`)
    if (params.length) path += `?${params.join('&')}`
    const data = await api(path)
    setStrategies(
      examFilters.length > 1
        ? data.filter((strategy) => examFilters.includes(strategy.exam_code))
        : data,
    )
  }

  useEffect(() => {
    loadStrategies().catch((error) => notify({ type: 'error', text: error.message }))
  }, [examFilters])

  useEffect(() => {
    localStorage.setItem('pmp-strategy-layout', layoutMode)
  }, [layoutMode])

  useEffect(() => {
    if (!previewQuestion) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [previewQuestion])

  function closePreview() {
    setPreviewQuestion(null)
    setPreviewResult(null)
  }

  async function openQuestionPreview(question) {
    setPreviewLoading(true)
    setPreviewResult(null)
    try {
      setPreviewQuestion(await api(`/api/questions/${question.id}`))
    } catch (error) {
      notify({ type: 'error', text: error.message })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function submitPreviewAttempt(selectedOptions) {
    if (!previewQuestion || previewResult) return
    try {
      const response = await api('/api/attempts', {
        method: 'POST',
        body: JSON.stringify({
          question_id: previewQuestion.id,
          selected_options: selectedOptions,
          mode: 'strategy-preview',
        }),
      })
      setPreviewResult(response)
      setPreviewQuestion((current) =>
        current
          ? {
              ...current,
              is_wrong_active: response.is_wrong_active,
              wrong_count: response.wrong_count,
              attempt_count: response.attempt_count,
              last_wrong_at: response.last_wrong_at,
            }
          : current,
      )
      await reloadExams()
    } catch (error) {
      notify({ type: 'error', text: error.message })
    }
  }

  const grouped = useMemo(() => {
    const map = new Map()
    const groupByCategory = examFilters.length > 1
    for (const strategy of strategies) {
      const key = groupByCategory ? strategy.category : `${strategy.exam_code}-${strategy.category}`
      if (!map.has(key)) {
        map.set(key, {
          exam_code: groupByCategory ? null : strategy.exam_code,
          category: strategy.category,
          items: [],
        })
      }
      map.get(key).items.push(strategy)
    }
    return Array.from(map.values())
  }, [examFilters.length, strategies])

  const isSingleColumn = layoutMode === '1'

  return (
    <Screen>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">思路总结</h2>
          <p className="mt-1 text-sm text-ink-400">按解题思路查看题目，点击题号练习。</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 rounded-md bg-ink-950/[0.045] p-1">
            {[
              { value: '1', label: '列表', icon: List },
              { value: '2', label: '两列', icon: Columns2 },
              { value: '3', label: '三列', icon: Columns3 },
              { value: '4', label: '四列', icon: Columns4 },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded px-2.5 text-xs font-semibold leading-none transition',
                    layoutMode === item.value ? 'bg-white text-ink-950 shadow-hairline' : 'text-ink-500 hover:text-ink-950',
                  )}
                  onClick={() => setLayoutMode(item.value)}
                  aria-pressed={layoutMode === item.value}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              )
            })}
          </div>
          <Badge tone="blue">{strategies.length} 条思路</Badge>
        </div>
      </div>

      <section className={panelClass('p-4')}>
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1fr)_auto] lg:items-end">
          <ExamFilterControl exams={exams} value={examFilters} onChange={setExamFilters} />
          <TextField label="搜索">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                className={inputClass('pl-9')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="分类或思路关键词"
              />
            </div>
          </TextField>
          <Button variant="secondary" onClick={() => run(loadStrategies)}>
            搜索
          </Button>
        </div>
      </section>

      <div className="mt-4 grid gap-3">
        {grouped.map((group) => (
          <section key={`${group.exam_code}-${group.category}`} className={panelClass('p-4')}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {group.exam_code && <Badge tone="blue">{EXAM_LABELS[group.exam_code] || group.exam_code.toUpperCase()}</Badge>}
              <Badge>{group.category}</Badge>
            </div>
            <div
              className={cn(
                isSingleColumn && 'divide-y divide-ink-950/[0.035]',
                layoutMode === '2' && 'grid gap-2 lg:grid-cols-2',
                layoutMode === '3' && 'grid gap-2 xl:grid-cols-3',
                layoutMode === '4' && 'grid gap-2 xl:grid-cols-3 2xl:grid-cols-4',
              )}
            >
              {group.items.map((strategy) => (
                <div
                  key={strategy.id}
                  className={cn(
                    'min-w-0',
                    !isSingleColumn
                      ? 'grid gap-3 rounded-lg bg-ink-950/[0.018] p-3 transition hover:bg-ink-950/[0.028]'
                      : 'grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start',
                  )}
                >
                  <div className="min-w-0">
                    <h3 className="flex flex-wrap items-start gap-2 text-[15px] leading-6">
                      {!group.exam_code && (
                        <Badge tone="blue" className="mt-0.5 h-6">
                          {EXAM_LABELS[strategy.exam_code] || strategy.exam_code.toUpperCase()}
                        </Badge>
                      )}
                      <span className="min-w-0">
                        <StrategyText text={strategy.title} />
                      </span>
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {strategy.questions.map((question) => (
                        <button
                          key={question.id}
                          type="button"
                          className={cn(
                            'inline-flex h-7 items-center rounded-md px-2 font-latin text-xs font-semibold leading-none tabular-nums transition',
                            question.is_wrong_active
                              ? 'bg-[#f0dfdc] text-[#8e4940] hover:bg-[#8e4940] hover:text-white'
                              : 'bg-ink-950/[0.045] text-ink-700 hover:bg-ink-950 hover:text-paper-50',
                          )}
                          title={question.is_wrong_active ? `错题｜${question.stem}` : question.stem}
                          onClick={() => openQuestionPreview(question)}
                        >
                          {question.number}
                        </button>
                      ))}
                    </div>
                  </div>
                  {strategy.questions[0] && (
                    <Button
                      variant="ghost"
                      className={cn(!isSingleColumn ? 'justify-self-start' : 'lg:justify-self-end')}
                      onClick={() => openQuestionPreview(strategy.questions[0])}
                    >
                      <ArrowRight size={16} />
                      练习
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <section className={panelClass('p-8 text-center text-sm font-medium text-ink-400')}>
            暂无匹配的思路。
          </section>
        )}
      </div>

      <QuestionPreviewDialog
        question={previewQuestion}
        result={previewResult}
        loading={previewLoading}
        onSubmit={submitPreviewAttempt}
        onClose={closePreview}
        onPractice={() => {
          if (!previewQuestion) return
          onOpenQuestion(previewQuestion)
          closePreview()
        }}
      />
    </Screen>
  )
}

function ExamFilterControl({ exams, value, onChange }) {
  const selected = new Set(value)

  function toggleExam(code) {
    const next = selected.has(code)
      ? value.filter((item) => item !== code)
      : [...value, code]
    onChange(next)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-ink-700">
      <div>套卷</div>
      <div className="flex min-h-11 flex-wrap items-center gap-2">
        <Button
          variant={value.length === 0 ? 'primary' : 'secondary'}
          className="min-h-9 px-3 text-xs"
          onClick={() => onChange([])}
        >
          全部套卷
        </Button>
        {exams.map((exam) => (
          <CheckboxControl
            key={exam.code}
            checked={selected.has(exam.code)}
            onCheckedChange={() => toggleExam(exam.code)}
            className="min-h-9 self-auto px-2.5 text-xs"
          >
            {exam.title}
          </CheckboxControl>
        ))}
      </div>
    </div>
  )
}

function QuestionPreviewDialog({ question, result, loading, onSubmit, onClose, onPractice }) {
  const isOpen = Boolean(question || loading)

  useEffect(() => {
    if (!isOpen) return undefined

    const scrollY = window.scrollY
    const { style } = document.body
    const previousPosition = style.position
    const previousTop = style.top
    const previousWidth = style.width
    const previousOverflow = style.overflow

    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.width = '100%'
    style.overflow = 'hidden'

    return () => {
      style.position = previousPosition
      style.top = previousTop
      style.width = previousWidth
      style.overflow = previousOverflow
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/18 px-3 py-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-paper-50 shadow-[0_28px_80px_rgba(42,35,28,0.18)] ring-1 ring-ink-950/[0.06]"
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="题目练习"
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink-950/[0.04] px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge tone={question ? 'blue' : 'neutral'}>{question ? '题目练习' : '加载中'}</Badge>
                {result && <Badge tone={result.is_correct ? 'success' : 'danger'}>{result.is_correct ? '已答对' : '已答错'}</Badge>}
              </div>
              <Button variant="icon" className="size-8" onClick={onClose} aria-label="关闭预览">
                <X size={16} />
              </Button>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
              {!question && <div className="py-12 text-center text-sm font-medium text-ink-400">正在加载题目...</div>}

              {question && <QuestionCard question={question} result={result} onSubmit={onSubmit} variant="dialog" />}
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-950/[0.04] px-5 py-3 sm:px-6">
              <Button variant="ghost" onClick={onClose}>关闭</Button>
              <Button variant="primary" onClick={onPractice} disabled={!question}>
                <ArrowRight size={16} />
                进入做题
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function normalizeLayoutMode(value) {
  if (value === 'list') return '1'
  if (value === 'grid') return '2'
  return ['1', '2', '3', '4'].includes(value) ? value : '1'
}
