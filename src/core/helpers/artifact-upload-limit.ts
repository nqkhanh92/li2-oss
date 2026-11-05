import { ARTIFACT_MAX_BYTES } from '@/core/types/artifact.type'

/**
 * Multipart puts a boundary and the part headers on top of the file itself. Measured at 265 bytes
 * for one file and one field, so a whole megabyte of headroom refuses only bodies whose file could
 * not have been accepted anyway — a 10MB file arrives as a ~10MB+265B body and must still pass.
 */
export const ARTIFACT_BODY_HEADROOM_BYTES = 1024 * 1024

/**
 * LAYER 0 of upload validation: is the declared body too big to even parse? (§4.1, §3 B9)
 *
 * `request.formData()` of undici multiplies memory ~5×, so this has to run on the header — before
 * the body is read. A `file.size` check after parsing is not a cheaper version of the same thing;
 * it is a different check that runs after the cost has already been paid.
 *
 * A missing header is NOT a refusal: a chunked request has no `content-length` and is perfectly
 * legal, so layer 1 (extension) and layer 2 (magic bytes) still have to do their work. The two
 * layers are complementary, not alternatives.
 */
export function artifactBodyExceedsLimit(declaredLength: string | null): boolean {
  if (declaredLength === null) return false

  const declared = Number(declaredLength)
  if (!Number.isFinite(declared)) return false

  return declared > ARTIFACT_MAX_BYTES + ARTIFACT_BODY_HEADROOM_BYTES
}
