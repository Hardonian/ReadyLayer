import fs from 'node:fs'
import path from 'node:path'

export function loadEnv(filePath: string = '.env.local'): void {
  const resolvedPath = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(resolvedPath)) {
    return
  }

  const contents = fs.readFileSync(resolvedPath, 'utf-8')
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const normalized = trimmed.startsWith('export ') ? trimmed.slice('export '.length) : trimmed
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = normalized.slice(0, separatorIndex).trim()
    const rawValue = normalized.slice(separatorIndex + 1).trim()
    if (!key) {
      continue
    }

    const value = rawValue.replace(/^['"]|['"]$/g, '')
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}
