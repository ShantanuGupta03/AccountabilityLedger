#!/usr/bin/env python3
"""Write evidentiary tiers onto every source in assets/data/cases.json."""

from __future__ import annotations

import json
from pathlib import Path

from source_tiers import CASES_PATH, classify

cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
updated = 0

for case in cases:
    for source in case.get("sources", []):
        url = source.get("url")
        if not url or source.get("todo"):
            continue
        tier = classify(url)
        if tier is None:
            continue
        if source.get("tier") != tier:
            source["tier"] = tier
            updated += 1

CASES_PATH.write_text(f"{json.dumps(cases, ensure_ascii=False, indent=2)}\n", encoding="utf-8")
print(f"Stamped tiers on {updated} source(s) in {CASES_PATH.relative_to(CASES_PATH.parent.parent)}")
