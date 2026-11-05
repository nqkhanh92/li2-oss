import type { UploadedArtifactFile } from '@/core/services/artifact.service'

/**
 * `{ html }` → a file named `index.html`, the one shape the HTML-as-text callers share: the JSON
 * branch of `POST …/replace` and the two MCP agent routes (`publish-artifact`, `update-artifact`).
 *
 * ONE place decides two things the service then trusts:
 * - the name is `index.html`, so `artifactFormatForFileName` resolves `kind: 'html'` with no magic
 *   bytes to match — the only kind the MCP v1 path can produce;
 * - `size` is the UTF-8 BYTE length, not `html.length`. The 10 MB check, the quota and the bucket all
 *   count bytes, and a Vietnamese page is noticeably more bytes than characters.
 */
export function uploadedFileFromHtml(html: string): UploadedArtifactFile {
  const bytes = Buffer.from(html, 'utf8')
  return {
    name: 'index.html',
    size: bytes.byteLength,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  }
}
