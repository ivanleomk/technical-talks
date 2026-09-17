import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Slide, type SlideProps } from './Slide'

type Collected = {
  id: string
  title: string
  node: ReactElement<SlideProps>
}

function isSlide(child: ReactNode): child is ReactElement<SlideProps> {
  return isValidElement(child) && child.type === Slide
}

function collectSlides(children: ReactNode): Collected[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isSlide(child)) return []
    const id = child.props.id
    return [{ id, title: child.props.title ?? id, node: child }]
  })
}

function pathIndex(slides: Collected[]): number {
  const raw = window.location.pathname.replace(/^\//, '')
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  if (Number.isFinite(n) && n >= 1 && n <= slides.length) return n - 1
  return 0
}

function slidePath(index: number): string {
  return `/${index + 1}`
}

export function Deck({ children }: { children: ReactNode }) {
  const slides = useMemo(() => collectSlides(children), [children])
  const [index, setIndex] = useState(() => pathIndex(slides))
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const [helpOpen, setHelpOpen] = useState(false)
  const indexRef = useRef(index)
  const helpRef = useRef<HTMLDialogElement>(null)
  const slideRef = useRef<HTMLElement>(null)

  indexRef.current = index

  useEffect(() => {
    if (index > slides.length - 1) {
      setIndex(0)
    }
  }, [index, slides.length])

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, next))
      const current = indexRef.current
      if (clamped === current) return
      setDir(clamped > current ? 'next' : 'prev')
      setIndex(clamped)
      history.pushState(null, '', slidePath(clamped))
    },
    [slides.length],
  )

  const step = useCallback(
    (delta: number) => {
      goTo(indexRef.current + delta)
    },
    [goTo],
  )

  useEffect(() => {
    if (slides.length === 0) return
    const nextPath = slidePath(pathIndex(slides))
    if (window.location.pathname !== nextPath) {
      history.replaceState(null, '', nextPath)
    }
  }, [slides])

  useEffect(() => {
    slideRef.current?.focus({ preventScroll: true })
  }, [index])

  useEffect(() => {
    function onPop() {
      const next = pathIndex(slides)
      const current = indexRef.current
      if (next === current) return
      setDir(next > current ? 'next' : 'prev')
      setIndex(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [slides])

  useEffect(() => {
    const dialog = helpRef.current
    if (!dialog) return
    if (helpOpen && !dialog.open) dialog.showModal()
    if (!helpOpen && dialog.open) dialog.close()
  }, [helpOpen])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target
      if (target instanceof HTMLElement) {
        if (
          target.matches('input, textarea, select') ||
          target.isContentEditable
        ) {
          return
        }
      }

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault()
        setHelpOpen((open) => !open)
        return
      }

      if (event.key === 'Escape') {
        setHelpOpen(false)
        return
      }

      if (helpOpen) return

      if (event.key === 'Tab') {
        event.preventDefault()
        step(event.shiftKey ? -1 : 1)
        return
      }

      if (
        event.key === 'ArrowRight' ||
        event.key === 'PageDown' ||
        event.key === ' '
      ) {
        event.preventDefault()
        step(1)
        return
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        step(-1)
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        goTo(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        goTo(slides.length - 1)
        return
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        if (document.fullscreenElement) {
          void document.exitFullscreen()
        } else {
          void document.documentElement.requestFullscreen()
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, helpOpen, slides.length, step])

  if (slides.length === 0) return null

  const safeIndex = Math.min(index, slides.length - 1)
  const current = slides[safeIndex]

  return (
    <div className="deck">
      <div className="sr-only" aria-live="polite">
        Slide {safeIndex + 1} of {slides.length}: {current.title}
      </div>

      <div
        key={`${current.id}-${dir}`}
        className="slide-frame"
        data-dir={dir}
      >
        <section
          ref={slideRef}
          className="slide-shell"
          tabIndex={-1}
          aria-label={current.title}
        >
          {current.node}
        </section>
      </div>

      <dialog
        ref={helpRef}
        className="help"
        onClose={() => setHelpOpen(false)}
        aria-labelledby="help-title"
      >
        <div className="help-inner">
          <h2 id="help-title">Move through the deck</h2>
          <dl className="key-list">
            <div>
              <dt>
                <kbd className="kbd">Tab</kbd>
              </dt>
              <dd>Next slide</dd>
            </div>
            <div>
              <dt>
                <kbd className="kbd">Shift</kbd> + <kbd className="kbd">Tab</kbd>
              </dt>
              <dd>Previous slide</dd>
            </div>
            <div>
              <dt>
                <kbd className="kbd">←</kbd> <kbd className="kbd">→</kbd>
              </dt>
              <dd>Also previous / next</dd>
            </div>
            <div>
              <dt>
                <kbd className="kbd">F</kbd>
              </dt>
              <dd>Fullscreen</dd>
            </div>
            <div>
              <dt>
                <kbd className="kbd">?</kbd>
              </dt>
              <dd>This panel</dd>
            </div>
          </dl>
          <button
            type="button"
            className="help-close"
            onClick={() => setHelpOpen(false)}
          >
            Close
          </button>
        </div>
      </dialog>
    </div>
  )
}
