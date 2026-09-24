import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CatalanEditor } from './editor/CatalanEditor'
import type { CatalanEditorHandle } from './editor/CatalanEditor'
import type { WordClickInfo } from './editor/extensions/wordClick'
import type { MetricsClickInfo } from './editor/extensions/lineInfo'
import { Toolbar } from './components/Toolbar'
import { SettingsPanel } from './components/SettingsPanel'
import { InstructionsPanel } from './components/InstructionsPanel'
import { EstructuresPanel } from './components/EstructuresPanel'
import { PeusPanel } from './components/PeusPanel'
import { ExamplesPanel } from './components/ExamplesPanel'
import { SynonymsPopup } from './components/SynonymsPopup'
import { MetricsPopup } from './components/MetricsPopup'
import { VerseSuggestions } from './components/VerseSuggestions'
import { useDocument } from './hooks/useDocument'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { useVisualTheme } from './hooks/useVisualTheme'
import { useVerseSuggestions } from './hooks/useVerseSuggestions'
import { SpellChecker } from './spellcheck/client'
import { getSynonyms, preloadSynonyms } from './synonyms/client'
import type { SynonymResult } from './synonyms/client'
import { preloadVerseSuggestions } from './suggestions/client'
import { clampPopupPosition, positionPopupNearLine } from './utils/popupPosition'

const SYNONYMS_POPUP_SIZE = { width: 256, height: 288 }
const METRICS_POPUP_SIZE = { width: 288, height: 288 }

interface SynonymsPopupState {
  word: string
  matchedWord: string
  from: number
  to: number
  x: number
  y: number
  loading: boolean
  results: SynonymResult[]
  isUnknown: boolean
}

interface MetricsPopupState {
  x: number
  y: number
  syllableExplanation: string
  rhymeExplanation: string
  feetExplanation: string
  rhymeGroupIndex: number | null
  lineIndex: number
}

