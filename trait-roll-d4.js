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

- It also relies on die images stored in The Forge assets for chat display
- Die Color Themes are used with the flavor feature (eg. 1d4x[name-of-colorset])
- Dice So Nice documentation : https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/home
- Foundry Die Formulas documentation : https://foundryvtt.com/article/dice/
*/

(async () => {
  // Trait die size (4 = d4). The matching Dice So Nice colorset must be named
  // "basic-d{TRAIT_DIE_SIZE}" (registered on startup, see start-session.js).
  const TRAIT_DIE_SIZE = 4;

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
    await game.dice3d.showForRoll(
      roll,
      user,
      true,
      null,
      false
    );
  }

  /* Build and post the chat message summarizing the roll */

  // The formula's {...} syntax creates a PoolTerm as roll.terms[0]. Its .dice property
  // gives the two individual dice it contains, in the same order as the formula: the
  // trait die first, then the wild die.
  const pool = roll.terms[0];
  const dice = pool.dice;

  // Formats one die's result(s) as plain text, appending 💥 to any exploded ("Ace")
  // result — in SWADE, a die that rolls its maximum face explodes: it is rerolled and
  // the new result is added to the total, repeating as long as it keeps rolling max.
  // When the die did explode, the line ends with "= sum" (the sum of everything it rolled,
  // e.g. "8💥 + 3 = 11"); a die that did not explode is shown as a plain result.
  const formatDie = (die) => {
    const text = die.results
      .map(r => r.exploded ? `${r.result}💥` : r.result)
      .join(" + ");
    if (!die.results.some(r => r.exploded)) return text;
    return `${text} = ${die.results.reduce((sum, r) => sum + r.result, 0)}`;
  };


  const standardDie = dice[0]; // First term in the formula: the trait die
  const wildDie = dice[1]; // Second term in the formula: the wild/joker d6

  // Die icons are embedded directly in this file as SVG source (see icons/*.svg in the
  // project). They used to be referenced as external Forge asset URLs (.webp files) that
  // turned out not to exist, which showed up as broken images in the chat card — embedding
  // the SVG source here removes that dependency entirely.
  const STANDARD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M90.743,59.829c8.745,-12.906 16.355,-35.4 23.689,-31.814c3.102,1.517 2.904,1.919 22.566,36.79l1.056,1.77c4.326,8.095 21.532,37.852 23.428,41.13c0.176,0.3 0.351,0.6 0.527,0.9c10.926,19.803 22.236,39.222 24.209,42.61c21.58,38.503 26.907,42.941 18.085,46.08c-2.039,0.725 -181.568,0.481 -182.893,0.131c-8.372,-2.209 -3.523,-9.32 -2.257,-11.785c3.654,-6.269 12.746,-22.287 13.848,-24.228c8.843,-15.581 8.799,-15.573 9.574,-16.922c11.943,-21.102 11.99,-20.982 23.948,-42.03c0.172,-0.295 0.344,-0.59 0.516,-0.885c4.029,-7.181 18.091,-31.485 23.704,-41.747Z" style="fill:#1d4d2d;fill-opacity:1;"/><path d="M160.46,172.854c-0.231,-3.665 -0.295,-13.673 -3.669,-7.679c-6.123,10.878 -6.711,10.812 -7.874,10.548c-5.207,-1.18 -3.812,-3.292 -1.171,-7.887c9.59,-16.683 9.919,-17.597 11.675,-16.8c7.803,3.54 5.915,19.164 8.468,25.473c3.007,7.429 15.985,2.287 7.377,-6.768c-2.953,-3.106 0.992,-8.152 3.5,-6.452c13.651,9.25 1.529,28.286 -9.642,23.835c-7.628,-3.039 -8.139,-8.319 -8.666,-14.27Z" style="fill:#e7ece8;"/><path d="M121.416,90.377c-0.079,0.715 1.063,4.165 -5.497,3.431c-2.999,-0.336 -0.154,-8.228 -3.817,-8.364c-10.489,-0.392 -12.687,1.812 -13.177,-2.613c-0.849,-7.657 4.551,-8.955 13.557,-22.979c2.49,-3.878 8.793,-3.687 8.897,-0.253c0.54,17.829 -0.668,19.193 1.986,19.594c0.459,0.069 4.558,0.688 2.421,5.279c-0.371,0.798 -2.648,0.965 -3.248,1.204c-1.832,0.731 -0.922,1.36 -1.123,4.701Z" style="fill:#e7ebe9;"/><path d="M56.62,178.877c1.804,3.716 2.611,5.395 -1.497,5.988c-3.83,0.553 -1.9,-5.511 -11.251,-5.34c-0.342,0.006 -7.636,-2.678 -0.531,-7.035c2.103,-1.289 24.439,-14.984 26.79,-15.272c0.866,-0.106 6.417,4.426 2.032,7.049c-6.918,4.138 -6.938,3.997 -13.867,8.145c-3.398,2.034 -3.27,2.781 -1.676,6.465Z" style="fill:#e7ece8;"/><path d="M114.262,76.123c-0.953,4.236 -2.349,3.157 -6.646,3.115c-3.863,-0.038 0.325,-4.098 3.502,-8.552c0.17,-0.238 2.131,-2.988 2.735,-2.421c0.648,0.609 0.417,5.038 0.409,7.859Z" style="fill:#214b30;"/></g></svg>`; // icons/d4.svg
  const WILD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M24.168,18.091c3.604,-0.521 3.334,-1.734 6.94,-1.561c6.355,0.304 160.706,-0.71 166.478,0.55c3.501,0.765 10.984,5.419 10.888,15.545c-0.242,25.506 0.562,160.87 -0.477,164.974c-1.262,4.984 -6.653,10.466 -14.129,10.923c-11.258,0.688 -11.203,-0.048 -140.993,-0.048c-24.955,-0 -28.976,1.553 -35.024,-8.731c-1.501,-2.552 -1.325,-2.787 -1.325,-107.119c0,-63.43 -0.185,-63.541 1.31,-67.383c0.343,-0.883 0.203,-0.86 0.237,-1.768c2.08,-1.186 5.193,-4.549 6.096,-5.383Z" style="fill:#f1eddf;fill-opacity:1;"/><path d="M114.356,147.777c-13.091,-1.337 -25.512,-3.701 -27.089,-34.148c-1.054,-20.357 12.168,-42.409 33.76,-36.397c11.852,3.3 17.049,16.019 13.514,17.416c-0.427,0.169 -9.449,1.999 -11.64,-1.444c-0.727,-1.142 -8.122,-12.763 -16.694,-2.759c-3.187,3.719 -8.666,18.854 -1.403,13.676c11.793,-8.408 33.169,-2.123 32.638,19.248c-0.037,1.474 -0.254,10.227 -6.628,17.2c-6.496,7.106 -15.258,7.025 -16.457,7.208Z"/><path d="M123.791,124.838c-3.152,22.563 -29.159,8.762 -19.82,-8.913c4.463,-8.447 20.083,-7.671 19.82,8.913Z" style="fill:#f1eddf;"/></g></svg>`; // icons/wild-die.svg

  // Critical failure: in SWADE, the trait die and the wild die both show 1. The roll keeps the
  // higher of the two dice (kh) and a die showing 1 cannot explode, so the total is 1 only in
  // that case: it is then displayed as a skull instead of the number.
  const totalDisplay = roll.total === 1 ? "💀" : roll.total;

  // Raises (SWADE "prouesses") against the standard target number of 4: one raise per full
  // 4 points above it, so 8+ = 1, 12+ = 2, 16+ = 3, 20+ = 4, and so on. A short message is
  // shown below the total only when there is at least one raise (nothing under 8, and no
  // raise on the critical failure, whose total is 1).
  const raises = Math.floor(roll.total / 4) - 1;
  const raisesHtml = raises >= 1
    ? `<div class="trait-roll-raises" style="width:100%;text-align:center;">
        <div style="font-size:1.15rem;opacity:0.85;">Et c'est ${raises} ${raises > 1 ? "prouesses" : "prouesse"} ! 🎉</div>
        <div style="font-size:0.85rem;opacity:0.7;">Si difficulté 4</div>
      </div>`
    : "";

  // Post the roll result as a styled chat message
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ user }),
    content: `
            <div class="swade-chat-message trait-roll-card" style="
                display:flex;
                flex-direction:column;
                gap:8px;
                background:linear-gradient(145deg,#f6ecd7,#e6d8b3);
                border:2px solid #8b5e3c;
                border-radius:12px;
                padding:12px;
                box-shadow:2px 2px 6px rgba(0,0,0,0.3);
                font-family: 'Garamond', 'Palatino Linotype', serif;
                color:#3b2f20;
            ">

                <!-- Top section: avatar next to one row per die, each showing its result -->
                <div class="trait-roll-dice" style="display:flex;align-items:center;gap:12px;">

                    <!-- User's avatar (escaped: the avatar path could otherwise contain characters that break out of the attribute) -->
                    <img src="${foundry.utils.escapeHTML(user.avatar)}" alt="Avatar de ${foundry.utils.escapeHTML(user.name)}" style="width:64px;height:64px;border-radius:6px;border:1px solid #8b5e3c;object-fit:cover;" />

                    <div style="display:flex;flex-direction:column;gap:4px;">

                        <!-- Trait die result. The icon is passed as a base64 data URI inside a plain <img>
                        tag rather than an inline <svg>: Foundry's HTML sanitizer strips raw <svg>/<path>
                        elements from chat message content, but a data-URI <img> survives untouched. -->
                        <div style="display:flex;align-items:center;gap:6px;">
                            <img src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(STANDARD_DIE_ICON_SVG)))}" alt="Dé de trait (d${standardDie.faces})" style="width:24px;height:24px;" />
                            <span>${formatDie(standardDie)}</span>
                        </div>

                        <!-- Wild/joker die result, same technique as above -->
                        <div style="display:flex;align-items:center;gap:6px;">
                            <img src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(WILD_DIE_ICON_SVG)))}" alt="Dé sauvage" style="width:24px;height:24px;" />
                            <span>${formatDie(wildDie)}</span>
                        </div>

                    </div>

                </div>

                <!-- Bottom section: the final total (already the higher of the two dice, thanks to "kh" in the formula) -->
                <!-- font-size is in rem so it scales with the chat's own font-size setting -->
                <div class="trait-roll-total" style="
                    width:100%;
                    text-align:center;
                    font-size:3rem;
                    font-weight:bold;
                    color:#5b3a1e;
                    text-shadow:1px 1px 2px rgba(0,0,0,0.3);
                    border-top:1px solid #8b5e3c;
                    padding-top:6px;
                ">
                    ${totalDisplay}
                </div>

                ${raisesHtml}

            </div>
        `});
})();
