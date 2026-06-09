import { useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, CheckCircle2, ChevronDown, Columns2, Columns3, Columns4, List, Search, X } from 'lucide-react'
import { api } from '../api/client'
import { EXAM_LABELS } from '../constants'
import { QuestionCard } from '../components/question-card'
import { StrategyText } from '../components/strategy-text'
import { Badge, Button, Screen, TextField, inputClass, panelClass } from '../components/ui'
import { cn } from '../lib/utils'

const MARKER_EFFECTS = [
  { value: 'diffusion', label: '柔雾' },
  { value: 'gleam', label: '流光' },
  { value: 'pulse', label: '呼吸' },
  { value: 'edge', label: '描边' },
  { value: 'ink', label: '墨色' },
  { value: 'halo', label: '柔光' },
]

export function StrategyView({ exams, notify, run, reloadExams, onOpenQuestion }) {
  const [strategies, setStrategies] = useState([])
  const [examFilters, setExamFilters] = useState([])
  const [search, setSearch] = useState('')
  const [layoutMode, setLayoutMode] = useState(() => normalizeLayoutMode(localStorage.getItem('pmp-strategy-layout')))
  const [markerEffect, setMarkerEffect] = useState(() => normalizeMarkerEffect(localStorage.getItem('pmp-strategy-marker-effect')))
  const [previewQuestion, setPreviewQuestion] = useState(null)
  const [previewResult, setPreviewResult] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewSourceStrategyMatches, setPreviewSourceStrategyMatches] = useState(null)
  const [lastPreviewedQuestionId, setLastPreviewedQuestionId] = useState(null)

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
    localStorage.setItem('pmp-strategy-marker-effect', markerEffect)
  }, [markerEffect])

  function closePreview() {
    setPreviewQuestion(null)
    setPreviewResult(null)
    setPreviewSourceStrategyMatches(null)
  }

  async function openQuestionPreview(question, sourceStrategy) {
    setLastPreviewedQuestionId(question.id)
    setPreviewLoading(true)
    setPreviewResult(null)
    setPreviewSourceStrategyMatches(sourceStrategy ? getStrategyMatches(sourceStrategy) : null)
    try {
      setPreviewQuestion(await api(`/api/questions/${question.id}`))
    } catch (error) {
      notify({ type: 'error', text: error.message })
    } finally {
      setPreviewLoading(false)
    }
  }

  function updateStrategyQuestion(questionId, updates) {
    setStrategies((previous) =>
      previous.map((strategy) => ({
        ...strategy,
        questions: strategy.questions.map((question) =>
          question.id === questionId
            ? {
                ...question,
                ...updates,
              }
            : question,
        ),
      })),
    )
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
      updateStrategyQuestion(previewQuestion.id, {
        is_wrong_active: response.is_wrong_active,
        wrong_count: response.wrong_count,
        attempt_count: response.attempt_count,
        last_wrong_at: response.last_wrong_at,
      })
      await reloadExams()
    } catch (error) {
      notify({ type: 'error', text: error.message })
    }
  }

  async function markStrategyQuestionLearned(question) {
    await run(async () => {
      await api(`/api/wrong-items/${question.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ learned: true }),
      })
      updateStrategyQuestion(question.id, { is_wrong_active: false })
      setPreviewQuestion((current) =>
        current?.id === question.id
          ? {
              ...current,
              is_wrong_active: false,
            }
          : current,
      )
      await reloadExams()
    }, '已移出错题集')
  }

  const grouped = useMemo(() => {
    const map = new Map()
    const mergeAcrossExams = examFilters.length > 1
    for (const strategy of strategies) {
      const key = mergeAcrossExams ? strategy.category : `${strategy.exam_code}-${strategy.category}`
      if (!map.has(key)) {
        map.set(key, {
          exam_code: mergeAcrossExams ? null : strategy.exam_code,
          category: strategy.category,
          items: [],
          itemMap: new Map(),
        })
      }
      const group = map.get(key)
      if (!mergeAcrossExams) {
        group.items.push({
          id: strategy.id,
          title: strategy.title,
          questions: strategy.questions,
          examGroups: [{ exam_code: strategy.exam_code, questions: strategy.questions }],
          strategyIds: [strategy.id],
          matchKeys: [],
        })
        continue
      }

      const titleKey = normalizeStrategyTitle(strategy.title)
      if (!group.itemMap.has(titleKey)) {
        const item = {
          id: titleKey,
          title: strategy.title,
          questions: [],
          examGroups: [],
          strategyIds: [],
          matchKeys: [],
        }
        group.itemMap.set(titleKey, item)
        group.items.push(item)
      }

      const item = group.itemMap.get(titleKey)
      if (!item.strategyIds.includes(strategy.id)) item.strategyIds.push(strategy.id)
      const matchKey = getStrategyMatchKey(strategy)
      if (!item.matchKeys.includes(matchKey)) item.matchKeys.push(matchKey)
      const examGroup = item.examGroups.find((entry) => entry.exam_code === strategy.exam_code)
      const target = examGroup || { exam_code: strategy.exam_code, questions: [] }
      target.questions = mergeQuestions(target.questions, strategy.questions)
      item.questions = mergeQuestions(item.questions, strategy.questions)
      if (!examGroup) item.examGroups.push(target)
    }
    return Array.from(map.values()).map(({ itemMap, ...group }) => group)
  }, [examFilters.length, strategies])

  const isSingleColumn = layoutMode === '1'
  const displayedStrategyCount = grouped.reduce((total, group) => total + group.items.length, 0)

  return (
    <Screen>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">思路总结</h2>
          <p className="mt-1 text-sm text-ink-400">按解题思路查看题目，点击题号练习。</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <MarkerEffectControl value={markerEffect} onChange={setMarkerEffect} />
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
                    layoutMode === item.value ? 'bg-paper-50 text-ink-950 shadow-hairline' : 'text-ink-500 hover:text-ink-950',
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
          <Badge tone="blue">{displayedStrategyCount} 条思路</Badge>
        </div>
      </div>

      <section className={panelClass('p-4')}>
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">
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
                isSingleColumn && 'grid gap-2 md:block md:divide-y md:divide-ink-950/[0.035]',
                layoutMode === '2' && 'grid gap-2 lg:grid-cols-2',
                layoutMode === '3' && 'grid gap-2 xl:grid-cols-3',
                layoutMode === '4' && 'grid gap-2 xl:grid-cols-3 2xl:grid-cols-4',
              )}
            >
              {group.items.map((strategy) => {
                return (
                  <div
                    key={strategy.id}
                    className={cn(
                      'min-w-0 border border-transparent',
                      !isSingleColumn
                        ? 'grid gap-3 rounded-lg bg-ink-950/[0.018] p-3 transition hover:bg-ink-950/[0.028]'
                        : 'grid gap-3 rounded-lg bg-ink-950/[0.018] p-3 transition hover:bg-ink-950/[0.028] md:rounded-none md:bg-transparent md:px-0 md:py-3 md:hover:bg-transparent lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start',
                    )}
                  >
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-start gap-2 text-[15px] leading-6">
                        <span className="min-w-0">
                          <StrategyText text={strategy.title} />
                        </span>
                      </h3>
                      <div className="mt-2 grid gap-2">
                        {strategy.examGroups.map((examGroup) => (
                          <div key={examGroup.exam_code} className="flex flex-wrap items-center gap-1.5">
                            {!group.exam_code && (
                              <Badge tone="blue" className="h-7">
                                {EXAM_LABELS[examGroup.exam_code] || examGroup.exam_code.toUpperCase()}
                              </Badge>
                            )}
                            {examGroup.questions.map((question) => (
                              <span
                                key={question.id}
                                className="inline-flex h-7 rounded-md"
                              >
                                <button
                                  type="button"
                                  className={cn(
                                    'strategy-question-button inline-flex h-7 items-center rounded-md px-2 font-latin text-xs font-semibold leading-none tabular-nums transition',
                                    question.is_wrong_active
                                      ? 'bg-danger-surface text-danger-text hover:bg-danger-strong hover:text-white'
                                      : 'bg-ink-950/[0.045] text-ink-700 hover:bg-ink-950 hover:text-paper-50',
                                    lastPreviewedQuestionId === question.id && 'ring-1 ring-brass-600/35',
                                  )}
                                  data-last-previewed={lastPreviewedQuestionId === question.id ? 'true' : undefined}
                                  data-marker-effect={lastPreviewedQuestionId === question.id ? markerEffect : undefined}
                                  data-wrong-active={question.is_wrong_active ? 'true' : undefined}
                                  aria-current={lastPreviewedQuestionId === question.id ? 'true' : undefined}
                                  title={question.is_wrong_active ? `错题｜${question.stem}` : question.stem}
                                  onClick={() => openQuestionPreview(question, strategy)}
                                >
                                  <span className="relative z-10">{question.number}</span>
                                </button>
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    {strategy.questions[0] && (
                      <Button
                        variant="ghost"
                        className={cn(!isSingleColumn ? 'justify-self-start' : 'lg:justify-self-end')}
                        onClick={() => openQuestionPreview(strategy.questions[0], strategy)}
                      >
                        <ArrowRight size={16} />
                        练习
                      </Button>
                    )}
                  </div>
                )
              })}
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
        onMarkLearned={markStrategyQuestionLearned}
        highlightedStrategyMatches={previewSourceStrategyMatches}
        onPractice={() => {
          if (!previewQuestion) return
          onOpenQuestion(previewQuestion)
          closePreview()
        }}
      />
    </Screen>
  )
}

function MarkerEffectControl({ value, onChange }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-md bg-ink-950/[0.045] p-1"
      role="group"
      aria-label="选择题号标记效果"
    >
      {MARKER_EFFECTS.map((effect, index) => (
        <button
          key={effect.value}
          type="button"
          className="strategy-question-button strategy-marker-swatch inline-flex h-8 min-w-[58px] items-center justify-center rounded-md px-2.5 text-xs font-semibold leading-none transition"
          data-last-previewed="true"
          data-marker-effect={effect.value}
          aria-pressed={value === effect.value}
          title={`${index + 1} ${effect.label}`}
          onClick={() => onChange(effect.value)}
        >
          <span className="relative z-10 inline-flex items-center gap-1.5">
            <span className="font-latin tabular-nums">{index + 1}</span>
            <span>{effect.label}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function ExamFilterControl({ exams, value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = new Set(value)
  const selectedLabels = exams
    .filter((exam) => selected.has(exam.code))
    .map((exam) => EXAM_LABELS[exam.code] || exam.title)
  const summary =
    value.length === 0
      ? '全部套卷'
      : selectedLabels.length <= 2
        ? selectedLabels.join('、')
        : `已选 ${selectedLabels.length} 套`

  useEffect(() => {
    if (!open) return undefined

    function closeOnPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', closeOnPointerDown)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDown)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function toggleExam(code) {
    const next = selected.has(code)
      ? value.filter((item) => item !== code)
      : [...value, code]
    onChange(next)
  }

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-col gap-2 text-sm font-semibold text-ink-700">
      <div id="strategy-exam-filter-label">套卷</div>
      <button
        type="button"
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-ink-950/[0.055] bg-paper-50/68 px-3 text-left text-sm font-semibold leading-none text-ink-950 outline-none transition hover:bg-paper-100 focus-visible:border-ink-950/[0.13] focus-visible:bg-paper-50 focus-visible:ring-2 focus-visible:ring-ink-950/[0.025]',
          open && 'border-ink-950/[0.13] bg-paper-50',
        )}
        aria-labelledby="strategy-exam-filter-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cn('min-w-0 truncate', value.length === 0 && 'text-ink-600')}>{summary}</span>
        <ChevronDown size={15} className={cn('shrink-0 text-ink-400 transition', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-ink-950/[0.055] bg-paper-50/95 p-1 text-sm text-ink-900 shadow-quiet backdrop-blur-xl"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            role="listbox"
            aria-multiselectable="true"
          >
            <button
              type="button"
              className={cn(
                'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-semibold outline-none transition hover:bg-ink-950/[0.055]',
                value.length === 0 && 'bg-ink-950/[0.045] text-ink-950',
              )}
              onClick={() => onChange([])}
              role="option"
              aria-selected={value.length === 0}
            >
              <span className="grid size-4 shrink-0 place-items-center">
                {value.length === 0 && <Check size={14} />}
              </span>
              全部套卷
            </button>
            <div className="my-1 h-px bg-ink-950/[0.045]" />
            {exams.map((exam) => {
              const checked = selected.has(exam.code)
              return (
                <button
                  key={exam.code}
                  type="button"
                  className={cn(
                    'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-semibold outline-none transition hover:bg-ink-950/[0.055]',
                    checked && 'bg-ink-950/[0.045] text-ink-950',
                  )}
                  onClick={() => toggleExam(exam.code)}
                  role="option"
                  aria-selected={checked}
                >
                  <span className="grid size-4 shrink-0 place-items-center text-ink-800">
                    {checked && <Check size={14} />}
                  </span>
                  <span className="min-w-0 truncate">{exam.title}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function normalizeStrategyTitle(title) {
  return String(title || '').trim().replace(/\s+/g, ' ')
}

function getStrategyMatchKey(strategy) {
  return `${strategy.category || ''}||${normalizeStrategyTitle(strategy.title)}`
}

function getStrategyMatches(strategy) {
  return {
    ids: strategy.strategyIds || [strategy.id],
    matchKeys: strategy.matchKeys || [],
  }
}

function mergeQuestions(current, incoming) {
  const map = new Map()
  for (const question of [...current, ...incoming]) {
    map.set(question.id, question)
  }
  return Array.from(map.values()).sort((a, b) => Number(a.number) - Number(b.number))
}

function QuestionPreviewDialog({
  question,
  result,
  loading,
  onSubmit,
  onClose,
  onPractice,
  onMarkLearned,
  highlightedStrategyMatches,
}) {
  const isOpen = Boolean(question || loading)
  const [confirmLearned, setConfirmLearned] = useState(false)

  useEffect(() => {
    setConfirmLearned(false)
  }, [question?.id, question?.is_wrong_active])

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-50 grid place-items-center bg-ink-950/18 px-3 py-5 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Dialog.Content forceMount asChild>
                  <motion.div
                    className="flex max-h-[86dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-paper-50 shadow-quiet outline-none ring-1 ring-ink-950/[0.06]"
                    initial={{ opacity: 0, y: 12, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.985 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <Dialog.Title className="sr-only">题目练习</Dialog.Title>
                    <Dialog.Description className="sr-only">在思路页预览并练习题目</Dialog.Description>
                    <div className="flex items-center justify-between gap-3 border-b border-ink-950/[0.04] px-4 py-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge tone={question ? 'blue' : 'neutral'}>{question ? '题目练习' : '加载中'}</Badge>
                        {result && <Badge tone={result.is_correct ? 'success' : 'danger'}>{result.is_correct ? '已答对' : '已答错'}</Badge>}
                      </div>
                      <Dialog.Close asChild>
                        <Button variant="icon" className="size-8" aria-label="关闭预览">
                          <X size={16} />
                        </Button>
                      </Dialog.Close>
                    </div>

                    <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
                      {!question && <div className="py-12 text-center text-sm font-medium text-ink-400">正在加载题目...</div>}

                      {question && (
                        <QuestionCard
                          question={question}
                          result={result}
                          onSubmit={onSubmit}
                          variant="dialog"
                          highlightedStrategyMatches={highlightedStrategyMatches}
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-ink-950/[0.04] px-5 py-3 sm:px-6">
                      {question?.is_wrong_active && !confirmLearned && (
                        <Button variant="ghost" onClick={() => setConfirmLearned(true)}>
                          <CheckCircle2 size={16} />
                          学会了
                        </Button>
                      )}
                      {question?.is_wrong_active && confirmLearned && (
                        <>
                          <Button variant="ghost" onClick={() => setConfirmLearned(false)}>
                            取消
                          </Button>
                          <Button variant="danger" onClick={() => onMarkLearned(question)}>
                            <CheckCircle2 size={16} />
                            确认移出错题
                          </Button>
                        </>
                      )}
                      <Dialog.Close asChild>
                        <Button variant="ghost">关闭</Button>
                      </Dialog.Close>
                      <Button variant="primary" onClick={onPractice} disabled={!question}>
                        <ArrowRight size={16} />
                        进入做题
                      </Button>
                    </div>
                  </motion.div>
                </Dialog.Content>
              </motion.div>
            </Dialog.Overlay>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function normalizeLayoutMode(value) {
  if (value === 'list') return '1'
  if (value === 'grid') return '2'
  return ['1', '2', '3', '4'].includes(value) ? value : '1'
}

function normalizeMarkerEffect(value) {
  return MARKER_EFFECTS.some((effect) => effect.value === value) ? value : 'diffusion'
}
