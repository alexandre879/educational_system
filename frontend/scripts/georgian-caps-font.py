"""
Builds public/fonts/georgian-caps.woff2: Noto Sans Georgian with everyday Georgian letters
(Mkhedruli) drawn as capitals (Mtavruli).

The website uses it to show headings, menus, buttons and labels in Mtavruli without changing the
text itself (copying, search and screen readers still get ordinary Georgian). globals.css also
uses it as the fallback for real Mtavruli letters on devices whose own fonts lack them.

Run it again only to update the font:
    python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli
    curl -A "Mozilla/5.0 Chrome/130" "https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@100..900"
        -> download the woff2 listed under /* georgian */
    /tmp/fontenv/bin/python scripts/georgian-caps-font.py noto-sans-georgian.woff2

Noto Sans Georgian is under the SIL Open Font License 1.1 (public/fonts/OFL.txt), which allows
modified copies under a different name; this one is called "Georgian Caps".
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FAMILY = "Georgian Caps"
OUT = Path(__file__).resolve().parent.parent / "public" / "fonts" / "georgian-caps.woff2"

# Mkhedruli letters and their Mtavruli capitals sit exactly 0xBC0 apart.
TO_MTAVRULI = 0x1C90 - 0x10D0
MKHEDRULI = [*range(0x10D0, 0x10FB), *range(0x10FD, 0x1100)]  # 0x10FB and 0x10FC have no capital
MTAVRULI = [code + TO_MTAVRULI for code in MKHEDRULI]


def build(source: str) -> None:
    font = TTFont(source)

    # Keep only the Georgian letters; the rest of the text falls through to the normal font stack.
    options = subset.Options()
    options.flavor = None
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=MKHEDRULI + MTAVRULI)
    subsetter.subset(font)

    # Point each everyday letter at its capital's drawing.
    for table in font["cmap"].tables:
        if not table.isUnicode():
            continue
        for small, capital in zip(MKHEDRULI, MTAVRULI):
            if capital in table.cmap:
                table.cmap[small] = table.cmap[capital]

    # A new name, as the font licence asks of modified copies.
    names = font["name"]
    for record in list(names.names):
        if record.nameID in (1, 3, 4, 6, 16, 17, 21, 22, 25):
            names.removeNames(nameID=record.nameID)
    names.setName(FAMILY, 1, 3, 1, 0x409)
    names.setName("Regular", 2, 3, 1, 0x409)
    names.setName(f"{FAMILY} Regular", 3, 3, 1, 0x409)
    names.setName(f"{FAMILY} Regular", 4, 3, 1, 0x409)
    names.setName("GeorgianCaps-Regular", 6, 3, 1, 0x409)
    names.setName("GeorgianCaps", 25, 3, 1, 0x409)  # variable-font instance names start from this
    names.setName(
        "Modified from Noto Sans Georgian: everyday Georgian letters (Mkhedruli) use the capital "
        "(Mtavruli) drawings.",
        10, 3, 1, 0x409,
    )
    names.setName("This Font Software is licensed under the SIL Open Font License, Version 1.1.", 13, 3, 1, 0x409)
    names.setName("https://openfontlicense.org", 14, 3, 1, 0x409)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(OUT)

    check = TTFont(OUT).getBestCmap()
    assert all(check[small] == check[capital] for small, capital in zip(MKHEDRULI, MTAVRULI))
    print(f"{OUT} ({OUT.stat().st_size // 1024} KB), {len(MKHEDRULI)} letters drawn as capitals")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: georgian-caps-font.py <Noto Sans Georgian .woff2 or .ttf>")
    build(sys.argv[1])
