#!/usr/bin/env python3
"""Sync the Google Fonts <link> across every page's <head> and <helmet>.

Each .dc.html page declares its font URL twice: once in the real <head>,
which is what the browser's initial HTML parse sees before the site's
runtime boots (support.js's helmet manager doesn't take over the document
until then, and this is what a no-JS fetcher or crawler sees too), and
once inside <helmet>, which IS what that runtime reads once it does boot
(see createHelmetManager / helmet.compile in support.js). Both copies are
real and neither can be deleted without either a pre-boot flash of
unstyled text or losing the runtime's own head management — so instead of
hand-editing both spots in every file (which is exactly how the Instrument
Serif and JetBrains Mono mismatches happened), this script is the single
place the font list is declared. Edit SHARED_FAMILIES or PAGE_EXTRAS below,
then run this — never hand-edit a font <link> in a .dc.html file directly.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Every page loads these.
SHARED_FAMILIES = [
    "Poppins:wght@400;500;600;700",
    "Schibsted+Grotesk:wght@400;500;600",
    "Instrument+Serif:ital@0;1",
]

# Per-page additions, layered on top of SHARED_FAMILIES. A page not listed
# here gets exactly SHARED_FAMILIES and nothing else.
PAGE_EXTRAS = {
    "Ayub Leon - Landing Page.dc.html": {
        # the curiosity section's pinned index cards
        "add": ["Gochi+Hand"],
        # landing page's own heading weight needs 700 too
        "override": {"Schibsted+Grotesk": "Schibsted+Grotesk:wght@400;500;600;700"},
    },
}

ALL_PAGES = [
    "Ayub Leon - Landing Page.dc.html",
    "Ayub Leon - Work.dc.html",
    "Ayub Leon - About.dc.html",
    "BuzzIQ.dc.html",
    "Danadana.dc.html",
    "Building a shadcn System from Scratch.dc.html",
    "Kenyan Banking Redesign.dc.html",
]

LINK_RE = re.compile(
    r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">'
)


def family_key(spec):
    return spec.split(":")[0]


def build_url(page_name):
    families = list(SHARED_FAMILIES)
    extras = PAGE_EXTRAS.get(page_name, {})
    overrides = extras.get("override", {})
    if overrides:
        families = [overrides.get(family_key(f), f) for f in families]
    families += extras.get("add", [])
    query = "&amp;".join("family=" + f for f in families) + "&amp;display=swap"
    return '<link href="https://fonts.googleapis.com/css2?' + query + '" rel="stylesheet">'


def sync_file(page_name):
    path = ROOT / page_name
    text = path.read_text()
    canonical = build_url(page_name)
    matches = LINK_RE.findall(text)
    if not matches:
        print(f"SKIP  {page_name}: no font <link> found")
        return
    new_text, count = LINK_RE.subn(canonical, text)
    if count != len(matches):
        print(f"WARN  {page_name}: expected to replace {len(matches)}, replaced {count}")
    changed = any(m != canonical for m in matches)
    path.write_text(new_text)
    status = "synced (was drifted)" if changed else "already in sync"
    print(f"OK    {page_name}: {count} occurrence(s) — {status}")


def main():
    for page_name in ALL_PAGES:
        sync_file(page_name)


if __name__ == "__main__":
    main()
