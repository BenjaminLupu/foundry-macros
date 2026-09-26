# Savage Worlds macros for Foundry VTT

*[Version française](README.fr.md)*

A set of macros for playing **Savage Worlds (SWADE)** on **Foundry VTT**: trait rolls, a dice
palette, private messages between players, and Bennies. Rolls and Bennies are shown as parchment
cards in the chat, in the language of each player (English or French).

The macros are developed with Foundry v14, on The Forge, with the
[SWADE system](https://gitlab.com/peginc/swade).

## Intent

These macros are deliberately **light on assistance and automation**. There is nothing wrong with
automating a game, but I noticed that my players became less creative with the rules, and ended up
knowing them less well, because they had become passive.

The macros aim to reproduce what happens around a real table: rolling the dice, working out the
modifiers by hand, receiving and spending Bennies, passing private notes to each other. The rest of
our way of playing Foundry follows the same idea:

- **Initiative** is handled by the system (dealing the cards).
- We only **move tokens**: we do not pick targets, and we do not let the system decide whether an attack
  hits, roll the damage or apply it.
- We use Foundry's built-in **ping** to point at a place on the screen.
- We use **SimpleFog** instead of Foundry's own fog of war and visibility management.

If you want the opposite, a table where the system does the counting for you, these macros are probably
not what you are looking for.

## What you need

| | |
|---|---|
| Foundry VTT | v13 or v14 |
| System | Savage Worlds Adventure Edition (SWADE) |
| [Macro Runner](https://foundryvtt.com/packages/macro-runner) | Runs `start-session` when the world starts (see [Installation](#installation)) |
| [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice) | Optional: 3D dice, the special effect on a double 1, the Benny animation |

## Installation

1. In Foundry, as Game Master, create a **script** macro and paste the content of
   [`install-macros.js`](install-macros.js) in it. Execute it.
2. Refresh the page (F5).
3. Set up **Macro Runner** so that it runs the `start-session` macro at startup (Macro Runner
   settings, *Global Startup Macros*). The name must be exactly `start-session`.

The installer creates the macros, gives them their icons, and puts them in the hotbar of **every**
user of the world, connected or not:

| Slot | Macro | For |
|:---:|---|---|
| 1 to 5 | Roll 1d4, 1d6, 1d8, 1d10, 1d12 + Wild Die | Everybody |
| 6 | Custom roll (dice palette) | Everybody |
| 7 | Spend a Benny | Everybody |
| 8 | Private message | Everybody |
| 9 | Give Bennies to players | Game Master only |
| | `start-session` (no slot) | Runs at startup |

You can run `install-macros.js` again at any time to update the macros: it never renames a macro you
renamed. To remove everything, execute [`uninstall-macros.js`](uninstall-macros.js). Refresh the page
(F5) after each installation.

> **Tip.** The SWADE system posts its own chat message when a Benny is spent or given. To avoid a
> duplicate of the cards below, turn off the SWADE world setting that notifies Bennies in the chat
> (`notifyBennies`).

## The macros

### Trait rolls (d4 to d12)

One click rolls a **trait die** and the **Wild Die** (a d6), both exploding, and keeps the better one.
The result is a chat card with one line per die (an exploded die shows `8💥 + 3 = 11`).

Under the total, the person who rolled (and the GM) can set a **Modifier** (−6 to +6) and a
**Target Number** (4 by default) with the − and + buttons, then click **Final roll**. The card then shows
the modified dice, **Success** or **Failure** (green or red), and one **raise** for each full 4 points
above the target number. The button becomes **Adjust**, to change the values again.

- A die never goes below 1, whatever the modifier (`5 − 6 → 1`).
- **Double 1**: if both dice show 1, the total is replaced by a 💀 (critical failure). The card cannot be
  adjusted, and Dice So Nice plays its *Dark* effect on the dice.

### Custom roll (dice palette)

A window to build any roll: choose how many dice of each size (d4, d6, d8, d10, d12), and optionally
the **Wild Die**.

- Every die is rolled on its own, with its own line and its own explosions.
- The Wild Die can only be added when there is **one** die (it makes a trait roll, with the card above).
  With several dice, or the Wild Die alone, the roll is a **free roll**: the dice are added up, the
  modifier is added once, and the target number is 0 by default (no result shown until you set one).

### Private message

Send a private message to another connected player (or to the GM). It arrives as a card with a **Reply**
button. The cursor goes straight to the text field, both when writing and when replying. The recipient,
and only the recipient, hears a short sound.

### Spend a Benny

One click spends a Benny of your assigned character (the GM spends the GM's own Bennies) with the SWADE
system: the Benny count, the Dice So Nice animation and the SWADE rules are all handled by the system.
A card tells everybody who spent one and **how many Bennies are left**, in bold when there is one left and
in red when there is none.

If you **own several characters**, a small window asks which character spends the Benny (a character
with no Benny left is greyed out; your assigned character is chosen by default).

### Give Bennies to players (Game Master only)

A window with the avatars of the characters of the **connected players**. Click the characters who get a
Benny, click a player's name to choose all of their characters, or click **All**, then **Give**. Each
chosen character gets one Benny, and one chat card lists who got one.

The characters offered are the ones a connected player **owns** (a player can own several). Give the
players the *Owner* permission on their characters in Foundry.

### `start-session`

Runs when the world starts. It draws the cards of the chat, wires the **Reply** button, registers the
Dice So Nice colors of the dice, and plays the sounds.

## Sounds (experimental)

Two short sounds are installed with the macros, in `worlds/<your world>/macro-sounds/`:

- a **coin** when a character gains a Benny, heard by everybody;
- a **whisper** when a private message arrives, heard by its recipient only.

Each sound has an on/off constant at the top of its block in [`start-session.js`](start-session.js)
(`LUCKY_COIN_SOUND`, `PRIVATE_MESSAGE_SOUND`).

## Dice So Nice

Two things are handled by the macros: the colors of each die size, and the *Dark* effect on a double 1.

## Languages

The cards and windows use the language of each player's Foundry: English (default) or French. The names of
the macros (the tooltips of the hotbar) are fixed when they are created, in the language of the GM who
installs them. To add a language, see [`lang/README.md`](lang/README.md).

## Credits

These macros were written with the help of [Claude Code](https://claude.com/claude-code), Anthropic's
coding assistant, and tested by the author in Foundry.

## For developers

How it all works, and the choices behind it: see the **[developer guide](docs/DEVELOPERS.md)**.

`install-macros.js` and `uninstall-macros.js` are **generated**: do not edit them by hand.

| Folder or file | What it is |
|---|---|
| `trait-roll-d*.js`, `custom-roll.js`, `private-message.js`, `spend-benny.js`, `give-bennies-to-players.js`, `start-session.js` | The macro sources |
| `build/build.py` | The build: the table of macros (slot, icon, GM only), the installer and uninstaller |
| `lang/` | The translations, one JSON file per language |
| `icons/`, `sounds/` | The icons (SVG) and the sounds, embedded in the installer |

After any change, run:

```bash
python build/build.py
```

then run `install-macros.js` in Foundry again and refresh the page. `python build/build.py --check` checks
that the generated files and the embedded icons are up to date. `python build/build.py --dump <folder>`
writes the compiled macros, which is useful for testing them outside Foundry.
