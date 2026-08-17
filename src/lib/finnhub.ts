import type { QuoteMeta, TickerNewsItem } from './types'
import type { SearchResult } from './alpaca'

export async function fetchFinnhubQuotes(syms: string[], key: string): Promise<{ px: Record<string, number>; meta: Record<string, QuoteMeta>; ok: number; fail: number }> {
  const px: Record<string, number> = {}
  const meta: Record<string, QuoteMeta> = {}
  let ok = 0
  let fail = 0
  for (const sym of syms) {
    try {
      const r = await fetch('https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(sym) + '&token=' + encodeURIComponent(key))
      const j = await r.json()
      if (j && typeof j.c === 'number' && j.c > 0) {
        px[sym] = j.c
        meta[sym] = { c: j.c, d: j.d, dp: j.dp, h: j.h, l: j.l, pc: j.pc }
        ok++
      } else {
        fail++
      }
    } catch {
      fail++
    }
  }
  return { px, meta, ok, fail }
}

export async function fetchFinnhubNews(sym: string, key: string): Promise<TickerNewsItem[]> {
  const to = new Date()
  const from = new Date(Date.now() - 380 * 864e5)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  try {
    const r = await fetch(
      'https://finnhub.io/api/v1/company-news?symbol=' + encodeURIComponent(sym) + '&from=' + iso(from) + '&to=' + iso(to) + '&token=' + encodeURIComponent(key)
    )
    const j: Array<{ datetime: number; source?: string; headline?: string; summary?: string; url?: string }> = await r.json()
    if (!Array.isArray(j) || !j.length) return []
    const step = Math.max(1, Math.floor(j.length / 5))
    const picked = []
    for (let i = 0; i < j.length && picked.length < 5; i += step) picked.push(j[i])
    return picked.reverse().map((a) => {
      const d = new Date(a.datetime * 1000)
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
        src: (a.source || 'news').slice(0, 14),
        move: 'LIVE',
        title: a.headline || '',
        why: (a.summary || '').slice(0, 170),
        ts: a.datetime * 1000,
        url: a.url,
      }
    })
  } catch {
    return []
  }
}

export async function searchFinnhub(q: string, key: string): Promise<{ status: string; results: SearchResult[] }> {
  try {
    const r = await fetch('https://finnhub.io/api/v1/search?q=' + encodeURIComponent(q) + '&token=' + encodeURIComponent(key))
    const j = await r.json()
    const hits: Array<{ symbol: string; description?: string; type?: string }> = (j.result || []).filter((x: { type?: string }) => x.type === 'Common Stock' || !x.type).slice(0, 6)
    const out: SearchResult[] = []
    for (const h of hits) {
      let quote: SearchResult['quote'] = null
      try {
        const rq = await fetch('https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(h.symbol) + '&token=' + encodeURIComponent(key))
        const jq = await rq.json()
        if (jq && typeof jq.c === 'number' && jq.c > 0) quote = { c: jq.c, pc: jq.pc, dp: jq.dp, h: jq.h, l: jq.l }
      } catch {
        /* skip quote */
      }
      out.push({ sym: h.symbol, name: h.description || h.symbol, quote })
    }
    return { status: out.length ? out.length + ' matches · live quotes' : 'No matches for "' + q + '"', results: out }
  } catch {
    return { status: 'Search failed — key may be rate-limited', results: [] }
  }
}
