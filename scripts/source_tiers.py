#!/usr/bin/env python3
"""Evidentiary tiers for the sources cited in assets/data/cases.json.

The ledger's claim is that every case is citable, but a Supreme Court judgment
and a partisan blog are not the same kind of citable. Tiers make that visible on
the card, and make the thin cases obvious so they can be upgraded.

  Tier 1  Primary record. Court judgments, audits, the gazette, statute text,
          official government or regulator publications, parliamentary records,
          official statistics and peer-reviewed research.
  Tier 2  Independent reporting and documented research. Established news
          organisations, and rights or research bodies that publish their
          method and their evidence.
  Tier 3  Partisan, advocacy, aggregated or user-edited. Useful as a pointer,
          never as proof, and never the only source on a case.

Run `python3 scripts/source_tiers.py` to see how the current ledger is spread.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parent.parent
CASES_PATH = REPO_ROOT / "assets" / "data" / "cases.json"

TIER_NAMES = {
    1: "Primary record",
    2: "Independent reporting",
    3: "Partisan or unverified",
}

# Anything under gov.in or nic.in is treated as a primary record by default; these
# are the non-obvious cases and the non-government primary sources.
TIER_1 = {
    "indiankanoon.org",       # full text of Indian judgments
    "sci.gov.in", "main.sci.gov.in", "digiscr.sci.gov.in",
    "cag.gov.in",             # Comptroller and Auditor General
    "egazette.gov.in", "indiacode.nic.in",
    "rbi.org.in",
    "sansad.in",              # Parliament: questions, debates, committee reports
    "pmc.ncbi.nlm.nih.gov",   # peer-reviewed literature
    "healthdata.org",         # IHME, Global Burden of Disease
    "who.int",
}

TIER_2 = {
    # Indian news
    "thehindu.com", "frontline.thehindu.com", "indianexpress.com",
    "deccanherald.com", "business-standard.com", "livemint.com",
    "economictimes.indiatimes.com", "businesstoday.in", "moneycontrol.com",
    "moneylife.in", "tribuneindia.com", "assamtribune.com", "theweek.in",
    "outlookindia.com", "theprint.in", "thefederal.com", "thenewsminute.com",
    "scroll.in", "thewire.in", "m.thewire.in", "caravanmagazine.in",
    "downtoearth.org.in",
    # Legal reporting
    "livelaw.in", "barandbench.com", "scobserver.in",
    # International news
    "bbc.com", "bbc.co.uk", "news.bbc.co.uk", "feeds.bbci.co.uk",
    "reuters.com", "theguardian.com", "aljazeera.com", "cnn.com",
    "nbcnews.com", "ft.com", "nytimes.com", "thediplomat.com",
    # Rights and research bodies that publish method and evidence
    "amnesty.org", "amnestyusa.org", "hrw.org", "rsf.org",
    "accessnow.org", "energyandcleanair.org", "sflc.in",
}

TIER_3 = {
    "opindia.com", "theswipeup.com", "oneworldnews.com",
    "india.com", "indiatvnews.com", "indianewsnetwork.com",
    "naga.com", "yahoo.com", "news.careers360.com",
    "thekashmirimages.com",
    "en.wikipedia.org", "wikipedia.org",
    "nationalheraldindia.com",  # owned by a party-linked trust
    "cjp.org.in",               # a litigant in several of the cases it reports
}


def domain(url: str) -> str:
    return (urlparse(url).hostname or "").lower().removeprefix("www.")


def classify(url: str) -> int | None:
    """Return the tier for a url, or None when the domain is not yet known."""
    host = domain(url)
    if not host:
        return None
    if host in TIER_3:
        return 3
    if host in TIER_1:
        return 1
    if host in TIER_2:
        return 2
    # PRS hosts the actual bill and act texts as well as its own summaries.
    if host == "prsindia.org":
        return 1 if "/files/bills_acts/" in url else 2
    if host.endswith(".gov.in") or host == "gov.in":
        return 1
    if host.endswith(".nic.in") or host == "nic.in":
        return 1
    return None


def main() -> int:
    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    counts: Counter[str] = Counter()
    unknown: Counter[str] = Counter()
    weakest: list[str] = []

    for case in cases:
        tiers = []
        for source in case.get("sources", []):
            url = source.get("url")
            if not url:
                continue
            tier = source.get("tier") or classify(url)
            if tier is None:
                unknown[domain(url)] += 1
                continue
            counts[f"Tier {tier}"] += 1
            tiers.append(tier)
        if tiers and min(tiers) == 3:
            weakest.append(f"  case {case['no']}: {case['title'][:60]}")

    total = sum(counts.values())
    print(f"{total} sources across {len(cases)} cases")
    for tier in (1, 2, 3):
        key = f"Tier {tier}"
        count = counts[key]
        print(f"  {key} ({TIER_NAMES[tier]}): {count} ({count / max(total, 1):.0%})")

    if weakest:
        print(f"\n{len(weakest)} case(s) rest entirely on tier 3 sources:")
        print("\n".join(weakest))
    if unknown:
        print(f"\n{sum(unknown.values())} source(s) on {len(unknown)} unclassified domain(s):")
        for host, count in unknown.most_common():
            print(f"  {host} ({count})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
