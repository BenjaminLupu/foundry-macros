# Developer guide

*[Version française](DEVELOPERS.fr.md)* · *[Back to the README](../README.md)*

How the macros work, and why they are built this way. Read the [README](../README.md) first: it explains
what the macros do and the intent behind them (little automation, a table that stays active).

- [Overview](#overview)
- [The build](#the-build)
- [Translations](#translations)
- [Chat cards](#chat-cards)
- [Design choices](#design-choices)
- [Testing](#testing)
- [Known limits](#known-limits)

## Overview

| File | Role |
|---|---|
| `trait-roll-d4.js` … `trait-roll-d12.js` | Roll a trait die and the Wild Die, then post the result as data |
| `custom-roll.js` | The dice palette: the same kinds of rolls, with any dice |
| `private-message.js` | Private messages between players |
| `spend-benny.js` | Spends a Benny (a palette if the player owns several characters) |
| `give-bennies-to-players.js` | Game Master only: gives Bennies to characters |
| `start-session.js` | Runs at startup: draws the cards, wires the buttons, Dice So Nice colors, sounds |
| `install-macros.js`, `uninstall-macros.js` | **Generated**: install and remove everything in one click |
| `build/` | The build script and the templates of the two generated files |
| `lang/` | The translations |
| `icons/`, `sounds/` | The icons (SVG) and the sounds, embedded in the installer |

The macros are plain Foundry **script macros**: no module of our own, nothing to install on the server. A
Game Master pastes `install-macros.js` in a macro and runs it. Everything else lives in the world's
macros.

The main idea: **the macros that roll or post do not draw anything**. They store *what happened* in the
flags of a chat message, and `start-session.js` draws the card from those flags, on every client, every
time the message is rendered. That is what makes a card adjustable afterwards, and translatable in the
language of each reader (see [Chat cards](#chat-cards)).

## The build

`python build/build.py` generates `install-macros.js` and `uninstall-macros.js`. **Never edit them by
hand**: edit the sources, the `MACROS` table, or the templates in `build/*.template.js`, then run the build.

**Why a build at all?** A Foundry macro is one self-contained script stored in the world: it cannot import
another file or read the local disk. So the installer has to *contain* the code of every macro, their
icons and their sounds, as strings. Doing this by hand was error-prone, hence the script.

### The `MACROS` table

One entry per installed macro (`build/build.py`):

- `key`: technical identifier, stored in `flags.world.macroKey`. It is how the installer finds a macro again
  on the next run. Renaming a key orphans the macro already in a world.
- `name`: the default display name (a translation key, or a fixed string). It is only applied when the macro
  is **created**: the installer never renames an existing macro, so a name you changed by hand is kept.
- `slot`: the hotbar slot, or none.
- `source`, `icon`, `refresh` (the page must be refreshed after an update), and `gm_only`.

`gm_only` macros get the default ownership *None* (players cannot even see them) and a hotbar slot for the
Game Masters only. The uninstaller clears such a slot only for the Game Masters, so that it never touches the
hotbars of the players.

### What the installer does

For every macro: create or update the Macro document, write its icon as a real `.svg` file with
`FilePicker.upload`, and assign the hotbar slot to **every** user of the world, connected or not (a GM may
modify any user). Two details come from constraints of Foundry:

- **Icons must be files.** A document's `img` needs a path with a valid extension: a base64 data URI is
  rejected. The file name contains a hash of the SVG, so an unchanged icon is reused, not uploaded again
  (Foundry offers no way to delete old ones from a script).
- **Sounds** are embedded in base64 and written the same way in `worlds/<world>/macro-sounds/` (list in
  `SOUNDS` of `build.py`). An existing file is reused, never replaced.

### Checks

`python build/build.py --check` exits with an error if a generated file is out of date, or if an icon
embedded in a source is not identical to `icons/*.svg`. The icons are also embedded *in* some sources
(`custom-roll.js`, `start-session.js`, `give-bennies-to-players.js`), because a macro cannot read `icons/`;
the check catches an icon that was swapped in one place only.

The generated files start with `Generated on dd/mm/yyyy hh:mm:ss`. That is the time of the last real
change: an up-to-date file is never rewritten, so a run that changes nothing leaves no diff.

`python build/build.py --dump <folder>` writes each macro as it is installed (with its translations). It is
useful for testing a macro outside Foundry.

## Translations

Texts live in `lang/<code>.json`: a flat object, `"key": "text"`, the format of Foundry's own `lang` files.
`en.json` is the reference and the fallback. `{name}` is replaced by a value, and plurals use `key.one` and
`key.other` (picked with `Intl.PluralRules`, from the value `n`). See [`lang/README.md`](../lang/README.md)
to add a language.

**How the texts reach a macro.** The sources call `t("card.success", { … })` with the key written **in
full, as a string literal**. The build looks for those calls, and puts at the top of each compiled macro
only the texts that macro uses, plus the `t()` function. So the macros depend on nothing else, and there is
no file to install in Foundry. The price: **the sources do not run on their own** (`t` only exists after the
build), which is why `--dump` exists.

**Which language.** `game.i18n.lang` of each client, then its base language (`fr-CA` gives `fr`), then
English. A key that cannot be found is shown as is. The cards, the titles of the private messages and the
**Reply** button are redrawn at display time, in the language of the reader. What is fixed when it is
created stays in the language of its author: the fallback text of a message, the HTML of a private message
that was sent, and the **names of the macros**.

That last point is a known limit: the tooltips of the hotbar are the names of the Macro documents, which
Foundry does not translate. They are set at creation and never renamed, so macros installed in French keep
their French names. Renaming them on reinstall, or rewriting the tooltips when the hotbar is drawn (fragile,
it depends on the HTML of Foundry v14), were considered and dropped.

The build checks every run: an unknown or non-literal key, or a `{value}` that differs from English, is an
**error**; an untranslated text or an unused key is a warning.

## Chat cards

Foundry's HTML sanitizer strips what a message could use to run code: no inline `<svg>`, no `<style>`, no
scripts, no event handlers. So:

- the icons are base64 data URIs in a plain `<img>`;
- the buttons and the hover effects are wired **in JavaScript**, by the `renderChatMessageHTML` hook of
  `start-session.js`, after the card is drawn.

### Data, not HTML

The macros post a message whose content is only a plain-text fallback (shown if `start-session.js` is not
running). The roll itself is in the flags:

| Flag (`flags.world.…`) | Posted by | Content |
|---|---|---|
| `traitRoll` | trait rolls, palette (Wild Die + one die) | `dice` (`type`, `faces`, `results`: first roll then explosions), `modifier`, `difficulty`, `final` |
| `freeRoll` | palette (any other roll) | same, without the trait/wild logic |
| `bennyCard` | `spend-benny.js` | `name`, `avatar`, `remaining` |
| `bennyGiveCard` | `give-bennies-to-players.js` | `name`, `recipients` (`name`, `avatar`) |
| `whisperReply` | `private-message.js` and the **Reply** button | `replyTo`: the id of the sender |

`start-session.js` draws each card from its flag. Storing data has three consequences: a card can be
**adjusted after the roll** (change the flags, Foundry re-renders the message on every client), it is drawn
in **the language of each reader**, and a card is never out of sync with its numbers.

### The roll card

- **Before "Final roll"** (`final` false): the raw roll: the dice, the best die as the total, no modifier,
  no result. The **−** and **+** buttons only change values kept in memory on the client of the person
  setting them (`pendingSettings`): nothing is sent to the others yet.
- **"Final roll"** writes `modifier`, `difficulty` and `final: true` with `message.update`. The card is then
  redrawn everywhere, with the modifier on **each** die of a trait roll (the best one is the total), the
  result, the raises, and the colors. The button becomes **Adjust**.
- **Only the author and the GM** can adjust a card.
- **A die never goes below 1**, whatever the modifier: `max(1, sum + modifier)`. When the floor applies,
  the line reads `5 − 6 → 1` (an arrow: `= 1` would be wrong arithmetic).
- **Double 1**: if both first results are 1, the card is a raw roll with a 💀, forever: no modifier, no
  difficulty, no button, no result, even for an old card that had already been made final.
- The **free roll** adds every die, applies the modifier once, and has no raises. The difficulty is 0 by
  default, which means "no difficulty": no result is shown.

### Showing the card again in the notifications

With the chat sidebar collapsed, Foundry shows the card of a new message for about 5 seconds, then hides
it. When someone applies **Final roll** or **Adjust**, each client compares the applied values with the last
ones it drew (`appliedSeen`, a signature `modifier|difficulty|final`). If they changed (never at the first
render of a message, and never when the card is redrawn with the same values: no loop), then:

- if a **visible** card of that message is already in `#chat-notifications`, it is **redrawn in place**;
- otherwise `ui.chat.notify(message, { newMessage: true })` shows it again.

Two facts, established by reading `ui.chat.notify` and the page in the console, explain the code: a card
that has expired **stays in the page with `display: none`** (so test the visibility, not the presence), and
calling `notify` while a card is still visible would stack a second one.

## Design choices

### Bennies belong to the SWADE system

`spend-benny.js` and `give-bennies-to-players.js` call the system's own methods (`User#spendBenny`,
`Actor#spendBenny`, `Actor#getBenny`), read in the system's source code. The count, the Dice So Nice
animation, the hooks (`swadeSpendBenny`, `swadeGetBenny`) and the *hard choices* rule then work as in the
system, and stay right if the system changes. The macros only add the **card**.

The system also posts its own message when the world setting `notifyBennies` is on. A macro can neither
remove nor replace it, so the table turns that setting off by hand. The installer does not do it on its
own: that setting belongs to the Game Master.

**Which characters.** A player spends the Bennies of their assigned character; the GM spends the GM's own.
A player who owns **several** characters gets a small palette. The GM's list of characters to give Bennies
to is made of the ones a connected player **owns explicitly** (never through the default ownership). A
character is listed once, so it never gets two Bennies.

### The double 1 is triggered by the code

The *Dark* effect used to be a Dice So Nice rule (`total == 1`). It also fired on the **Benny die** (`1dB`
in the SWADE system: a die with **2 faces**, so a 1 half of the time) and on any free roll that totals 1,
and Dice So Nice cannot exclude a kind of die from a rule (conditions combine only with "or"). Now the
macros put `options.sfx = { specialEffect: "PlayAnimationDark" }` on both dice of a roll whose total is 1,
just before `showForRoll`. It is a documented Dice So Nice feature, and the effect plays whatever the
players' own settings are.

### The palette

The formula has **one term per die** (`1d6x + 1d6x`, not `2d6x`), so every die has its own line and its own
explosions. The Wild Die is only allowed with **one** other die (or alone), since SWADE has no trait roll
with several dice. The window enforces it: with two dice or more, the Wild Die is greyed out. With the Wild
Die on, clicking a die *replaces* the die.

### Game Master only

`give-bennies-to-players.js` is installed for everybody, but with the ownership *None* for the players, and
in the hotbar of the Game Masters only. It also refuses to run for a player.

### Sounds

Each client decides for itself, from a Foundry event:

- the **coin** plays on the SWADE hook `swadeGetBenny`, on the client that gives the Benny, and is **pushed**
  to the others (`AudioHelper.play(…, true)`). Bennies given one after the other (a distribution) play it
  once (2 s cooldown);
- the **whisper** plays on `createChatMessage`, **locally**, on the client of the recipient only. Nothing is
  pushed, so nobody else hears it. The `sound` field of a chat message was not used: in v14, `_onCreate` does
  not play it.

The path of a sound is the one `FilePicker.browse` lists (on a hosting service, it may differ from the plain
path), otherwise the plain path. Each sound has an on/off constant at the top of its block in
`start-session.js`, and a line in `SOUNDS` in `build.py` to stop uploading it. A script cannot delete an
uploaded file: remove it by hand.

### Running at startup

`start-session.js` is run by the **Macro Runner** module, which looks the macro up by its **exact name**:
`start-session`. An earlier version renamed the macro at every install, which broke the launch (the **Reply**
button did nothing). Hence the rules that the default name is `start-session`, and that the installer never
renames. The hooks are protected by guards (`game._whisperReplyHooked`, `game._traitRollCardHooked`, …),
so a reinstall takes effect at the **next page load**: refresh (F5). `console.log(game._whisperReplyHooked)`
must print `true`.

### Focus

Foundry can give the focus to a button while a dialog is rendered. The windows for writing a private message
and for replying therefore call `focus()` on the text field after `await dialog.render()`, on top of the
`autofocus` attribute.

## Testing

**Forcing the dice**, in the Foundry console, to get a double 1 without waiting for it:

```js
window._randomOrigine ??= CONFIG.Dice.randomUniform;
CONFIG.Dice.randomUniform = () => 0.999;   // every die shows 1
// to restore: CONFIG.Dice.randomUniform = window._randomOrigine;  (or F5)
```

Do not use `0.001`: Foundry computes `1 − random`, so it gives the **maximum**, and the exploding dice loop
until Foundry stops them (*Maximum recursion depth for exploding dice roll exceeded*).

**Uncertain APIs.** When a Foundry API is unclear, read it in the console, for example
`foundry.audio.AudioHelper.play.toString()`, instead of guessing. The signatures of `AudioHelper.play` and
`ui.chat.notify`, and the `_onCreate` of a chat message, were settled that way.

## Known limits

What a mock cannot prove, and was not checked in a real Foundry:

- **Sounds**: the real playback, the push of the coin to the other players, and the paths on The Forge.
- **Double 1**: the *Dark* effect on the screen of the **other** players (it worked in the author's console).
- **Cards**: that a **player** is allowed to `message.update` their own message. If Foundry refuses, the
  player gets a warning ("This card cannot be modified.").
- **Notifications**: the automatic reappearance is only simulated; part of the flicker on a click may come
  from Foundry's own redraw.
- **Give Bennies**: whether a `DialogV2` button callback that returns `false` keeps the window open (used when
  nothing is selected). The palette of **Spend a Benny** avoids the question by disabling its button.
- **Free roll**: it has no floor: with a negative modifier, the total can be negative.
- **Names**: the tooltips of the hotbar are not translated (see [Translations](#translations)).
- **API**: the SWADE API was read on the `develop` branch of the system (`SwadeActor.ts`, `SwadeUser.ts`);
  a different version may differ.
- **Icon**: the icon of *Give Bennies to players* is `icons/gives-bennies-to-players.svg` (with an extra "s"
  in the file name), used as is in the `MACROS` table.
