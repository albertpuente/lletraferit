# Lletraferit

[![CI/CD](https://github.com/albertpuente/lletraferit/actions/workflows/deploy.yml/badge.svg)](https://github.com/albertpuente/lletraferit/actions/workflows/deploy.yml)
[![Tests](https://github.com/albertpuente/lletraferit/actions/workflows/tests.yml/badge.svg)](https://github.com/albertpuente/lletraferit/actions/workflows/tests.yml)
[![Code style: oxlint](https://img.shields.io/badge/code%20style-oxlint-4D7CFE?logo=oxlint&logoColor=white)](https://oxc.rs/docs/guide/usage/linter.html)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)

<img src="docs/screenshot.png" alt="Lletraferit editor screenshot" align="right" width="360">

A small, client-only web app for writing poetry in Catalan. 

> **Lletraferit, -ida** *(adj., Catalan)* - literally "letter-wounded"; someone struck, smitten, or
> afflicted by literature. A person hopelessly devoted to writing and the written word.

### [**Open Lletraferit 🔗**](https://albertpuente.github.io/lletraferit/)

It's a plain-text editor that counts syllables per verse as you type, detects rhyme schemes, flags
misspelled words, and suggests synonyms. Analysis and document handling run locally in the browser:
there is no server or account.

**Table of contents:**
- [Features](#features)
- [Architecture](#architecture)
- [License](#license)
- [Getting started](#getting-started)
- [Deployment](#deployment)

<br clear="right">

## Features

- **Live syllable count** - a per-line gutter shows the metrical syllable count for each verse,
  applying Catalan rules for sinalefa (vowel fusion across word boundaries) and the
  "count-to-the-last-stress" convention (aguda/plana/esdrúixola endings). A dièresi (ï/ü) can be
  used to force a hiatus where the automatic analysis would assume a diphthong or sinalefa. The
  contributing syllables can also be shown as curves below the verse.
- **Rhyme scheme detection** - verses are grouped by matching phonetic endings (from the stressed
  vowel onward) and labelled with the traditional lettering convention (A, B, C…, upper/lowercase
  for art major/menor, an apostrophe for plana endings), scoped per stanza. Selecting a rhyme group
  highlights its matching endings.
- **Click-to-explain metrics** - clicking a line's syllable count or rhyme letter opens a popup
  explaining exactly how that number or letter was derived.
- **Poetry reference and examples** - panels provide a guided metrics explanation, well-known
  Catalan forms (sonet, quartets, romanç, haikú, etc.), and bundled real poems to load into the
  editor.
- **Offline Catalan spellchecking** - the real Hunspell engine (compiled to WebAssembly via
  `hunspell-asm`) runs a Central-or-Valencian-variant dictionary in a Web Worker and underlines
  unrecognized words. Words can be added to a local personal dictionary.
- **Click-a-word synonyms** - clicking any word looks it up in an offline Catalan thesaurus and
  offers alternatives, which can be inserted with one click.
- **Local file storage** - the most recently opened, created, or explicitly saved document is
  backed up in IndexedDB and restored on reopening the app. Plain-text poems can be opened from or
  saved directly to disk with the File System Access API, with upload/download fallbacks where that
  API is unavailable. Use the toolbar or ⌘/Ctrl+S to save; typing does not write to disk.
- **Customizable writing surface** - choose Central or Valencian analysis, light/dark/system theme,
  one of four visual styles, font size, optional paper texture, and a responsive layout for phones
  and desktops.

## Architecture

Built with **Vite + React + TypeScript**, styled with **Tailwind CSS**, and edited with
**CodeMirror 6**. There is no backend - everything runs client-side.

```
src/
  engine/        Pure-TS Catalan metrics engine: syllabification, stress detection,
                 sinalefa, rhyme phonetics, rhyme-scheme and verse-type classification.
                 No dependency on the editor or DOM - independently unit-tested (Vitest).
  editor/        CodeMirror integration: the syllable/rhyme gutter, spellcheck-underline
                 decoration, word-click handling, typing animation, and the glue that
                 feeds editor content through the engine on every change.
  spellcheck/    Web Worker + client for offline Hunspell-based Catalan spellchecking.
  synonyms/      Client for the offline Catalan thesaurus (a build-time-compiled JSON index).
  storage/       IndexedDB backups/settings and File System Access API wrappers.
  structures/    Static reference data for classic Catalan poetic forms.
  hooks/         React hooks tying documents, settings, and theme state together.
  components/    UI: toolbar, settings/structures panels, synonym/metrics popups.
```

The metrics engine is a heuristic, spelling-based approximation of Catalan phonology. It covers the
general rules well but is not a full linguistic analyzer; its output has been spot-checked against
real published poems rather than formally verified against a reference corpus.

### Data sources

- Spellcheck dictionaries: `dictionary-ca` / `dictionary-ca-valencia` (Hunspell format, npm).
- Synonyms: [Softcatalà's Diccionari de sinònims](https://github.com/Softcatala/sinonims-cat)
  (CC-BY 4.0), compiled into `public/dictionaries/synonyms.json` via `npm run build:synonyms`
  (not run automatically since it requires network access - see below).

## License

Copyright © 2026 Albert Puente Encinas. Lletraferit is licensed under the
[GNU General Public License v3.0 or later](LICENSE). Bundled dictionaries and
synonym data remain subject to their respective licenses.

## Getting started

```sh
npm install
npm run dev             # start the dev server
npm run build           # type-check and build for production
npm run test            # run the engine's unit test suite
npm run lint            # lint TypeScript and TSX source with oxlint
npm run preview         # serve the production build locally
npm run build:synonyms  # optional: (re)generate the synonyms dictionary
```

`npm install` also runs `postinstall`, which copies the bundled Hunspell dictionaries into
`public/dictionaries/`. The synonym build fetches the current Softcatalà source, so it needs network
access; commit its generated JSON and license files when refreshing the bundled data.

## Deployment

Pushes to `main` automatically build and deploy the app to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The workflow installs
dependencies, regenerates the synonyms dictionary, runs the test suite, builds the site
(`vite build`, with `base: '/lletraferit/'` for this project-site path), and publishes
`dist/` — no server or hosting configuration to maintain beyond that.
