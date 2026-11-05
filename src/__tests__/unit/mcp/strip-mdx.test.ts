/**
 * `stripMdx` — MDX → plain markdown for `get_doc_page` (plan §4.3).
 *
 * ★ WHY IT IS TESTED APART FROM THE TOOL. The function is pure, so it can be pinned against the
 * shapes the live corpus actually contains without a fetch, a cache or a tool error in the loop.
 * That is the same reason li2-ai keeps its `strip_mdx` in its own module.
 *
 * The two properties worth a test are both SILENT when broken — the tool still returns text, the
 * text is just wrong:
 *   1. **Code survives.** Doc pages teach integration code. `Li2<Deep>` and `List<String>` look
 *      exactly like JSX to the tag regex, and eating them hands the model code that will not
 *      compile with nothing to indicate anything was removed.
 *   2. **Unwrapping is not deleting.** The text inside `<Info>` is the page's content, and a step's
 *      title exists ONLY in the tag's attribute — drop the tag naively and the numbered steps of
 *      every setup guide become unlabelled prose.
 */
import { describe, it, expect } from 'vitest'
import { stripMdx } from '@/core/mcp/strip-mdx'

describe('stripMdx — code is untouchable', () => {
  it('keeps a fenced block byte for byte, JSX-looking content and all', () => {
    const raw = ['# T', '', '```swift', 'let a = Li2<Deep>()', '<Info>not a component here</Info>', '```'].join('\n')
    expect(stripMdx(raw)).toBe(raw)
  })

  it('keeps an inline code span that contains angle brackets', () => {
    // The live corpus writes `<TeamID>.<BundleID>` in prose, outside any fence.
    expect(stripMdx('Dùng `<TeamID>.<BundleID>` làm định danh.')).toBe(
      'Dùng `<TeamID>.<BundleID>` làm định danh.'
    )
  })

  it('toggles fence state on an indented or info-stringed fence', () => {
    // Fences appear indented inside <Steps> children, and Mintlify emits ```ts theme={null}.
    const raw = ['  ```ts theme={null}', '  const x = <Foo />', '  ```'].join('\n')
    expect(stripMdx(raw)).toBe(raw)
  })
})

describe('stripMdx — components unwrap, their content stays', () => {
  it('drops the wrapper but keeps the children', () => {
    expect(stripMdx('<Info>\n  **Bạn sẽ học**: X.\n</Info>')).toBe('  **Bạn sẽ học**: X.')
  })

  it('numbers steps by position and restarts at every Steps block', () => {
    const raw = [
      '<Steps>',
      '<Step title="A">one</Step>',
      '<Step title="B">two</Step>',
      '</Steps>',
      '<Steps>',
      '<Step title="C">three</Step>',
      '</Steps>',
    ].join('\n')
    const out = stripMdx(raw)
    expect(out).toContain('**Bước 1: A**one')
    expect(out).toContain('**Bước 2: B**two')
    // The restart is why the replacer is stateful per document rather than a bare function.
    expect(out).toContain('**Bước 1: C**three')
  })

  it('does not double-number a title that already says "Bước 3"', () => {
    expect(stripMdx('<Step title="Bước 3: Xác minh">x</Step>')).toBe('**Bước 3: Xác minh**x')
  })

  it('renders an OPEN Card as title + href, and drops the self-closing form entirely', () => {
    // Self-closing tags are dropped unconditionally (li2-ai's rule, kept for parity) — a line that
    // was nothing but one collapses away rather than leaving a blank behind.
    expect(stripMdx('<Card title="SDK" href="https://x.test/a.md">body</Card>')).toBe(
      '**SDK** (https://x.test/a.md)body'
    )
    expect(stripMdx('<Card title="SDK" href="https://x.test/a.md" />')).toBe('')
  })

  it('turns <br /> into a space instead of gluing words together', () => {
    // Live corpus: "590000 =<br />590.000₫" inside a table cell.
    expect(stripMdx('590000 =<br />590.000₫')).toBe('590000 = 590.000₫')
  })

  it('bolds a Tab title and unwraps the group', () => {
    expect(stripMdx('<Tabs>\n<Tab title="iOS">x</Tab>\n</Tabs>')).toBe('**iOS**x')
  })
})

describe('stripMdx — page-level noise', () => {
  it('drops the Documentation Index blockquote every live page opens with', () => {
    const raw = [
      '> ## Documentation Index',
      '> Fetch the complete documentation index at: https://docs.li2.ai/llms.txt',
      '> Use this file to discover all available pages before exploring further.',
      '',
      '# Real Title',
    ].join('\n')
    expect(stripMdx(raw)).toBe('# Real Title')
  })

  it('leaves a blockquote that is NOT the boilerplate alone', () => {
    const raw = '> Hiểu cách Deep Link hoạt động.'
    expect(stripMdx(raw)).toBe(raw)
  })

  it('is idempotent — stripping stripped output changes nothing', () => {
    const raw = ['<Info>a</Info>', '', '```ts', 'const x = <Y/>', '```', '<Step title="S">b</Step>'].join('\n')
    const once = stripMdx(raw)
    expect(stripMdx(once)).toBe(once)
  })
})
