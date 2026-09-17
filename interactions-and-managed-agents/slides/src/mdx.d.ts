declare module '*.mdx' {
  import type { ComponentType } from 'react'

  export const frontmatter: {
    layout?: 'about' | 'exhibit' | 'center'
    title?: string
  }

  const MDXComponent: ComponentType
  export default MDXComponent
}
