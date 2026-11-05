/**
 * The deployed app version, read from `package.json` — the one place a release number already exists.
 *
 * ⛔ SERVER ONLY, and that is the whole reason this is its own file rather than an import inside the
 * two routes that need it. `import pkg from 'package.json'` pulls the ENTIRE manifest into whatever
 * bundle reaches it, dependency list and scripts included; in a client component that is a free map
 * of the stack for anyone reading the JS. Only the field below crosses, and only server code imports
 * this module (`/api/mcp` serverInfo, `/api/health`).
 *
 * It is read rather than typed because a hand-maintained constant goes stale silently: the symptom
 * would be a directory listing and a health probe both reporting a version that was never deployed.
 */
import pkg from '../../../package.json'

export const APP_VERSION: string = pkg.version
