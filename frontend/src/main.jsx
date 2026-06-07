import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Database,
  FilePenLine,
  GraduationCap,
  Layers3,
  ListChecks,
  RefreshCw,
  Search,
  Shuffle,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react'
import './styles.css'

const EXAM_ORDER = ['sim7', 'sim8', 'sim9', 'sim10']
const EXAM_LABELS = {
  sim7: '模拟七',
  sim8: '模拟八',
  sim9: '模拟九',
  sim10: '模拟十',
}
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

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

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
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

function App() {
  const [view, setView] = useState('home')
  const [exams, setExams] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState(null)
  const [submitted, setSubmitted] = useState(new Map())
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

  async function refreshEverything() {
    await run(loadExams, '统计已刷新')
  }

  useEffect(() => {
    loadExams().catch((error) => setNotice({ type: 'error', text: error.message }))
  }, [])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <Sidebar view={view} setView={setView} totals={totals} />
      <main id="main" className="main-surface">
        <TopBar onRefresh={refreshEverything} loading={loading} />
        {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
        {view === 'home' && (
          <HomeView exams={exams} totals={totals} onStart={startPractice} />
        )}
        {view === 'practice' && currentQuestion && (
          <PracticeView
            question={currentQuestion}
            index={currentIndex}
            total={questions.length}
            mode={mode}
            result={submitted.get(currentQuestion.id)}
            submittedElapsed={submittedElapsed}
            onBack={() => setView('home')}
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
                      ? { ...item, is_wrong_active: response.is_wrong_active }
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
                    setView('home')
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
          <AdminView exams={exams} reloadExams={loadExams} notify={setNotice} run={run} />
        )}
      </main>
    </div>
  )
}

function Sidebar({ view, setView, totals }) {
  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="brand">
        <div className="brand-icon" aria-hidden="true">
          <GraduationCap size={24} />
        </div>
        <div>
          <h1>PMP 练习系统</h1>
          <p>本地题库</p>
        </div>
      </div>

      <nav className="nav-stack">
        <button className={cx('nav-item', view === 'home' && 'active')} onClick={() => setView('home')}>
          <BookOpen size={18} />
          <span>练习</span>
        </button>
        <button className={cx('nav-item', view === 'admin' && 'active')} onClick={() => setView('admin')}>
          <Database size={18} />
          <span>题库</span>
        </button>
      </nav>

      <div className="metric-panel">
        <Metric label="题目" value={totals.questions} icon={<Layers3 size={16} />} />
        <Metric label="错题" value={totals.wrong} icon={<Target size={16} />} tone="warm" />
        <Metric label="记录" value={totals.attempts} icon={<ListChecks size={16} />} />
      </div>
    </aside>
  )
}

function Metric({ label, value, icon, tone = 'blue' }) {
  return (
    <div className={cx('metric', tone)}>
      <div className="metric-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function TopBar({ onRefresh, loading }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">PMP Practice</p>
        <h2>练习</h2>
      </div>
      <button className="soft-button" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={17} className={loading ? 'spin' : ''} />
        刷新
      </button>
    </header>
  )
}

function Notice({ notice, onClose }) {
  const Icon = notice.type === 'error' ? AlertCircle : CheckCircle2
  return (
    <div className={cx('notice', notice.type)} role="status" aria-live="polite">
      <Icon size={18} />
      <span>{notice.text}</span>
      <button type="button" onClick={onClose} aria-label="关闭提示">
        <XCircle size={18} />
      </button>
    </div>
  )
}

