/**
 * ============================================================================
 * MDX → plain markdown, for `get_doc_page` (plan §4.3).
 * ============================================================================
 *
 * A `str -> str` function with no I/O, deliberately in its own module rather than inside
 * `find-docs.ts`: purity that is structural can be pinned against fixtures with no fetch, no cache
 * and no tool error in the loop. li2-ai reached the same conclusion for the same reason
 * (`app/kb/strip.py`) and the rules below are ported from it — READ, NEVER IMPORTED. That file lives
 * in another repo, another language and another deploy; a shared "utility" across that boundary
 * would be a dependency neither service can see.
 *
 * WHY STRIP AT ALL: `docs.li2.ai` serves Mintlify MDX, so a page is markdown with React components
 * spliced through it (`<Info>`, `<Steps>`, `<Tab title="…">`). A model does not need the tags, and
 * every one of them is context the customer pays for. What it DOES need is the text inside them and
 * the titles that live in their attributes — so unwrapping is not the same as deleting.
 *
 * ⛔ TWO INVARIANTS THAT ARE NOT STYLE:
 *   1. **Fenced code survives byte for byte.** Doc pages teach integration code; a snippet containing
 *      `<Provider>` or a generic `List<String>` looks exactly like a JSX tag to the tag regex. Strip
 *      it and we hand the model code that does not compile, silently.
 *   2. **Inline code spans are protected the same way.** The live corpus writes literal placeholders
 *      like `` `<TeamID>.<BundleID>` `` in prose — outside any fence.
 * Idempotence follows from both: stripping stripped output changes nothing.
 */

/** A fence toggles state whatever its info string (` ```swift theme={null} `) or indentation. */
const FENCE_LINE = /^\s*```/

/**
 * One JSX/HTML tag. `inner` is everything after the name — attributes, plus the trailing `/` of a
 * self-closing tag — and is parsed separately below rather than folded in here, because an attribute
 * value may contain almost anything except an unescaped `>`.
 */
const TAG = /<(\/)?([A-Za-z][A-Za-z0-9]*)([^<>]*)>/g

const ATTR = /([A-Za-z][\w-]*)="([^"]*)"/g

/** Splitting on a capturing group keeps the separators, so odd indices ARE the code spans. */
const INLINE_CODE = /(`[^`]*`)/

/** A title that already reads "Bước 3: …" must not become "Bước 1: Bước 3: …". */
const STEP_ALREADY_NUMBERED = /^Bước\s*\d+/

const STEP_TAGS = new Set(['Step'])
const STEPS_WRAPPER_TAGS = new Set(['Steps'])
const TITLE_BOLD_TAGS = new Set(['Tab', 'Accordion'])
const TITLE_WRAPPER_TAGS = new Set(['Tabs', 'AccordionGroup'])
const CARD_LIKE_TAGS = new Set(['Card', 'Frame'])

function parseAttrs(inner: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const [, name, value] of inner.matchAll(ATTR)) attrs[name] = value
  return attrs
}

type TagReplacer = (match: string, closing: string | undefined, name: string, inner: string) => string

/**
 * The `<Step>` counter is why this is a closure and not a bare function: Mintlify numbers steps by
 * position, so the number exists only in the rendering. It restarts at 1 on every fresh `<Steps>`
 * wrapper, which is the whole reason the state is per-document.
 */
function createTagReplacer(): TagReplacer {
  let stepCounter = 0

  return (_match, closing, name, inner) => {
    // `<br />` separates lines inside table cells in the live corpus ("590000 =<br />590.000₫").
    // Every other tag is dropped, but dropping this one glues the surrounding words together.
    if (name.toLowerCase() === 'br') return ' '

    const isSelfClosing = inner.trimEnd().endsWith('/')
    // A closing tag never emits: whatever it was going to say was said at the open tag.
    if (closing || isSelfClosing) return ''

    const attrs = parseAttrs(inner)
    const title = attrs.title ?? ''
    const href = attrs.href

    if (STEPS_WRAPPER_TAGS.has(name)) {
      stepCounter = 0
      return ''
    }

    if (STEP_TAGS.has(name)) {
      stepCounter += 1
      if (!title) return `**Bước ${stepCounter}:**`
      if (STEP_ALREADY_NUMBERED.test(title)) return `**${title}**`
      return `**Bước ${stepCounter}: ${title}**`
    }

    if (TITLE_WRAPPER_TAGS.has(name)) return ''
    if (TITLE_BOLD_TAGS.has(name)) return title ? `**${title}**` : ''

    if (CARD_LIKE_TAGS.has(name)) {
      if (title && href) return `**${title}** (${href})`
      return title ? `**${title}**` : ''
    }

    // Info, Note, Check, Warning, Tip, CardGroup and anything unrecognised: unwrap and keep the
    // children. The tag contributed presentation, and presentation is not what a model is reading.
    return ''
  }
}

function stripLine(line: string, replace: TagReplacer): string {
  const segments = line.split(INLINE_CODE)
  for (let i = 0; i < segments.length; i += 2) {
    segments[i] = segments[i].replace(TAG, replace as (...args: unknown[]) => string)
  }
  return segments.join('')
}

/**
 * Every live page opens with the same 4-line "Documentation Index" blockquote — per-page noise that
 * would otherwise ride into the model's context once for every page it opens, telling it to go fetch
 * a manifest we already gave it.
 */
function dropBoilerplate(lines: string[]): string[] {
  if (!lines[0]?.trimStart().startsWith('> ## Documentation Index')) return lines
  let i = 0
  while (i < lines.length && lines[i].trimStart().startsWith('>')) i += 1
  if (lines[i]?.trim() === '') i += 1
  return lines.slice(i)
}

export function stripMdx(raw: string): string {
  const lines = dropBoilerplate(raw.split('\n'))
  const replace = createTagReplacer()
  const out: string[] = []
  let inFence = false

  for (const line of lines) {
    if (FENCE_LINE.test(line)) {
      inFence = !inFence
      out.push(line)
      continue
    }
    if (inFence) {
      out.push(line)
      continue
    }

    const stripped = stripLine(line, replace)
    // A line that was ONLY tag syntax collapses to nothing — skip it rather than emit a blank for
    // every wrapper open and close. A line that was already blank in the source passes through.
    if (line.trim() && !stripped.trim()) continue
    out.push(stripped)
  }

  return out.join('\n')
}
