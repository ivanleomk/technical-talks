import { MDXProvider } from '@mdx-js/react'
import { CompletionSample } from './components/CompletionSample'
import { PatchSample } from './components/PatchSample'
import { ReasoningSample } from './components/ReasoningSample'
import { TauSample } from './components/TauSample'
import { Deck } from './deck/Deck'
import { Em } from './deck/Em'
import { Slide } from './deck/Slide'
import { slides } from './slides'

const components = {
  em: Em,
  CompletionSample,
  ReasoningSample,
  PatchSample,
  TauSample,
}

export default function App() {
  return (
    <MDXProvider components={components}>
      <Deck>
        {slides.map((slide) => (
          <Slide
            key={slide.n}
            id={String(slide.n)}
            title={slide.title}
            layout={slide.layout}
            eyebrow={slide.eyebrow}
          >
            <slide.Content />
          </Slide>
        ))}
      </Deck>
    </MDXProvider>
  )
}
