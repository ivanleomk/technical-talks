import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type ReasoningSampleProps = {
  problem: string
  thoughts: string[]
  answer: string
  source?: string
  loop?: boolean
}

type Phase = 'static' | 'pending' | 'playing'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nextCharDelay(char: string) {
  if (/[.!?]/.test(char)) return 160
  if (/[,;:]/.test(char)) return 90
  if (char === ' ') return 24
  return 12 + Math.random() * 12
}

export function ReasoningSample({
  problem,
  thoughts,
  answer,
  source,
  loop = true,
}: ReasoningSampleProps) {
  const rootRef = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<Phase>('static')
  const [thoughtIndex, setThoughtIndex] = useState(thoughts.length)
  const [typed, setTyped] = useState(thoughts.at(-1) ?? '')
  const [showAnswer, setShowAnswer] = useState(true)
  const thoughtKey = thoughts.join('\0')

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    setPhase('pending')
  }, [thoughtKey])

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
    if (phase === 'static') {
      setThoughtIndex(thoughts.length)
      setTyped(thoughts.at(-1) ?? '')
      setShowAnswer(true)
      return
    }

    if (phase !== 'playing') return

    let currentThought = 0
    let currentChar = 0
    let timeout = 0
    let cancelled = false

    const setThought = (index: number, text: string) => {
      setThoughtIndex(index)
      setTyped(text)
    }

    const tick = () => {
      if (cancelled) return

      if (currentThought >= thoughts.length) {
        setShowAnswer(true)
        if (!loop) return
        timeout = window.setTimeout(() => {
          if (cancelled) return
          currentThought = 0
          currentChar = 0
          setShowAnswer(false)
          setThought(0, '')
          timeout = window.setTimeout(tick, 280)
        }, 2200)
        return
      }

      const thought = thoughts[currentThought]
      if (currentChar >= thought.length) {
        currentThought += 1
        currentChar = 0
        setThought(currentThought, '')
        timeout = window.setTimeout(tick, 220)
        return
      }

      const char = thought[currentChar]
      currentChar += 1
      setThought(currentThought, thought.slice(0, currentChar))
      timeout = window.setTimeout(tick, nextCharDelay(char))
    }

    currentThought = 0
    currentChar = 0
    setShowAnswer(false)
    setThought(0, '')
    timeout = window.setTimeout(tick, 320)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [phase, thoughtKey, loop, thoughts])

  const thinking = phase !== 'static' && !showAnswer

  return (
    <figure
      ref={rootRef}
      className="reasoning-sample"
      aria-label={`${source ? `${source}. ` : ''}${problem} ${thoughts.join(' ')} ${answer}`}
    >
      {source ? <figcaption>{source}</figcaption> : null}

      <p className="reasoning-problem">{problem}</p>

      <div className="reasoning-stage">
        <div className="reasoning-sizer" aria-hidden="true">
          <p className="reasoning-label">Thinking</p>
          <div className="reasoning-thoughts">
            {thoughts.map((thought) => (
              <p key={thought} className="reasoning-thought">
                {thought}
              </p>
            ))}
          </div>
          <p className="reasoning-label reasoning-label-answer">Answer</p>
          <p className="reasoning-answer">{answer}</p>
        </div>

        <div className="reasoning-live" aria-hidden="true">
          <p className="reasoning-label">
            {thinking ? <span className="thinking-dot" /> : null}
            Thinking
          </p>
          <div className="reasoning-thoughts">
            {thoughts.map((thought, index) => {
              const text =
                index < thoughtIndex || showAnswer
                  ? thought
                  : index === thoughtIndex
                    ? typed
                    : ''

              return (
                <p key={thought} className="reasoning-thought">
                  {text}
                  {thinking && index === thoughtIndex ? (
                    <span className="completion-caret" />
                  ) : null}
                </p>
              )
            })}
          </div>
          <p className="reasoning-label reasoning-label-answer">Answer</p>
          <p className="reasoning-answer">
            {showAnswer ? (
              <mark className="completion-mark">{answer}</mark>
            ) : null}
          </p>
        </div>
      </div>
    </figure>
  )
}
