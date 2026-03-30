import { logInfo as _ulogInfo, logError as _ulogError } from '@/lib/logging/core'
import { execSync } from 'node:child_process'

const ALLOWLIST = new Set([
  'src/app/api/auth/[...nextauth]/route.ts',
  'src/app/api/files/[...path]/route.ts',
  'src/app/api/system/boot-id/route.ts',
])

function main() {
  const output = execSync("find src/app/api -name 'route.ts' -type f", { encoding: 'utf8' })
  const files = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const missing: string[] = []

  for (const file of files) {
    if (ALLOWLIST.has(file)) continue
    const hasApiHandler = execSync(`grep -l "apiHandler" ${JSON.stringify(file)} || true`, { encoding: 'utf8' }).trim().length > 0
    if (!hasApiHandler) {
      missing.push(file)
    }
  }

  if (missing.length > 0) {
    _ulogError('[check-api-handler] missing apiHandler in:')
    for (const file of missing) {
      _ulogError(`- ${file}`)
    }
    process.exit(1)
  }

  _ulogInfo(`[check-api-handler] ok total=${files.length} allowlist=${ALLOWLIST.size}`)
}

main()
