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
  const STANDARD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M46.978,154.695c-2.235,-1.33 -4.281,-1.415 -2.163,-4.961c0.014,-0.023 64.336,-111.659 66.053,-114.717c1.031,-1.836 1.331,-3.248 2.572,-1.509c0.745,1.045 63.376,110.695 65.611,114.516c1.949,3.334 3.275,4.264 -0.066,6.289c-1.68,1.018 -1.707,0.897 -21.232,12.339c-0.749,0.672 -2.134,1.353 -2.331,1.45c-4.363,2.215 -4.281,2.32 -39.552,22.763c-3.554,2.714 -4.165,1.634 -12.873,-3.518c-9.762,-5.776 -11.462,-6.632 -12.49,-7.15c-0.194,-0.099 -1.539,-0.785 -2.318,-1.434c-36.987,-21.792 -37.027,-21.812 -40.391,-23.436c-0.273,-0.21 -0.546,-0.421 -0.819,-0.631Z" style="fill:#4c4397;fill-opacity:1;"/><path d="M78.598,47.934c1.568,-0.634 1.487,-0.706 2.956,-1.48c20.904,-11.016 24.13,-13.839 24.495,-12.318c0.002,0.01 -50.07,87.013 -51.451,89.367c-14.474,24.662 -13.926,27.783 -17.281,25.802c-9.421,-5.563 -9.282,-5.705 -18.787,-11.138c-1.261,-0.714 -1.495,-0.516 -1.919,-1.97c-0.298,-1.02 -0.102,-48.371 -0.085,-52.577c0.012,-2.897 4.819,-4.533 5.721,-5.016c13.803,-7.387 39.351,-21.345 42.767,-23.211c0.49,-0.273 0.979,-0.545 1.469,-0.818c4.272,-2.116 7.355,-3.916 9.745,-5.248c0.76,-0.653 2.169,-1.301 2.369,-1.393Z" style="fill:#4c4297;fill-opacity:1;"/><path d="M179.457,65.867c0.198,0.093 1.577,0.739 2.361,1.369c5.158,2.818 5.025,2.977 10.392,5.467c0.273,0.201 0.547,0.403 0.82,0.604c15.545,8.454 15.399,8.85 15.424,9.528c0.077,2.125 -0.057,47.404 0.073,51.789c0.106,3.587 -4.388,4.322 -9.591,7.915c-0.48,0.289 -0.96,0.578 -1.44,0.867c-11.554,6.643 -11.963,6.655 -12.405,6.036c-1.022,-1.432 -63.074,-110.926 -65.247,-113.929c-4.078,-5.636 2.843,-0.089 27.725,13.254c2.199,1.179 18.726,10.042 27.447,14.817c2.233,1.223 2.135,1.324 4.442,2.283Z" style="fill:#4c4297;fill-opacity:1;"/><path d="M143.2,132.408c-0.52,3.241 -1.678,17.297 -14.576,17.935c-22.366,1.107 -21.025,-37.497 -8.174,-44.076c3.596,-1.841 23.068,-5.903 22.992,20.857c-0.001,0.423 -0.018,0.391 -0.241,5.284Z" style="fill:#eaeaf0;"/><path d="M101.974,112.125c-0.001,10.5 -0.002,21 -0.003,31.5c-0,3.309 1.406,7.188 -6.355,6.072c-3.616,-0.52 -2.181,-5.633 -2.397,-24.82c-0.089,-7.893 -11.124,0.361 -10.939,-7.501c0.13,-5.505 6.971,-0.404 11.614,-8.39c0.3,-0.516 3.163,-5.44 6.923,-2.765c2.319,1.65 1.03,2.258 1.156,5.904Z" style="fill:#eaeaef;"/><path d="M134.295,121.895c0.088,2.013 2.119,19.987 -6.388,21.198c-9.936,1.414 -10.877,-31.22 -0.785,-30.753c6.316,0.292 6.854,7.577 7.173,9.555Z" style="fill:#4c4394;"/></g></svg>`; // icons/d10.svg
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
