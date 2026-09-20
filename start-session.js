// Load once per client (world module or startup macro)

console.log('Custom | Session starts');

console.log('Custom | Session start macros');

if (!game._whisperReplyHooked) {

    console.log('Custom | Hook on renderChatMessageHTML for whispers');

    game._whisperReplyHooked = true;

    // renderChatMessage (jQuery-based) has been deprecated since Foundry v13 in favor of
    // renderChatMessageHTML, which passes the native HTML element directly.
    Hooks.on("renderChatMessageHTML", (message, html) => {

        // DYNAMIC HIDING: if the user currently viewing the chat log is the message's author,
        // hide the "Répondre" (Reply) button from them to prevent replying to themselves.
        if (message.author.id === game.user.id) {
            html.querySelectorAll(".whisper-reply")?.forEach(btn => {
                btn.style.display = "none";
            });
        }

        // "RÉPONDRE" BUTTON HOVER: a <style> tag placed inside a chat message's content does
        // not seem to be applied by Foundry (same issue as custom-roll.js's <style> inside a
        // DialogV2) — so the fill-on-hover effect is implemented with JS listeners instead of
        // a CSS ":hover" rule. Applies to any private-message card (both the initial send and
        // any reply).
        html.querySelectorAll(".fantasy-whisper-reply-btn").forEach(btn => {
            btn.textContent = t("whisper.reply");
            btn.addEventListener("mouseenter", () => {
                btn.style.backgroundColor = "rgb(201, 89, 63)";
                btn.style.borderColor = "rgb(231, 209, 177)";
                btn.style.color = "#ffffff";
            });
            btn.addEventListener("mouseleave", () => {
                btn.style.backgroundColor = "transparent";
                btn.style.borderColor = "rgb(159, 132, 117)";
                btn.style.color = "#5b3a1e";
            });
        });

        // DYNAMIC TITLE: changes the message's title depending on whether the current client
        // is the sender (📤 icon) or the recipient (📥 icon). The wording always stays
        // "message" (never "réponse"/"reply"), whether it's an initial message or a reply.
        const headerEl = html.querySelector(".fantasy-whisper-header");
        if (headerEl) {
            if (message.author.id === game.user.id) {
                // The logged-in user is the whisper's author
                headerEl.innerHTML = t("whisper.header_sent");
            } else {
                // The logged-in user is the whisper's recipient
                headerEl.innerHTML = t("whisper.header_received");
            }
        }

        // RECIPIENT NAME IN FOUNDRY'S NATIVE HEADER (the timestamped "... to: Recipient" line
        // above the card): Foundry derives this from the recipients' account names
        // (message.whisper), which shows e.g. "to: Gamemaster". We replace it with the GM's
        // assigned character name (e.g. "Meneur de jeu") whenever the GM is one of the
        // whisper's recipients.
        // Only text nodes OUTSIDE our own card (.swade-chat-message) are touched, so we never
        // accidentally rewrite the message body itself if a player happened to type the word
        // "Gamemaster" in it.
        if (message.whisper?.length) {
            const cardEl = html.querySelector(".swade-chat-message");
            message.whisper.forEach(recipientId => {
                const recipient = game.users.get(recipientId);
                if (!recipient?.isGM) return; // only the Gamemaster recipient is affected
                const gmDisplayName = recipient.character?.name || recipient.name;
                if (gmDisplayName === recipient.name) return; // no character assigned: nothing to fix

                const walker = document.createTreeWalker(html, NodeFilter.SHOW_TEXT);
                const textNodes = [];
                let node;
                while ((node = walker.nextNode())) {
                    if (cardEl && cardEl.contains(node)) continue;
                    if (node.nodeValue.includes(recipient.name)) textNodes.push(node);
                }
                textNodes.forEach(n => {
                    n.nodeValue = n.nodeValue.split(recipient.name).join(gmDisplayName);
                });
            });
        }

        // Helper that opens an input dialog and sends a whisper reply. "dialogTitle" (e.g.
        // "Reply privately to Amandine") is already translated by the caller.
        const replyFlow = async (targetIds, dialogTitle) => {
            const dlg = new foundry.applications.api.DialogV2({
                window: { title: dialogTitle },
                content: `
          <div class="form-group" style="width:600px;">
            <label for="reply-text">${t("whisper.message")}</label>
            <textarea id="reply-text" rows="4" class="w-full" style="font-size:1.1rem;"></textarea>
          </div>
      `,
                buttons: [{
                    action: "send",
                    label: t("common.send"),
                    default: true,
                    callback: (event, button) => {
                        const text = button.form.querySelector("#reply-text")?.value.trim();
                        if (!text) return true;

                        // Dynamically fetch the replying user's own avatar
                        const avatar = game.user.character?.img || game.user.avatar || "icons/svg/mystery-man.svg";

                        // PARCHMENT STYLE (matching trait-roll.js's visual style): beige/gold
                        // parchment background, #8b5e3c border, Garamond/Palatino font &
                        // gold-brass button. Layout mirrors the dice-roll result cards
                        // (trait-roll.js/custom-roll.js): an avatar+title header row, a simple
                        // divider, then the full-width message body.
                        const content = `
          <div class="swade-chat-message fantasy-whisper-card" style="
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: linear-gradient(145deg, #f6ecd7, #e6d8b3); /* Same parchment gradient as trait-roll.js */
            border: 2px solid #8b5e3c; /* Same brown border as trait-roll.js */
            box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3); /* Same drop shadow as trait-roll.js */
            border-radius: 12px;
            padding: 12px;
            font-family: 'Garamond', 'Palatino Linotype', serif;
            color: #3b2f20;
          ">
            <!-- The "Répondre" (Reply) button's fill-on-hover effect is handled in JS by the
                 renderChatMessageHTML hook earlier in this file: a <style> tag here would not
                 be applied. -->

            <!-- Header: avatar + title, mirroring trait-roll.js's avatar+dice row -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <img class="fantasy-whisper-avatar" src="${foundry.utils.escapeHTML(avatar)}" alt="${foundry.utils.escapeHTML(t("common.avatar_of", { name: game.user.name }))}" style="
                width: 64px;
                height: 64px;
                min-width: 64px;
                max-width: 64px;
                border-radius: 6px;
                border: 2px solid #8b5e3c;
                box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                object-fit: cover;
                display: block;
              ">
              <div class="fantasy-whisper-header" style="
                font-family: 'Garamond', 'Palatino Linotype', serif;
                font-weight: bold;
                font-size: 0.9rem;
                color: #5b3a1e; /* Same accent color as the final total in trait-roll.js */
                letter-spacing: 0.5px;
                text-transform: uppercase;
              ">
                ${t("whisper.header_reply")}
              </div>
            </div>

            <!-- Simple divider -->
            <div style="height: 1px; background: rgba(139, 94, 60, 0.4);"></div>

            <!-- Reply body (more legible sans-serif font, tightened line height) -->
            <div class="fantasy-whisper-body" style="
              font-family: 'Segoe UI', Verdana, Arial, sans-serif;
              font-size: 1.2rem;
              line-height: 1.2;
              color: #3b2f20;
              word-break: break-word;
            ">
              ${foundry.utils.escapeHTML(text)}
            </div>

            <!-- "Répondre" (Reply) action button (flat style, matching Foundry's native look) -->
            <div class="whisper-actions" style="text-align: center;">
              <button type="button"
                      class="whisper-reply fantasy-whisper-reply-btn"
                      data-reply-to="${game.user.id}"
                      style="
                        background: transparent;
                        border: 1px solid rgb(159, 132, 117);
                        border-radius: 4px;
                        color: #5b3a1e;
                        font-family: 'Segoe UI', Verdana, Arial, sans-serif;
                        font-size: 0.85rem;
                        font-weight: bold;
                        padding: 4px 10px;
                        cursor: pointer;
                        transition: border-color 0.15s ease, background-color 0.15s ease;
                        display: inline-block;
                        margin-top: 6px;
                      ">
                ${t("whisper.reply")}
              </button>
            </div>
          </div>
        `;

                        // FOUNDRY'S NATIVE HEADER ALIAS (same logic as private-message.js):
                        // Gamemaster => their assigned character, player => always their account name.
                        const senderAlias = game.user.isGM ? (game.user.character?.name || game.user.name) : game.user.name;

                        // Create the reply whisper, storing the whisperReply flag so the chain
                        // remembers who to reply to next. The "WHISPER" style is now inferred
                        // automatically from the presence of the "whisper" array alone: setting
                        // it explicitly has been deprecated since Foundry v12.
                        ChatMessage.create({
                            content: content,
                            speaker: { alias: senderAlias },
                            whisper: targetIds,
                            flags: { world: { whisperReply: { replyTo: game.user.id } } }
                        });
                        return true;
                    }
                }, { action: "cancel", label: t("common.cancel") }]
            });
            dlg.render({ force: true });
        };

        // "Répondre" (Reply) button — replies to the original author
        html.querySelectorAll(".whisper-reply")?.forEach(btn => {
            btn.addEventListener("click", async () => {
                const replyToFlag = message.getFlag("world", "whisperReply");
                const authorId = replyToFlag?.replyTo ?? message.author.id;
                const target = game.users.get(authorId);
                if (!target) return ui.notifications.warn(t("whisper.author_not_found"));
                // The Gamemaster is always referred to by their assigned character (e.g.
                // "Meneur de jeu"), never by their account name — same convention as the
                // rest of this file.
                const dialogTitle = target.isGM
                    ? t("whisper.reply_title_gm", { name: target.character?.name || target.name })
                    : t("whisper.reply_title", { name: target.name });
                await replyFlow([authorId], dialogTitle);
            });
        });

    });

}

