import { NextResponse } from 'next/server'
import { I18nMessage } from '../ok/base'

export abstract class BaseError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly i18nMessage?: I18nMessage

  constructor(message: string, status: number, code?: string, i18nMessage?: I18nMessage) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
    this.i18nMessage = i18nMessage

    // Maintains proper stack trace for where our error was thrown
    // Error.captureStackTrace(this, this.constructor);
  }

  // Pure business logic method
  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      i18nMessage: this.i18nMessage,
    }
  }

  public toResponse(): NextResponse {
    return NextResponse.json(
      { error: true, message: this.message, i18nMessage: this.i18nMessage },
      { status: this.status }
    )
  }
}
