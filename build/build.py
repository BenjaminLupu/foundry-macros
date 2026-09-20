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

Each generated file starts with "Generated on dd/mm/yyyy hh:mm:ss" (local time).
That time is the last time the file actually changed: an up-to-date file is left
untouched, so running the script again does not rewrite it, and --check ignores
the timestamp.

Translations: the texts live in lang/<code>.json (see lang/README.md). The sources
call t("key", {values}); the build puts, at the top of each macro, the texts that
macro uses and the t() function, so the macros need nothing else in Foundry. The
macros that install-macros.js does not install (STANDALONE) are written, translated,
in dist/ to be pasted by hand. Every run checks the translations: an unknown or
non-literal key, or a {value} that differs from English, is an error; a text missing
from a language is a warning (English is used).

    python build/build.py --dump DIR   # write what is installed for each macro in DIR (tests)
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"

# One entry per macro installed in Foundry, in installation order.
#   key       : technical identifier (flags.world.macroKey) used to find the macro again.
#               Renaming a key orphans the macro already installed in a world.
#   name      : default display name (hotbar tooltip), translated when the macro is first
#               created (in the language of the GM who installs): a translation key from
#               lang/*.json, given as (key, values), or a plain string for a name that is
#               never translated. Only applied when the macro is first created:
#               install-macros.js never renames an existing macro.
#   slot      : hotbar slot (None = no slot)
#   source    : script file, relative to the repository root
#   icon      : SVG file in icons/ (None = no icon)
#   refresh   : True if the Foundry window must be refreshed (F5) after an update
MACROS = [
    {"key": "macro-1d4-joker", "name": ("macro.trait_roll", {"die": 4}), "slot": 1, "source": "trait-roll-d4.js", "icon": "d4-wild-die.svg", "refresh": False},
    {"key": "macro-1d6-joker", "name": ("macro.trait_roll", {"die": 6}), "slot": 2, "source": "trait-roll-d6.js", "icon": "d6-wild-die.svg", "refresh": False},
    {"key": "macro-1d8-joker", "name": ("macro.trait_roll", {"die": 8}), "slot": 3, "source": "trait-roll-d8.js", "icon": "d8-wild-die.svg", "refresh": False},
    {"key": "macro-1d10-joker", "name": ("macro.trait_roll", {"die": 10}), "slot": 4, "source": "trait-roll-d10.js", "icon": "d10-wild-die.svg", "refresh": False},
    {"key": "macro-1d12-joker", "name": ("macro.trait_roll", {"die": 12}), "slot": 5, "source": "trait-roll-d12.js", "icon": "d12-wild-die.svg", "refresh": False},
    {"key": "custom-roll", "name": ("macro.custom_roll", {}), "slot": 6, "source": "custom-roll.js", "icon": "custom-roll.svg", "refresh": False},
    {"key": "macro-private-message", "name": ("macro.private_message", {}), "slot": 7, "source": "private-message.js", "icon": "private-message.svg", "refresh": False},
    {"key": "macro-session-start", "name": "start-session", "slot": None, "source": "start-session.js", "icon": None, "refresh": True},
]

OUTPUTS = {
    "install-macros.js": "install-macros.template.js",
    "uninstall-macros.js": "uninstall-macros.template.js",
}

# Macros that are not installed by install-macros.js (they are pasted by hand into Foundry): the
# build writes a ready-to-paste copy, with its translations, in dist/.
STANDALONE = ["give-a-benny-to-connected-players.js"]

# --- Translations ---------------------------------------------------------------------------
# lang/<code>.json: flat {"key": "text"} files, the same format as Foundry's own lang files
# ({name} is replaced by a value; "key.one" / "key.other" are the plural forms picked with
# Intl.PluralRules). lang/en.json is the reference and the fallback.
# The sources call t("key", {values}) with the key written out in full; the build finds those
# calls and puts, at the top of every macro, the texts that macro uses and the small t() function.
LANG_DIR = ROOT / "lang"
DEFAULT_LANGUAGE = "en"
PLURAL_CATEGORIES = ("zero", "one", "two", "few", "many", "other")
T_CALL_RE = re.compile(r"""(?<![\w.$])t\(\s*(["'])([\w.]+)\1""")
T_ANY_CALL_RE = re.compile(r"(?<![\w.$])t\(")
PLACEHOLDER_RE = re.compile(r"\{(\w+)\}")


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


