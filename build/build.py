#!/usr/bin/env python3
"""Generates install-macros.js and uninstall-macros.js from the macro sources.

Usage (from anywhere):
    python build/build.py           # regenerate both files
    python build/build.py --check   # exit 1 if a generated file is out of date

Single source of truth: the MACROS table below (key, default name, hotbar slot,
source file, icon) plus the source files themselves (trait-roll-*.js,
custom-roll.js, private-message.js, start-session.js) and icons/*.svg.
Change a macro or the table, run this script, commit the result.

The two generated files are built from build/*.template.js: edit the
templates for anything that is not a macro (installer logic, header comments),
never the generated files.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"

# One entry per macro installed in Foundry, in installation order.
#   key       : technical identifier (flags.world.macroKey) used to find the macro again.
#               Renaming a key orphans the macro already installed in a world.
#   name      : default display name (hotbar tooltip). Only applied when the macro is
#               first created: install-macros.js never renames an existing macro.
#   slot      : hotbar slot (None = no slot)
#   source    : script file, relative to the repository root
#   icon      : SVG file in icons/ (None = no icon)
#   refresh   : True if the Foundry window must be refreshed (F5) after an update
MACROS = [
    {"key": "macro-1d4-joker", "name": "Lancer 1d4+Joker", "slot": 1, "source": "trait-roll-d4.js", "icon": "d4-wild-die.svg", "refresh": False},
    {"key": "macro-1d6-joker", "name": "Lancer 1d6+Joker", "slot": 2, "source": "trait-roll-d6.js", "icon": "d6-wild-die.svg", "refresh": False},
    {"key": "macro-1d8-joker", "name": "Lancer 1d8+Joker", "slot": 3, "source": "trait-roll-d8.js", "icon": "d8-wild-die.svg", "refresh": False},
    {"key": "macro-1d10-joker", "name": "Lancer 1d10+Joker", "slot": 4, "source": "trait-roll-d10.js", "icon": "d10-wild-die.svg", "refresh": False},
    {"key": "macro-1d12-joker", "name": "Lancer 1d12+Joker", "slot": 5, "source": "trait-roll-d12.js", "icon": "d12-wild-die.svg", "refresh": False},
    {"key": "custom-roll", "name": "Lancer personnalisé", "slot": 6, "source": "custom-roll.js", "icon": "custom-roll.svg", "refresh": False},
    {"key": "macro-private-message", "name": "Message privé", "slot": 7, "source": "private-message.js", "icon": "private-message.svg", "refresh": False},
    {"key": "macro-session-start", "name": "start-session", "slot": None, "source": "start-session.js", "icon": None, "refresh": True},
]

OUTPUTS = {
    "install-macros.js": "install-macros.template.js",
    "uninstall-macros.js": "uninstall-macros.template.js",
}


def read_text(path):
    """Reads a source file as UTF-8 with LF line endings, so the output does not
    depend on the checkout's line endings (git may hand out CRLF on Windows)."""
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def js_string(text):
    """JSON string literal (valid JavaScript), with the same escaping style as
    before: <, >, & and ' as \\uXXXX, everything else (accents, emojis) left as is."""
    encoded = json.dumps(text, ensure_ascii=False)
    for char, escape in (("<", "\\u003c"), (">", "\\u003e"), ("&", "\\u0026"), ("'", "\\u0027")):
        encoded = encoded.replace(char, escape)
    return encoded


def macros_block():
    lines = []
    for m in MACROS:
        command = read_text(ROOT / m["source"])
        icon = js_string(read_text(ROOT / "icons" / m["icon"])) if m["icon"] else "null"
        slot = "null" if m["slot"] is None else str(m["slot"])
        lines.append(
            f'  {{ name: {js_string(m["name"])}, macroKey: {js_string(m["key"])}, slot: {slot}, '
            f'command: {js_string(command)}, icon: {icon}, requiresRefresh: {"true" if m["refresh"] else "false"} }},'
        )
    return "\n".join(lines)


def wrap_keys(keys, width=100):
    """Quoted keys separated by commas, wrapped on 2-space indented lines."""
    lines, current = [], "  "
    for i, key in enumerate(keys):
        item = json.dumps(key) + ("," if i < len(keys) - 1 else "")
        if current.strip() and len(current) + len(item) + 1 > width:
            lines.append(current.rstrip())
            current = "  "
        current += item + " "
    lines.append(current.rstrip())
    return "\n".join(lines)


def render(template_name):
    text = read_text(BUILD / template_name)
    slots = [m["slot"] for m in MACROS if m["slot"] is not None]
    replacements = {
        "__MACROS__": macros_block(),
        "__INSTALLED_MACRO_KEYS__": wrap_keys([m["key"] for m in MACROS]),
        "__INSTALLED_SLOTS__": ", ".join(str(m["slot"]) for m in MACROS if m["slot"] is not None),
        "__MACRO_COUNT__": str(len(MACROS)),
        "__SLOT_RANGE__": f"{min(slots)}-{max(slots)}",
    }
    for placeholder, value in replacements.items():
        text = text.replace(placeholder, value)
    return text


# Sources that embed a copy of the die icons (a Foundry macro cannot read icons/*.svg).
# They must stay identical to icons/*.svg: this is checked on every run, so a swapped or
# outdated icon is reported instead of silently shipped.
ICON_SOURCES = ["custom-roll.js", "start-session.js"]
DIE_ICON_FILES = {"4": "d4", "6": "d6", "8": "d8", "10": "d10", "12": "d12"}


def svg_body(name):
    """An icon as embedded in the macros: from the <svg> tag on, without the trailing newline."""
    text = read_text(ROOT / "icons" / f"{name}.svg")
    return text[text.index("<svg"):].rstrip("\n")


def icon_problems():
    problems = []
    for source in ICON_SOURCES:
        text = read_text(ROOT / source)
        embedded = {m.group(1): m.group(2)
                    for m in re.finditer(r"^\s+(\d+): `(<svg.*?</svg>)`,?$", text, re.M | re.S)}
        for faces, name in DIE_ICON_FILES.items():
            if embedded.get(faces) != svg_body(name):
                problems.append(f"{source}: l'icône du d{faces} n'est pas celle de icons/{name}.svg")
        wild = re.search(r"WILD_DIE_ICON_SVG = `(<svg.*?</svg>)`", text, re.S)
        if not wild or wild.group(1) != svg_body("wild-die"):
            problems.append(f"{source}: l'icône du dé sauvage n'est pas celle de icons/wild-die.svg")
    return problems


def main():
    check = "--check" in sys.argv[1:]
    stale = []
    for output, template in OUTPUTS.items():
        expected = render(template)
        target = ROOT / output
        current = read_text(target) if target.exists() else None
        if current == expected:
            print(f"{output}: à jour")
            continue
        if check:
            stale.append(output)
            print(f"{output}: PÉRIMÉ (relancer python build/build.py)")
        else:
            target.write_text(expected, encoding="utf-8", newline="\n")
            print(f"{output}: régénéré")
    problems = icon_problems()
    for problem in problems:
        print(f"ICÔNE DÉSYNCHRONISÉE — {problem}")
    if not problems:
        print("icônes embarquées: identiques à icons/*.svg")
    return 1 if (stale or problems) else 0


if __name__ == "__main__":
    sys.exit(main())
