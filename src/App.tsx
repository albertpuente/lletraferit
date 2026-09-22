import { useEffect, useMemo, useRef, useState } from 'react'
import { CatalanEditor } from './editor/CatalanEditor'
import type { CatalanEditorHandle } from './editor/CatalanEditor'
import type { WordClickInfo } from './editor/extensions/wordClick'
import type { MetricsClickInfo } from './editor/extensions/lineInfo'
import { Toolbar } from './components/Toolbar'
import { SettingsPanel } from './components/SettingsPanel'
import { StructuresPanel } from './components/StructuresPanel'
import { AboutPanel } from './components/AboutPanel'
import { SynonymsPopup } from './components/SynonymsPopup'
import { MetricsPopup } from './components/MetricsPopup'
import { useDocument } from './hooks/useDocument'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { usePaperTexture } from './hooks/usePaperTexture'
import { SpellChecker } from './spellcheck/client'
import { getSynonyms, preloadSynonyms } from './synonyms/client'
import type { SynonymResult } from './synonyms/client'
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
  rhymeGroupIndex: number | null
  lineIndex: number
}

function App() {
  const doc = useDocument()
  const { settings, update, loaded } = useSettings()
  const dark = useTheme(settings.theme)
  usePaperTexture(settings.paperTexture)
  const [showSettings, setShowSettings] = useState(false)
  const [showStructures, setShowStructures] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const spellCheckerRef = useRef<SpellChecker | null>(null)
  const [spellChecker, setSpellChecker] = useState<SpellChecker | null>(null)
  const editorHandleRef = useRef<CatalanEditorHandle | null>(null)
  const [popup, setPopup] = useState<SynonymsPopupState | null>(null)
  const [metricsPopup, setMetricsPopup] = useState<MetricsPopupState | null>(null)

  const ignoredWords = useMemo(() => new Set(settings.ignoredWords), [settings.ignoredWords])

  useEffect(() => {
    preloadSynonyms()
  }, [])

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
    setShowStructures(false)
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
      if (e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        doc.saveDocument()
      } else if (e.key === 's' && e.shiftKey) {
        e.preventDefault()
        doc.saveDocumentAs()
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

  return (
    <div className="relative flex h-full flex-col">
      <Toolbar
        name={doc.name}
        onNameChange={doc.setName}
        status={doc.status}
        hasFileHandle={doc.hasFileHandle}
        onNew={doc.newDocument}
        onOpen={doc.openDocument}
        onSave={doc.saveDocument}
        onSaveAs={doc.saveDocumentAs}
        onReconnect={doc.reconnectFile}
        onToggleSettings={() => setShowSettings((v) => !v)}
        onToggleStructures={() => setShowStructures((v) => !v)}
        onToggleAbout={() => setShowAbout((v) => !v)}
      />

      {showSettings && (
        <SettingsPanel settings={settings} onChange={update} onClose={() => setShowSettings(false)} />
      )}

      {showStructures && (
        <StructuresPanel onClose={() => setShowStructures(false)} onLoadExample={handleLoadExample} />
      )}

      {showAbout && <AboutPanel onClose={() => setShowAbout(false)} />}

      <main className="mx-auto w-full max-w-3xl flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8">
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
          handleRef={editorHandleRef}
        />
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
          onClose={() => setMetricsPopup(null)}
        />
      )}
    </div>
  )
}

export default App
