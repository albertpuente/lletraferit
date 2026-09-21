// Copies the Hunspell dictionary files bundled in node_modules (dictionary-ca,
// dictionary-ca-valencia) into public/dictionaries/<code>/ so they can be
// fetched at runtime as static assets by the spellcheck worker.
//
// This project's "exports" field in those packages only exposes index.js
// (which uses node:fs and can't run in the browser), so we copy the raw
// .aff/.dic/license files ourselves instead of importing the package directly.

import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const dictionaries = [
  { pkg: 'dictionary-ca', code: 'ca' },
  { pkg: 'dictionary-ca-valencia', code: 'ca-valencia' },
]

for (const { pkg, code } of dictionaries) {
  const srcDir = path.join(root, 'node_modules', pkg)
  const destDir = path.join(root, 'public', 'dictionaries', code)

  if (!existsSync(srcDir)) {
    console.warn(`[copy-dictionaries] Skipping ${pkg}: not found in node_modules.`)
    continue
  }

  await mkdir(destDir, { recursive: true })

  for (const file of ['index.aff', 'index.dic', 'license']) {
    const src = path.join(srcDir, file)
    if (!existsSync(src)) continue
    await copyFile(src, path.join(destDir, file))
  }

  console.log(`[copy-dictionaries] Copied ${pkg} -> public/dictionaries/${code}/`)
}
