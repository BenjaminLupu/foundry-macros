# Translations

One file per language: `lang/<code>.json`, where `<code>` is the Foundry language code
(`en`, `fr`, `de`, `pt-BR`…). The format is the one Foundry uses for its own `lang` files:
a flat JSON object, `"key": "text"`.

- `en.json` is the reference and the fallback: any text missing from another language is
  shown in English.
- `{name}` in a text is replaced by a value given by the code. Keep the same `{names}` as
  in English (the build fails otherwise).
- Plurals: `key.one` and `key.other` (and `zero`, `two`, `few`, `many` if the language needs
  them) are picked with the plural rules of the language, from the value `n`.
- The language of each player is the language of their Foundry (`game.i18n.lang`); an unknown
  language, or `fr-CA` without a `fr-CA.json`, falls back to its base language then to English.

## Add a language

1. Copy `lang/en.json` to `lang/<code>.json` and translate the values (not the keys).
2. Run `python build/build.py`, then reinstall the macros in Foundry (`install-macros.js`).

`python build/build.py --check` lists the texts that are not translated yet.

## Game terms

Keep the Savage Worlds vocabulary of each language (in French: Jet de trait, Dé Joker,
Prouesse, Réussite, Échec, Difficulté, Modificateur, Jeton; in English: Trait roll, Wild Die,
Raise, Success, Failure, Target Number, Modifier, Benny).
