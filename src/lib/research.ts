export function stripJats(s: unknown): string {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const DOMAIN_WORDS: [string, string[]][] = [
  ['semiconductor', ['semiconductor', 'semiconductors', 'chip', 'chips', 'microelectronics', 'microelectronic', 'foundry', 'wafer', 'integrated circuit']],
  ['photovoltaic', ['photovoltaic', 'photovoltaics', 'solar', 'renewable']],
  ['oil', ['oil', 'gas', 'petroleum', 'crude', 'energy']],
  ['software', ['software', 'saas', 'cloud', 'digital']],
  ['electric', ['utility', 'utilities', 'electricity', 'grid', 'power']],
]
const FIN_RE = /^(stock|stocks|share|shares|return|returns|equity|equities|valuation|investor|investors|price|prices|pricing|portfolio|firm|firms|shareholder|market|markets|profitability|profit|margin|margins|earnings|capex|investment|financial)/

function domainWordsFor(q: string): string[] | null {
  const low = String(q).toLowerCase()
  for (const [key, words] of DOMAIN_WORDS) {
    if (low.indexOf(key) >= 0 || words.some((w) => low.indexOf(w) >= 0)) return words
  }
  return null
}

export interface CrossrefItem {
  id: string
  title: string
  venue: string
  iso: string
  abstract: string
  cited: number
  url: string
  type: string
  source: 'Crossref'
}

interface CrossrefRawItem {
  title?: string[]
  abstract?: string
  'container-title'?: string[]
  URL?: string
  DOI?: string
  issued?: { 'date-parts'?: number[][] }
  'is-referenced-by-count'?: number
  type?: string
}

async function crossrefSearch(q: string, rows: number): Promise<CrossrefItem[]> {
  const base =
    'https://api.crossref.org/works?rows=40' +
    '&filter=type:journal-article,from-pub-date:' + new Date(Date.now() - 2920 * 864e5).toISOString().slice(0, 10) +
    '&select=title,abstract,container-title,URL,DOI,issued,is-referenced-by-count,type' +
    '&mailto=basis-app@example.com'
  const r = await fetch(base + '&query.bibliographic=' + encodeURIComponent(q) + '&query.title=' + encodeURIComponent(q))
  if (!r.ok) throw new Error('crossref ' + r.status)
  const j = await r.json()
  const dom = domainWordsFor(q)
  const items: CrossrefRawItem[] = (j.message || {}).items || []
  const cand = items.map((it) => {
    const title = (it.title || [''])[0] || ''
    const words = title.toLowerCase().split(/[^a-z]+/).filter(Boolean)
    const yr = ((it.issued || {})['date-parts'] || [[0]])[0][0] || 0
    return {
      it,
      yr,
      onDomain: dom ? dom.some((d) => words.indexOf(d) >= 0 || (d.indexOf(' ') > 0 && title.toLowerCase().indexOf(d) >= 0)) : true,
      onFinance: words.some((w) => FIN_RE.test(w)),
    }
  })
  // With no domain anchor the finance gate is the ONLY filter — never let it collapse open.
  const strict = cand.filter((x) => x.onDomain && x.onFinance)
  const loose = dom ? cand.filter((x) => x.onDomain) : cand.filter((x) => x.onFinance)
  const picked = strict.length >= 2 ? strict : loose
  const seenT: Record<string, 1> = {}
  const uniq = picked.filter((x) => {
    const k = x.it.DOI || x.it.URL
    if (!k || seenT[k]) return false
    seenT[k] = 1
    return true
  })
  uniq.sort((a, b) => Number(b.onFinance) - Number(a.onFinance) || b.yr - a.yr)
  return uniq
    .slice(0, rows)
    .map((x) => x.it)
    .map((it) => {
      const parts = ((it.issued || {})['date-parts'] || [[]])[0] || []
      const iso = parts.length ? parts.slice(0, 3).map((n, i) => (i ? String(n).padStart(2, '0') : n)).join('-') : ''
      const abs = stripJats(it.abstract)
      return {
        id: it.DOI || it.URL || '',
        title: (it.title || [''])[0] || 'Untitled',
        venue: ((it['container-title'] || [''])[0] || 'Journal').slice(0, 42),
        iso,
        abstract: abs ? (abs.length > 260 ? abs.slice(0, 257).replace(/\s\S*$/, '') + '…' : abs) : 'No abstract in the index — open the record for the full text.',
        cited: it['is-referenced-by-count'] || 0,
        url: it.URL || 'https://doi.org/' + it.DOI,
        type: (it.type || 'journal article').replace(/-/g, ' '),
        source: 'Crossref' as const,
      }
    })
}

export async function crossrefTopic(q: string, rows: number): Promise<CrossrefItem[]> {
  const dom = domainWordsFor(q) || []
  const head = dom[0] || q.split(' ')[0]
  const variants = [q, head + ' firms stock returns', head + ' industry equity valuation']
  const merged: CrossrefItem[] = []
  const seen: Record<string, 1> = {}
  for (const v of variants) {
    if (merged.length >= rows) break
    try {
      const items = await crossrefSearch(v, rows)
      items.forEach((it) => {
        if (!seen[it.id]) {
          seen[it.id] = 1
          merged.push(it)
        }
      })
    } catch (e) {
      if (!merged.length && v === q) throw e
    }
  }
  return merged.slice(0, rows)
}

interface OpenAlexWork {
  id?: string
  primary_location?: { source?: { display_name?: string } }
  open_access?: { oa_url?: string; is_oa?: boolean }
  doi?: string
  publication_date?: string
  referenced_works_count?: number
  display_name?: string
  abstract_inverted_index?: Record<string, number[]>
  type?: string
  cited_by_count?: number
}

export function abstractOf(w: OpenAlexWork): string {
  const inv = w.abstract_inverted_index
  if (!inv) return 'Abstract not indexed — open the full text.'
  const words: string[] = []
  Object.keys(inv).forEach((word) => {
    ;(inv[word] || []).forEach((pos) => {
      words[pos] = word
    })
  })
  const txt = words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  if (!txt) return 'Abstract not indexed — open the full text.'
  return txt.length > 260 ? txt.slice(0, 257).replace(/\s\S*$/, '') + '…' : txt
}

export async function openAlexSearch(q: string, perPage: number, page: number, sinceIso: string): Promise<OpenAlexWork[]> {
  const r = await fetch(
    'https://api.openalex.org/works?search=' + encodeURIComponent(q) +
    '&per-page=' + perPage + '&page=' + page +
    '&sort=publication_date:desc' +
    '&filter=has_abstract:true,from_publication_date:' + sinceIso +
    '&mailto=basis@example.com'
  )
  if (r.status === 429 || r.status === 403) {
    throw new OpenAlexBlocked(r.status === 429 ? 'budget' : 'blocked')
  }
  if (!r.ok) throw new Error('openalex ' + r.status)
  const j = await r.json()
  return j.results || []
}

export class OpenAlexBlocked extends Error {
  reason: 'budget' | 'blocked'
  constructor(reason: 'budget' | 'blocked') {
    super('openalex ' + reason)
    this.reason = reason
  }
}

export function openAlexHost(w: OpenAlexWork): string {
  return ((w.primary_location || {}).source || {}).display_name || 'Working paper'
}
export function openAlexOaUrl(w: OpenAlexWork): string {
  return (w.open_access || {}).oa_url || w.doi || 'https://openalex.org/' + (w.id || '').split('/').pop()
}
export function openAlexId(w: OpenAlexWork): string {
  return (w.id || '').split('/').pop() || ''
}
export type { OpenAlexWork }