function HomeView({ exams, totals, onStart }) {
  return (
    <section className="screen">
      <div className="mode-panel">
        <div className="mode-panel-header">
          <h2>选择模式</h2>
          <div className="home-stats" aria-label="题库统计">
            <span>720 题</span>
            <span>{totals.wrong} 错题</span>
            <span>SQLite</span>
          </div>
        </div>

        <div className="mode-list">
          {exams.map((exam) => (
            <ModeCard
              key={exam.code}
              title={exam.title.replace('PMP 仿真', '')}
              meta={`${exam.total_questions} 题`}
              extra={`${exam.wrong_questions} 错题`}
              icon={<BookOpen size={18} />}
              onClick={() => onStart({ type: 'exam', examCode: exam.code, label: exam.title })}
            />
          ))}
          <ModeCard
            title="混合随机"
            meta="720 题"
            extra="随机"
            icon={<Shuffle size={18} />}
            strong
            onClick={() => onStart({ type: 'mixed', label: '混合随机' })}
          />
          <ModeCard
            title="错题集"
            meta={`${totals.wrong} 题`}
            extra="待处理"
            icon={<Target size={18} />}
            onClick={() => onStart({ type: 'wrong', label: '错题集' })}
          />
        </div>
      </div>
    </section>
  )
}

function ModeCard({ title, meta, extra, icon, onClick, strong }) {
  return (
    <button className={cx('mode-card', strong && 'strong')} onClick={onClick}>
      <div className="mode-icon">{icon}</div>
      <div className="mode-title">
        <h3>{title}</h3>
      </div>
      <span className="mode-meta">{meta}</span>
      <span className="mode-extra">{extra}</span>
      <ArrowRight size={16} />
    </button>
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
    <section className="screen practice-screen">
      <div className="practice-toolbar">
        <button className="soft-button" onClick={onBack}>
          <ArrowLeft size={17} />
          返回
        </button>
        <div className="practice-context">
          <strong>{mode?.label || '练习'}</strong>
        </div>
        <div className="timer-strip" aria-label="练习计时">
          <span className="timer-pill">本次 {formatElapsed(sessionElapsed)}</span>
          <span className="timer-pill">本题 {formatElapsed(currentElapsed)}</span>
          <button
            className="timer-reset"
            type="button"
            onClick={clearQuestionTimer}
            disabled={Boolean(result)}
            aria-label="清除当前题计时"
            title="清除当前题计时"
          >
            <RefreshCw size={15} />
          </button>
        </div>
        <div className="practice-progress">
          <strong>
            {index + 1}/{total}
          </strong>
          <div className="progress-track" aria-label={`进度 ${progress}%`}>
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="question-stage">
        <article key={question.id} className="question-panel">
          <div className="question-panel-nav">
            <button className="nav-fab previous" onClick={onPrevious} disabled={index === 0} aria-label="上一题">
              <ArrowLeft size={20} />
            </button>
            <div className="question-meta">
              <span className="question-chip question-number">
                {EXAM_LABELS[question.exam_code] || question.exam_code.toUpperCase()} · 第 {question.number} 题
              </span>
              <span className={cx('question-chip', question.is_multi ? 'multi' : 'single')}>
                {question.is_multi ? '多选' : '单选'}
              </span>
              {question.is_wrong_active && <span className="question-chip danger">错题</span>}
            </div>
            <div className="question-nav-actions">
              {question.is_wrong_active && (
                <button className="nav-fab learned" onClick={onLearned} aria-label="学会了，移出错题集" title="学会了">
                  <CheckCircle2 size={20} />
                </button>
              )}
              <button className="nav-fab next" onClick={onNext} disabled={index >= total - 1} aria-label="下一题">
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
          <h1>{question.stem}</h1>

          <div className="options" role="group" aria-label="题目选项">
            {question.options.map((option) => {
              const checked = selected.includes(option.label)
              return (
                <button
                  key={option.label}
                  type="button"
                  className={cx('answer-option', checked && 'selected', result && 'locked')}
                  onClick={() => toggle(option.label)}
                  aria-pressed={checked}
                >
                  <span className="answer-letter">{option.label}</span>
                  <span>{option.text}</span>
                  {checked && <Check size={18} />}
                </button>
              )
            })}
          </div>

          {question.is_multi && !result && (
            <div className="question-actions">
              <button className="primary-button submit-button" onClick={submit} disabled={selected.length === 0}>
                提交答案
              </button>
            </div>
          )}

          {result && <ResultPanel key={`${question.id}-${result.is_correct ? 'correct' : 'wrong'}`} result={result} />}
        </article>
      </div>
    </section>
  )
}

