#!/usr/bin/env python3
"""Compile verbecc's Catalan conjugations into a browser-friendly word list.

Set VERBECC_PATH to a checkout of the pinned verbecc source, then run this
script with the Python environment that provides verbecc's dependencies.
"""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_PATH = Path(os.environ.get("VERBECC_PATH", ""))
OUTPUT_PATH = ROOT / "public" / "dictionaries" / "verbs.json"


def bare_form(entry: dict) -> str | None:
    """Return a conjugation without its subject pronoun, or reject a phrase."""
    forms = entry.get("c", [])
    if len(forms) != 1:
        return None

    form = forms[0].strip().lower()
    pronoun = entry.get("pr")
    pronoun_value = getattr(pronoun, "value", None)
    if pronoun_value:
        prefix = f"{pronoun_value} "
        if not form.startswith(prefix):
            return None
        form = form.removeprefix(prefix)

    return form if form and " " not in form else None


def main() -> None:
    if not SOURCE_PATH.is_dir():
        raise SystemExit("Set VERBECC_PATH to a local verbecc source checkout.")

    sys.path.insert(0, str(SOURCE_PATH))
    from verbecc.src.conjugator.complete_conjugator import CompleteConjugator
    from verbecc.src.defs.types.lang_code import LangCodeISO639_1 as Lang

    conjugator = CompleteConjugator(Lang.ca)
    forms: set[str] = set()
    for verb in conjugator.get_verbs():
        infinitive = verb.infinitive
        conjugation = conjugator.conjugate(infinitive).get_data()
        for tenses in conjugation["moods"].values():
            for entries in tenses.values():
                for entry in entries:
                    form = bare_form(entry)
                    if form:
                        forms.add(form)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({"version": 1, "forms": sorted(forms)}, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"[build-verbs] Wrote {len(forms)} single-word forms to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()