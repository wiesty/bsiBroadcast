import packageJson from '@/package.json'

export const APP_VERSION = packageJson.version
export const APP_TAG = `v${APP_VERSION}`
export const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'wiesty/bsibroadcast'

export function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, '')
}

export function compareVersions(a: string, b: string) {
  const left = normalizeVersion(a).split(/[.-]/)
  const right = normalizeVersion(b).split(/[.-]/)
  const length = Math.max(left.length, right.length, 3)

  for (let index = 0; index < length; index++) {
    const leftPart = left[index] ?? '0'
    const rightPart = right[index] ?? '0'
    const leftNumber = Number(leftPart)
    const rightNumber = Number(rightPart)

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      if (leftNumber !== rightNumber) return leftNumber - rightNumber
      continue
    }

    const lexical = leftPart.localeCompare(rightPart)
    if (lexical !== 0) return lexical
  }

  return 0
}
