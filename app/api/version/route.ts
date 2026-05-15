import { APP_TAG, APP_VERSION, GITHUB_REPOSITORY, compareVersions, normalizeVersion } from '@/lib/version'

export const dynamic = 'force-dynamic'

interface GitHubRelease {
  tag_name?: string
  html_url?: string
  name?: string
  published_at?: string
}

interface GitHubTag {
  name?: string
  commit?: {
    sha?: string
    url?: string
  }
}

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'bsibroadcast-update-check',
}

function tagToVersion(tag: string | undefined) {
  return tag ? normalizeVersion(tag) : null
}

async function fetchLatestRelease(repository: string) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
    headers: githubHeaders,
    next: { revalidate: 3600 },
  })

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub releases request failed with ${response.status}`)

  const release = (await response.json()) as GitHubRelease
  const latestVersion = tagToVersion(release.tag_name)

  if (!latestVersion) return null

  return {
    source: 'release' as const,
    latestVersion,
    latestTag: release.tag_name ?? `v${latestVersion}`,
    latestUrl: release.html_url ?? `https://github.com/${repository}/releases/tag/v${latestVersion}`,
    latestName: release.name ?? release.tag_name ?? `v${latestVersion}`,
    publishedAt: release.published_at ?? null,
  }
}

async function fetchLatestTag(repository: string) {
  const response = await fetch(`https://api.github.com/repos/${repository}/tags?per_page=30`, {
    headers: githubHeaders,
    next: { revalidate: 3600 },
  })

  if (!response.ok) throw new Error(`GitHub tags request failed with ${response.status}`)

  const tags = ((await response.json()) as GitHubTag[])
    .map((tag) => tag.name)
    .filter((tag): tag is string => Boolean(tag))
    .filter((tag) => /^v?\d+\.\d+\.\d+/.test(tag))
    .sort((a, b) => compareVersions(b, a))

  const latestTag = tags[0]
  const latestVersion = tagToVersion(latestTag)

  if (!latestVersion) return null

  return {
    source: 'tag' as const,
    latestVersion,
    latestTag,
    latestUrl: `https://github.com/${repository}/tree/${latestTag}`,
    latestName: latestTag,
    publishedAt: null,
  }
}

export async function GET() {
  try {
    const latest = (await fetchLatestRelease(GITHUB_REPOSITORY)) ?? (await fetchLatestTag(GITHUB_REPOSITORY))
    const updateAvailable = latest ? compareVersions(latest.latestVersion, APP_VERSION) > 0 : false

    return Response.json({
      currentVersion: APP_VERSION,
      currentTag: APP_TAG,
      repository: GITHUB_REPOSITORY,
      status: latest ? 'ok' : 'unavailable',
      updateAvailable,
      latest,
    })
  } catch (error) {
    return Response.json(
      {
        currentVersion: APP_VERSION,
        currentTag: APP_TAG,
        repository: GITHUB_REPOSITORY,
        status: 'error',
        updateAvailable: false,
        latest: null,
        error: error instanceof Error ? error.message : 'Unknown update check error',
      },
      { status: 502 }
    )
  }
}
