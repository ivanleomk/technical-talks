import katex from 'katex'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type CompletionSampleProps = {
  prompt: string
  completion: string
  source?: string
  loop?: boolean
  status?: 'correct' | 'incorrect'
  expectedAnswer?: string
  /** Multiplier for typing delays. `2` is half speed. */
  pace?: number
  /** Delay before typing starts, in milliseconds. */
  delay?: number
}

type Phase = 'static' | 'pending' | 'playing'

type Unit =
  | { kind: 'text'; char: string }
  | { kind: 'calc'; expr: string; result: string }
  | { kind: 'math'; tex: string }

function toUnits(text: string): Unit[] {
  const units: Unit[] = []
  const pattern = /<<([^<>]+)>>(\$?[\d.,]+)?|\$([^$\n]+)\$/g
  let last = 0

  for (const match of text.matchAll(pattern)) {
    for (const char of text.slice(last, match.index)) {
      units.push({ kind: 'text', char })
    }

    if (match[1] !== undefined) {
      const expr = match[1]
      units.push({
        kind: 'calc',
        expr,
        result: expr.split('=').at(-1) ?? match[2] ?? '',
      })
    } else {
      units.push({ kind: 'math', tex: match[3] })
    }

    last = match.index + match[0].length
  }

  for (const char of text.slice(last)) {
    units.push({ kind: 'text', char })
  }

  return units
}

function joinPromptAndCompletion(prompt: string, completion: string) {
  if (prompt.includes('\n') || completion.includes('\n')) return '\n'
  if (/[.!?]$/.test(prompt)) return '\n'
  return ' '
}

function CalcCall({ expr, result }: { expr: string; result: string }) {
  return (
    <span title={`Calculator: ${expr}`} className="completion-calc">
      {result}
    </span>
  )
}

function MathInline({ tex }: { tex: string }) {
  const html = katex.renderToString(tex, {
    throwOnError: false,
    displayMode: false,
    output: 'html',
  })

  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function renderUnits(units: Unit[]): ReactNode {
  const nodes: ReactNode[] = []
  let buffer = ''

  const flush = () => {
    if (!buffer) return
    nodes.push(buffer)
    buffer = ''
  }

  units.forEach((unit, index) => {
    if (unit.kind === 'text') {
      buffer += unit.char
      return
    }

    flush()
    if (unit.kind === 'math') {
      nodes.push(<MathInline key={`math-${index}`} tex={unit.tex} />)
      return
    }

    nodes.push(
      <CalcCall
        key={`calc-${index}`}
        expr={unit.expr}
        result={unit.result}
      />,
    )
  })

  flush()
  return nodes
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nextUnitDelay(unit: Unit) {
  if (unit.kind === 'calc') return 280
  if (unit.kind === 'math') return 240 + Math.min(unit.tex.length * 16, 720)
  const char = unit.char
  if (char === '\n') return 160
  if (/[.!?]/.test(char)) return 240
  if (/[,;:]/.test(char)) return 140
  if (char === ' ') return 48
  return 28 + Math.random() * 14
}

const markClassName = 'completion-mark'

export function CompletionSample({
  prompt,
  completion,
  source,
  loop = true,
  status,
  expectedAnswer,
  pace = 1,
  delay = 0,
}: CompletionSampleProps) {
  const promptText = prompt.trim()
  const completionText = completion.trim()
  const units = useMemo(() => toUnits(completionText), [completionText])
  const promptUnits = useMemo(() => toUnits(promptText), [promptText])
  const separator = joinPromptAndCompletion(promptText, completionText)
  const rootRef = useRef<HTMLElement>(null)
  const indexRef = useRef(units.length)
  const [typedCount, setTypedCount] = useState(units.length)
  const [phase, setPhase] = useState<Phase>('static')

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    indexRef.current = 0
    setTypedCount(0)
    setPhase('pending')
  }, [completionText])

  const motionEnabled = phase !== 'static'

  useEffect(() => {
    if (!motionEnabled) return
    const node = rootRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPhase(entry.isIntersecting ? 'playing' : 'pending')
      },
      { threshold: 0.35 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [motionEnabled])

  useEffect(() => {
    if (phase !== 'playing') return

    let timeout = 0
    let cancelled = false

    const tick = () => {
      if (cancelled) return

      if (indexRef.current >= units.length) {
        setTypedCount(units.length)
        if (!loop) return
        timeout = window.setTimeout(() => {
          if (cancelled) return
          indexRef.current = 0
          setTypedCount(0)
          timeout = window.setTimeout(tick, 280)
        }, 1800)
        return
      }

      const index = indexRef.current
      indexRef.current = index + 1
      setTypedCount(index + 1)
      timeout = window.setTimeout(tick, nextUnitDelay(units[index]) * pace)
    }

    timeout = window.setTimeout(
      tick,
      indexRef.current === 0 ? 280 + delay : 0,
    )

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [phase, completionText, delay, loop, units, pace])

  const typedUnits = units.slice(0, typedCount)
  const showCaret = phase !== 'static' && typedCount < units.length
  const note = [
    status === 'incorrect'
      ? 'Incorrect'
      : status === 'correct'
        ? 'Correct'
        : null,
    expectedAnswer ? `answer is ${expectedAnswer}` : null,
  ]
    .filter(Boolean)
    .join(' — ')

  const completionMark = (
    <mark className={markClassName}>
      {renderUnits(typedUnits)}
      {showCaret ? (
        <span className="completion-caret" aria-hidden="true" />
      ) : null}
    </mark>
  )

  return (
    <figure
      ref={rootRef}
      className="completion-sample"
      aria-label={`${source ? `${source} sample. ` : ''}${promptText} ${completionText}${expectedAnswer ? ` Correct answer: ${expectedAnswer}` : ''}`}
    >
      {source ? <figcaption>{source}</figcaption> : null}

      <div className="completion-body">
        <p className="completion-sizer" aria-hidden="true">
          {renderUnits(promptUnits)}
          {separator}
          <mark className={markClassName}>{renderUnits(units)}</mark>
        </p>
        <p className="completion-live" aria-hidden="true">
          <span className="completion-prompt">{renderUnits(promptUnits)}</span>
          {separator}
          {typedCount > 0 || showCaret ? completionMark : null}
        </p>
      </div>

      {note ? <p className="completion-note">{note}</p> : null}
    </figure>
  )
}
