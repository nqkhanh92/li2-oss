/**
 * ============================================================================
 * Applying `publish_artifact.access` — the one thing publish does AFTER it has already succeeded.
 * ============================================================================
 *
 * WHY A SEPARATE FILE AND A SEPARATE CALL. `createAndPublish` takes no access input
 * (`CreateAndPublishInput` is `{ name, file, slug?, domain_id? }`), and widening it would mean
 * threading an access block through the publish RPC and its quota transaction — a change to the
 * path every UI publish takes, for a field only MCP sends. So WP2 composes two existing service
 * calls instead: `createAndPublish`, then `setAccess`. Everything that makes that honest lives here.
 *
 * ⚠️ THE WINDOW IS REAL AND IT IS IN THE CONTRACT. Between the two calls the page is PUBLIC and its
 * short link already resolves. If the second call fails the page STAYS public, the response carries
 * `warning`, and the HTTP status is still 201 — the publish is not undone. Rolling it back would
 * mean deleting an artifact the user may already have been handed the link to, and a `delete` here
 * would also have to beat the user's own browser to it. Telling the truth is the smaller harm, and
 * `publish_artifact`'s description instructs the model to say it out loud and call
 * `set_artifact_access` to retry.
 *
 * ⛔ NO PASSWORD EVER REACHES A LOG OR A RESPONSE. The sentences below are fixed strings chosen by
 * the thrown error's i18n KEY; neither the error's `message` nor any argument is interpolated. This
 * is the same discipline `core/mcp/artifact-refusals.ts` applies to the back hop's 4xx bodies, for
 * the same reason — except these sentences travel inside a 2xx `data` block, so they are authored
 * here rather than at the MCP layer.
 */
import { artifactService } from '@/core/services/artifact.service'
import { recordArtifactAudit } from '@/core/helpers/artifact-audit'
import {
  ARTIFACT_PASSWORD_MAX_LENGTH,
  ARTIFACT_PASSWORD_MIN_LENGTH,
  type ArtifactDTO,
} from '@/core/types/artifact.type'
import { logger } from '@/infrastructure/logging/logger'
import type { ArtifactAccessInput } from '@/shared/schemas/agent-tools'

const log = logger.child({ module: 'artifact-agent-access' })

export interface ApplyRequestedAccessParams {
  orgId: string
  userId: string
  /** The artifact `createAndPublish` just returned. */
  published: ArtifactDTO
  access: ArtifactAccessInput
  /** For the audit row: the OAuth client and surface of the connected agent. */
  clientId?: string
  surface?: string
}

export interface ApplyRequestedAccessOutcome {
  /**
   * The DTO to project into the response: the one `setAccess` returned on success, or the original
   * published one on failure — which is the artifact as it REALLY is, `access_mode: 'public'`
   * included. A response claiming `password` for a page anyone can open would be the one outcome
   * worse than the failure itself.
   */
  dto: ArtifactDTO
  /** Set only on failure, and its presence means the page is public. */
  warning?: string
}

/** The keys `setAccess` can raise. Closed set — anything else gets the generic sentence. */
const KEY = {
  fieldRequired: 'common:messages.error.field_required',
  fieldInvalid: 'common:messages.error.field_invalid',
  accessConflict: 'artifact:access.conflict',
  permission: 'common:messages.error.permission_error',
  notFound: 'common:messages.error.not_found',
  removed: 'artifact:errors.removed',
  statusRefuses: 'artifact:update.status_refuses',
} as const

const PASSWORD_FIELD = '$t(label.password)'

const PUBLIC_NOW =
  'The artifact was published and its link and QR code work, but it is PUBLIC: anyone with the ' +
  'link can open it. '
const RETRY =
  ' Tell the user the page is public right now, then call set_artifact_access with the same ' +
  'artifact_id to lock it.'

function i18nKeyOf(error: unknown): { key: string; field: string } {
  const message = (error as { i18nMessage?: { key?: unknown; params?: unknown } })?.i18nMessage
  const key = typeof message?.key === 'string' ? message.key : ''
  const rawField = (message?.params as { field?: unknown } | undefined)?.field
  return { key, field: typeof rawField === 'string' ? rawField : '' }
}

/**
 * Turn a failed `setAccess` into ONE sentence a model can act on.
 *
 * Every branch opens with the same "it is public" clause, because that is the fact the user needs
 * and the one a model summarising a long response is most likely to drop.
 */
export function accessWarningFor(error: unknown, mode: string): string {
  const { key, field } = i18nKeyOf(error)

  if (key === KEY.fieldRequired && field === PASSWORD_FIELD)
    return `${PUBLIC_NOW}The requested access mode "password" needs a password and none was sent.${RETRY}`

  if (key === KEY.fieldInvalid && field === PASSWORD_FIELD)
    return (
      `${PUBLIC_NOW}The password was rejected: it must be ${ARTIFACT_PASSWORD_MIN_LENGTH} to ` +
      `${ARTIFACT_PASSWORD_MAX_LENGTH} characters long.${RETRY}`
    )

  if (key === KEY.fieldInvalid && field === 'access_mode')
    return (
      `${PUBLIC_NOW}The access mode "${mode}" is turned off on this Li2 server, so it could not be ` +
      'applied. Use "password" or "private" instead, via set_artifact_access.'
    )

  if (key === KEY.permission)
    return (
      `${PUBLIC_NOW}Your role in this organization does not include permission to change who can ` +
      'open a touch point. Ask an owner or admin of the organization to lock the page.'
    )

  if (key === KEY.accessConflict)
    return `${PUBLIC_NOW}Another change to this artifact landed at the same time.${RETRY}`

  if (key === KEY.notFound || key === KEY.removed || key === KEY.statusRefuses)
    return `${PUBLIC_NOW}The artifact was no longer in a state that accepts an access change.${RETRY}`

  return `${PUBLIC_NOW}The access mode could not be applied.${RETRY}`
}

/**
 * Apply the `access` block a `publish_artifact` call asked for.
 *
 * NEVER THROWS for an access failure — that is the entire point. The publish already happened, so a
 * throw here would answer an error for a call that created an artifact, and the agent would be told
 * nothing exists while the user's dashboard shows a live page.
 */
export async function applyRequestedAccess(
  params: ApplyRequestedAccessParams
): Promise<ApplyRequestedAccessOutcome> {
  const { orgId, userId, published, access } = params

  try {
    const dto = await artifactService.setAccess(orgId, userId, published.id, {
      access_mode: access.mode,
      password: access.password,
    })

    // Best effort and never awaited, like every artifact audit row: the access change already
    // happened. `metadata` carries ids and the tool name only — never the password (the helper's
    // own header forbids arguments in `metadata`).
    recordArtifactAudit({
      orgId,
      userId,
      artifactId: published.id,
      action: 'update',
      tool: 'publish_artifact',
      clientId: params.clientId,
      surface: params.surface,
    })

    return { dto }
  } catch (error) {
    // `mode` is safe to log; `access.password` is not and is not in scope of this call.
    log.warn(
      { err: error, artifactId: published.id, mode: access.mode },
      'Artifact published but the requested access mode could not be applied'
    )
    return { dto: published, warning: accessWarningFor(error, access.mode) }
  }
}
