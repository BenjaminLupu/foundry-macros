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
                headerEl.innerHTML = "📤 Envoi message privé";
            } else {
                // The logged-in user is the whisper's recipient
                headerEl.innerHTML = "📥 Réception message privé";
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

        // Helper that opens an input dialog and sends a whisper reply. "targetLabel" (e.g.
        // "à Amandine" or "au Meneur de jeu") is already built by the caller and embedded in
        // the dialog's title.
        const replyFlow = async (targetIds, targetLabel) => {
            const dlg = new foundry.applications.api.DialogV2({
                window: { title: `Répondre en privé ${targetLabel}` },
                content: `
          <div class="form-group" style="width:600px;">
            <label for="reply-text">Message :</label>
            <textarea id="reply-text" rows="4" class="w-full" style="font-size:1.1rem;"></textarea>
          </div>
      `,
                buttons: [{
                    action: "send",
                    label: "Envoyer",
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
              <img class="fantasy-whisper-avatar" src="${foundry.utils.escapeHTML(avatar)}" alt="Avatar de ${foundry.utils.escapeHTML(game.user.name)}" style="
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
                📩 Réponse privée
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
                Répondre
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
                }, { action: "cancel", label: "Annuler" }]
            });
            dlg.render({ force: true });
        };

        // "Répondre" (Reply) button — replies to the original author
        html.querySelectorAll(".whisper-reply")?.forEach(btn => {
            btn.addEventListener("click", async () => {
                const replyToFlag = message.getFlag("world", "whisperReply");
                const authorId = replyToFlag?.replyTo ?? message.author.id;
                const target = game.users.get(authorId);
                if (!target) return ui.notifications.warn("Auteur introuvable.");
                // The Gamemaster is always referred to by their assigned character (e.g.
                // "Meneur de jeu"), never by their account name — same convention as the
                // rest of this file.
                const targetLabel = target.isGM
                    ? `au ${target.character?.name || target.name}`
                    : `à ${target.name}`;
                await replyFlow([authorId], targetLabel);
            });
        });

    });

}

// Registers one Dice So Nice colorset per die size (plus the SWADE wild/joker die), so that
// the [basic-dN] / [basic-wild-die] flavor tags used in the roll formulas (trait-roll-*.js,
// custom-roll.js) resolve to a distinct look for each die.
Hooks.once('diceSoNiceReady', (dice3d) => {

    console.log('Test | Dice So Nice is loaded');

    dice3d.addColorset({
        name: 'basic-wild-die',
        description: 'D6 blanc pour le dé joker SWADE',
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
        description: 'D4 vert pour SWADE',
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
        description: 'D6 jaune pour SWADE',
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
        description: 'D8 rouge pour SWADE',
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
        description: 'D10 violet pour SWADE',
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
        description: 'D12 bleu pour SWADE',
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