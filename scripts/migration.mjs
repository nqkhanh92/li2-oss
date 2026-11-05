import { execSync } from 'child_process'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { createInterface } from 'readline'

let rl = createInterface({ input: process.stdin, output: process.stdout })

const ENV_OPTIONS = [
  { label: 'Development (.env.development)', value: '.env.development' },
  { label: 'Production (.env.production)',   value: '.env.production'  },
  { label: 'Local (.env.local)',             value: '.env.local'       },
]

function select(prompt, options, defaultIndex = 0) {
  return new Promise((resolve) => {
    rl.close()
    let selectedIndex = defaultIndex

    const render = () => {
      process.stdout.write(`\x1B[${options.length}A`)
      options.forEach((opt, i) => {
        const prefix = i === selectedIndex ? '❯ ' : '  '
        const style  = i === selectedIndex ? '\x1B[36m' : '\x1B[90m'
        process.stdout.write(`\x1B[2K${style}${prefix}${opt.label}\x1B[0m\n`)
      })
    }

    console.log(prompt)
    options.forEach((opt, i) => {
      const prefix = i === selectedIndex ? '❯ ' : '  '
      const style  = i === selectedIndex ? '\x1B[36m' : '\x1B[90m'
      console.log(`${style}${prefix}${opt.label}\x1B[0m`)
    })

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    const onKey = (key) => {
      if (key === '\u001B[A') {
        selectedIndex = (selectedIndex - 1 + options.length) % options.length
        render()
      } else if (key === '\u001B[B') {
        selectedIndex = (selectedIndex + 1) % options.length
        render()
      } else if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false)
        process.stdin.removeListener('data', onKey)
        process.stdout.write('\x1B[?25h')
        rl = createInterface({ input: process.stdin, output: process.stdout })
        resolve(options[selectedIndex].value)
      } else if (key === '\u0003') {
        process.stdout.write('\x1B[?25h')
        process.exit()
      }
    }

    process.stdin.on('data', onKey)
  })
}

function loadEnv(envFile) {
  const envPath = resolve(process.cwd(), envFile)
  if (!existsSync(envPath)) {
    console.error(`\x1B[31mFile not found: ${envFile}\x1B[0m`)
    process.exit(1)
  }
  config({ path: envPath })
  const dbUrl = process.env.DB_URL
  if (!dbUrl) {
    console.error(`\x1B[31mDB_URL not found in ${envFile}\x1B[0m`)
    process.exit(1)
  }
  return dbUrl
}

async function resolveEnv() {
  const args = process.argv
  if (args.includes('--dev'))  return { dbUrl: loadEnv('.env.development'), isProd: false }
  if (args.includes('--prod')) return { dbUrl: loadEnv('.env.production'),   isProd: true  }

  const available = ENV_OPTIONS.filter((opt) =>
    existsSync(resolve(process.cwd(), opt.value))
  )
  if (available.length === 0) {
    console.error('\x1B[31mNo env files found (.env.development, .env.production, .env.local)\x1B[0m')
    process.exit(1)
  }

  const envFile = await select('Select environment:', available, 0)
  return { dbUrl: loadEnv(envFile), isProd: envFile === '.env.production' }
}

async function main() {
  const command = process.argv[2]

  if (!['push', 'list'].includes(command)) {
    console.error(`Unknown command "${command}". Use: push, list`)
    process.exit(1)
  }

  const { dbUrl, isProd } = await resolveEnv()
  const debug = isProd ? ' --debug' : ''
  rl.close()

  const cmds = {
    push: `supabase db push --db-url "${dbUrl}"${debug}`,
    list: `supabase migration list --db-url "${dbUrl}"${debug}`,
  }

  execSync(cmds[command], { stdio: 'inherit' })
}

main()
