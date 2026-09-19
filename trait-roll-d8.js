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
  // Trait die size (8 = d8). The matching Dice So Nice colorset must be named
  // "basic-d{TRAIT_DIE_SIZE}" (registered on startup, see start-session.js).
  const TRAIT_DIE_SIZE = 8;

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
  const STANDARD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M111.682,2.938c1.438,0.435 1.369,0.553 2.133,1.821c2.098,3.483 13.653,22.67 25.702,43.843c43.905,77.154 67.86,116.747 66.844,117.414c-0.308,0.202 -0.336,0.209 -172.985,0.204c-12.948,-0 -13.137,0.346 -14.564,-0.823l0.594,-1.367c10.153,-18.874 90.873,-157.292 92.277,-161.092Z" style="fill:#c50001;fill-opacity:1;"/><path d="M102.578,5.923c1.942,-1.023 1.847,-1.145 2.023,-1.215c3.326,-1.335 0.168,2.063 -21.371,39.366c-28.889,50.032 -28.749,50.104 -31.299,54.433c-32.189,54.652 -32.296,54.915 -34.389,60.04c-0.416,-0.235 -0.832,-0.469 -1.248,-0.704c0.338,-13.176 0.219,-13.162 0.23,-80.967c0.003,-19.759 -0.495,-20.311 2.02,-22.269c20.091,-11.889 20.277,-11.475 40.392,-23.371c0.807,-0.64 2.132,-1.284 2.327,-1.378c26.947,-15.803 27.035,-15.63 29.281,-17.155c4.966,-2.599 4.84,-2.68 9.717,-5.326c0.163,-0.146 0.173,-0.098 2.317,-1.453Z" style="fill:#c50001;fill-opacity:1;"/><path d="M23.803,170.742c0.826,-0.635 1.662,-0.09 6.572,-0.054c61.485,0.455 151.8,0.059 165,0.001c5.383,-0.024 6.348,-0.838 6.203,0.716c-0.024,0.256 -0.276,-0.014 -2.564,1.937c-0.958,0.232 -0.953,0.171 -1.319,0.398c-1.658,0.881 -1.622,0.824 -3.249,1.805c-36.451,21 -36.531,20.902 -37.446,21.762c-0.867,0.268 -0.789,0.28 -1.584,0.793c-1.581,0.56 -1.467,0.656 -2.952,1.479c-36.329,20.905 -36.409,20.797 -37.457,21.748c-4.714,1.535 -4.597,-0.12 -8.992,-2.512c-8.028,-4.369 -12.641,-7.658 -15.448,-8.692c-0.781,-0.504 -0.704,-0.516 -1.572,-0.798c-1.759,-1.636 -38.28,-22.566 -41.221,-23.975c-0.268,-0.217 -0.536,-0.434 -0.804,-0.651c-17.833,-10.297 -19.791,-11.916 -23.109,-12.741c-0.02,-0.405 -0.039,-0.811 -0.059,-1.216Z" style="fill:#c50001;fill-opacity:0.99;"/><path d="M143.414,17.919c2.156,1.299 2.161,1.303 2.323,1.451c19.677,10.994 19.442,11.305 38.988,22.509c0.195,0.094 1.524,0.731 2.329,1.373c19.164,11.143 19.44,10.729 20.821,12.071c1.565,1.522 0.032,79.415 0.834,102.519c-0.418,0.235 -0.835,0.47 -1.253,0.705c-2.31,-5.694 -86.318,-150.663 -87.69,-152.235c-6.196,-7.099 18.305,9.497 23.648,11.606Z" style="fill:#c50001;fill-opacity:1;"/><path d="M93.056,116.621c0.058,-0.744 0.523,-6.717 2.605,-8.962c0.656,-0.707 5.903,-4.009 4.124,-5.718c-1.014,-0.975 -9.504,-9.13 -1.822,-17.49c12.032,-13.095 33.765,-4.022 32.134,8.921c-0.999,7.927 -8.389,8.289 -3.505,11.682c8.106,5.632 5.62,14.939 4.004,18.167c-6.563,13.106 -36.813,14.184 -37.539,-6.6Z" style="fill:#f1e6e6;"/><path d="M121.554,115.883c-1.325,15.449 -22.394,7.438 -17.309,-3.595c2.461,-5.34 15.448,-8.745 17.309,3.595Z" style="fill:#bf0405;"/><path d="M104.94,91.924c0.192,-0.55 1.519,-4.358 4.909,-5.374c13.454,-4.034 12.773,15.501 2.295,13.469c-7.588,-1.471 -7.239,-3.754 -7.204,-8.095Z" style="fill:#bd0506;"/><path d="M197.695,173.74c-0.082,0.415 -0.165,0.83 -0.247,1.245c-2.098,2.944 -2.744,0.714 -3.002,0.56c1.627,-0.981 1.591,-0.925 3.249,-1.805Z" style="fill:#b70608;fill-opacity:0.14;"/><path d="M155.416,198.1l-0.018,0.842c-1.869,2.842 -2.75,0.742 -2.934,0.637c1.486,-0.822 1.371,-0.919 2.952,-1.479Z" style="fill:#b80507;fill-opacity:0.12;"/><path d="M16.293,157.842c0.416,0.235 0.832,0.469 1.248,0.704l0.104,1.621l-0.709,0.486c-0.849,-1.227 -0.535,-1.295 -0.644,-2.81Z" style="fill:#951416;fill-opacity:0.2;"/><path d="M208.709,157.843c-0.206,2.951 -1.25,2.42 -1.302,2.22c-0.128,-0.489 0.177,-1.026 0.049,-1.515c0.418,-0.235 0.835,-0.47 1.253,-0.705Z" style="fill:#961414;fill-opacity:0.21;"/><path d="M23.803,170.742c0.02,0.405 0.039,0.811 0.059,1.216l-0.121,0.823c-0.058,-0.115 -0.728,-1.432 -0.728,-1.432c-0.132,-1.061 0.783,-0.602 0.79,-0.607Z" style="fill:#991215;fill-opacity:0.12;"/><path d="M19.405,164.03l-0.594,1.367l-0.451,0.731c0.296,-1.18 0.37,-1.108 1.045,-2.098Z" style="fill:#aa0808;fill-opacity:0.39;"/></g></svg>`; // icons/d8.svg
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
