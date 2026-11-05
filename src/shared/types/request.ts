import { AsyncLocalStorage } from 'async_hooks'
export interface RequestContext {
  requestId: string
  role: RequestRole
}

export interface AnonAuthContext extends RequestContext {
  anonId: string
  ipAddress: string
}

export interface AuthContext extends RequestContext {
  userId: string
  email: string
}

export interface ServiceAuthContext extends RequestContext {
  host: string
  ipAddress: string
}

export enum RequestRole {
  ANON = 'anon',
  AUTH = 'auth',
  SERVICE = 'service',
  AGENT = 'agent'
}

export const requestContext = new AsyncLocalStorage<
  Partial<AuthContext & AnonAuthContext & ServiceAuthContext>
>()
