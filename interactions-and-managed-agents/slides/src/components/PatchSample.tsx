import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type TrajectoryTurn = {
  thought: string
  action: string
}

type PatchSampleProps = {
  issue: string
  issueTitle?: string
  actions: TrajectoryTurn[]
  patch: string
  failToPass: string[]
  passToPass: string[]
  file?: string
  source?: string
  loop?: boolean
}

type DiffLineKind = 'add' | 'del' | 'hunk' | 'meta' | 'ctx'

function classifyDiffLine(line: string): DiffLineKind {
  if (line.startsWith('@@')) return 'hunk'
  if (
    line.startsWith('diff ') ||
    line.startsWith('index ') ||
    line.startsWith('---') ||
    line.startsWith('+++')
  ) {
    return 'meta'
  }
  if (line.startsWith('+') || line.startsWith('*')) return 'add'
  if (line.startsWith('-')) return 'del'
  return 'ctx'
}

function displayDiffLine(line: string) {
  if (line.startsWith('*') && !line.startsWith('**')) {
    return `+${line.slice(1)}`
  }
  return line
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function splitAction(action: string) {
  const [tool, ...rest] = action.trim().split(/\s+/)
  return { tool, target: rest.join(' ') }
}

export function PatchSample({
  issue,
  issueTitle,
  actions,
  patch,
  failToPass,
  passToPass,
  file,
  source,
  loop = false,
}: PatchSampleProps) {
  const rootRef = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<'static' | 'pending' | 'playing'>('static')
  const revealUnits = actions.length * 2
  const total = revealUnits + 1 + failToPass.length + passToPass.length
  const [step, setStep] = useState(total)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    setPhase('pending')
  }, [issue, total])

  const motionEnabled = phase !== 'static'

  useEffect(() => {
    if (!motionEnabled) return
    const node = rootRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPhase(entry.isIntersecting ? 'playing' : 'pending')
      },
      { threshold: 0.25 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [motionEnabled])

  useEffect(() => {
    if (phase === 'static') {
      setStep(total)
      return
    }

    if (phase !== 'playing') return

    let current = 0
    let timeout = 0
    let cancelled = false

    const tick = () => {
      if (cancelled) return

      if (current >= total) {
        if (!loop) return
        timeout = window.setTimeout(() => {
          if (cancelled) return
          current = 0
          setStep(0)
          timeout = window.setTimeout(tick, 320)
        }, 2400)
        return
      }

      current += 1
      setStep(current)
      const inTrajectory = current <= revealUnits
      const justFinishedThought = inTrajectory && current % 2 === 1
      timeout = window.setTimeout(
        tick,
        justFinishedThought ? 520 : inTrajectory ? 380 : 260,
      )
    }

    current = 0
    setStep(0)
    timeout = window.setTimeout(tick, 320)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [phase, total, revealUnits, loop])

  const shownUnits = Math.min(step, revealUnits)
  const showPatch = step > revealUnits
  const testStep = Math.max(0, step - revealUnits - 1)
  const shownFail = Math.min(testStep, failToPass.length)
  const shownPass = Math.max(0, testStep - failToPass.length)
  const allPassed =
    shownFail === failToPass.length && shownPass === passToPass.length

  return (
    <figure
      ref={rootRef}
      className="patch-sample"
      aria-label={`${source ? `${source}. ` : ''}${issueTitle ? `${issueTitle}. ` : ''}${issue} ${actions.map((turn) => `${turn.thought} ${turn.action}`).join('. ')}`}
    >
      {source ? <figcaption>{source}</figcaption> : null}

      <div className="patch-grid">
        <section>
          <p className="patch-label">Issue</p>
          {issueTitle ? <p className="patch-issue-title">{issueTitle}</p> : null}
          <p className="patch-issue">{issue}</p>

          <p className="patch-label patch-label-later">Actions</p>
          <ol className="patch-actions">
            {actions.map((turn, index) => {
              const thoughtVisible = shownUnits >= index * 2 + 1
              const actionVisible = shownUnits >= index * 2 + 2
              const { tool, target } = splitAction(turn.action)

              return (
                <li key={turn.action}>
                  <p
                    className={`patch-thought${thoughtVisible ? '' : ' is-hidden'}`}
                  >
                    {turn.thought}
                  </p>
                  <p
                    className={`patch-action${actionVisible ? '' : ' is-hidden'}`}
                  >
                    <span>{tool}</span>
                    <span>{target}</span>
                  </p>
                </li>
              )
            })}
          </ol>
        </section>

        <section>
          <p className="patch-label">Patch</p>
          <div className={showPatch ? '' : 'is-hidden'}>
            {file ? <p className="patch-file">{file}</p> : null}
            <div className="patch-diff">
              {patch.split('\n').map((line, index) => (
                <div
                  key={`${index}-${line}`}
                  className={`patch-diff-line is-${classifyDiffLine(line)}`}
                >
                  {displayDiffLine(line) || ' '}
                </div>
              ))}
            </div>
          </div>

          <p className="patch-label patch-label-later">pytest</p>
          <div className="patch-tests">
            <p className="patch-test-heading"># FAIL_TO_PASS</p>
            {failToPass.map((test, index) => {
              const done = index < shownFail
              return (
                <p key={test} className="patch-test">
                  <span className={done ? 'is-pass' : 'is-fail'}>
                    {done ? 'PASSED' : 'FAILED'}
                  </span>
                  <span> {test}</span>
                </p>
              )
            })}
            <p className="patch-test-heading patch-test-heading-later">
              # PASS_TO_PASS
            </p>
            {passToPass.map((test, index) => {
              const done = index < shownPass
              return (
                <p
                  key={test}
                  className={`patch-test${done ? '' : ' is-dim'}`}
                >
                  <span className="is-pass">PASSED</span>
                  <span> {test}</span>
                </p>
              )
            })}
            <p className="patch-test-summary">
              {allPassed
                ? `==== ${failToPass.length + passToPass.length} passed in 0.31s ====`
                : `==== ${failToPass.length - shownFail} failed, ${shownFail + shownPass} passed in 0.31s ====`}
            </p>
          </div>
        </section>
      </div>
    </figure>
  )
}
