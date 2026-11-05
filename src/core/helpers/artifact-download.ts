import 'server-only'

/**
 * `Content-Disposition: attachment` with a filename that survives Vietnamese.
 *
 * Node refuses to send a header containing a byte outside ISO-8859-1 — `undici` THROWS rather than
 * mangling it — so `filename="Báo giá tháng 9.pdf"` is not a cosmetic problem, it is a 500. RFC 5987
 * is the way out: an ASCII-only `filename` every client understands, plus `filename*` carrying the
 * real name percent-encoded as UTF-8, which every current browser prefers when both are present.
 *
 * The artifact's own name is used, not its serve token: the token is an opaque internal handle and a
 * file called `k3f9x2qp.pdf` in someone's Downloads folder is a file they will not find again.
 */
export function attachmentDisposition(fileName: string): string {
  return `attachment; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${encodeRFC5987(fileName)}`
}

/**
 * The artifact name plus the real extension.
 *
 * The extension comes from `storage_path`, which was built from the format at upload time, rather
 * than from the name: a user's name for a deck is usually `Báo giá tháng 9`, with no extension at
 * all, and an OS that cannot see an extension will not offer the right application.
 *
 * A name that already ends in the same extension is left alone — nobody wants `deck.pdf.pdf`.
 */
export function downloadFileName(artifactName: string, storagePath: string): string {
  const extension = storagePath.match(/\.[^./]+$/)?.[0] ?? ''
  const name = artifactName.trim() || 'artifact'

  if (extension && name.toLowerCase().endsWith(extension.toLowerCase())) return name
  return `${name}${extension}`
}

/**
 * Everything outside printable ASCII becomes `_`, and so do `"` and `\`.
 *
 * The quote is the one that matters: this value sits inside a quoted-string, and a name containing
 * `"` would close it early and let the rest of the name be read as further header parameters.
 */
function asciiFallback(fileName: string): string {
  const stripped = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return stripped.trim() || 'artifact'
}

/**
 * `encodeURIComponent` leaves `!'()*` alone, and RFC 5987's `attr-char` set does not include them.
 * A client parsing strictly is entitled to reject the header over an unescaped `'`.
 */
function encodeRFC5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()!*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  )
}
