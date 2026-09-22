import { useRef } from 'react'
import { POEM_STRUCTURES } from '../structures/definitions'
import type { StructureVerse } from '../structures/definitions'
import { EXAMPLE_POEMS } from '../structures/examples'
import { verseTypeName } from '../engine'
import { useClickOutside } from '../hooks/useClickOutside'

export interface StructuresPanelProps {
  onClose: () => void
  onLoadExample: (title: string, content: string) => void
}

function VerseBadge({ verse }: { verse: StructureVerse }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600 dark:bg-neutral-800 dark:text-neutral-300"
      title={verseTypeName(verse.syllables)}
    >
      <span className="font-medium tabular-nums">{verse.syllables}</span>
      {verse.rhyme && <span className="text-violet-500 dark:text-violet-400">{verse.rhyme}</span>}
    </span>
  )
}

export function StructuresPanel({ onClose, onLoadExample }: StructuresPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <div
      ref={ref}
      className="absolute right-2 left-2 top-14 z-10 max-h-[75vh] overflow-auto rounded-lg border border-stone-200 bg-[#f8f5ee] p-4 shadow-lg sm:left-auto sm:right-4 sm:w-96 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-900 dark:text-neutral-100">Estructures</h2>
        <button
          className="touch-manipulation p-1 text-stone-400 hover:text-stone-700 dark:hover:text-neutral-200"
          onClick={onClose}
          aria-label="Tanca"
        >
          ✕
        </button>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        Suggeriments clàssics de mètrica i rima. El nombre indica les síl·labes del vers; la lletra, el
        grup de rima (versos sense lletra són versos blancs). Una lletra{' '}
        <span className="font-semibold text-stone-500 dark:text-neutral-400">majúscula</span> indica un
        vers d'art major (més de 8 síl·labes); una{' '}
        <span className="text-stone-500 dark:text-neutral-400">minúscula</span>, un vers d'art menor (8
        síl·labes o menys), tal com es mostra a l'editor. Clica el nombre o la lletra a l'editor per
        veure'n el detall.
      </p>

      <p className="mb-4 text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        Un apòstrof després de la lletra (per exemple{' '}
        <span className="font-medium text-stone-500 dark:text-neutral-400">a'</span> en comptes de{' '}
        <span className="font-medium text-stone-500 dark:text-neutral-400">a</span>) indica que la
        paraula final d'aquest vers és plana (rima femenina); sense apòstrof, el vers acaba en una
        paraula aguda o esdrúixola (rima masculina). És la convenció clàssica per distingir totes dues
        terminacions dins un mateix esquema de rima.
      </p>

      <div className="mb-4">
        <h3 className="mb-2 text-sm font-medium text-stone-800 dark:text-neutral-200">Exemples</h3>
        <p className="mb-2 text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
          Carrega un poema real a l'editor per veure com se n'analitzen les síl·labes i la rima.
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLE_POEMS.map((example) => (
            <button
              key={example.id}
              className="touch-manipulation rounded-md border border-stone-200 bg-white px-3 py-2 text-left hover:bg-stone-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              onClick={() => onLoadExample(example.title, example.content)}
            >
              <div className="text-sm font-medium text-stone-800 dark:text-neutral-200">{example.title}</div>
              <div className="text-[11px] text-stone-400 dark:text-neutral-500">{example.attribution}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {POEM_STRUCTURES.map((structure) => (
          <div key={structure.id} className="border-t border-stone-100 pt-3 first:border-t-0 first:pt-0 dark:border-neutral-800">
            <h3 className="text-sm font-medium text-stone-800 dark:text-neutral-200">{structure.name}</h3>
            <p className="mt-0.5 mb-2 text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
              {structure.description}
            </p>
            <div className="flex flex-col gap-1">
              {structure.stanzas.map((stanza, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1">
                  {stanza.verses.map((verse, j) => (
                    <VerseBadge key={j} verse={verse} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

