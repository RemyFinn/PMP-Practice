export function StrategyText({ text, strongClassName = 'font-semibold text-ink-950', restClassName = 'font-normal text-ink-700' }) {
  const value = String(text || '')
  const match = value.match(/^(.+?[：:])(.+)$/)

  if (!match) {
    return <span className={strongClassName}>{value}</span>
  }

  return (
    <>
      <span className={strongClassName}>{match[1]}</span>
      <span className={restClassName}>{match[2]}</span>
    </>
  )
}
