import type { ReactNode } from 'react'

export type SlideProps = {
  id: string
  title?: string
  layout?: 'about' | 'exhibit' | 'center' | 'section'
  eyebrow?: string
  children?: ReactNode
}

export function Slide({ layout, eyebrow, children }: SlideProps) {
  return (
    <article className={layout ? `slide ${layout}` : 'slide'}>
      {eyebrow && layout !== 'section' && (
        <p className="slide-eyebrow">{eyebrow}</p>
      )}
      {children}
    </article>
  )
}
