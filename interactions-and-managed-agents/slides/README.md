# Building Agents with the Managed Agents API

A Vite + MDX presentation (built from `slide-lib`). Tab (or arrows) to move between slides.

Each slide is a numbered MDX file in `content/`. The URL is the number: `/1`, `/2`, `/3`.

## Run

```bash
npm install
npm run dev
```

Open the local URL, then press **F** for fullscreen.

```bash
npm run deploy
```

## Move around

| Key | Action |
| --- | --- |
| `Tab` | Next slide |
| `Shift+Tab` | Previous slide |
| `←` `→` `Space` | Same as Tab |
| `F` | Fullscreen |
| `?` | Shortcut list |

## Add a slide

Drop `content/22.mdx` (next unused number). Frontmatter sets layout and the screen-reader title. The body is MDX — import components from `src/components`.

```mdx
---
layout: center
title: My slide
---

# One sentence, with an _emphasis_.
```

Layouts:

- default — big heading, optional muted paragraph or list
- `center` — same, centered
- `about` — heading + list, with a `.portrait` image on the right
- `exhibit` — a screenshot or meme, centered

```mdx
import photo from '../src/assets/ivan.png'

<img src={photo} className="portrait" alt="" />
```

`_underscores_` become the marker underline.
