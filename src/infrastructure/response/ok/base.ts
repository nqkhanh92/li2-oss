import { NextResponse } from 'next/server'

export interface I18nMessage {
  key: string
  params?: Record<string, string | number>
  defaultMessage?: string
}
type ResponseOptions<T> = {
  data?: T
  message?: string
  code?: string
  i18nMessage?: I18nMessage
  [key: string]: any
}

export class APIResponse<T> {
  public readonly data?: T
  public readonly message?: string
  public readonly status: number
  public readonly success: boolean
  public readonly i18nMessage?: I18nMessage
  public readonly extra?: Record<string, any>

  constructor(
    data?: T,
    message?: string,
    status = 200,
    success = true,
    i18nMessage?: I18nMessage,
    extra?: Record<string, any>
  ) {
    this.data = data
    this.message = message
    this.status = status
    this.success = success
    this.i18nMessage = i18nMessage
    this.extra = extra
  }

  static ok<T>(options: ResponseOptions<T>) {
    const {
      data,
      message = 'Success',
      i18nMessage = { key: 'text.success', defaultMessage: 'Success' },
      ...rest
    } = options
    return new APIResponse(data, message, 200, true, i18nMessage, rest).toResponse()
  }

  static created<T>(options: ResponseOptions<T>) {
    const {
      data,
      message = 'Created',
      i18nMessage = { key: 'common.created', defaultMessage: 'Created' },
      ...rest
    } = options
    return new APIResponse(data, message, 201, true, i18nMessage, rest).toResponse()
  }

  static updated<T>(options: ResponseOptions<T>) {
    const {
      data,
      message = 'Updated',
      i18nMessage = { key: 'common:messages.updated.default', defaultMessage: 'Updated' },
      ...rest
    } = options
    return new APIResponse(data, message, 200, true, i18nMessage, rest).toResponse()
  }

  static deleted<T>(options: ResponseOptions<T>) {
    const {
      data,
      message = 'Deleted',
      i18nMessage = { key: 'common.messages.deleted.default', defaultMessage: 'Deleted' },
      ...rest
    } = options
    return new APIResponse(data, message, 200, true, i18nMessage, rest).toResponse()
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        data: this.data,
        message: this.message,
        success: this.success,
        i18nMessage: this.i18nMessage,
        ...this.extra,
      },
      { status: this.status }
    )
  }
}
