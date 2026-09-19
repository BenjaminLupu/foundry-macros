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
  // Trait die size (6 = d6). The matching Dice So Nice colorset must be named
  // "basic-d{TRAIT_DIE_SIZE}" (registered on startup, see start-session.js).
  const TRAIT_DIE_SIZE = 6;

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
  const STANDARD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M18.282,23.573c3.116,-2.287 5.687,-6.896 12.829,-7.022c5.715,-0.1 148.091,0.142 162.01,-0.112c1.133,-0.021 8.715,-0.159 12.555,6.567c3.24,5.676 2.798,6.031 2.798,39.619c-0,133.443 0.072,133.472 -0.57,135.698c-1.304,4.521 -7.706,10.023 -13.254,10.122c-5.558,0.099 -154.119,-0.053 -163.522,0.079c-5.492,0.077 -14.512,-4.366 -14.6,-15.391c-0.042,-5.266 0.061,-156.394 -0.053,-161.254c-0.078,-3.331 0.93,-5.016 1.805,-8.305Z" style="fill:#d4b32e;fill-opacity:1;"/><path d="M114.394,147.703c-18.439,-0.856 -25.865,-10.363 -27.132,-34.073c-0.6,-11.222 4.313,-29.574 16.693,-35.072c21.64,-9.611 36.372,13.788 30.587,16.091c-0.389,0.155 -9.464,1.97 -11.64,-1.445c-0.728,-1.142 -8.123,-12.749 -16.697,-2.76c-3.391,3.951 -8.512,18.81 -1.397,13.681c16.904,-12.187 42.949,7.372 28.827,32.613c-5.529,9.882 -17.474,10.826 -19.241,10.966Z" style="fill:#020000;"/><path d="M101.962,124.12c0.124,-0.687 0.246,-12.358 9.436,-13.339c9.865,-1.052 11.884,8.353 12.143,9.562c3.715,17.305 -19.435,23.732 -21.579,3.777Z" style="fill:#d3b334;"/></g></svg>`; // icons/d6.svg
  const WILD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M24.168,18.091c3.604,-0.521 3.334,-1.734 6.94,-1.561c6.355,0.304 160.706,-0.71 166.478,0.55c3.501,0.765 10.984,5.419 10.888,15.545c-0.242,25.506 0.562,160.87 -0.477,164.974c-1.262,4.984 -6.653,10.466 -14.129,10.923c-11.258,0.688 -11.203,-0.048 -140.993,-0.048c-24.955,-0 -28.976,1.553 -35.024,-8.731c-1.501,-2.552 -1.325,-2.787 -1.325,-107.119c0,-63.43 -0.185,-63.541 1.31,-67.383c0.343,-0.883 0.203,-0.86 0.237,-1.768c2.08,-1.186 5.193,-4.549 6.096,-5.383Z" style="fill:#f1eddf;fill-opacity:1;"/><path d="M114.356,147.777c-13.091,-1.337 -25.512,-3.701 -27.089,-34.148c-1.054,-20.357 12.168,-42.409 33.76,-36.397c11.852,3.3 17.049,16.019 13.514,17.416c-0.427,0.169 -9.449,1.999 -11.64,-1.444c-0.727,-1.142 -8.122,-12.763 -16.694,-2.759c-3.187,3.719 -8.666,18.854 -1.403,13.676c11.793,-8.408 33.169,-2.123 32.638,19.248c-0.037,1.474 -0.254,10.227 -6.628,17.2c-6.496,7.106 -15.258,7.025 -16.457,7.208Z"/><path d="M123.791,124.838c-3.152,22.563 -29.159,8.762 -19.82,-8.913c4.463,-8.447 20.083,-7.671 19.82,8.913Z" style="fill:#f1eddf;"/></g></svg>`; // icons/wild-die.svg

  // Critical failure: in SWADE, the trait die and the wild die both show 1. The roll keeps the
  // higher of the two dice (kh) and a die showing 1 cannot explode, so the total is 1 only in
  // that case: it is then displayed as a skull instead of the number.
  const totalDisplay = roll.total === 1 ? "💀" : roll.total;

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

            </div>
        `});
})();
