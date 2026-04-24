export interface ContentNode {
  name: string
  type: string
  children: ContentNode[]
  properties: Record<string, unknown>
}

export interface BsiAdvisoryContent {
  uuid: string
  name: string
  children: ContentNode[]
  properties: {
    description?: string
    productdescription?: string
    title?: string
    damage?: number
    probability?: number
    remotelyExploitable?: boolean
    noPatch?: boolean
    operatingsystems?: string
    updatetype?: string
    initialreleasedate?: string
    currentreleasedate?: string
    idKuerzel?: string
    risiko?: string
    latestrevision?: number
  }
}

export interface DocumentReference {
  url: string
  description: string
  date?: string
}

export interface Revision {
  number: number
  date: string
  description: string
}

export interface Score {
  basescore: number
  temporalscore: number
  score: number
  classification: string
  version: string
}

export interface ParsedAdvisoryContent {
  description?: string
  productdescription?: string
  damage?: number
  probability?: number
  remotelyExploitable?: boolean
  noPatch?: boolean
  operatingsystems?: string[]
  updatetype?: string
  initialreleasedate?: string
  currentreleasedate?: string
  revisions: Revision[]
  documentReferences: DocumentReference[]
  scores: Score[]
}

function findChild(node: ContentNode | { children: ContentNode[] }, name: string): ContentNode | undefined {
  return node.children.find((c) => c.name === name)
}

function findChildren(node: ContentNode | { children: ContentNode[] }, name: string): ContentNode[] {
  return node.children.filter((c) => c.name === name)
}

export function parseAdvisoryContent(data: BsiAdvisoryContent): ParsedAdvisoryContent {
  const props = data.properties

  const revisionsNode = findChild(data, 'revisionsListe')
  const revisions: Revision[] = revisionsNode
    ? findChildren(revisionsNode, 'revision').map((r) => ({
        number: r.properties.number as number,
        date: r.properties.date as string,
        description: r.properties.description as string,
      }))
    : []

  const docRefNode = findChild(data, 'documentReferenceListe')
  const documentReferences: DocumentReference[] = docRefNode
    ? findChildren(docRefNode, 'documentReference').map((r) => ({
        url: r.properties.url as string,
        description: r.properties.description as string,
        date: r.properties.date as string | undefined,
      }))
    : []

  const scoreNode = findChild(data, 'scoreListe')
  const scores: Score[] = scoreNode
    ? findChildren(scoreNode, 'score').map((s) => ({
        basescore: s.properties.basescore as number,
        temporalscore: s.properties.temporalscore as number,
        score: s.properties.score as number,
        classification: s.properties.classification as string,
        version: s.properties.version as string,
      }))
    : []

  return {
    description: props.description,
    productdescription: props.productdescription,
    damage: props.damage,
    probability: props.probability,
    remotelyExploitable: props.remotelyExploitable,
    noPatch: props.noPatch,
    operatingsystems: props.operatingsystems
      ? props.operatingsystems.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    updatetype: props.updatetype,
    initialreleasedate: props.initialreleasedate,
    currentreleasedate: props.currentreleasedate,
    revisions,
    documentReferences,
    scores,
  }
}

export async function fetchAdvisoryContent(advisoryName: string): Promise<ParsedAdvisoryContent | null> {
  try {
    const uuidRes = await fetch(
      `https://wid.cert-bund.de/content/public/securityAdvisory/kurzinfo-uuid-by-name/${advisoryName}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000), next: { revalidate: 3600 } }
    )
    if (!uuidRes.ok) return null
    const contentUuid: string = (await uuidRes.json()).replace(/"/g, '')

    const res = await fetch(`https://wid.cert-bund.de/content/public/content/${contentUuid}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data: BsiAdvisoryContent = await res.json()
    return parseAdvisoryContent(data)
  } catch {
    return null
  }
}

export interface BsiAdvisory {
  uuid: string
  name: string
  title: string
  published: string
  basescore?: number
  temporalscore?: number
  classification?: string
  status?: string
  productNames?: string[]
  cves?: string[]
  noPatch?: boolean
}

export interface BsiApiResponse {
  content: BsiAdvisory[]
  pageable: {
    pageNumber: number
    pageSize: number
  }
  totalPages: number
  totalElements: number
}

const BSI_API_BASE = 'https://wid.cert-bund.de/content/public/securityAdvisory'
export const FETCH_DELAY_MS = 1000

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function fetchAdvisoryPage(page: number, size = 50): Promise<BsiApiResponse> {
  const url = `${BSI_API_BASE}?size=${size}&page=${page}&sort=published%2Cdesc&aboFilter=false`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`BSI API error ${res.status}: ${url}`)
  return res.json()
}
