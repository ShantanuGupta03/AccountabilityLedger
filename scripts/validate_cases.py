#!/usr/bin/env python3
"""Validate assets/data/cases.json before it is published.

Run `python3 scripts/validate_cases.py` for a report, or add `--strict` to make
unverified sources (`todo: true`) and missing estimates fail the run too.

A case with `"status": "draft"` is held back by scripts/build.mjs and never
reaches the public site, so it is checked far more leniently. The one rule that
is never relaxed: a case that ships must carry at least one real source URL.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

sys.path.insert(0, str(Path(__file__).resolve().parent))
from source_tiers import classify, domain  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
CASES_PATH = REPO_ROOT / "assets" / "data" / "cases.json"

REQUIRED_FIELDS = (
    "no", "sk", "year", "date", "cat", "sev", "title", "stamp",
    "human", "cost", "what", "dodge", "ministers", "pos", "alt", "sources",
)
OPTIONAL_FIELDS = ("alleg", "estimates", "id", "status", "resignations")

# Cases default to published; drafts are withheld from the build until sourced.
STATUSES = {"draft", "published"}

CATEGORIES = {
    "Consumer harm", "Crony capital (alleged)", "Data denial",
    "Democratic institutions", "Economic shock", "Environment",
    "Exam integrity", "Fund opacity", "National security", "Policy misfire",
    "Public money", "Public safety", "Rights and dissent",
}
SEVERITIES = {"amber", "red"}

# app.js renders these fields as rich text, so only inline emphasis is allowed.
RICH_TEXT_FIELDS = ("human", "cost")
ALLOWED_TAGS = {"b", "em", "i", "strong", "br"}
TAG_RE = re.compile(r"</?([a-zA-Z0-9]+)[^>]*>")
DATE_FORMAT = "%d %b %Y"


class Report:
    """Collects errors and warnings keyed by the case they belong to."""

    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, where: str, message: str) -> None:
        self.errors.append(f"{where}: {message}")

    def warn(self, where: str, message: str) -> None:
        self.warnings.append(f"{where}: {message}")


def is_shipped(case: Any) -> bool:
    """Mirrors the filter in scripts/build.mjs: anything not marked draft goes live."""
    return isinstance(case, dict) and case.get("status", "published") != "draft"


def _label(case: Any, index: int) -> str:
    if isinstance(case, dict) and isinstance(case.get("no"), int):
        title = str(case.get("title", ""))[:48]
        return f"case {case['no']} ({title})"
    return f"record at index {index}"


def _check_tags(report: Report, where: str, field: str, value: str) -> None:
    used = {tag.lower() for tag in TAG_RE.findall(value)}
    for tag in sorted(used - ALLOWED_TAGS):
        report.error(where, f"{field} uses disallowed tag <{tag}>")
    for tag in sorted(used & ALLOWED_TAGS):
        if tag == "br":
            continue
        if value.count(f"<{tag}>") != value.count(f"</{tag}>"):
            report.error(where, f"{field} has unbalanced <{tag}> tags")


def _check_dates(report: Report, where: str, case: dict[str, Any]) -> None:
    """`date` is free-text shown on the card ("Sep 2020", "2014 to 2026");
    `sk` is the YYYYMMDD sort key and is the field that must be machine-valid."""
    date_text, sort_key, year = case.get("date"), case.get("sk"), case.get("year")
    if not isinstance(date_text, str) or not date_text.strip():
        report.error(where, "date must be a non-empty display string")
        date_text = ""

    parsed = None
    if not isinstance(sort_key, int):
        report.error(where, "sk must be an integer of the form YYYYMMDD")
    else:
        try:
            parsed = datetime.strptime(str(sort_key), "%Y%m%d")
        except ValueError:
            report.error(where, f"sk {sort_key} is not a valid YYYYMMDD date")

    if not isinstance(year, int):
        report.error(where, "year must be an integer")
        return
    if not 1947 <= year <= datetime.now().year + 1:
        report.error(where, f"year {year} is outside the plausible range")
    if parsed is not None and parsed.year != year:
        report.error(where, f"sk {sort_key} starts with {parsed.year} but year is {year}")
    if date_text and str(year) not in date_text:
        report.warn(where, f"date {date_text!r} does not mention its year ({year})")


def _check_sources(report: Report, where: str, case: dict[str, Any], strict: bool, shipped: bool) -> None:
    sources = case.get("sources")
    if not isinstance(sources, list) or not sources:
        report.error(where, "sources must be a non-empty list")
        return

    verified = 0
    tiers: list[int] = []
    for position, source in enumerate(sources, start=1):
        at = f"{where} source {position}"
        if not isinstance(source, dict):
            report.error(at, "must be an object")
            continue
        label = source.get("label")
        if not isinstance(label, str) or not label.strip():
            report.error(at, "needs a non-empty label")
        elif len(label) > 60:
            report.warn(at, f"label is {len(label)} chars; keep it under 60")

        url = source.get("url")
        if source.get("todo") is True:
            if url:
                report.error(at, "is marked todo but already has a url; drop the todo flag")
            message = f"{label!r} is unverified (todo: true)"
            if strict and shipped:
                report.error(at, message)
            elif shipped:
                report.warn(at, f"{message}; the build will drop it from the published card")
            continue
        if not isinstance(url, str) or not url.startswith(("http://", "https://")):
            report.error(at, "url must start with http:// or https://")
            continue
        if url.startswith("http://"):
            report.warn(at, "url is plain http; prefer https")
        if "archiveUrl" in source and source["archiveUrl"] is not None:
            archive = source.get("archiveUrl")
            if not isinstance(archive, str) or not archive.startswith(("http://", "https://")):
                report.error(at, "archiveUrl must start with http:// or https://")

        tier = source.get("tier")
        expected = classify(url)
        if tier not in (1, 2, 3):
            report.error(at, "needs a tier of 1, 2 or 3; run scripts/source_tiers.py")
        elif expected is None:
            report.warn(at, f"{domain(url)} is not in the tier map, so its tier is unchecked")
        elif tier != expected:
            report.warn(at, f"is tier {tier} but {domain(url)} classifies as tier {expected}")
        if isinstance(tier, int):
            tiers.append(tier)
        verified += 1

    if verified == 0:
        message = "has no source with a real url; every claim must be citable"
        if shipped:
            report.error(where, f"{message}. Source it, or set \"status\": \"draft\" to hold it back")
        else:
            report.warn(where, f"{message} (draft, so it is not published)")
    elif tiers and min(tiers) == 3 and shipped:
        message = "rests entirely on tier 3 sources; find a court, audit, official or reported source"
        report.error(where, message) if strict else report.warn(where, message)


RESIGNATION_LEVELS = {"union", "state", "official"}


def _check_resignations(report: Report, where: str, case: dict[str, Any]) -> None:
    """Who actually left office over this case.

    The header counts these, so the ledger's claim about how many ministers ever
    resigned is derived from the record rather than asserted. `level` separates
    a Union minister from a state one from a civil servant, because conflating
    them is how a headline number stops being true.
    """
    entries = case.get("resignations")
    if entries is None:
        return
    if not isinstance(entries, list) or not entries:
        report.error(where, "resignations must be a non-empty list when present")
        return
    for position, entry in enumerate(entries, start=1):
        at = f"{where} resignation {position}"
        if not isinstance(entry, dict):
            report.error(at, "must be an object")
            continue
        for key, description in (("n", "name"), ("office", "office held"), ("when", "date text")):
            if not isinstance(entry.get(key), str) or not entry[key].strip():
                report.error(at, f"needs a non-empty {description} ({key!r})")
        if entry.get("level") not in RESIGNATION_LEVELS:
            report.error(at, f"level must be one of {sorted(RESIGNATION_LEVELS)}")
        year = entry.get("year")
        if not isinstance(year, int) or not 1947 <= year <= datetime.now().year + 1:
            report.error(at, "year must be a plausible integer")


def _check_estimates(report: Report, where: str, case: dict[str, Any], strict: bool, shipped: bool) -> None:
    estimates = case.get("estimates")
    if estimates is None:
        if not shipped:
            return
        message = "has no estimates block, so it adds nothing to the header totals"
        report.error(where, message) if strict else report.warn(where, message)
        return
    if not isinstance(estimates, dict):
        report.error(where, "estimates must be an object")
        return
    for key in sorted(set(estimates) - {"costInrCrore", "deaths"}):
        report.error(where, f"estimates has unknown key {key!r}")
    for key in ("costInrCrore", "deaths"):
        if key not in estimates:
            continue
        value = estimates[key]
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            report.error(where, f"estimates.{key} must be a number")
        elif value < 0:
            report.error(where, f"estimates.{key} cannot be negative")


def validate_case(report: Report, case: Any, index: int, strict: bool) -> None:
    where = _label(case, index)
    if not isinstance(case, dict):
        report.error(where, "must be an object")
        return

    for field in REQUIRED_FIELDS:
        if field not in case:
            report.error(where, f"missing required field {field!r}")
    for field in sorted(set(case) - set(REQUIRED_FIELDS) - set(OPTIONAL_FIELDS)):
        report.warn(where, f"unknown field {field!r}")

    shipped = is_shipped(case)
    if case.get("status", "published") not in STATUSES:
        report.error(where, f"status {case.get('status')!r} must be one of {sorted(STATUSES)}")

    if not isinstance(case.get("no"), int) or case.get("no", 0) < 1:
        report.error(where, "no must be a positive integer")
    if case.get("cat") not in CATEGORIES:
        report.error(where, f"cat {case.get('cat')!r} is not one of the known categories")
    if case.get("sev") not in SEVERITIES:
        report.error(where, f"sev must be one of {sorted(SEVERITIES)}")

    for field in ("title", "stamp", "what", "dodge", "pos", "alt"):
        value = case.get(field)
        if not isinstance(value, str) or not value.strip():
            report.error(where, f"{field} must be a non-empty string")
    if isinstance(case.get("title"), str) and len(case["title"]) > 110:
        report.warn(where, f"title is {len(case['title'])} chars; it will crowd the card")

    for field in RICH_TEXT_FIELDS:
        block = case.get(field)
        if not isinstance(block, dict):
            report.error(where, f"{field} must be an object with 'v' and 'est'")
            continue
        if not isinstance(block.get("v"), str) or not block["v"].strip():
            report.error(where, f"{field}.v must be a non-empty string")
        else:
            _check_tags(report, where, field, block["v"])
        if not isinstance(block.get("est"), bool):
            report.error(where, f"{field}.est must be true or false")

    ministers = case.get("ministers")
    if not isinstance(ministers, list) or not ministers:
        report.error(where, "ministers must be a non-empty list")
    else:
        for position, minister in enumerate(ministers, start=1):
            at = f"{where} minister {position}"
            if not isinstance(minister, dict):
                report.error(at, "must be an object")
                continue
            for key, description in (("n", "name"), ("r", "role")):
                if not isinstance(minister.get(key), str) or not minister[key].strip():
                    report.error(at, f"needs a non-empty {description} ({key!r})")

    _check_dates(report, where, case)
    _check_sources(report, where, case, strict, shipped)
    _check_resignations(report, where, case)
    _check_estimates(report, where, case, strict, shipped)


def validate_collection(report: Report, cases: list[Any]) -> None:
    seen_numbers: dict[int, int] = {}
    seen_titles: dict[str, int] = {}
    for index, case in enumerate(cases):
        if not isinstance(case, dict):
            continue
        number = case.get("no")
        if isinstance(number, int):
            if number in seen_numbers:
                report.error(_label(case, index), f"reuses no {number} (also at index {seen_numbers[number]})")
            seen_numbers[number] = index
        title = case.get("title")
        if isinstance(title, str):
            key = title.strip().lower()
            if key in seen_titles:
                report.error(_label(case, index), f"duplicates the title at index {seen_titles[key]}")
            seen_titles[key] = index

    if seen_numbers:
        expected = set(range(1, max(seen_numbers) + 1))
        missing = sorted(expected - set(seen_numbers))
        if missing:
            report.warn("ledger", f"case numbers are not contiguous; missing {missing}")


def totals(cases: list[dict[str, Any]]) -> tuple[float, float]:
    cost = deaths = 0.0
    for case in cases:
        estimates = case.get("estimates") or {}
        for key, add in (("costInrCrore", "cost"), ("deaths", "deaths")):
            value = estimates.get(key)
            if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0:
                if add == "cost":
                    cost += value
                else:
                    deaths += value
    return cost, deaths


def _print(lines: list[str], heading: str) -> None:
    if not lines:
        return
    print(f"\n{heading}")
    for line in lines:
        print(f"  - {line}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", type=Path, default=CASES_PATH, help="path to cases.json")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="also fail on unverified (todo) sources and missing estimates",
    )
    args = parser.parse_args(argv)

    try:
        cases = json.loads(args.path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"cases file not found: {args.path}", file=sys.stderr)
        return 2
    except json.JSONDecodeError as exc:
        print(f"cases.json is not valid JSON: {exc}", file=sys.stderr)
        return 2

    if not isinstance(cases, list):
        print("cases.json must contain a list of case objects", file=sys.stderr)
        return 2

    report = Report()
    for index, case in enumerate(cases):
        validate_case(report, case, index, args.strict)
    validate_collection(report, cases)

    records = [case for case in cases if isinstance(case, dict)]
    shipped = [case for case in records if is_shipped(case)]
    drafts = len(records) - len(shipped)
    quantified = sum(1 for case in shipped if case.get("estimates"))
    cost, deaths = totals(shipped)

    print(f"Checked {len(cases)} cases in {args.path.relative_to(REPO_ROOT)}")
    print(f"Publishing {len(shipped)}, holding back {drafts} draft(s)")
    print(f"Header totals: ~Rs {cost:,.0f} crore, ~{deaths:,.0f} deaths, from {quantified} of {len(shipped)} published cases")

    _print(report.warnings, f"Warnings ({len(report.warnings)})")
    _print(report.errors, f"Errors ({len(report.errors)})")

    if report.errors:
        print(f"\nFAILED with {len(report.errors)} error(s).")
        return 1
    print("\nPASSED." + (f" {len(report.warnings)} warning(s)." if report.warnings else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
