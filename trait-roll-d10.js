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
  const formatDie = (die) =>
    die.results
      .map(r => r.exploded ? `${r.result}💥` : r.result)
      .join(" + ");


  const standardDie = dice[0]; // First term in the formula: the trait die
  const wildDie = dice[1]; // Second term in the formula: the wild/joker d6

  // Die icons are embedded directly in this file as SVG source (see icons/*.svg in the
  // project). They used to be referenced as external Forge asset URLs (.webp files) that
  // turned out not to exist, which showed up as broken images in the chat card — embedding
  // the SVG source here removes that dependency entirely.
  const STANDARD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M66.546,130.072c-5.782,-18.043 -7.566,-22.935 -11.092,-33.806c-1.298,-4 0.216,-3.886 3.634,-6.357c51.897,-37.504 52.454,-39.242 54.408,-38.304c1.807,0.867 50.282,36.637 54.635,39.849c3.405,2.512 1.735,4.196 0.265,8.678c-19.745,60.178 -19.071,61.247 -21.026,61.466c-0.885,0.099 -68.736,0.047 -68.995,0.029c-2.468,-0.177 -4.108,-7.742 -11.829,-31.554Z" style="fill:#2d1c9c;fill-opacity:1;"/><path d="M42.653,179.417c-22.158,-31.232 -26.262,-34.72 -26.178,-38.044c0.336,-13.244 -0.497,-56.988 0.496,-57.634c0.479,-0.311 32.625,9.581 33.521,11.212c0.394,0.717 11.91,36.625 12.36,38.098c8.951,29.298 10.207,29.642 8.484,32.126c-1.442,2.079 -13.03,18.788 -18.574,25.594c-1.518,1.863 -2.624,-1.651 -10.11,-11.353Z" style="fill:#2d1c9c;fill-opacity:1;"/><path d="M120.338,13.243c8.244,2.766 8.195,2.756 16.465,5.345c6.226,2.146 18.046,5.884 19.62,6.382l0.686,0.208c6.766,2.277 6.737,2.217 13.516,4.447c2.881,0.948 6.153,7.593 14.766,18.921c1.16,1.749 1.144,1.743 1.252,1.889c1.603,2.161 17.006,22.927 19.617,27.326c0.999,1.684 -4.075,2.661 -14.575,6.054c-17.032,5.504 -17.523,6.622 -20.38,4.404c-22.074,-17.14 -22.967,-15.853 -44.984,-33.022c-9.667,-7.538 -11.576,-6.656 -11.5,-11.322c0.005,-0.289 -0.012,-30.085 0.02,-30.816c0.107,-2.496 1.408,-0.848 5.496,0.183Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M191.555,166.826l-0.946,1.365c-5.787,7.613 -16.341,23.801 -17.66,23.175c-0.471,-0.224 -0.411,-0.329 -17.614,-24.286c-4.587,-6.389 -1.576,-6.983 0.796,-14.535c1.471,-4.684 17.925,-57.068 19.121,-58.31c0.934,-0.969 12.965,-4.336 31.425,-10.421c3.18,-1.048 1.798,1.806 1.798,41.812c-0,16.087 0.569,16.404 -2.176,20.794c-2.001,3.201 -13.546,18.789 -14.745,20.407Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M163.825,196.731c-0.058,0.038 -0.004,0.011 -2.226,0.823c-7.908,2.568 -7.902,2.442 -15.794,5.087c-0.508,0.213 -1.017,0.426 -1.525,0.639c-4.089,0.921 -13.7,4.291 -17.212,5.409c-13.784,4.947 -14.377,4.781 -15.629,4.43c-1.855,-0.52 -49.753,-16.29 -54.077,-17.713c-2.34,-0.77 -0.177,-2.831 10.148,-16.795c8.603,-11.635 8.253,-12.353 10.117,-12.461c0.806,-0.047 69.393,-0.039 69.747,-0.006c2.597,0.243 12.468,16.022 20.321,26.182c2.387,3.088 -0.22,2.991 -3.87,4.406Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M48.677,36.602c4.617,-5.937 4.282,-6.36 5.744,-6.867c3.858,-1.338 51.954,-16.893 53.911,-17.541c1.387,-0.46 1.85,-0.211 1.851,1.667c0.015,32.434 0.025,32.687 -1.115,33.695c-1.102,0.975 -50.503,37.06 -54.901,40.273c-3.649,2.666 -4.12,1.439 -16.342,-2.547c-11.627,-3.791 -12.912,-3.964 -18.671,-6.187c-0.069,-0.213 -0.961,-0.723 0.202,-2.064c1.103,-1.39 22.374,-30.615 29.322,-40.43Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M134.211,109.145c-2.261,10.966 -9.147,9.524 -14.529,15.765c-3.036,3.52 13.301,-0.252 14.752,3.031c1.839,4.16 -1.608,4.7 -2.017,4.764c-0.706,0.111 -20.73,0.241 -21.864,-0.088c-1.965,-0.569 -3.121,-7.189 8.521,-14.942c0.988,-0.658 13.138,-8.75 6.257,-13.459c-3.279,-2.244 -6.927,-0.596 -7.99,2.644c-0.899,2.74 -0.29,4.485 -5.207,4.309c-4.594,-0.164 -0.668,-9.975 3.122,-12.351c4.119,-2.583 9.979,-1.924 12.522,-0.732c7.449,3.492 6.405,10.587 6.432,11.058Z" style="fill:#e7e6f3;"/><path d="M101.875,127.125c-0.127,5.112 -0.607,6.886 -5.572,5.509c-3.941,-1.093 0.383,-20.919 -2.785,-22.311c-3.256,-1.431 -8.01,1.732 -7.425,-4.157c0.219,-2.203 6.11,-1.479 8.449,-4.815c2.091,-2.983 1.947,-3.916 5.576,-3.437c2.101,0.277 1.758,1.352 1.758,29.211Z" style="fill:#eae9f2;"/></g></svg>`; // icons/d10.svg
  const WILD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M24.168,18.091c3.604,-0.521 3.334,-1.734 6.94,-1.561c6.355,0.304 160.706,-0.71 166.478,0.55c3.501,0.765 10.984,5.419 10.888,15.545c-0.242,25.506 0.562,160.87 -0.477,164.974c-1.262,4.984 -6.653,10.466 -14.129,10.923c-11.258,0.688 -11.203,-0.048 -140.993,-0.048c-24.955,-0 -28.976,1.553 -35.024,-8.731c-1.501,-2.552 -1.325,-2.787 -1.325,-107.119c0,-63.43 -0.185,-63.541 1.31,-67.383c0.343,-0.883 0.203,-0.86 0.237,-1.768c2.08,-1.186 5.193,-4.549 6.096,-5.383Z" style="fill:#f1eddf;fill-opacity:1;"/><path d="M114.356,147.777c-13.091,-1.337 -25.512,-3.701 -27.089,-34.148c-1.054,-20.357 12.168,-42.409 33.76,-36.397c11.852,3.3 17.049,16.019 13.514,17.416c-0.427,0.169 -9.449,1.999 -11.64,-1.444c-0.727,-1.142 -8.122,-12.763 -16.694,-2.759c-3.187,3.719 -8.666,18.854 -1.403,13.676c11.793,-8.408 33.169,-2.123 32.638,19.248c-0.037,1.474 -0.254,10.227 -6.628,17.2c-6.496,7.106 -15.258,7.025 -16.457,7.208Z"/><path d="M123.791,124.838c-3.152,22.563 -29.159,8.762 -19.82,-8.913c4.463,-8.447 20.083,-7.671 19.82,8.913Z" style="fill:#f1eddf;"/></g></svg>`; // icons/wild-die.svg

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
                    ${roll.total}
                </div>

            </div>
        `});
})();
