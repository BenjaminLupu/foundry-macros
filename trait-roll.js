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
  const FORGE_ID = await ForgeAPI.getUserId(); // Récupéré dynamiquement (voir test-forgeid.js)
  const TRAIT_DIE_SIZE = 4; // Taille du dé de trait (4 = d4). Le colorset associé doit s'appeler "basic-d{TRAIT_DIE_SIZE}" (voir start-session.js)
  const formula = `{1d${TRAIT_DIE_SIZE}x[basic-d${TRAIT_DIE_SIZE}],1d6x[basic-wild-die]}kh`; // Set die used
  const user = game.user; // Get connected user
  const roll = await new Roll(formula).roll(); // Roll dice (in Foundry)

  /* Let's roll dice */

  // Trigger Dice So Nice 3D dice
  if (game.modules.get("dice-so-nice")?.active && game.dice3d) {
    await game.dice3d.showForRoll(
      roll,
      user,
      true,
      null,
      false
    );
  }

  /* And display a nice message in the chat */

  // Get the dice from the roll
  const pool = roll.terms[0];
  const dice = pool.dice;

  // Get roll results and format it to show aces
  const formatDie = (die) =>
    die.results
      .map(r => r.exploded ? `${r.result}💥` : r.result)
      .join(" + ");


  const standardDie = dice[0]; // Get Trait Die
  const wildDie = dice[1]; // Get Wild Die

  // Get die images
  const dieIcons = {
    "standard-die-icon": `https://assets.forge-vtt.com/${FORGE_ID}/dice-icons/d${standardDie.faces}.webp`, // Note that die filename is d[faces].webp (eg. d4.webp)
    "wild-die-icon": `https://assets.forge-vtt.com/${FORGE_ID}/dice-icons/wild-die.webp`
  };

  // Display chat message
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

                <!-- Upper Part -->
                <div class="trait-roll-dice" style="display:flex;align-items:center;gap:12px;">

                    <!-- Display user's avatar (escaped: avatar path could contain characters that break out of the attribute) -->
                    <img src="${foundry.utils.escapeHTML(user.avatar)}" alt="Avatar de ${foundry.utils.escapeHTML(user.name)}" style="width:64px;height:64px;border-radius:6px;border:1px solid #8b5e3c;object-fit:cover;" />

                    <div style="display:flex;flex-direction:column;gap:4px;">

                        <!-- Displaying the result of the trait die roll, showing any aces. onerror hides the icon if the Forge asset is missing (eg. forgeId not set) instead of showing a broken image -->
                        <div style="display:flex;align-items:center;gap:6px;">
                            <img src="${dieIcons['standard-die-icon']}" alt="Dé de trait (d${standardDie.faces})" style="width:24px;height:24px;" onerror="this.style.display='none'" />
                            <span>${formatDie(standardDie)}</span>
                        </div>

                        <!-- Displaying the result of the wild die roll, showing any aces -->
                        <div style="display:flex;align-items:center;gap:6px;">
                            <img src="${dieIcons['wild-die-icon']}" alt="Dé sauvage" style="width:24px;height:24px;" onerror="this.style.display='none'" />
                            <span>${formatDie(wildDie)}</span>
                        </div>

                    </div>

                </div>

                <!-- Lower Part -->
                <!-- Display final result (font-size in rem so it follows the chat's font-size setting) -->
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