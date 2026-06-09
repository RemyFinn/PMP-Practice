import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  GraduationCap,
  Lightbulb,
  Layers3,
  ListChecks,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  Target,
  Users,
  XCircle,
} from 'lucide-react'
import { FONT_OPTIONS } from '../constants'
import { cn } from '../lib/utils'
import { Button, SelectControl } from './ui'

export function Sidebar({ view, totals, user, onLogout }) {
  const isAdmin = user?.role === 'admin'
  return (
    <aside className="sidebar-shell relative border-b border-ink-950/[0.06] px-4 py-4 backdrop-blur-2xl after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-gradient-to-r after:from-transparent after:via-ink-950/[0.07] after:to-transparent lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:px-5 lg:after:bottom-6 lg:after:left-auto lg:after:right-0 lg:after:top-6 lg:after:h-auto lg:after:w-px lg:after:bg-gradient-to-b">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-ink-950 text-paper-50">
          <GraduationCap size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">PMP 练习系统</h1>
          <p className="text-xs font-medium text-ink-400">Local trainer</p>
        </div>
      </div>

      <nav className="mt-5 grid grid-cols-4 gap-2 lg:grid-cols-1">
        <NavItem active={view === 'home'} to="/" icon={<BookOpen size={17} />} label="练习" />
        <NavItem active={view === 'strategies'} to="/strategies" icon={<Lightbulb size={17} />} label="思路" />
        <NavItem active={view === 'wrong'} to="/wrong" icon={<Target size={17} />} label="错题" />
        {isAdmin && <NavItem active={view === 'admin'} to="/admin" icon={<Database size={17} />} label="题库" />}
        {isAdmin && <NavItem active={view === 'users'} to="/users" icon={<Users size={17} />} label="用户" />}
      </nav>

      <div className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1">
        <Metric label="题目" value={totals.questions} icon={<Layers3 size={15} />} />
        <Metric label="错题" value={totals.wrong} icon={<Target size={15} />} />
        <Metric label="记录" value={totals.attempts} icon={<ListChecks size={15} />} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 rounded-xl bg-paper-50/24 px-3 py-2 text-sm text-ink-600 ring-1 ring-ink-950/[0.04] backdrop-blur-2xl">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink-900">{user?.display_name || user?.username}</div>
          <div className="mt-0.5 text-xs text-ink-400">{isAdmin ? '管理员' : '普通用户'}</div>
        </div>
        <Button variant="icon" className="size-8" onClick={onLogout} aria-label="退出登录" title="退出登录">
          <LogOut size={15} />
        </Button>
      </div>
    </aside>
  )
}

function NavItem({ active, to, icon, label }) {
  return (
    <Button as={Link} to={to} variant={active ? 'primary' : 'ghost'} className="justify-start">
      {icon}
      {label}
    </Button>
  )
}

function Metric({ label, value, icon }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-ink-950/[0.055] bg-paper-50/24 px-2.5 py-2.5 shadow-hairline backdrop-blur-2xl ring-1 ring-ink-950/[0.04]">
      <div className="hidden size-7 place-items-center rounded-lg border border-ink-950/[0.06] bg-paper-50/30 text-ink-500 backdrop-blur-xl sm:grid">{icon}</div>
      <div className="min-w-0">
        <strong className="block font-latin text-[15px] leading-none tabular-nums text-ink-950">{value}</strong>
        <div className="mt-1 text-[11px] font-semibold leading-none text-ink-500">{label}</div>
      </div>
    </div>
  )
}

export function TopBar({ onRefresh, loading, fontMode, setFontMode, themeMode, onToggleTheme }) {
  const isDark = themeMode === 'dark'
  return (
    <header className="mx-auto mb-4 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">PMP Practice</p>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">练习</h2>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="icon"
          className="size-10"
          onClick={onToggleTheme}
          aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
          title={isDark ? '切换到浅色模式' : '切换到深色模式'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
        <SelectControl
          value={fontMode}
          onValueChange={setFontMode}
          options={FONT_OPTIONS}
          ariaLabel="选择界面字体"
          prefix="字体"
          triggerClassName="min-h-10 w-[128px] border-0 bg-paper-50/50 hover:bg-paper-50/70"
        />
        <Button variant="ghost" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          刷新
        </Button>
      </div>
    </header>
  )
}

export function NoticeViewport({ notice, onClose, insetSidebar = false }) {
  useEffect(() => {
    if (!notice) return undefined
    const timeoutMs = notice.type === 'error' ? 5200 : 3200
    const timer = window.setTimeout(onClose, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [notice, onClose])

  return (
    <div
      className={cn(
        'pointer-events-none fixed left-0 right-0 top-4 z-50 px-4',
        insetSidebar && 'lg:left-[236px]',
      )}
    >
      <AnimatePresence>{notice && <Notice notice={notice} onClose={onClose} />}</AnimatePresence>
    </div>
  )
}

export function Notice({ notice, onClose }) {
  const Icon = notice.type === 'error' ? AlertCircle : CheckCircle2
  return (
    <motion.div
      className={cn(
        'pointer-events-auto mx-auto flex w-full max-w-sm items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-quiet sm:max-w-md',
        notice.type === 'error'
          ? 'border-danger-border/20 bg-danger-surface text-danger-text'
          : 'border-success-border/20 bg-success-surface text-success-text',
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
