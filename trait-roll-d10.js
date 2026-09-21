/* Readme */
/*
- This macro is meant to be used on https://eu.forge-vtt.com/
- It relies on Die Color Themes that are loaded on startup using the diceSoNiceReady hook and addColorset

    Die Colorset Example

    dice3d.addColorset({
        name: 'basic-d4',
        description: 'Green d4',
        category: 'Colors',
        foreground: ['#FFFFFF'],
        background: ['#297243'],
        outline: ['#2F2A13'],
        texture: 'none',
        material: 'plastic',
        font: 'Arial'
    });

- Die Color Themes are used with the flavor feature (eg. 1d4x[name-of-colorset])
- The chat card is NOT built here: this macro stores what was rolled in the message flags
  (flags.world.traitRoll) and start-session.js draws the card from them, on every client (see
  the "ROLL CARDS" block of start-session.js). That is what lets the roll be adjusted
  afterwards (modifier / difficulty buttons on the card), and it also holds the die icons.
- Dice So Nice documentation : https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/home
- Foundry Die Formulas documentation : https://foundryvtt.com/article/dice/
*/

(async () => {
  // Trait die size (10 = d10). The matching Dice So Nice colorset must be named
  // "basic-d{TRAIT_DIE_SIZE}" (registered on startup, see start-session.js).
  const TRAIT_DIE_SIZE = 10;

  // Roll formula: a pool of two exploding dice — the trait die and the SWADE "wild"/joker
  // d6 — using Foundry's {A,B}kh syntax, which keeps only the higher of the two results
  // (the classic SWADE trait-roll mechanic). Both dice carry a colorset flavor tag
  // ([basic-dN] / [basic-wild-die]) so Dice So Nice renders them with the right look.
  const formula = `{1d${TRAIT_DIE_SIZE}x[basic-d${TRAIT_DIE_SIZE}],1d6x[basic-wild-die]}kh`;

  const user = game.user; // The user currently executing this macro
  const roll = await new Roll(formula).roll(); // Actually roll the dice via Foundry's Roll API

  // If the Dice So Nice module is installed and active, play its 3D dice animation for
  // this roll before posting the result. Purely cosmetic — has no effect on the outcome.
  if (game.modules.get("dice-so-nice")?.active && game.dice3d) {
    // A double 1 (both dice show 1, so the kept total is 1) is a critical failure: ask Dice So Nice
    // for its "Dark" effect on both dice. It is done here, and not with a "total == 1" rule in the
    // Dice So Nice settings, because such a rule also fires on other rolls that total 1 (the Benny
    // die of the SWADE system, a free roll...).
    if (roll.total === 1) roll.dice.forEach(die => { die.options.sfx = { specialEffect: "PlayAnimationDark" }; });

    await game.dice3d.showForRoll(
      roll,
      user,
      true,
      null,
      false
    );
  }

  // The formula's {...} syntax creates a PoolTerm as roll.terms[0]. Its .dice property
  // gives the two individual dice it contains, in the same order as the formula: the
  // trait die first, then the wild die.
  const [standardDie, wildDie] = roll.terms[0].dice;

  // What the card needs about a die: its size and every result it rolled, in order (the first
  // one, then the results of its explosions: in SWADE, a die that rolls its maximum face
  // explodes — it is rerolled and the new result is added, as long as it keeps rolling max).
  const dieData = (type, die) => ({
    type,
    faces: die.faces,
    results: die.results.map(result => result.result)
  });

  // Post the roll to the chat. The card is drawn from the flags by start-session.js (modifier 0,
  // difficulty 4 by default); the content is only a plain text fallback, shown if
  // start-session.js is not active on a client.
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ user }),
    content: `<p>${t("roll.trait_fallback", { die: TRAIT_DIE_SIZE, total: roll.total })}</p>`,
    flags: {
      world: {
        traitRoll: {
          dice: [dieData("trait", standardDie), dieData("wild", wildDie)],
          modifier: 0,
          difficulty: 4
        }
      }
    }
  });
})();
