// Tiny Node ESM loader so scripts/*.ts can `import` this project's source files with
// their normal extensionless specifiers (as Vite/tsc already resolve them) — lets
// analysis scripts import the REAL shipped model code directly instead of maintaining
// a duplicate copy that can drift out of sync.
//
// Usage: node --experimental-strip-types --import ./scripts/ts-resolve-loader.mjs <script>.ts
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('.') || specifier.startsWith('/')) && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
    const candidate = new URL(specifier + '.ts', context.parentURL)
    if (existsSync(fileURLToPath(candidate))) {
      return nextResolve(candidate.href, context)
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  return nextLoad(url, context)
}
