(async () => {
    const players = game.users.filter(u => u.active && u.id !== game.user.id);
    if (!players.length) return ui.notifications.warn(t("whisper.none_active"));

    const optionsHtml = players.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

    const dialog = new foundry.applications.api.DialogV2({
        window: { title: t("whisper.send_title") },
        content: `
      <div class="form-group" style="width:600px;">
        <label for="recipient">${t("whisper.recipient")}</label>
        <select id="recipient" name="recipient" class="w-full">${optionsHtml}</select>
      </div>
      <div class="form-group">
        <label for="whisper-message">${t("whisper.message")}</label>
        <textarea id="whisper-message" name="message" rows="4" class="w-full" style="font-size:1.1rem;"></textarea>
      </div>
    `,
        buttons: [{
            action: "send",
            label: t("common.send"),
            default: true,
            callback: (_event, button) => {
                const form = button.closest("form");
                const recipientId = form.querySelector("#recipient")?.value;
                const message = form.querySelector("#whisper-message")?.value.trim();
                if (!recipientId || !message) return true;

                // Sending user's avatar
                const avatar = game.user.character?.img || game.user.avatar || "icons/svg/mystery-man.svg";

                // PARCHMENT STYLE (matching trait-roll.js's visual style): beige/gold parchment
                // background, #8b5e3c border, Garamond/Palatino font & gold-brass button.
                // Layout mirrors the dice-roll result cards (trait-roll.js/custom-roll.js): an
                // avatar+title header row, a simple divider, then the full-width message body.
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
            <!-- The "Répondre" (Reply) button's fill-on-hover effect is handled in JS by
                 start-session.js's renderChatMessageHTML hook: a <style> tag here would not
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
                ${t("whisper.header")}
              </div>
            </div>

            <!-- Simple divider -->
            <div style="height: 1px; background: rgba(139, 94, 60, 0.4);"></div>

            <!-- Message body (more legible sans-serif font, tightened line height) -->
            <div class="fantasy-whisper-body" style="
              font-family: 'Segoe UI', Verdana, Arial, sans-serif;
              font-size: 1.2rem;
              line-height: 1.2;
              color: #3b2f20;
              word-break: break-word;
            ">
              ${foundry.utils.escapeHTML(message)}
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

                // FOUNDRY'S NATIVE HEADER ALIAS (the name shown above the card, next to the
                // timestamp): without an explicit "speaker", Foundry defaults to the user's
                // assigned character (game.user.character), which would show the player's PC
                // name instead of the player's own account name. So we force it explicitly:
                // - the Gamemaster => their assigned character (e.g. "Meneur de jeu"), or their
                //   account name if none is assigned
                // - a player => always their account name, never their PC's name
                const senderAlias = game.user.isGM ? (game.user.character?.name || game.user.name) : game.user.name;

                // Create the whisper (private) chat message in Foundry.
                // The "WHISPER" style is now inferred automatically from the presence of the
                // "whisper" array alone: setting it explicitly has been deprecated since
                // Foundry v12.
                ChatMessage.create({
                    content,
                    speaker: { alias: senderAlias },
                    whisper: [recipientId],
                    // Remember the sender in flags so the reply flow knows who to reply to
                    flags: { world: { whisperReply: { replyTo: game.user.id } } }
                });

                return true;
            }
        }, { action: "cancel", label: t("common.cancel") }]
    });

    dialog.render({ force: true });
})();