import { RES_QUERIES, sectorTerm, type ResFilter } from './constants'
import { abstractOf, crossrefTopic, openAlexHost, openAlexId, openAlexOaUrl, openAlexSearch, OpenAlexBlocked } from './research'
import type { Position, ResearchItem, TickerNewsItem } from './types'

export interface FetchPapersArgs {
  resFilter: ResFilter
  positions: Position[]
  paperSpin: number
  seenPapers: Record<string, 1>
  primarySym: string
}

export interface FetchPapersResult {
  items: ResearchItem[]
  newCount: number
  nextSeen: Record<string, 1>
  nextSpin: number
  blocked: 'budget' | 'blocked' | ''
}

const ANGLE = ['stock returns', 'profit margins valuation', 'supply constraints', 'capital expenditure investment', 'demand elasticity']

export async function fetchPapers({ resFilter, positions, paperSpin, seenPapers, primarySym }: FetchPapersArgs): Promise<FetchPapersResult> {
  const tabQ = RES_QUERIES[resFilter] || RES_QUERIES.Papers
  const sectors = Array.from(new Set(positions.map((p) => p.sector.toLowerCase()))).filter((s) => s !== 'unclassified')
  const spin = paperSpin || 0
  // Unclassified holdings have no sector to seed from — fall back to their ticker/company name.
  const named = positions.filter((p) => p.sector === 'Unclassified').map((p) => (p.name && p.name !== p.sym ? p.name : p.sym))
  const seeds = sectors.length ? sectors.map(sectorTerm) : named.slice(0, 2)
  const topics =
    resFilter === 'Papers'
      ? (seeds.length ? seeds.slice(0, 3).map((s, i) => s + ' ' + ANGLE[(spin + i) % 5]) : []).concat([tabQ[spin % tabQ.length]])
      : tabQ.map((q, i) => (i === 0 && seeds[0] ? seeds[0] + ' ' + q : q))

  const since = new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10)
  const out: ResearchItem[] = []
  const fresh: Record<string, 1> = {}
  let blocked: 'budget' | 'blocked' | '' = ''

  for (const t of topics) {
    const q = t
    const page = 1 + ((spin + t.length) % 3)
    if (blocked) {
      try {
        const items = await crossrefTopic(q, 3)
        items.forEach((it) => {
          if (!it.id || fresh[it.id]) return
          fresh[it.id] = 1
          out.push({
            venue: it.venue,
            kind: 'CROSSREF RECORD',
            date: (it.iso || '').slice(0, 7),
            read: it.type,
            title: it.title,
            finding: it.abstract,
            method: it.type,
            cites: 'cited ' + it.cited + ' times',
            tickers: [primarySym],
            liveUrl: it.url,
            topic: t,
            isNew: !seenPapers[it.id],
            oaid: it.id,
          })
        })
      } catch {
        /* skip */
      }
      continue
    }
    try {
      const works = await openAlexSearch(q, 4, page, since)
      works.forEach((w) => {
        const id = openAlexId(w)
        if (!id || fresh[id]) return
        fresh[id] = 1
        out.push({
          venue: openAlexHost(w).slice(0, 42),
          kind: w.open_access && w.open_access.is_oa ? 'OPEN ACCESS' : 'PEER-REVIEWED',
          date: (w.publication_date || '').slice(0, 7),
          read: (w.referenced_works_count || 0) + ' refs',
          title: w.display_name || 'Untitled',
          finding: abstractOf(w),
          method: (w.type || 'article').replace(/-/g, ' '),
          cites: 'cited ' + (w.cited_by_count || 0) + ' times',
          tickers: [primarySym],
          liveUrl: openAlexOaUrl(w),
          topic: t,
          isNew: !seenPapers[id],
          oaid: id,
        })
      })
    } catch (e) {
      if (e instanceof OpenAlexBlocked) {
        blocked = e.reason
        try {
          const items = await crossrefTopic(q, 3)
          items.forEach((it) => {
            if (!it.id || fresh[it.id]) return
            fresh[it.id] = 1
            out.push({
              venue: it.venue,
              kind: 'CROSSREF RECORD',
              date: (it.iso || '').slice(0, 7),
              read: it.type,
              title: it.title,
              finding: it.abstract,
              method: it.type,
              cites: 'cited ' + it.cited + ' times',
              tickers: [primarySym],
              liveUrl: it.url,
              topic: t,
              isNew: !seenPapers[it.id],
              oaid: it.id,
            })
          })
        } catch {
          /* skip */
        }
      }
    }
  }

  out.sort((a, b) => Number(b.isNew) - Number(a.isNew) || String(b.date).localeCompare(String(a.date)))
  const newCount = out.filter((x) => x.isNew).length
  const nextSeen = { ...seenPapers }
  out.forEach((x) => {
    nextSeen[x.oaid] = 1
  })
  const keys = Object.keys(nextSeen)
  if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((k) => delete nextSeen[k])

  return { items: out, newCount, nextSeen, nextSpin: (spin + 1) % 21, blocked }
}

const TICKER_ANGLES = ['competitive position', 'margin structure', 'demand outlook', 'capital intensity', 'supply constraints']

export async function fetchTickerResearch(name: string, sector: string, paperSpin: number): Promise<TickerNewsItem[]> {
  const spin = paperSpin || 0
  const queries = [sectorTerm(sector) + ' ' + name + ' stock returns', sectorTerm(sector) + ' ' + TICKER_ANGLES[spin % TICKER_ANGLES.length]]
  const since = new Date(Date.now() - 1095 * 864e5).toISOString().slice(0, 10)
  const out: TickerNewsItem[] = []
  const seenIds: Record<string, 1> = {}
  for (const q of queries) {
    try {
      const works = await openAlexSearch(q, 3, 1, since)
      works.forEach((w) => {
        const id = openAlexId(w)
        if (!id || seenIds[id]) return
        seenIds[id] = 1
        const d = w.publication_date || ''
        out.push({
          date: d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase() : '—',
          src: openAlexHost(w).slice(0, 16),
          move: 'PAPER',
          title: w.display_name || 'Untitled',
          why: abstractOf(w).slice(0, 170),
          ts: d ? new Date(d).getTime() : 0,
          url: openAlexOaUrl(w),
          isPaper: true,
        })
      })
    } catch {
      try {
        const items = await crossrefTopic(q, 2)
        items.forEach((it) => {
          if (!it.id || seenIds[it.id]) return
          seenIds[it.id] = 1
          out.push({
            date: it.iso ? new Date(it.iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase() : '—',
            src: it.venue.slice(0, 16),
            move: 'PAPER',
            title: it.title,
            why: it.abstract,
            ts: it.iso ? new Date(it.iso).getTime() : 0,
            url: it.url,
            isPaper: true,
          })
        })
      } catch {
        /* skip */
      }
    }
  }
  return out
}
