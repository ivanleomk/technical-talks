import type { ComponentType } from 'react'
import type { SlideProps } from './deck/Slide'

export type SlideModule = {
  default: ComponentType
  frontmatter?: {
    layout?: SlideProps['layout']
    title?: string
  }
}

const modules = import.meta.glob<SlideModule>('../content/*.mdx', {
  eager: true,
})

// The deck is three parts bookended by setup and questions. Each entry
// claims every slide from `from` until the next section starts, so slides
// only need renumbering when they move.
const sections = [
  { label: 'AI Studio', from: 3.5 },
  { label: 'Interactions API', from: 6 },
  { label: 'Building Agents', from: 11 },
  { label: 'Managed Agents', from: 14 },
  { label: 'Questions', from: 17 },
]

function eyebrowFor(n: number): string | undefined {
  const index = sections.findLastIndex((section) => n >= section.from)
  if (index === -1) return undefined
  return `0${index + 1} · ${sections[index].label}`
}

function slideNumber(path: string): number | null {
  const match = path.match(/\/(\d+(?:\.\d+)?)\.mdx$/)
  if (!match) return null
  return Number.parseFloat(match[1])
}

export const slides = Object.entries(modules)
  .flatMap(([path, mod]) => {
    const n = slideNumber(path)
    if (n == null) return []
    return [
      {
        n,
        title: mod.frontmatter?.title ?? String(n),
        layout: mod.frontmatter?.layout,
        eyebrow: eyebrowFor(n),
        Content: mod.default,
      },
    ]
  })
  .sort((a, b) => a.n - b.n)
