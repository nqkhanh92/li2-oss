import { systemLogger } from '@/shared/lib/logs/system-logger'
import { I18nMessage } from '../ok/base'
import { BaseError } from './base.error'
import { requestContext } from '@/shared/types/request'

export class PermissionError extends BaseError {
  constructor(
    message: string = 'You do not have permission to perform this action',
    i18nMessage?: I18nMessage
  ) {
    const {
      key = 'common:messages.error.permission_error',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 403, 'PERMISSION_ERROR', { key, params, defaultMessage })
    this.name = 'PermissionError'
  }
}
export class BadRequestError extends BaseError {
  constructor(
    message: string = 'Bad request. Please check your inputs',
    i18nMessage?: I18nMessage
  ) {
    const {
      key = 'common:messages.error.bad_request',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 400, 'BAD_REQUEST', { key, params, defaultMessage })
    this.name = 'BadRequestError'
  }
}

export class PlanError extends BaseError {
  constructor(
    message: string = 'Please upgrade your plan to perform this action',
    i18nMessage?: I18nMessage
  ) {
    const {
      key = 'common:messages.error.plan_error',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 403, 'PLAN_ERROR', { key, params, defaultMessage })
    this.name = 'PlanError'
  }
}

export class AppError extends BaseError {
  constructor(message: string = 'Something went wrong on server!', i18nMessage?: I18nMessage) {
    const {
      key = 'common:messages.error.some_error',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 500, 'APP_ERROR', { key, params, defaultMessage })
    this.name = 'AppError'

    const context = requestContext.getStore() ?? {}
    systemLogger.logEvent('API_SERVER_ERROR', {
      eventType: 'API_SERVER_ERROR',
      ...context,
      reason: this.message,
      errorMessage: this.message,
      metadata: {
        message,
        trace: this.stack,
      },
    })
  }
}

/**
 * 413 rather than 400: the request is well formed, it is simply bigger than we accept. The
 * distinction is worth a class because a body that is refused before it is parsed has to be refused
 * on a number the server read from a header, not on anything it understood about the content.
 */
export class PayloadTooLargeError extends BaseError {
  constructor(message: string = 'Payload too large', i18nMessage?: I18nMessage) {
    const {
      key = 'common:messages.error.field_exceed_limit',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 413, 'PAYLOAD_TOO_LARGE', { key, params, defaultMessage })
    this.name = 'PayloadTooLargeError'
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', i18nMessage?: I18nMessage) {
    const {
      key = 'common:messages.error.unauthorized',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 401, 'UNAUTHORIZED', { key, params, defaultMessage })
    this.name = 'UnauthorizedError'
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message: string = 'Too many requests', i18nMessage?: I18nMessage) {
    const {
      key = 'common:messages.error.too_many_requests',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 429, 'TOO_MANY_REQUESTS', { key, params, defaultMessage })
    this.name = 'TooManyRequestsError'
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = 'Forbidden', i18nMessage?: I18nMessage) {
    const {
      key = 'common:messages.error.forbidden',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 403, 'FORBIDDEN', { key, params, defaultMessage })
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found', i18nMessage?: I18nMessage) {
    const {
      key = 'common:messages.error.not_found',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 404, 'NOT_FOUND', { key, params, defaultMessage })
    this.name = 'NotFoundError'
  }
}

/**
 * 503, not 500: the request was well formed and the server understood it — a dependency the handler
 * needs to answer SAFELY is unreachable. The distinction matters to a caller because a 503 says
 * "retrying later can work" while a 500 says "something is broken in the code path".
 *
 * Raised by the artifact idempotency claim (WP3) when Redis does not answer: with no store there is
 * no way to tell a first publish from a retry, and guessing creates a second artifact. Deliberately
 * NOT `AppError`, which also writes an `API_SERVER_ERROR` system event — a Redis blip is an outage of
 * a dependency, not a server bug to page on.
 */
export class ServiceUnavailableError extends BaseError {
  constructor(message: string = 'Service temporarily unavailable', i18nMessage?: I18nMessage) {
    const {
      key = 'common:messages.error.service_unavailable',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 503, 'SERVICE_UNAVAILABLE', { key, params, defaultMessage })
    this.name = 'ServiceUnavailableError'
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = 'Conflict', i18nMessage?: I18nMessage) {
    const {
      key = 'common:messages.error.conflict',
      params,
      defaultMessage = message,
    } = i18nMessage || {}
    super(message, 409, 'CONFLICT', { key, params, defaultMessage })
    this.name = 'ConflictError'
  }
}
