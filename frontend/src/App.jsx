import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from './api/client'
import { EXAM_ORDER } from './constants'
import { MobileNavDrawer, NoticeViewport, Sidebar, TopBar } from './components/layout'
import { HomeView } from './views/HomeView'
import { PracticeView } from './views/PracticeView'
import { StrategyView } from './views/StrategyView'
import { RecordsView } from './views/RecordsView'
import { WrongItemsView } from './views/WrongItemsView'
import { AdminView } from './views/AdminView'
import { LoginView } from './views/LoginView'
import { UsersView } from './views/UsersView'

const ROUTE_TO_VIEW = {
  '/': 'home',
  '/strategies': 'strategies',
  '/records': 'records',
  '/wrong': 'wrong',
  '/admin': 'admin',
  '/users': 'users',
  '/practice': 'practice',
}

const VIEW_TO_ROUTE = {
  home: '/',
  strategies: '/strategies',
  records: '/records',
  wrong: '/wrong',
  admin: '/admin',
  users: '/users',
  practice: '/practice',
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const view = ROUTE_TO_VIEW[location.pathname]
  const [exams, setExams] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState(null)
  const [submitted, setSubmitted] = useState(new Map())
  const [practiceRecords, setPracticeRecords] = useState([])
  const [fontMode, setFontMode] = useState(() => {
    const saved = localStorage.getItem('pmp-font-mode')
    return saved === 'system' || saved === 'bold' ? saved : 'default'
  })
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('pmp-theme-mode')
    return saved === 'dark' ? 'dark' : 'light'
  })
  const [strategyAutoExpand, setStrategyAutoExpand] = useState(() => {
    return localStorage.getItem('pmp-strategy-auto-expand') === '1'
  })
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(() => {
    return localStorage.getItem('pmp-keyboard-shortcuts') === '1'
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

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

  async function loadPracticeRecords() {
    setPracticeRecords(await api('/api/practice-records'))
  }

  function recordSessionKey(nextMode) {
    if (nextMode.type === 'exam') return `exam:${nextMode.examCode}`
    if (nextMode.type === 'wrong') return 'wrong'
    if (nextMode.type === 'mixed') return 'mixed'
    return nextMode.type || 'practice'
  }

  function resultsObjectFromMap(map) {
    return Object.fromEntries(Array.from(map.entries()).map(([questionId, result]) => [String(questionId), result]))
  }

  function resultMapFromObject(results) {
    return new Map(
      Object.entries(results || {}).map(([questionId, result]) => [Number(questionId), result]),
    )
  }

  async function createPracticeRecord(nextMode, nextQuestions, startIndex = 0) {
    const record = await api('/api/practice-records', {
      method: 'POST',
      body: JSON.stringify({
        session_key: recordSessionKey(nextMode),
        mode_type: nextMode.type,
        exam_code: nextMode.examCode || '',
        label: nextMode.label || '练习',
        question_ids: nextQuestions.map((question) => question.id),
        current_index: startIndex,
        results: {},
      }),
    })
    await loadPracticeRecords()
    return record
  }

  async function savePracticeRecord(recordId, nextIndex, nextSubmitted) {
    if (!recordId) return
    try {
      await api(`/api/practice-records/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          current_index: nextIndex,
          results: resultsObjectFromMap(nextSubmitted),
        }),
      })
      await loadPracticeRecords()
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    }
  }

  async function loadMe() {
    try {
      const data = await api('/api/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setAuthChecked(true)
    }
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
      const record = await createPracticeRecord(nextMode, data, 0)
      setQuestions(data)
      setSubmitted(new Map())
      setCurrentIndex(0)
      setMode({ ...nextMode, recordId: record.id, sessionKey: record.session_key })
      navigate('/practice')
    })
  }

  async function startPracticeFromQuestions(nextQuestions, startIndex = 0, nextMode = { type: 'wrong', label: '错题集' }) {
    if (nextQuestions.length === 0) {
      setNotice({ type: 'info', text: '当前没有可练习的题目。' })
      return
    }
    const safeIndex = Math.max(0, Math.min(startIndex, nextQuestions.length - 1))
    const record = await run(() => createPracticeRecord(nextMode, nextQuestions, safeIndex))
    setQuestions(nextQuestions)
    setSubmitted(new Map())
    setCurrentIndex(safeIndex)
    setMode({ ...nextMode, recordId: record.id, sessionKey: record.session_key })
    navigate('/practice')
  }

  async function continuePracticeRecord(recordId, options = {}) {
    await run(async () => {
      const record = await api(`/api/practice-records/${recordId}`)
      if (record.questions.length === 0) {
        setNotice({ type: 'info', text: '这条记录里的题目已经不可用。' })
        return
      }
      const nextIndex = Math.max(0, Math.min(options.index ?? record.current_index, record.questions.length - 1))
      const nextSubmitted = resultMapFromObject(record.results)
      setQuestions(record.questions)
      setSubmitted(nextSubmitted)
      setCurrentIndex(nextIndex)
      setMode({
        type: record.mode_type,
        examCode: record.exam_code || undefined,
        label: record.label,
        recordId: record.id,
        sessionKey: record.session_key,
        backView: options.backView || 'records',
      })
      if (nextIndex !== record.current_index) await savePracticeRecord(record.id, nextIndex, nextSubmitted)
      navigate('/practice')
    })
  }

  async function openQuestionFromStrategy(question) {
    await run(async () => {
      const data = await api(`/api/questions?mode=exam&exam=${encodeURIComponent(question.exam_code)}`)
      const targetIndex = data.findIndex((item) => item.id === question.id)
      if (targetIndex < 0) {
        setNotice({ type: 'error', text: '没有找到对应题目。' })
        return
      }
      setQuestions(data)
      setSubmitted(new Map())
      setCurrentIndex(targetIndex)
      setMode({
        type: 'strategy',
        label: `${question.exam_code.toUpperCase()}-${question.number}`,
        backView: 'strategies',
      })
      navigate('/practice')
    })
  }

  async function refreshEverything() {
    await run(async () => {
      await loadExams()
      await loadPracticeRecords()
    }, '统计已刷新')
  }

  async function logout() {
    await run(async () => {
      await api('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setQuestions([])
      setSubmitted(new Map())
      setMode(null)
      setPracticeRecords([])
      navigate('/')
    }, '已退出登录')
  }

  useEffect(() => {
    loadMe()
  }, [])

  useEffect(() => {
    if (!user) return
    loadExams().catch((error) => setNotice({ type: 'error', text: error.message }))
    loadPracticeRecords().catch((error) => setNotice({ type: 'error', text: error.message }))
  }, [user])

  useEffect(() => {
    document.documentElement.dataset.font = fontMode
    localStorage.setItem('pmp-font-mode', fontMode)
  }, [fontMode])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = themeMode
    localStorage.setItem('pmp-theme-mode', themeMode)
  }, [themeMode])

  useEffect(() => {
    localStorage.setItem('pmp-strategy-auto-expand', strategyAutoExpand ? '1' : '0')
  }, [strategyAutoExpand])

  useEffect(() => {
    localStorage.setItem('pmp-keyboard-shortcuts', keyboardShortcuts ? '1' : '0')
  }, [keyboardShortcuts])

  if (!authChecked) {
    return <div className="grid min-h-dvh place-items-center bg-paper-50 text-sm font-medium text-ink-400">正在加载...</div>
  }

  if (!user) {
    return (
      <div className="relative min-h-dvh bg-paper-50">
        <LoginView
          onLogin={(nextUser) => {
            setUser(nextUser)
            setNotice({ type: 'success', text: '已登录' })
          }}
          notify={setNotice}
        />
        <NoticeViewport notice={notice} onClose={() => setNotice(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper-50 text-ink-950">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[236px_minmax(0,1fr)]">
        <Sidebar view={view || 'home'} totals={totals} user={user} onLogout={logout} />
        <MobileNavDrawer
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          view={view || 'home'}
          totals={totals}
          user={user}
          onLogout={logout}
        />
        <main id="main" className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
          <TopBar
            onRefresh={refreshEverything}
            loading={loading}
            fontMode={fontMode}
            setFontMode={setFontMode}
            themeMode={themeMode}
            onToggleTheme={() => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))}
            strategyAutoExpand={strategyAutoExpand}
            setStrategyAutoExpand={setStrategyAutoExpand}
            keyboardShortcuts={keyboardShortcuts}
            setKeyboardShortcuts={setKeyboardShortcuts}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />
          <NoticeViewport notice={notice} onClose={() => setNotice(null)} insetSidebar />
          <AnimatePresence mode="wait">
            {!view && <Navigate key="not-found" to="/" replace />}
            {view === 'admin' && user.role !== 'admin' && <Navigate key="admin-denied" to="/" replace />}
            {view === 'users' && user.role !== 'admin' && <Navigate key="users-denied" to="/" replace />}
            {view === 'home' && (
              <HomeView
                key="home"
                exams={exams}
                totals={totals}
                practiceRecords={practiceRecords}
                onStart={startPractice}
                onContinueRecord={(recordId) => continuePracticeRecord(recordId, { backView: 'home' })}
              />
            )}
            {view === 'strategies' && (
              <StrategyView
                key="strategies"
                exams={exams}
                notify={setNotice}
                run={run}
                reloadExams={loadExams}
                onOpenQuestion={openQuestionFromStrategy}
              />
            )}
            {view === 'practice' && !currentQuestion && <Navigate key="empty-practice" to="/" replace />}
            {view === 'practice' && currentQuestion && (
              <PracticeView
                key="practice"
                question={currentQuestion}
                index={currentIndex}
                total={questions.length}
                mode={mode}
                result={submitted.get(currentQuestion.id)}
                submittedElapsed={submittedElapsed}
                questionStatuses={questions.map((question) => submitted.get(question.id)?.is_correct)}
                autoExpandStrategies={strategyAutoExpand}
                keyboardShortcuts={keyboardShortcuts}
                onBack={() => navigate(VIEW_TO_ROUTE[mode?.backView] || '/')}
                onPrevious={() => {
                  const nextIndex = Math.max(0, currentIndex - 1)
                  setCurrentIndex(nextIndex)
                  savePracticeRecord(mode?.recordId, nextIndex, submitted)
                }}
                onNext={() => {
                  const nextIndex = Math.min(questions.length - 1, currentIndex + 1)
                  setCurrentIndex(nextIndex)
                  savePracticeRecord(mode?.recordId, nextIndex, submitted)
                }}
                onJump={(nextIndex) => {
                  const safeIndex = Math.max(0, Math.min(questions.length - 1, nextIndex))
                  setCurrentIndex(safeIndex)
                  savePracticeRecord(mode?.recordId, safeIndex, submitted)
                }}
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
                    const nextSubmitted = new Map(submitted).set(currentQuestion.id, response)
                    setSubmitted(nextSubmitted)
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
                    await savePracticeRecord(mode?.recordId, currentIndex, nextSubmitted)
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
                        navigate(VIEW_TO_ROUTE[mode?.backView] || '/')
                        setNotice({ type: 'success', text: '错题集已清空。' })
                      }
                      return next
                    })
                    await loadExams()
                    await savePracticeRecord(mode?.recordId, currentIndex, submitted)
                  }, '已移出错题集')
                }}
              />
            )}
            {view === 'records' && (
              <RecordsView
                key="records"
                records={practiceRecords}
                reloadRecords={loadPracticeRecords}
                onContinueRecord={(recordId, options) => continuePracticeRecord(recordId, { ...options, backView: 'records' })}
                notify={setNotice}
                run={run}
              />
            )}
            {view === 'admin' && (
              <AdminView key="admin" exams={exams} reloadExams={loadExams} notify={setNotice} run={run} />
            )}
            {view === 'users' && <UsersView key="users" notify={setNotice} run={run} />}
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
