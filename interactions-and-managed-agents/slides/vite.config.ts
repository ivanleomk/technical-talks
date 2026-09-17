import mdx from '@mdx-js/rollup'
import rehypeShiki from '@shikijs/rehype'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { defineConfig } from 'vite'

export default defineConfig({
  appType: 'spa',
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
        rehypePlugins: [
          // Highlight fenced code blocks at build time; swap the theme's white
          // background for the deck's warm surface tone.
          [
            rehypeShiki,
            {
              theme: 'vitesse-light',
              colorReplacements: { '#ffffff': 'var(--surface)' },
            },
          ],
        ],
      }),
    },
    tailwindcss(),
    react(),
  ],
})