// ---------------------------------------------------------------------------------------------
// ROLL CARDS (posted by trait-roll-*.js and custom-roll.js)
//
// Those macros do not build the chat card themselves: they store what was rolled in the message
// flags (flags.world.traitRoll or .freeRoll) and post a plain text fallback as the content. The card
// is drawn here, every time the message is rendered, on every client, from those flags. This is
// what makes the card adjustable after the roll: the "-" / "+" buttons only change the values
// being set (kept in memory on the client of the person setting them); the "Jet définitif" button,
// then "Ajuster", stores them in the flags, Foundry re-renders the message everywhere, and the card
// is redrawn with the new modifier/difficulty. (Scripts and click handlers written in a message's
// own HTML are stripped by Foundry, hence the buttons are wired up here.)
//
// flags.world.traitRoll: a SWADE trait roll (trait die + wild die, the higher is kept)
//   dice       : [{ type: "trait" | "wild", faces, results: [first roll, explosion, ...] }, ...]
//   modifier   : -6 .. +6, added to every die line and to the total (default 0)
//   difficulty : target number, 0 or more (default 4); raises for every 4 points above it
//   final      : false until "Jet définitif" is clicked. The modifier, the result (Réussite / Échec,
//                raises) and the color of the total are only shown once the roll is final
//
// flags.world.freeRoll: any other palette roll (all the dice are added up, no raises)
//   dice       : [{ type: "die" | "wild", faces, results: [...] }, ...]
//   modifier   : -6 .. +6, added once to the sum of the dice (default 0)
//   difficulty : target number, 0 or more (default 0 = no difficulty: no result is shown)
//   final      : false until "Jet définitif" is clicked (same as above)
// ---------------------------------------------------------------------------------------------
if (!game._traitRollCardHooked) {

    game._traitRollCardHooked = true;

    console.log('Custom | Hook on renderChatMessageHTML for trait roll cards');

    // Icons embedded directly in the code (see icons/*.svg in the project): a macro script runs
    // inside the browser with no access to the local filesystem. They must stay identical to
    // icons/*.svg (python build/build.py checks it). Foundry's HTML sanitizer strips an inline
    // <svg> from a message, so they are always shown as a base64 data URI in a plain <img> tag.
    const DIE_ICON_SVG = {
        4: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M90.743,59.829c8.745,-12.906 16.355,-35.4 23.689,-31.814c3.102,1.517 2.904,1.919 22.566,36.79l1.056,1.77c4.326,8.095 21.532,37.852 23.428,41.13c0.176,0.3 0.351,0.6 0.527,0.9c10.926,19.803 22.236,39.222 24.209,42.61c21.58,38.503 26.907,42.941 18.085,46.08c-2.039,0.725 -181.568,0.481 -182.893,0.131c-8.372,-2.209 -3.523,-9.32 -2.257,-11.785c3.654,-6.269 12.746,-22.287 13.848,-24.228c8.843,-15.581 8.799,-15.573 9.574,-16.922c11.943,-21.102 11.99,-20.982 23.948,-42.03c0.172,-0.295 0.344,-0.59 0.516,-0.885c4.029,-7.181 18.091,-31.485 23.704,-41.747Z" style="fill:#1d4d2d;fill-opacity:1;"/><path d="M160.46,172.854c-0.231,-3.665 -0.295,-13.673 -3.669,-7.679c-6.123,10.878 -6.711,10.812 -7.874,10.548c-5.207,-1.18 -3.812,-3.292 -1.171,-7.887c9.59,-16.683 9.919,-17.597 11.675,-16.8c7.803,3.54 5.915,19.164 8.468,25.473c3.007,7.429 15.985,2.287 7.377,-6.768c-2.953,-3.106 0.992,-8.152 3.5,-6.452c13.651,9.25 1.529,28.286 -9.642,23.835c-7.628,-3.039 -8.139,-8.319 -8.666,-14.27Z" style="fill:#e7ece8;"/><path d="M121.416,90.377c-0.079,0.715 1.063,4.165 -5.497,3.431c-2.999,-0.336 -0.154,-8.228 -3.817,-8.364c-10.489,-0.392 -12.687,1.812 -13.177,-2.613c-0.849,-7.657 4.551,-8.955 13.557,-22.979c2.49,-3.878 8.793,-3.687 8.897,-0.253c0.54,17.829 -0.668,19.193 1.986,19.594c0.459,0.069 4.558,0.688 2.421,5.279c-0.371,0.798 -2.648,0.965 -3.248,1.204c-1.832,0.731 -0.922,1.36 -1.123,4.701Z" style="fill:#e7ebe9;"/><path d="M56.62,178.877c1.804,3.716 2.611,5.395 -1.497,5.988c-3.83,0.553 -1.9,-5.511 -11.251,-5.34c-0.342,0.006 -7.636,-2.678 -0.531,-7.035c2.103,-1.289 24.439,-14.984 26.79,-15.272c0.866,-0.106 6.417,4.426 2.032,7.049c-6.918,4.138 -6.938,3.997 -13.867,8.145c-3.398,2.034 -3.27,2.781 -1.676,6.465Z" style="fill:#e7ece8;"/><path d="M114.262,76.123c-0.953,4.236 -2.349,3.157 -6.646,3.115c-3.863,-0.038 0.325,-4.098 3.502,-8.552c0.17,-0.238 2.131,-2.988 2.735,-2.421c0.648,0.609 0.417,5.038 0.409,7.859Z" style="fill:#214b30;"/></g></svg>`,
        6: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M18.282,23.573c3.116,-2.287 5.687,-6.896 12.829,-7.022c5.715,-0.1 148.091,0.142 162.01,-0.112c1.133,-0.021 8.715,-0.159 12.555,6.567c3.24,5.676 2.798,6.031 2.798,39.619c-0,133.443 0.072,133.472 -0.57,135.698c-1.304,4.521 -7.706,10.023 -13.254,10.122c-5.558,0.099 -154.119,-0.053 -163.522,0.079c-5.492,0.077 -14.512,-4.366 -14.6,-15.391c-0.042,-5.266 0.061,-156.394 -0.053,-161.254c-0.078,-3.331 0.93,-5.016 1.805,-8.305Z" style="fill:#d4b32e;fill-opacity:1;"/><path d="M114.394,147.703c-18.439,-0.856 -25.865,-10.363 -27.132,-34.073c-0.6,-11.222 4.313,-29.574 16.693,-35.072c21.64,-9.611 36.372,13.788 30.587,16.091c-0.389,0.155 -9.464,1.97 -11.64,-1.445c-0.728,-1.142 -8.123,-12.749 -16.697,-2.76c-3.391,3.951 -8.512,18.81 -1.397,13.681c16.904,-12.187 42.949,7.372 28.827,32.613c-5.529,9.882 -17.474,10.826 -19.241,10.966Z" style="fill:#020000;"/><path d="M101.962,124.12c0.124,-0.687 0.246,-12.358 9.436,-13.339c9.865,-1.052 11.884,8.353 12.143,9.562c3.715,17.305 -19.435,23.732 -21.579,3.777Z" style="fill:#d3b334;"/></g></svg>`,
        8: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M111.682,2.938c1.438,0.435 1.369,0.553 2.133,1.821c2.098,3.483 13.653,22.67 25.702,43.843c43.905,77.154 67.86,116.747 66.844,117.414c-0.308,0.202 -0.336,0.209 -172.985,0.204c-12.948,-0 -13.137,0.346 -14.564,-0.823l0.594,-1.367c10.153,-18.874 90.873,-157.292 92.277,-161.092Z" style="fill:#c50001;fill-opacity:1;"/><path d="M102.578,5.923c1.942,-1.023 1.847,-1.145 2.023,-1.215c3.326,-1.335 0.168,2.063 -21.371,39.366c-28.889,50.032 -28.749,50.104 -31.299,54.433c-32.189,54.652 -32.296,54.915 -34.389,60.04c-0.416,-0.235 -0.832,-0.469 -1.248,-0.704c0.338,-13.176 0.219,-13.162 0.23,-80.967c0.003,-19.759 -0.495,-20.311 2.02,-22.269c20.091,-11.889 20.277,-11.475 40.392,-23.371c0.807,-0.64 2.132,-1.284 2.327,-1.378c26.947,-15.803 27.035,-15.63 29.281,-17.155c4.966,-2.599 4.84,-2.68 9.717,-5.326c0.163,-0.146 0.173,-0.098 2.317,-1.453Z" style="fill:#c50001;fill-opacity:1;"/><path d="M23.803,170.742c0.826,-0.635 1.662,-0.09 6.572,-0.054c61.485,0.455 151.8,0.059 165,0.001c5.383,-0.024 6.348,-0.838 6.203,0.716c-0.024,0.256 -0.276,-0.014 -2.564,1.937c-0.958,0.232 -0.953,0.171 -1.319,0.398c-1.658,0.881 -1.622,0.824 -3.249,1.805c-36.451,21 -36.531,20.902 -37.446,21.762c-0.867,0.268 -0.789,0.28 -1.584,0.793c-1.581,0.56 -1.467,0.656 -2.952,1.479c-36.329,20.905 -36.409,20.797 -37.457,21.748c-4.714,1.535 -4.597,-0.12 -8.992,-2.512c-8.028,-4.369 -12.641,-7.658 -15.448,-8.692c-0.781,-0.504 -0.704,-0.516 -1.572,-0.798c-1.759,-1.636 -38.28,-22.566 -41.221,-23.975c-0.268,-0.217 -0.536,-0.434 -0.804,-0.651c-17.833,-10.297 -19.791,-11.916 -23.109,-12.741c-0.02,-0.405 -0.039,-0.811 -0.059,-1.216Z" style="fill:#c50001;fill-opacity:0.99;"/><path d="M143.414,17.919c2.156,1.299 2.161,1.303 2.323,1.451c19.677,10.994 19.442,11.305 38.988,22.509c0.195,0.094 1.524,0.731 2.329,1.373c19.164,11.143 19.44,10.729 20.821,12.071c1.565,1.522 0.032,79.415 0.834,102.519c-0.418,0.235 -0.835,0.47 -1.253,0.705c-2.31,-5.694 -86.318,-150.663 -87.69,-152.235c-6.196,-7.099 18.305,9.497 23.648,11.606Z" style="fill:#c50001;fill-opacity:1;"/><path d="M93.056,116.621c0.058,-0.744 0.523,-6.717 2.605,-8.962c0.656,-0.707 5.903,-4.009 4.124,-5.718c-1.014,-0.975 -9.504,-9.13 -1.822,-17.49c12.032,-13.095 33.765,-4.022 32.134,8.921c-0.999,7.927 -8.389,8.289 -3.505,11.682c8.106,5.632 5.62,14.939 4.004,18.167c-6.563,13.106 -36.813,14.184 -37.539,-6.6Z" style="fill:#f1e6e6;"/><path d="M121.554,115.883c-1.325,15.449 -22.394,7.438 -17.309,-3.595c2.461,-5.34 15.448,-8.745 17.309,3.595Z" style="fill:#bf0405;"/><path d="M104.94,91.924c0.192,-0.55 1.519,-4.358 4.909,-5.374c13.454,-4.034 12.773,15.501 2.295,13.469c-7.588,-1.471 -7.239,-3.754 -7.204,-8.095Z" style="fill:#bd0506;"/><path d="M197.695,173.74c-0.082,0.415 -0.165,0.83 -0.247,1.245c-2.098,2.944 -2.744,0.714 -3.002,0.56c1.627,-0.981 1.591,-0.925 3.249,-1.805Z" style="fill:#b70608;fill-opacity:0.14;"/><path d="M155.416,198.1l-0.018,0.842c-1.869,2.842 -2.75,0.742 -2.934,0.637c1.486,-0.822 1.371,-0.919 2.952,-1.479Z" style="fill:#b80507;fill-opacity:0.12;"/><path d="M16.293,157.842c0.416,0.235 0.832,0.469 1.248,0.704l0.104,1.621l-0.709,0.486c-0.849,-1.227 -0.535,-1.295 -0.644,-2.81Z" style="fill:#951416;fill-opacity:0.2;"/><path d="M208.709,157.843c-0.206,2.951 -1.25,2.42 -1.302,2.22c-0.128,-0.489 0.177,-1.026 0.049,-1.515c0.418,-0.235 0.835,-0.47 1.253,-0.705Z" style="fill:#961414;fill-opacity:0.21;"/><path d="M23.803,170.742c0.02,0.405 0.039,0.811 0.059,1.216l-0.121,0.823c-0.058,-0.115 -0.728,-1.432 -0.728,-1.432c-0.132,-1.061 0.783,-0.602 0.79,-0.607Z" style="fill:#991215;fill-opacity:0.12;"/><path d="M19.405,164.03l-0.594,1.367l-0.451,0.731c0.296,-1.18 0.37,-1.108 1.045,-2.098Z" style="fill:#aa0808;fill-opacity:0.39;"/></g></svg>`,
        10: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M46.978,154.695c-2.235,-1.33 -4.281,-1.415 -2.163,-4.961c0.014,-0.023 64.336,-111.659 66.053,-114.717c1.031,-1.836 1.331,-3.248 2.572,-1.509c0.745,1.045 63.376,110.695 65.611,114.516c1.949,3.334 3.275,4.264 -0.066,6.289c-1.68,1.018 -1.707,0.897 -21.232,12.339c-0.749,0.672 -2.134,1.353 -2.331,1.45c-4.363,2.215 -4.281,2.32 -39.552,22.763c-3.554,2.714 -4.165,1.634 -12.873,-3.518c-9.762,-5.776 -11.462,-6.632 -12.49,-7.15c-0.194,-0.099 -1.539,-0.785 -2.318,-1.434c-36.987,-21.792 -37.027,-21.812 -40.391,-23.436c-0.273,-0.21 -0.546,-0.421 -0.819,-0.631Z" style="fill:#4c4397;fill-opacity:1;"/><path d="M78.598,47.934c1.568,-0.634 1.487,-0.706 2.956,-1.48c20.904,-11.016 24.13,-13.839 24.495,-12.318c0.002,0.01 -50.07,87.013 -51.451,89.367c-14.474,24.662 -13.926,27.783 -17.281,25.802c-9.421,-5.563 -9.282,-5.705 -18.787,-11.138c-1.261,-0.714 -1.495,-0.516 -1.919,-1.97c-0.298,-1.02 -0.102,-48.371 -0.085,-52.577c0.012,-2.897 4.819,-4.533 5.721,-5.016c13.803,-7.387 39.351,-21.345 42.767,-23.211c0.49,-0.273 0.979,-0.545 1.469,-0.818c4.272,-2.116 7.355,-3.916 9.745,-5.248c0.76,-0.653 2.169,-1.301 2.369,-1.393Z" style="fill:#4c4297;fill-opacity:1;"/><path d="M179.457,65.867c0.198,0.093 1.577,0.739 2.361,1.369c5.158,2.818 5.025,2.977 10.392,5.467c0.273,0.201 0.547,0.403 0.82,0.604c15.545,8.454 15.399,8.85 15.424,9.528c0.077,2.125 -0.057,47.404 0.073,51.789c0.106,3.587 -4.388,4.322 -9.591,7.915c-0.48,0.289 -0.96,0.578 -1.44,0.867c-11.554,6.643 -11.963,6.655 -12.405,6.036c-1.022,-1.432 -63.074,-110.926 -65.247,-113.929c-4.078,-5.636 2.843,-0.089 27.725,13.254c2.199,1.179 18.726,10.042 27.447,14.817c2.233,1.223 2.135,1.324 4.442,2.283Z" style="fill:#4c4297;fill-opacity:1;"/><path d="M143.2,132.408c-0.52,3.241 -1.678,17.297 -14.576,17.935c-22.366,1.107 -21.025,-37.497 -8.174,-44.076c3.596,-1.841 23.068,-5.903 22.992,20.857c-0.001,0.423 -0.018,0.391 -0.241,5.284Z" style="fill:#eaeaf0;"/><path d="M101.974,112.125c-0.001,10.5 -0.002,21 -0.003,31.5c-0,3.309 1.406,7.188 -6.355,6.072c-3.616,-0.52 -2.181,-5.633 -2.397,-24.82c-0.089,-7.893 -11.124,0.361 -10.939,-7.501c0.13,-5.505 6.971,-0.404 11.614,-8.39c0.3,-0.516 3.163,-5.44 6.923,-2.765c2.319,1.65 1.03,2.258 1.156,5.904Z" style="fill:#eaeaef;"/><path d="M134.295,121.895c0.088,2.013 2.119,19.987 -6.388,21.198c-9.936,1.414 -10.877,-31.22 -0.785,-30.753c6.316,0.292 6.854,7.577 7.173,9.555Z" style="fill:#4c4394;"/></g></svg>`,
        12: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M66.546,130.072c-5.782,-18.043 -7.566,-22.935 -11.092,-33.806c-1.298,-4 0.216,-3.886 3.634,-6.357c51.897,-37.504 52.454,-39.242 54.408,-38.304c1.807,0.867 50.282,36.637 54.635,39.849c3.405,2.512 1.735,4.196 0.265,8.678c-19.745,60.178 -19.071,61.247 -21.026,61.466c-0.885,0.099 -68.736,0.047 -68.995,0.029c-2.468,-0.177 -4.108,-7.742 -11.829,-31.554Z" style="fill:#2d1c9c;fill-opacity:1;"/><path d="M42.653,179.417c-22.158,-31.232 -26.262,-34.72 -26.178,-38.044c0.336,-13.244 -0.497,-56.988 0.496,-57.634c0.479,-0.311 32.625,9.581 33.521,11.212c0.394,0.717 11.91,36.625 12.36,38.098c8.951,29.298 10.207,29.642 8.484,32.126c-1.442,2.079 -13.03,18.788 -18.574,25.594c-1.518,1.863 -2.624,-1.651 -10.11,-11.353Z" style="fill:#2d1c9c;fill-opacity:1;"/><path d="M120.338,13.243c8.244,2.766 8.195,2.756 16.465,5.345c6.226,2.146 18.046,5.884 19.62,6.382l0.686,0.208c6.766,2.277 6.737,2.217 13.516,4.447c2.881,0.948 6.153,7.593 14.766,18.921c1.16,1.749 1.144,1.743 1.252,1.889c1.603,2.161 17.006,22.927 19.617,27.326c0.999,1.684 -4.075,2.661 -14.575,6.054c-17.032,5.504 -17.523,6.622 -20.38,4.404c-22.074,-17.14 -22.967,-15.853 -44.984,-33.022c-9.667,-7.538 -11.576,-6.656 -11.5,-11.322c0.005,-0.289 -0.012,-30.085 0.02,-30.816c0.107,-2.496 1.408,-0.848 5.496,0.183Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M191.555,166.826l-0.946,1.365c-5.787,7.613 -16.341,23.801 -17.66,23.175c-0.471,-0.224 -0.411,-0.329 -17.614,-24.286c-4.587,-6.389 -1.576,-6.983 0.796,-14.535c1.471,-4.684 17.925,-57.068 19.121,-58.31c0.934,-0.969 12.965,-4.336 31.425,-10.421c3.18,-1.048 1.798,1.806 1.798,41.812c-0,16.087 0.569,16.404 -2.176,20.794c-2.001,3.201 -13.546,18.789 -14.745,20.407Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M163.825,196.731c-0.058,0.038 -0.004,0.011 -2.226,0.823c-7.908,2.568 -7.902,2.442 -15.794,5.087c-0.508,0.213 -1.017,0.426 -1.525,0.639c-4.089,0.921 -13.7,4.291 -17.212,5.409c-13.784,4.947 -14.377,4.781 -15.629,4.43c-1.855,-0.52 -49.753,-16.29 -54.077,-17.713c-2.34,-0.77 -0.177,-2.831 10.148,-16.795c8.603,-11.635 8.253,-12.353 10.117,-12.461c0.806,-0.047 69.393,-0.039 69.747,-0.006c2.597,0.243 12.468,16.022 20.321,26.182c2.387,3.088 -0.22,2.991 -3.87,4.406Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M48.677,36.602c4.617,-5.937 4.282,-6.36 5.744,-6.867c3.858,-1.338 51.954,-16.893 53.911,-17.541c1.387,-0.46 1.85,-0.211 1.851,1.667c0.015,32.434 0.025,32.687 -1.115,33.695c-1.102,0.975 -50.503,37.06 -54.901,40.273c-3.649,2.666 -4.12,1.439 -16.342,-2.547c-11.627,-3.791 -12.912,-3.964 -18.671,-6.187c-0.069,-0.213 -0.961,-0.723 0.202,-2.064c1.103,-1.39 22.374,-30.615 29.322,-40.43Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M134.211,109.145c-2.261,10.966 -9.147,9.524 -14.529,15.765c-3.036,3.52 13.301,-0.252 14.752,3.031c1.839,4.16 -1.608,4.7 -2.017,4.764c-0.706,0.111 -20.73,0.241 -21.864,-0.088c-1.965,-0.569 -3.121,-7.189 8.521,-14.942c0.988,-0.658 13.138,-8.75 6.257,-13.459c-3.279,-2.244 -6.927,-0.596 -7.99,2.644c-0.899,2.74 -0.29,4.485 -5.207,4.309c-4.594,-0.164 -0.668,-9.975 3.122,-12.351c4.119,-2.583 9.979,-1.924 12.522,-0.732c7.449,3.492 6.405,10.587 6.432,11.058Z" style="fill:#e7e6f3;"/><path d="M101.875,127.125c-0.127,5.112 -0.607,6.886 -5.572,5.509c-3.941,-1.093 0.383,-20.919 -2.785,-22.311c-3.256,-1.431 -8.01,1.732 -7.425,-4.157c0.219,-2.203 6.11,-1.479 8.449,-4.815c2.091,-2.983 1.947,-3.916 5.576,-3.437c2.101,0.277 1.758,1.352 1.758,29.211Z" style="fill:#eae9f2;"/></g></svg>`,
    };
    const WILD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M24.168,18.091c3.604,-0.521 3.334,-1.734 6.94,-1.561c6.355,0.304 160.706,-0.71 166.478,0.55c3.501,0.765 10.984,5.419 10.888,15.545c-0.242,25.506 0.562,160.87 -0.477,164.974c-1.262,4.984 -6.653,10.466 -14.129,10.923c-11.258,0.688 -11.203,-0.048 -140.993,-0.048c-24.955,-0 -28.976,1.553 -35.024,-8.731c-1.501,-2.552 -1.325,-2.787 -1.325,-107.119c0,-63.43 -0.185,-63.541 1.31,-67.383c0.343,-0.883 0.203,-0.86 0.237,-1.768c2.08,-1.186 5.193,-4.549 6.096,-5.383Z" style="fill:#f1eddf;fill-opacity:1;"/><path d="M114.356,147.777c-13.091,-1.337 -25.512,-3.701 -27.089,-34.148c-1.054,-20.357 12.168,-42.409 33.76,-36.397c11.852,3.3 17.049,16.019 13.514,17.416c-0.427,0.169 -9.449,1.999 -11.64,-1.444c-0.727,-1.142 -8.122,-12.763 -16.694,-2.759c-3.187,3.719 -8.666,18.854 -1.403,13.676c11.793,-8.408 33.169,-2.123 32.638,19.248c-0.037,1.474 -0.254,10.227 -6.628,17.2c-6.496,7.106 -15.258,7.025 -16.457,7.208Z"/><path d="M123.791,124.838c-3.152,22.563 -29.159,8.762 -19.82,-8.913c4.463,-8.447 20.083,-7.671 19.82,8.913Z" style="fill:#f1eddf;"/></g></svg>`;

    const svgToDataUri = (svg) => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

    const MODIFIER_MIN = -6;
    const MODIFIER_MAX = 6;
    const DIFFICULTY_MIN = 0;
    const DEFAULT_MODIFIER = 0;
    const DEFAULT_TRAIT_DIFFICULTY = 4;
    const DEFAULT_FREE_DIFFICULTY = 0;
    const COLOR_POSITIVE = "#2e7d32";
    const COLOR_NEGATIVE = "#c62828";
    const MINUS = "−"; // real minus sign, as wide as the "+"

    const sum = (values) => values.reduce((total, value) => total + value, 0);

    // A die that rolled its maximum face exploded: it was rerolled and the new result added.
    const hasExploded = (die) => die.results.some(result => result === die.faces);

    // A number with the real minus sign when negative (a plain hyphen would look different from
    // the "−" used everywhere else on the card)
    const formatNumber = (value) => value < 0 ? `${MINUS}${Math.abs(value)}` : String(value);

    // "+2", "−2" or "0"
    const formatModifier = (modifier) =>
        modifier > 0 ? `+${modifier}` : (modifier < 0 ? `${MINUS}${Math.abs(modifier)}` : "0");

    const modifierColor = (modifier) =>
        modifier > 0 ? COLOR_POSITIVE : (modifier < 0 ? COLOR_NEGATIVE : "inherit");

    // The result of a die with a modifier: never below 1, whatever the modifier (a die that rolled 5
    // with a -6 counts as 1, not as -1).
    const dieResult = (die, modifier) => Math.max(1, sum(die.results) + modifier);

    // Results line of one die: the results (💥 marks an exploded one), then the modifier (green
    // if positive, red if negative), then "= sum" as soon as there is something to add up:
    //   5            (no explosion, no modifier)
    //   8💥 + 3 = 11  (explosion)
    //   5 + 2 = 7    (modifier, the "+ 2" being green)
    //   5 − 6 → 1    (the modifier would take the die below 1: it counts as 1, and a tooltip says so)
    const formatDieLine = (die, modifier) => {
        const text = die.results.map(result => result === die.faces ? `${result}💥` : `${result}`).join(" + ");
        if (!hasExploded(die) && modifier === 0) return text;
        const modifierHtml = modifier === 0 ? "" : ` <span style="color:${modifierColor(modifier)};font-weight:bold;">${modifier > 0 ? "+" : MINUS} ${Math.abs(modifier)}</span>`;
        const raw = sum(die.results) + modifier;
        const resultHtml = raw < 1
            ? `<span title="${foundry.utils.escapeHTML(t("card.minimum_result"))}">→ 1</span>`
            : `= ${formatNumber(raw)}`;
        return `${text}${modifierHtml} ${resultHtml}`;
    };

    // One flat "-" / "+" button, same look as the "Répondre" button of the private messages.
    // Its hover effect is done in JS (see the listeners below): a <style> tag in a message is
    // not applied.
    const stepButton = (field, delta, symbol, enabled) => `
        <button type="button" class="trait-roll-step" data-field="${field}" data-delta="${delta}" ${enabled ? "" : "disabled"} style="
            background: transparent;
            border: 1px solid rgb(159, 132, 117);
            border-radius: 4px;
            color: #5b3a1e;
            font-family: 'Segoe UI', Verdana, Arial, sans-serif;
            font-size: 1rem;
            font-weight: bold;
            line-height: 1;
            width: 28px;
            height: 28px;
            margin: 0;
            padding: 0;
            cursor: ${enabled ? "pointer" : "not-allowed"};
            opacity: ${enabled ? 1 : 0.4};
            transition: border-color 0.15s ease, background-color 0.15s ease;
        ">${symbol}</button>`;

    // "Label   [-]  value  [+]" row. The value is plain text: it cannot be typed in.
    const stepperRow = (label, field, valueText, valueColor, canDecrease, canIncrease) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:1rem;">${label}</span>
            <span style="display:flex;align-items:center;gap:8px;">
                ${stepButton(field, -1, MINUS, canDecrease)}
                <span class="trait-roll-value" data-field="${field}" style="min-width:2.5em;text-align:center;font-size:1.3rem;font-weight:bold;color:${valueColor};">${valueText}</span>
                ${stepButton(field, +1, "+", canIncrease)}
            </span>
        </div>`;

    // One line of the dice list: the die icon, then its text (the label is only the alt text).
    const dieRowHtml = (die, label, lineText) => `
                <div style="display:flex;align-items:center;gap:6px;">
                    <img src="${svgToDataUri(die.type === "wild" ? WILD_DIE_ICON_SVG : DIE_ICON_SVG[die.faces])}" alt="${label}" style="width:24px;height:24px;" />
                    <span>${lineText}</span>
                </div>`;

    // The button under the controls: "Jet définitif" the first time (it applies the modifier and the
    // difficulty and reveals the result), then "Ajuster" (it applies the new values). Same look as
    // the "-" / "+" buttons, with the same hover effect done in JS.
    const applyButton = (label) => `
        <button type="button" class="trait-roll-apply" style="
            background: transparent;
            border: 1px solid rgb(159, 132, 117);
            border-radius: 4px;
            color: #5b3a1e;
            font-family: 'Segoe UI', Verdana, Arial, sans-serif;
            font-size: 0.95rem;
            font-weight: bold;
            line-height: 1;
            width: auto;
            flex: 0 0 auto;
            margin: 2px auto 0;
            padding: 7px 16px;
            cursor: pointer;
            transition: border-color 0.15s ease, background-color 0.15s ease;
        ">${label}</button>`;

    // The modifier / difficulty controls and their button, shown to the author of the roll and to
    // the GM only. "settings" are the values being set: they only reach the card when the button
    // is clicked.
    const adjustZoneHtml = (settings, isFinal) => `
            <div class="trait-roll-adjust" style="border-top:1px solid rgba(139,94,60,0.4);padding-top:8px;display:flex;flex-direction:column;gap:6px;">
                ${stepperRow(t("card.modifier"), "modifier", formatModifier(settings.modifier), modifierColor(settings.modifier), settings.modifier > MODIFIER_MIN, settings.modifier < MODIFIER_MAX)}
                ${stepperRow(t("card.difficulty"), "difficulty", String(settings.difficulty), "inherit", settings.difficulty > DIFFICULTY_MIN, true)}
                <div style="display:flex;justify-content:center;">${applyButton(isFinal ? t("card.adjust") : t("card.final_roll"))}</div>
            </div>`;

    // The parchment card shared by every roll: the author's avatar and one line per die, the big
    // total (in "totalColor": green on a success, red on a failure, brown by default), then
    // "belowTotalHtml" (calculation detail, result, adjust controls).
    const cardHtml = (author, diceRows, totalDisplay, totalColor, belowTotalHtml) => `
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
                <div class="trait-roll-dice" style="display:flex;align-items:center;gap:12px;">
                    <img src="${foundry.utils.escapeHTML(author?.avatar ?? "icons/svg/mystery-man.svg")}" alt="${foundry.utils.escapeHTML(t("common.avatar_of", { name: author?.name ?? "" }))}" style="width:64px;height:64px;border-radius:6px;border:1px solid #8b5e3c;object-fit:cover;" />
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        ${diceRows}
                    </div>
                </div>

                <!-- font-size is in rem so it scales with the chat's own font-size setting -->
                <div class="trait-roll-total" style="
                    width:100%;
                    text-align:center;
                    font-size:3rem;
                    font-weight:bold;
                    color:${totalColor ?? "#5b3a1e"};
                    text-shadow:1px 1px 2px rgba(0,0,0,0.3);
                    border-top:1px solid #8b5e3c;
                    padding-top:6px;
                ">
                    ${totalDisplay}
                </div>

                ${belowTotalHtml}
            </div>`;

    // SWADE trait roll card (flags.world.traitRoll), drawn from the flags. Until "Jet définitif" is
    // clicked (flags.world.traitRoll.final), the card shows the raw roll: the dice, the best die as
    // the total (and the skull on a double 1), with no modifier, no result and no color. "canAdjust"
    // (author of the roll, or GM) decides whether the controls are shown, with "settings", the
    // values being set.
    const buildTraitRollCard = (message, data, canAdjust, settings) => {
        const isFinal = data.final === true;
        const modifier = isFinal ? (data.modifier ?? DEFAULT_MODIFIER) : 0;
        const difficulty = data.difficulty ?? DEFAULT_TRAIT_DIFFICULTY;

        // The roll keeps the higher of the two dice (SWADE); the modifier applies to each die, and a
        // die is never below 1 (dieResult).
        const total = Math.max(...data.dice.map(die => dieResult(die, modifier)));

        // Critical failure: the trait die and the wild die both show 1 on their first roll. It
        // depends on the dice only, so it shows at once and whatever the modifier: the skull
        // replaces the total.
        const criticalFailure = data.dice.every(die => die.results[0] === 1);
        const totalDisplay = criticalFailure ? "💀" : formatNumber(total);

        // Once final, the total is green on a success and red on a failure (the skull keeps its own look)
        const success = total >= difficulty;
        const totalColor = (isFinal && !criticalFailure) ? (success ? COLOR_POSITIVE : COLOR_NEGATIVE) : undefined;

        const diceRows = data.dice.map(die =>
            dieRowHtml(die, die.type === "wild" ? t("dice.wild_die") : t("dice.trait_die", { faces: die.faces }), formatDieLine(die, modifier))
        ).join("");

        // Result, once final: Échec / Réussite against the difficulty, and one raise per full 4
        // points above it. Nothing about the result on a critical failure.
        let resultHtml = "";
        if (isFinal) {
            const lines = [];
            if (!criticalFailure) {
                const raises = success ? Math.floor((total - difficulty) / 4) : 0;
                lines.push(`<div style="font-size:1.3rem;font-weight:bold;">${success ? t("card.success") : t("card.failure")}</div>`);
                if (raises >= 1) {
                    lines.push(`<div style="font-size:1.15rem;">${t("card.raises", { n: raises })}</div>`);
                }
            }
            lines.push(`<div style="font-size:0.85rem;opacity:0.7;">${t("card.details_trait", { difficulty, modifier: formatModifier(modifier) })}</div>`);
            resultHtml = `<div class="trait-roll-result" style="text-align:center;">${lines.join("")}</div>`;
        }

        return cardHtml(message.author, diceRows, totalDisplay, totalColor, resultHtml + (canAdjust ? adjustZoneHtml(settings, isFinal) : ""));
    };

    // Free roll card (flags.world.freeRoll): any palette roll that is not a trait roll. Every die
    // is added up (nothing is compared with a wild die), the modifier is added once to the sum, and
    // there are no raises. Same as the trait roll card, the modifier, the result and the color only
    // show once "Jet définitif" has been clicked.
    const buildFreeRollCard = (message, data, canAdjust, settings) => {
        const isFinal = data.final === true;
        const modifier = isFinal ? (data.modifier ?? DEFAULT_MODIFIER) : 0;
        const difficulty = data.difficulty ?? DEFAULT_FREE_DIFFICULTY;

        const diceTotal = sum(data.dice.map(die => sum(die.results)));
        const total = diceTotal + modifier;

        // One line per die, without the modifier (it applies to the whole sum, not to each die)
        const diceRows = data.dice.map(die =>
            dieRowHtml(die, die.type === "wild" ? t("dice.wild_die") : `d${die.faces}`, formatDieLine(die, 0))
        ).join("");

        // The calculation of the total, under it, when there is a modifier: "11 + 2" (the "+ 2"
        // green when positive, "− 3" red when negative)
        const calculationHtml = modifier === 0 ? "" : `
                <div class="trait-roll-calculation" style="text-align:center;font-size:1.1rem;">${diceTotal} <span style="color:${modifierColor(modifier)};font-weight:bold;">${modifier > 0 ? "+" : MINUS} ${Math.abs(modifier)}</span></div>`;

        // Result: only once final and with a difficulty (0 = no difficulty, nothing is shown). The
        // total is then green on a success and red on a failure.
        let resultHtml = "";
        let totalColor;
        if (isFinal && difficulty >= 1) {
            totalColor = total >= difficulty ? COLOR_POSITIVE : COLOR_NEGATIVE;
            resultHtml = `
                <div class="trait-roll-result" style="text-align:center;">
                    <div style="font-size:1.3rem;font-weight:bold;">${total >= difficulty ? t("card.success") : t("card.failure")}</div>
                    <div style="font-size:0.85rem;opacity:0.7;">${t("card.details_free", { difficulty })}</div>
                </div>`;
        }

        return cardHtml(message.author, diceRows, formatNumber(total), totalColor, calculationHtml + resultHtml + (canAdjust ? adjustZoneHtml(settings, isFinal) : ""));
    };

    // The two kinds of card: the message flag holding the roll, how to draw it, and the default
    // difficulty (used when the flag has none).
    const ROLL_CARDS = {
        traitRoll: { build: buildTraitRollCard, defaultDifficulty: DEFAULT_TRAIT_DIFFICULTY },
        freeRoll: { build: buildFreeRollCard, defaultDifficulty: DEFAULT_FREE_DIFFICULTY }
    };

    // Values being set with the "-" / "+" buttons, per message. They are kept in memory on the
    // client of the person setting them: nothing is sent to the others until the "Jet définitif" /
    // "Ajuster" button is clicked. They survive a redraw of the chat, not a reload of the page. An
    // entry remembers the applied values it started from and is dropped if they changed meanwhile.
    const pendingSettings = new Map();

    // The values last applied to each message, as seen by this client (see renderRollCard).
    const appliedSeen = new Map();

    // Draws the card of a message into its element, and wires up its buttons.
    const renderRollCard = (message, html, flagKey) => {
        const card = ROLL_CARDS[flagKey];
        const data = message.getFlag("world", flagKey);
        const contentEl = html.querySelector(".message-content");
        if (!contentEl) return;

        // The values applied to the card, and the values being set (the applied ones by default)
        const applied = { modifier: data.modifier ?? DEFAULT_MODIFIER, difficulty: data.difficulty ?? card.defaultDifficulty };
        const appliedKey = `${applied.modifier}|${applied.difficulty}|${data.final === true}`;

        // When someone applies new values ("Jet définitif" / "Ajuster"), show the updated card again
        // in the chat notifications. With the chat sidebar collapsed, the card of a message fades
        // away a few seconds after it appeared, and an update does not bring it back by itself.
        // The first time a client renders a message (a new message, or the page loading) is not an
        // update: Foundry notifies new messages itself. Redrawing the card for the same values (the
        // "-" / "+" buttons, the notification card itself) does not notify again, so there is no loop.
        // The call is deferred so that this render is over, and skipped when Foundry would not show
        // chat notifications anyway (chat open, or the setting turned off).
        const previousKey = appliedSeen.get(message.id);
        appliedSeen.set(message.id, appliedKey);
        if (previousKey !== undefined && previousKey !== appliedKey) {
            setTimeout(() => {
                if (ui.chat?._shouldShowNotifications && !ui.chat._shouldShowNotifications()) return;
                ui.chat?.notify?.(message, { newMessage: true });
            }, 0);
        }
        const pending = pendingSettings.get(message.id);
        const settings = pending?.appliedKey === appliedKey ? pending.settings : { ...applied };

        // Only the author of the roll and the GM can adjust it.
        const canAdjust = game.user.isGM || message.author?.id === game.user.id;
        contentEl.innerHTML = card.build(message, data, canAdjust, settings);

        html.querySelectorAll(".trait-roll-step, .trait-roll-apply").forEach(btn => {
            // Hover fill, same as the "Répondre" button (a disabled button does not react)
            btn.addEventListener("mouseenter", () => {
                if (btn.disabled) return;
                btn.style.backgroundColor = "rgb(201, 89, 63)";
                btn.style.borderColor = "rgb(231, 209, 177)";
                btn.style.color = "#ffffff";
            });
            btn.addEventListener("mouseleave", () => {
                btn.style.backgroundColor = "transparent";
                btn.style.borderColor = "rgb(159, 132, 117)";
                btn.style.color = "#5b3a1e";
            });
        });

        // "-" / "+": only change the values being set, then redraw the card (which keeps showing
        // the applied values)
        html.querySelectorAll(".trait-roll-step").forEach(btn => {
            btn.addEventListener("click", () => {
                const next = { ...settings };
                const delta = Number(btn.dataset.delta);
                if (btn.dataset.field === "modifier") {
                    next.modifier = Math.min(MODIFIER_MAX, Math.max(MODIFIER_MIN, next.modifier + delta));
                } else {
                    next.difficulty = Math.max(DIFFICULTY_MIN, next.difficulty + delta);
                }
                pendingSettings.set(message.id, { appliedKey, settings: next });
                renderRollCard(message, html, flagKey);
            });
        });

        // "Jet définitif" / "Ajuster": apply the values being set. They are stored in the flags,
        // Foundry then re-renders the message on every client and the card is redrawn by this hook.
        html.querySelector(".trait-roll-apply")?.addEventListener("click", async () => {
            try {
                await message.update({
                    [`flags.world.${flagKey}.modifier`]: settings.modifier,
                    [`flags.world.${flagKey}.difficulty`]: settings.difficulty,
                    [`flags.world.${flagKey}.final`]: true
                });
                pendingSettings.delete(message.id);
            } catch (error) {
                console.error("Custom | Could not adjust the roll card", error);
                ui.notifications.warn(t("card.update_failed"));
            }
        });
    };

    Hooks.on("renderChatMessageHTML", (message, html) => {
        const flagKey = Object.keys(ROLL_CARDS).find(key => message.getFlag("world", key)?.dice?.length);
        if (!flagKey) return; // not a roll card
        renderRollCard(message, html, flagKey);
    });
}