def load_languages():
    """{code: {key: text}} from lang/*.json (the file name is the language code)."""
    languages = {}
    for path in sorted(LANG_DIR.glob("*.json")):
        languages[path.stem] = json.loads(path.read_text(encoding="utf-8"))
    return languages


def used_keys(text):
    """The translation keys a source asks for with t("key", ...)."""
    return {m.group(2) for m in T_CALL_RE.finditer(text)}


def is_plural_variant(key, wanted):
    base, _, category = key.rpartition(".")
    return category in PLURAL_CATEGORIES and base in wanted


# The t() function put at the top of every macro. It picks the language of Foundry
# (game.i18n.lang, chosen by each client), then its base language ("fr-CA" -> "fr"), then
# English; a key found nowhere is returned as is, so a missing text is visible.
I18N_FUNCTION = r"""const t = (key, vars = {}) => {
  const lang = String(game.i18n?.lang ?? "en");
  for (const code of [lang, lang.split("-")[0], "en"]) {
    const table = I18N_TEXTS[code];
    if (!table) continue;
    let text = table[key];
    if (text === undefined && vars.n !== undefined) {
      text = table[`${key}.${new Intl.PluralRules(code).select(vars.n)}`] ?? table[`${key}.other`];
    }
    if (text !== undefined) return text.replace(/\{(\w+)\}/g, (match, name) => name in vars ? String(vars[name]) : match);
  }
  return key;
};"""


def i18n_prelude(keys):
    """The translations of `keys` (every language) and the t() function, as JavaScript."""
    if not keys:
        return ""
    wanted = set(keys)
    tables = {}
    for code, table in load_languages().items():
        subset = {k: v for k, v in table.items() if k in wanted or is_plural_variant(k, wanted)}
        if subset:
            tables[code] = dict(sorted(subset.items()))
    body = ",\n".join(f"  {json.dumps(code)}: {json.dumps(table, ensure_ascii=False)}" for code, table in tables.items())
    return (
        "// ---- Translations: generated by build/build.py from lang/*.json, do not edit ----\n"
        f"const I18N_TEXTS = {{\n{body}\n}};\n{I18N_FUNCTION}\n"
        "// ---- End of translations ----\n"
    )


def macro_command(source):
    """What is installed in Foundry for a macro: its translations, then its source."""
    text = read_text(ROOT / source)
    return i18n_prelude(used_keys(text)) + text


def name_expression(name):
    """JavaScript for a macro's default name: a call to t() (translated when the macro is
    created), or a plain string that is never translated."""
    if isinstance(name, str):
        return js_string(name)
    key, values = name
    return f"t({js_string(key)}, {json.dumps(values)})"


def name_keys():
    return {m["name"][0] for m in MACROS if not isinstance(m["name"], str)}