function ResultPanel({ result }) {
  return (
    <section className={cx('result-card', result.is_correct ? 'correct' : 'wrong')}>
      <div className="result-heading">
        {result.is_correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
        <strong>{result.is_correct ? '正确' : '错误'}</strong>
      </div>
      <div className="answer-summary">
        <span>已选：{result.selected_answer || '未选'}</span>
        <span>答案：{result.correct_answer}</span>
        <span>用时：{formatSpent(result.elapsed_seconds)}</span>
      </div>
      <div className="explanation">
        <strong>解析</strong>
        <p>{result.explanation || '暂无解析'}</p>
      </div>
    </section>
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
    <section className="screen admin-screen">
      <div className="section-heading">
        <div>
          <h2>题库管理</h2>
        </div>
        <button className="primary-button" onClick={resetForm}>
          <FilePenLine size={17} />
          新增题目
        </button>
      </div>

      <div className="admin-grid">
        <section className="list-panel">
          <div className="filters">
            <label>
              套卷
              <select value={examFilter} onChange={(event) => setExamFilter(event.target.value)}>
                <option value="">全部套卷</option>
                {exams.map((exam) => (
                  <option key={exam.code} value={exam.code}>
                    {exam.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              搜索
              <div className="search-field">
                <Search size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="关键词" />
              </div>
            </label>
            <button className="soft-button" onClick={() => run(loadQuestions)}>
              搜索
            </button>
          </div>

          <div className="question-list" aria-label="题目列表">
            {questions.map((question) => (
              <button
                key={question.id}
                className={cx('question-list-item', selectedId === question.id && 'active')}
                onClick={() => setSelectedId(question.id)}
              >
                <strong>
                  {question.exam_code.toUpperCase()}-{question.number} · {question.correct_answer}
                </strong>
                <span>{question.stem}</span>
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
    </section>
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
    <form className="editor-panel" onSubmit={onSave}>
      <div className="editor-title">
        <h3>{selectedId ? '编辑题目' : '新增题目'}</h3>
        <span>{selectedId ? `ID ${selectedId}` : 'New'}</span>
      </div>

      <div className="form-row two">
        <label>
          套卷
          <select value={form.exam_code} onChange={(event) => setForm({ ...form, exam_code: event.target.value })} required>
            {exams.map((exam) => (
              <option key={exam.code} value={exam.code}>
                {exam.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          题号
          <input
            type="number"
            min="1"
            value={form.number}
            onChange={(event) => setForm({ ...form, number: event.target.value })}
            required
          />
        </label>
      </div>

      <label>
        题干
        <textarea value={form.stem} onChange={(event) => setForm({ ...form, stem: event.target.value })} rows={7} required />
      </label>

      <div className="form-row two">
        <label>
          标准答案
          <input
            value={form.correct_answer}
            onChange={(event) => setForm({ ...form, correct_answer: event.target.value })}
            placeholder="A、C 或 A/C"
            required
          />
        </label>
        <label className="check-line">
          <input
            type="checkbox"
            checked={form.is_multi}
            onChange={(event) => setForm({ ...form, is_multi: event.target.checked })}
          />
          多选题
        </label>
      </div>

      <div className="option-editor-grid">
        {form.options.map((option) => (
          <label key={option.label}>
            {option.label}
            <input value={option.text} onChange={(event) => setOption(option.label, event.target.value)} />
          </label>
        ))}
      </div>

      <label>
        解析
        <textarea
          value={form.explanation}
          onChange={(event) => setForm({ ...form, explanation: event.target.value })}
          rows={8}
        />
      </label>

      <div className="editor-actions">
        <button className="primary-button" type="submit">
          保存
        </button>
        <button className="soft-button" type="button" onClick={onClear}>
          清空
        </button>
        {selectedId && (
          <button className="danger-button" type="button" onClick={onDelete}>
            <Trash2 size={17} />
            删除
          </button>
        )}
      </div>
    </form>
  )
}

createRoot(document.getElementById('root')).render(<App />)