// Registers one Dice So Nice colorset per die size (plus the SWADE wild/joker die), so that
// the [basic-dN] / [basic-wild-die] flavor tags used in the roll formulas (trait-roll-*.js,
// custom-roll.js) resolve to a distinct look for each die.
Hooks.once('diceSoNiceReady', (dice3d) => {

    console.log('Test | Dice So Nice is loaded');

    dice3d.addColorset({
        name: 'basic-wild-die',
        description: t("colorset.wild_die"),
        category: 'Colors',
        foreground: ['#000000'],
        background: ['#EAF1F6'],
        outline: ['#2F2A13'],
        edge: ['#D6DBDF'],
        texture: 'none',
        material: 'plastic',
        font: 'Arial',
        fontScale: 2
    });

    dice3d.addColorset({
        name: 'basic-d4',
        description: t("colorset.d4"),
        category: 'Colors',
        foreground: ['#FFFFFF'],
        background: ['#297243'],
        outline: ['#2F2A13'],
        texture: 'none',
        material: 'plastic',
        font: 'Arial'
    });

    dice3d.addColorset({
        name: 'basic-d6',
        description: t("colorset.d6"),
        category: 'Colors',
        foreground: ['#000000'],
        background: ['#D4B42D'],
        outline: ['#2F2A13'],
        edge: ['#A68C1F'],
        texture: 'none',
        material: 'plastic',
        font: 'Arial',
        fontScale: 2
    });

    dice3d.addColorset({
        name: 'basic-d8',
        description: t("colorset.d8"),
        category: 'Colors',
        foreground: ['#FFFFFF'],
        background: ['#C50000'],
        outline: ['#2F2A13'],
        edge: ['#CA1E1E'],
        texture: 'none',
        material: 'plastic',
        font: 'Arial'
    });

    dice3d.addColorset({
        name: 'basic-d10',
        description: t("colorset.d10"),
        category: 'Colors',
        foreground: ['#FFFFFF'],
        background: ['#4C4297'],
        outline: ['#6554E2'],
        edge: ['#5A4FA8'],
        texture: 'none',
        material: 'plastic',
        font: 'Arial'
    });

    dice3d.addColorset({
        name: 'basic-d12',
        description: t("colorset.d12"),
        category: 'Colors',
        foreground: ['#FFFFFF'],
        background: ['#184285'],
        outline: ['#2F2A13'],
        edge: ['#365D9A'],
        texture: 'none',
        material: 'plastic',
        font: 'Arial'
    });

});

console.log('Custom | All session start macros have been launched');