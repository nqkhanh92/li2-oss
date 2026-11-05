export function cleanMarkdown(md: string): string {
  let text = md

  // 1. Remove images: ![alt](url)
  text = text.replace(/!\[.*?\]\(.*?\)/g, '')

  // 2. Remove links but keep the link text: [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  // 3. Remove extra formatting (**bold**, *italic*, headers ###, etc.)
  text = text.replace(/[*_`#>~\-]+/g, '')

  // 4. Collapse multiple spaces/newlines
  text = text.replace(/\n{2,}/g, '\n').replace(/[ \t]{2,}/g, ' ')

  // 5. Deduplicate repeated lines
  const seen = new Set<string>()
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false
      if (seen.has(line)) return false
      seen.add(line)
      return true
    })
    .join('\n')

  return text.trim()
}
