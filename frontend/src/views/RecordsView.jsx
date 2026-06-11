import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, History, Trash2, X, XCircle } from 'lucide-react'
import { api } from '../api/client'
import { QuestionCard } from '../components/question-card'
import { Badge, Button, Screen, panelClass } from '../components/ui'
import { cn } from '../lib/utils'
import { formatDateTime, formatSpent } from '../utils/format'

export function RecordsView({ records, reloadRecords, onContinueRecord, notify, run }) {
  const [openRecordIds, setOpenRecordIds] = useState(new Set())
  const [recordDetails, setRecordDetails] = useState(new Map())
  const [preview, setPreview] = useState(null)

  async function loadRecord(recordId) {
    if (recordDetails.has(recordId)) return recordDetails.get(recordId)
    const record = await api(`/api/practice-records/${recordId}`)
    setRecordDetails((previous) => new Map(previous).set(recordId, record))
    return record
  }

  async function toggleRecord(recordId) {
    const next = new Set(openRecordIds)
    if (next.has(recordId)) {
      next.delete(recordId)
      setOpenRecordIds(next)
      return
    }
    try {
      await loadRecord(recordId)
      next.add(recordId)
      setOpenRecordIds(next)
    } catch (error) {
      notify({ type: 'error', text: error.message })
    }
  }

  async function deleteRecord(recordId) {
    await run(async () => {
      await api(`/api/practice-records/${recordId}`, { method: 'DELETE' })
      setRecordDetails((previous) => {
        const next = new Map(previous)
        next.delete(recordId)
        return next
      })
      setOpenRecordIds((previous) => {
        const next = new Set(previous)
        next.delete(recordId)
        return next
      })
      await reloadRecords()
    }, '练习记录已删除')
  }

  async function openQuestion(recordSummary, index) {
    try {
      const record = await loadRecord(recordSummary.id)
      const question = record.questions[index]
      if (!question) return
      setPreview({
        record,
        question,
        index,
        result: record.results?.[String(question.id)] || null,
      })
    } catch (error) {
      notify({ type: 'error', text: error.message })
    }
  }

  return (
    <Screen>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">练习记录</h2>
          <p className="mt-1 text-sm text-ink-400">按一次练习查看进度、对错和对应错题。</p>
        </div>
        <Badge tone="blue">{records.length} 条记录</Badge>
      </div>

      <div className="grid gap-3">
        {records.map((record) => {
          const open = openRecordIds.has(record.id)
          const detail = recordDetails.get(record.id)
          return (
            <section key={record.id} className={panelClass('p-4')}>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <button type="button" className="min-w-0 text-left" onClick={() => toggleRecord(record.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{record.label}</Badge>
                    <Badge>{record.answered_count}/{record.total_questions}</Badge>
                  </div>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-400">
                    <span className="font-latin tabular-nums">#{record.id}</span>
                    <span>{record.session_key}</span>
                    <span>最近更新 {formatDateTime(record.updated_at)}</span>
                  </div>
                </button>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button variant="secondary" onClick={() => onContinueRecord(record.id)}>
                    <ArrowRight size={16} />
                    继续
                  </Button>
                  <Button variant="ghost" onClick={() => toggleRecord(record.id)}>
                    <History size={16} />
                    {open ? '收起' : '展开'}
                  </Button>
                  <Button variant="ghost" onClick={() => deleteRecord(record.id)} aria-label="删除记录" title="删除记录">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {open && (
                  <motion.div
                    className="mt-4 border-t border-ink-950/[0.04] pt-4"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {!detail && <div className="text-sm font-medium text-ink-400">正在加载题号...</div>}
                    {detail && (
                      <div className="flex flex-wrap gap-1.5">
                        {detail.questions.map((question, index) => (
                          <QuestionNumberButton
                            key={`${detail.id}-${question.id}`}
                            question={question}
                            index={index}
                            result={detail.results?.[String(question.id)]}
                            current={index === detail.current_index}
                            onClick={() => openQuestion(record, index)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )
        })}

        {records.length === 0 && (
          <section className={panelClass('p-8 text-center text-sm font-medium text-ink-400')}>
            暂无练习记录。开始任意套卷、混合或错题练习后会出现在这里。
          </section>
        )}
      </div>

      <RecordQuestionDialog
        preview={preview}
        onClose={() => setPreview(null)}
        onContinue={() => {
          if (!preview) return
          onContinueRecord(preview.record.id, { index: preview.index })
          setPreview(null)
        }}
      />
    </Screen>
  )
}

function QuestionNumberButton({ question, index, result, current, onClick }) {
  const answered = Boolean(result)
  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-latin text-xs font-semibold leading-none tabular-nums transition',
        !answered && 'bg-ink-950/[0.045] text-ink-600 hover:bg-ink-950/[0.07] hover:text-ink-950',
        answered && result?.is_correct && 'bg-success-surface text-success-text ring-1 ring-success-border/25',
        answered && !result?.is_correct && 'bg-danger-surface text-danger-text ring-1 ring-danger-border/20',
        current && 'outline outline-2 outline-offset-1 outline-brass-600/45',
      )}
      onClick={onClick}
      title={answered ? `本记录第 ${index + 1} 题｜原第 ${question.number} 题` : `本记录第 ${index + 1} 题｜未作答`}
    >
      {index + 1}
    </button>
  )
}

function RecordQuestionDialog({ preview, onClose, onContinue }) {
  const open = Boolean(preview)
  const question = preview?.question
    ? {
        ...preview.question,
        is_wrong_active: false,
        wrong_count: 0,
      }
    : null
  const result = preview?.result
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AnimatePresence>
        {open && (
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
                    <Dialog.Title className="sr-only">练习记录题目预览</Dialog.Title>
                    <Dialog.Description className="sr-only">查看记录中的作答结果并继续练习</Dialog.Description>
                    <div className="flex items-center justify-between gap-3 border-b border-ink-950/[0.04] px-4 py-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge tone="blue">{preview?.record.label}</Badge>
                        {result ? (
                          <Badge tone={result.is_correct ? 'success' : 'danger'}>{result.is_correct ? '已答对' : '已答错'}</Badge>
                        ) : (
                          <Badge>未作答</Badge>
                        )}
                      </div>
                      <Dialog.Close asChild>
                        <Button variant="icon" className="size-8" aria-label="关闭预览">
                          <X size={16} />
                        </Button>
                      </Dialog.Close>
                    </div>

                    <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
                      {question && (
                        <>
                          <QuestionCard
                            question={question}
                            result={result}
                            onSubmit={async () => {}}
                            variant="dialog"
                            readOnly
                          />
                          {!result && (
                            <section className="mt-4 rounded-xl border border-ink-950/[0.055] bg-ink-950/[0.018] p-4 text-sm text-ink-700">
                              <div className="mb-2 flex items-center gap-2 font-semibold text-ink-950">
                                <XCircle size={16} />
                                这条记录中尚未作答
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span>标准答案</span>
                                <Badge tone="success">{question.correct_answer}</Badge>
                              </div>
                              <p className="mt-3 whitespace-pre-wrap leading-7">{question.explanation || '暂无解析'}</p>
                            </section>
                          )}
                          {result && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-400">
                              <CheckCircle2 size={16} />
                              <span>本题记录用时 {formatSpent(result.elapsed_seconds)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-ink-950/[0.04] px-5 py-3 sm:px-6">
                      <Dialog.Close asChild>
                        <Button variant="ghost">关闭</Button>
                      </Dialog.Close>
                      <Button variant="primary" onClick={onContinue}>
                        <ArrowRight size={16} />
                        继续这条记录
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
