import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type ChatRole = 'user' | 'agent' | 'tool'

type ChatTurn = {
  role: ChatRole
  text: string
  detail?: string
}

type CompareRow = {
  label: string
  value: string
}

type TauSampleProps = {
  source?: string
  loop?: boolean
}

const PROMPT =
  'You are mia_li_3668. You want to fly from New York to Seattle on May 20 (one way). You do not want to fly before 11am est. You want to fly in economy. You prefer direct flights but one stopover also fine. If there are multiple options, you prefer the one with the lowest price. You have 3 baggages. You do not want insurance. You want to use your two certificates to pay. If only one certificate can be used, you prefer using the larger one, and pay the rest with your 7447 card.'

const TURNS: ChatTurn[] = [
  { role: 'agent', text: 'Hi, how can I help you today?' },
  {
    role: 'user',
    text: 'I want to fly from New York to Seattle on May 20. One way.',
  },
  { role: 'agent', text: "What's your user id?" },
  { role: 'user', text: 'mia_li_3668' },
  {
    role: 'tool',
    text: 'get_user_details',
    detail: 'gold · $250 cert · $100 cert · •7447',
  },
  { role: 'agent', text: 'Cabin, bags, and do you want insurance?' },
  { role: 'user', text: 'Economy. 3 bags. No insurance.' },
  {
    role: 'tool',
    text: 'search_direct_flight',
    detail: 'JFK → SEA · 2024-05-20',
  },
  {
    role: 'tool',
    text: 'search_onestop_flight',
    detail: 'HAT136 + HAT039 · $255',
  },
  {
    role: 'agent',
    text: 'Cheapest after 11am is a one-stop. HAT136 JFK→ATL 7:00pm, then HAT039 ATL→SEA 10:00pm. $255 economy. Book it?',
  },
  { role: 'user', text: 'Use my two certificates.' },
  {
    role: 'agent',
    text: "I can only apply one certificate. I'll use the $250 one and the rest on your 7447 card. Confirm?",
  },
  { role: 'user', text: 'Yes.' },
  {
    role: 'tool',
    text: 'book_reservation',
    detail: 'HAT136 + HAT039 · cert $250 + •7447 $5',
  },
]

const COMPARE: CompareRow[] = [
  { label: 'origin', value: 'JFK' },
  { label: 'destination', value: 'SEA' },
  { label: 'flights', value: 'HAT136, HAT039' },
  { label: 'cabin', value: 'economy' },
  { label: 'bags', value: '3' },
  { label: 'insurance', value: 'no' },
  { label: 'payment', value: 'certificate $250 + •7447 $5' },
]

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isChat(role: ChatRole): role is 'user' | 'agent' {
  return role === 'user' || role === 'agent'
}

export function TauSample({ source, loop = false }: TauSampleProps) {
  const rootRef = useRef<HTMLElement>(null)
  const [phase, setPhase] = useState<'static' | 'pending' | 'playing'>('static')
  const total = TURNS.length + COMPARE.length + 1
  const [step, setStep] = useState(total)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    setPhase('pending')
  }, [total])

  const motionEnabled = phase !== 'static'

  useEffect(() => {
    if (!motionEnabled) return
    const node = rootRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPhase(entry.isIntersecting ? 'playing' : 'pending')
      },
      { threshold: 0.2 },
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
          timeout = window.setTimeout(tick, 280)
        }, 2400)
        return
      }

      current += 1
      setStep(current)
      const turn = TURNS[current - 1]
      const delay = !turn
        ? 200
        : turn.role === 'tool'
          ? 280
          : turn.role === 'user'
            ? 360
            : 480
      timeout = window.setTimeout(tick, delay)
    }

    current = 0
    setStep(0)
    timeout = window.setTimeout(tick, 320)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [phase, total, loop])

  const shownTurns = Math.min(step, TURNS.length)
  const compareStep = Math.max(0, step - TURNS.length)
  const shownCompare = Math.min(compareStep, COMPARE.length)
  const showMatch = step >= total

  return (
    <figure
      ref={rootRef}
      className="tau-sample"
      aria-label={`${source ? `${source}. ` : ''}Hidden user instructions: ${PROMPT}`}
    >
      {source ? <figcaption>{source}</figcaption> : null}

      <div className="tau-grid">
        <section>
          <p className="tau-label">
            Instructions
            <span>hidden from the agent</span>
          </p>
          <p className="tau-prompt">{PROMPT}</p>

          <p className="tau-label tau-label-later">Database</p>
          <div className="tau-db">
            {COMPARE.map((row, index) => (
              <p
                key={row.label}
                className={`tau-db-row${index < shownCompare ? '' : ' is-hidden'}`}
              >
                <span>{row.label}</span>
                <span>{row.value}</span>
              </p>
            ))}
            <p className={`tau-db-match${showMatch ? '' : ' is-hidden'}`}>
              <span className="is-pass">✓</span> matches annotated goal
            </p>
          </div>
        </section>

        <section>
          <p className="tau-label">
            Conversation
            <span>agent in blue</span>
          </p>
          <ol className="tau-chat">
            {TURNS.map((turn, index) => {
              const visible = index < shownTurns
              const prev = TURNS[index - 1]
              const first = !prev || prev.role !== turn.role
              const stacked = isChat(turn.role) && !first

              if (turn.role === 'tool') {
                return (
                  <li
                    key={`${turn.text}-${index}`}
                    className={`tau-tool${visible ? '' : ' is-hidden'}`}
                  >
                    <span>{turn.text}</span>
                    {turn.detail ? <span> · {turn.detail}</span> : null}
                  </li>
                )
              }

              const incoming = turn.role === 'user'

              return (
                <li
                  key={`${turn.role}-${index}`}
                  className={`tau-turn ${incoming ? 'is-user' : 'is-agent'}${stacked ? ' is-stacked' : ''}${visible ? '' : ' is-hidden'}`}
                >
                  <p className={`tau-bubble ${incoming ? 'is-in' : 'is-out'}`}>
                    {turn.text}
                  </p>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </figure>
  )
}
