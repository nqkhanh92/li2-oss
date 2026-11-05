import { NextResponse } from 'next/server'

import { APP_VERSION } from '@/core/constants/app-version'

/**
 * `version` is here for the directory reviews and for deploy verification (P0.6): the MCP server
 * advertises the same number in its `serverInfo`, and this is the only way to ask a running
 * container which build it is without a shell on the box.
 *
 * Both fields read from `package.json`, so there is nothing to bump by hand.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', version: APP_VERSION })
}