def macros_block():
    lines = []
    for m in MACROS:
        command = macro_command(m["source"])
        icon = js_string(read_text(ROOT / "icons" / m["icon"])) if m["icon"] else "null"
        slot = "null" if m["slot"] is None else str(m["slot"])
        lines.append(
            f'  {{ name: {name_expression(m["name"])}, macroKey: {js_string(m["key"])}, slot: {slot}, '
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
    # The translations the template itself uses, plus the macro names (installer only)
    keys = used_keys(text) | (name_keys() if "__MACROS__" in text else set())
    slots = [m["slot"] for m in MACROS if m["slot"] is not None]
    replacements = {
        "__I18N__": i18n_prelude(keys).rstrip("\n"),
        "__MACROS__": macros_block(),
        "__INSTALLED_MACRO_KEYS__": wrap_keys([m["key"] for m in MACROS]),
        "__INSTALLED_SLOTS__": ", ".join(str(m["slot"]) for m in MACROS if m["slot"] is not None),
        "__MACRO_COUNT__": str(len(MACROS)),
        "__SLOT_RANGE__": f"{min(slots)}-{max(slots)}",
    }
    for placeholder, value in replacements.items():
        text = text.replace(placeholder, value)
    return text


STANDALONE_BANNER = (
    "/* Generated on __GENERATED_AT__\n"
    "   GENERATED FILE: do not edit. Edit {source} (or lang/*.json), then run: python build/build.py */\n\n"
)


def render_standalone(source):
    """A macro that is pasted by hand into Foundry: its source with its translations."""
    return STANDALONE_BANNER.format(source=source) + macro_command(source)


def expected_outputs():
    """Every generated file (path relative to the repository root -> content)."""
    outputs = {name: render(template) for name, template in OUTPUTS.items()}
    for source in STANDALONE:
        outputs[f"dist/{source}"] = render_standalone(source)
    return outputs


def dump_commands(directory):
    """Writes what is installed in Foundry for every macro (translations + source) in a folder,
    to test the macros as they run."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    for source in [m["source"] for m in MACROS] + STANDALONE:
        (directory / source).write_text(macro_command(source), encoding="utf-8", newline="\n")
        print(f"{directory / source}")


def i18n_problems():
    """(errors, warnings) about the translations. Errors make the build fail."""
    errors, warnings = [], []
    try:
        languages = load_languages()
    except (OSError, ValueError) as error:
        return [f"lang/*.json illisible : {error}"], []
    reference = languages.get(DEFAULT_LANGUAGE)
    if reference is None:
        return [f"lang/{DEFAULT_LANGUAGE}.json est introuvable"], []

    sources = [(s, read_text(ROOT / s)) for s in [m["source"] for m in MACROS] + STANDALONE]
    sources += [(f"build/{template}", read_text(BUILD / template)) for template in OUTPUTS.values()]
    used = set(name_keys())
    for label, text in sources:
        literal = {m.start() for m in T_CALL_RE.finditer(text)}
        for m in T_ANY_CALL_RE.finditer(text):
            if m.start() not in literal:
                errors.append(f"{label}: appel t() dont la clé n'est pas écrite en toutes lettres")
        used |= used_keys(text)

    def known(key):
        return key in reference or any(f"{key}.{category}" in reference for category in PLURAL_CATEGORIES)

    for key in sorted(used):
        if not known(key):
            errors.append(f'clé "{key}" utilisée dans le code mais absente de lang/{DEFAULT_LANGUAGE}.json')
    for code, table in languages.items():
        if code == DEFAULT_LANGUAGE:
            continue
        for key in sorted(set(reference) - set(table)):
            warnings.append(f'lang/{code}.json : "{key}" n\'est pas traduit (l\'anglais sera utilisé)')
        for key in sorted(set(table) - set(reference)):
            warnings.append(f'lang/{code}.json : "{key}" n\'existe pas dans lang/{DEFAULT_LANGUAGE}.json')
        for key in sorted(set(reference) & set(table)):
            if set(PLACEHOLDER_RE.findall(reference[key])) != set(PLACEHOLDER_RE.findall(table[key])):
                errors.append(f'lang/{code}.json : "{key}" n\'a pas les mêmes {{valeurs}} que l\'anglais')
    for key in sorted(reference):
        base, _, category = key.rpartition(".")
        if key not in used and not (category in PLURAL_CATEGORIES and base in used):
            warnings.append(f'lang/{DEFAULT_LANGUAGE}.json : "{key}" n\'est utilisée nulle part')
    return errors, warnings


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


# Generation timestamp in the header comment of the generated files: "dd/mm/yyyy hh:mm:ss".
# render() leaves the placeholder in place; it is only filled in when a file is written.
TIMESTAMP_PLACEHOLDER = "__GENERATED_AT__"
TIMESTAMP_RE = re.compile(r"(Generated on )\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}")


def without_timestamp(text):
    """A generated file with its timestamp replaced by the placeholder, to compare it with render()."""
    return TIMESTAMP_RE.sub(r"\g<1>" + TIMESTAMP_PLACEHOLDER, text, count=1)


def main():
    args = sys.argv[1:]
    if "--dump" in args:
        dump_commands(args[args.index("--dump") + 1])
        return 0
    check = "--check" in args
    stale = []
    for output, expected in expected_outputs().items():
        target = ROOT / output
        current = read_text(target) if target.exists() else None
        if current is not None and without_timestamp(current) == expected:
            print(f"{output}: à jour")
            continue
        if check:
            stale.append(output)
            print(f"{output}: PÉRIMÉ (relancer python build/build.py)")
        else:
            generated_at = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(expected.replace(TIMESTAMP_PLACEHOLDER, generated_at), encoding="utf-8", newline="\n")
            print(f"{output}: régénéré ({generated_at})")
    problems = icon_problems()
    for problem in problems:
        print(f"ICÔNE DÉSYNCHRONISÉE — {problem}")
    if not problems:
        print("icônes embarquées: identiques à icons/*.svg")
    errors, warnings = i18n_problems()
    for error in errors:
        print(f"TRADUCTION — ERREUR : {error}")
    for warning in warnings:
        print(f"traduction — avertissement : {warning}")
    if not errors and not warnings:
        print("traductions: complètes")
    return 1 if (stale or problems or errors) else 0


if __name__ == "__main__":
    sys.exit(main())