function App() {
  const doc = useDocument()
  const { settings, update, loaded } = useSettings()
  const dark = useTheme(settings.theme)
  useVisualTheme(settings.visualTheme)
  const [showSettings, setShowSettings] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showStructures, setShowStructures] = useState(false)
  const [showPeus, setShowPeus] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const spellCheckerRef = useRef<SpellChecker | null>(null)
  const [spellChecker, setSpellChecker] = useState<SpellChecker | null>(null)
  const editorHandleRef = useRef<CatalanEditorHandle | null>(null)
  const [popup, setPopup] = useState<SynonymsPopupState | null>(null)
  const [metricsPopup, setMetricsPopup] = useState<MetricsPopupState | null>(null)
  const [cursorLine, setCursorLine] = useState(0)
  const [cursorPosition, setCursorPosition] = useState<{ left: number; top: number; bottom: number } | null>(null)
  const { suggestions, loading: suggestionsLoading } = useVerseSuggestions(
    doc.content,
    cursorLine,
    settings.verseSuggestionsEnabled,
    settings.variant,
  )

  const ignoredWords = useMemo(() => new Set(settings.ignoredWords), [settings.ignoredWords])
  const handleCursorLineChange = useCallback((lineIndex: number) => setCursorLine(lineIndex), [])

  useEffect(() => {
    preloadSynonyms()
  }, [])

  useEffect(() => {
    preloadVerseSuggestions(settings.variant)
  }, [settings.variant])

  async function handleWordClick(info: WordClickInfo) {
    const { word, from, to, clientX, clientY, isUnknown } = info
    const { x, y } = clampPopupPosition(clientX, clientY, SYNONYMS_POPUP_SIZE.width, SYNONYMS_POPUP_SIZE.height)
    setPopup({ word, matchedWord: word, from, to, x, y, loading: true, results: [], isUnknown })
    const { matchedWord, results } = await getSynonyms(word)
    setPopup((current) =>
      current && current.from === from ? { ...current, matchedWord, loading: false, results } : current,
    )
  }

  function handleMetricsClick(info: MetricsClickInfo) {
    const { x, y } = positionPopupNearLine(
      info.lineLeft,
      info.lineTop,
      info.lineBottom,
      METRICS_POPUP_SIZE.width,
      METRICS_POPUP_SIZE.height,
    )
    setMetricsPopup({
      x,
      y,
      syllableExplanation: info.syllableExplanation,
      rhymeExplanation: info.rhymeExplanation,
      feetExplanation: info.feetExplanation,
      rhymeGroupIndex: info.rhymeGroupIndex,
      lineIndex: info.lineIndex,
    })
  }

  function handleSelectSynonym(synonym: string) {
    if (!popup) return
    editorHandleRef.current?.replaceRange(popup.from, popup.to, synonym)
    setPopup(null)
  }

  function handleIgnoreWord(word: string) {
    const key = word.toLowerCase()
    if (settings.ignoredWords.includes(key)) return
    update({ ignoredWords: [...settings.ignoredWords, key] })
    setPopup(null)
  }

  function handleLoadExample(title: string, content: string) {
    doc.setName(`${title}.txt`)
    doc.setContent(content)
    setShowInstructions(false)
    setShowStructures(false)
    setShowPeus(false)
    setShowExamples(false)
  }

  // Create the spellcheck worker once settings are loaded, and reload the
  // dictionary whenever the Catalan variant changes.
  useEffect(() => {
    if (!loaded) return
    if (!spellCheckerRef.current) {
      spellCheckerRef.current = new SpellChecker(settings.variant)
      setSpellChecker(spellCheckerRef.current)
    } else {
      spellCheckerRef.current.load(settings.variant)
    }
  }, [loaded, settings.variant])

  useEffect(() => {
    return () => spellCheckerRef.current?.dispose()
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 's') {
        e.preventDefault()
        doc.saveDocument()
      } else if (e.key === 'o') {
        e.preventDefault()
        doc.openDocument()
      } else if (e.key === 'n') {
        e.preventDefault()
        doc.newDocument()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [doc])

  async function handleCopy() {
    await navigator.clipboard.writeText(doc.content)
  }

  return (
    <div className="relative flex h-full flex-col">
      <Toolbar
        name={doc.name}
        isDirty={doc.isDirty}
        status={doc.status}
        errorMessage={doc.errorMessage}
        hasFileHandle={doc.hasFileHandle}
        onNew={doc.newDocument}
        onOpen={doc.openDocument}
        onSave={doc.saveDocument}
        onCopy={handleCopy}
        onToggleSettings={() => {
          setShowSettings((v) => !v)
          setShowInstructions(false)
          setShowStructures(false)
          setShowPeus(false)
          setShowExamples(false)
          setPopup(null)
          setMetricsPopup(null)
        }}
        onToggleInstructions={() => {
          setShowInstructions((v) => !v)
          setShowStructures(false)
          setShowPeus(false)
          setShowExamples(false)
        }}
        onToggleStructures={() => {
          setShowStructures((v) => !v)
          setShowInstructions(false)
          setShowPeus(false)
          setShowExamples(false)
        }}
        onTogglePeus={() => {
          setShowPeus((v) => !v)
          setShowInstructions(false)
          setShowStructures(false)
          setShowExamples(false)
        }}
        onToggleExamples={() => {
          setShowExamples((v) => !v)
          setShowInstructions(false)
          setShowStructures(false)
          setShowPeus(false)
        }}
      />

      {showSettings && (
        <SettingsPanel settings={settings} onChange={update} onClose={() => setShowSettings(false)} />
      )}

      {showInstructions && (
        <InstructionsPanel
          onClose={() => setShowInstructions(false)}
          showAllSyllableCurves={settings.showAllSyllableCurves}
          onToggleShowAllSyllableCurves={(v) => update({ showAllSyllableCurves: v })}
        />
      )}

      {showStructures && <EstructuresPanel onClose={() => setShowStructures(false)} />}

      {showPeus && (
        <PeusPanel
          onClose={() => setShowPeus(false)}
          showAllStressDots={settings.showAllStressDots}
          onToggleShowAllStressDots={(v) => update({ showAllStressDots: v })}
        />
      )}

      {showExamples && <ExamplesPanel onClose={() => setShowExamples(false)} onLoadExample={handleLoadExample} />}

      <main className="relative w-full flex-1 overflow-auto">
        <div className="mx-auto min-h-full w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <CatalanEditor
            value={doc.content}
            onChange={doc.setContent}
            spellChecker={settings.spellcheckEnabled ? spellChecker : null}
            dark={dark}
            variant={settings.variant}
            fontSize={settings.fontSize}
            ignoredWords={ignoredWords}
            onWordClick={handleWordClick}
            onMetricsClick={handleMetricsClick}
            highlightedRhymeGroup={metricsPopup?.rhymeGroupIndex ?? null}
            activeMetricsLine={metricsPopup?.lineIndex ?? null}
            showAllSyllableCurves={settings.showAllSyllableCurves}
            showFootBoundaries={settings.showFootBoundaries}
            showAllStressDots={settings.showAllStressDots}
            onCursorLineChange={handleCursorLineChange}
            onCursorPositionChange={setCursorPosition}
            handleRef={editorHandleRef}
          />
        </div>
      </main>

      {popup && (
        <SynonymsPopup
          word={popup.word}
          matchedWord={popup.matchedWord}
          x={popup.x}
          y={popup.y}
          loading={popup.loading}
          results={popup.results}
          isUnknown={popup.isUnknown}
          onSelect={handleSelectSynonym}
          onIgnoreWord={handleIgnoreWord}
          onClose={() => setPopup(null)}
        />
      )}

      {metricsPopup && (
        <MetricsPopup
          x={metricsPopup.x}
          y={metricsPopup.y}
          syllableExplanation={metricsPopup.syllableExplanation}
          rhymeExplanation={metricsPopup.rhymeExplanation}
          feetExplanation={metricsPopup.feetExplanation}
          onClose={() => setMetricsPopup(null)}
        />
      )}

      <VerseSuggestions
        suggestions={suggestions}
        loading={suggestionsLoading}
        cursorPosition={cursorPosition}
        onSelect={(suggestion) => editorHandleRef.current?.insertAtCursor(suggestion.word, suggestion.replacePrefix)}
      />
    </div>
  )
}

export default App
