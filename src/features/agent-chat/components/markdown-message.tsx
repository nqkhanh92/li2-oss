'use client'

/**
 * Track 1 — the model's PROSE, rendered as sanitized Markdown.
 *
 * This is the single trusted-render chokepoint for untrusted model output. The text is the LLM's
 * stream, so it is treated as hostile: react-markdown builds a hast tree (never runs raw HTML), and
 * rehype-sanitize strips anything dangerous (script/iframe/event handlers/js: URLs) via its default
 * schema. remark-gfm gives autolinks/tables/strikethrough — notably, a created short_url arriving
 * as plain text becomes a clickable link for free.
 *
 * ⛔ We do NOT compile the model's text as real MDX. MDX evaluates arbitrary JSX/imports = XSS/RCE.
 * The rich interactive bits (the approval card) are OUR components driven by structured SSE events,
 * never parsed out of this prose. See project_ai_agent_chat_ui (two-track render).
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

export function MarkdownMessage({ text }: { text: string }) {
  return (
    // `prose prose-sm` (from @tailwindcss/typography) restores list markers, heading sizes, code and
    // table styling that Tailwind Preflight strips. Scoped tweaks keep it readable in the ~448px
    // panel: tighter vertical rhythm, wrapping long words/URLs, and horizontally-scrollable
    // code/table blocks instead of overflow that breaks the layout.
    <div
      className="prose prose-sm max-w-none break-words leading-relaxed text-slate-800
        prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1
        prose-pre:my-2 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:bg-slate-900 prose-pre:p-3
        prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs
        prose-code:before:content-none prose-code:after:content-none
        prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
        prose-table:block prose-table:overflow-x-auto"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Force every link to open safely in a new tab. rel=noopener/noreferrer blocks the
          // opened page from touching window.opener; sanitize already dropped any js: scheme.
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
