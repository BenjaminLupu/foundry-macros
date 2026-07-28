(async () => {
    const players = game.users.filter(u => u.active && u.id !== game.user.id);
    if (!players.length) return ui.notifications.warn("Aucun joueur actif.");

    const optionsHtml = players.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

    const dialog = new foundry.applications.api.DialogV2({
        window: { title: "Envoyer un message privé" },
        content: `
      <div class="form-group" style="width:600px;">
        <label for="recipient">Destinataire :</label>
        <select id="recipient" name="recipient" class="w-full">${optionsHtml}</select>
      </div>
      <div class="form-group">
        <label for="whisper-message">Message :</label>
        <textarea id="whisper-message" name="message" rows="4" class="w-full"></textarea>
      </div>
    `,
        buttons: [{
            action: "send",
            label: "Envoyer",
            default: true,
            callback: (_event, button) => {
                const form = button.closest("form");
                const recipientId = form.querySelector("#recipient")?.value;
                const message = form.querySelector("#whisper-message")?.value.trim();
                if (!recipientId || !message) return true;

                // Avatar de l'utilisateur
                const avatar = game.user.character?.img || game.user.avatar || "icons/svg/mystery-man.svg";

                // STYLE PARCHEMIN (aligné sur la charte graphique de trait-roll.js) : parchemin
                // beige/or, bordure #8b5e3c, police Garamond/Palatino & bouton laiton or.
                const content = `
          <div class="swade-chat-message fantasy-whisper-card" style="
            display: flex;
            align-items: flex-start;
            background: linear-gradient(145deg, #f6ecd7, #e6d8b3); /* Même dégradé parchemin que trait-roll.js */
            border: 2px solid #8b5e3c; /* Même bordure marron que trait-roll.js */
            box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.3); /* Même ombre portée que trait-roll.js */
            border-radius: 12px;
            padding: 12px;
            font-family: 'Garamond', 'Palatino Linotype', serif;
            color: #3b2f20;
            position: relative;
          ">
            <style>
              /* Styles locaux pour les animations de survol (hover) sur le bouton Répondre */
              .fantasy-whisper-reply-btn:hover {
                background: linear-gradient(to bottom, #e5c158, #c6941e) !important;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4) !important;
                transform: translateY(-0.5px);
              }
              .fantasy-whisper-reply-btn:active {
                transform: translateY(0.5px);
                box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
              }
            </style>

            <!-- Image de l'avatar (dimensions verrouillées inline à 64px, alignées sur trait-roll.js, pour bypasser les styles globaux de Foundry) -->
            <img class="fantasy-whisper-avatar" src="${foundry.utils.escapeHTML(avatar)}" alt="Avatar de ${foundry.utils.escapeHTML(game.user.name)}" style="
              width: 64px;
              height: 64px;
              min-width: 64px;
              max-width: 64px;
              border-radius: 6px;
              border: 2px solid #8b5e3c;
              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
              object-fit: cover;
              margin-right: 10px;
              display: block;
            ">
            <div class="fantasy-whisper-content" style="flex: 1; min-width: 0;">
              <!-- En-tête du message privé -->
              <div class="fantasy-whisper-header" style="
                font-family: 'Garamond', 'Palatino Linotype', serif;
                font-weight: bold;
                font-size: 0.9rem;
                color: #5b3a1e; /* Même couleur accent que le résultat final dans trait-roll.js */
                letter-spacing: 0.5px;
                text-transform: uppercase;
              ">
                ✉️ Message privé
              </div>

              <!-- Séparateur ornemental (ligne dégradée avec un losange central pivoté) -->
              <div class="fantasy-whisper-divider" style="
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 4px 0 6px 0;
              ">
                <div style="flex: 1; height: 1px; background: linear-gradient(to right, rgba(139, 94, 60, 0), rgba(139, 94, 60, 0.4), rgba(139, 94, 60, 0));"></div>
                <div style="width: 5px; height: 5px; transform: rotate(45deg); background-color: #8b5e3c; margin: 0 6px;"></div>
                <div style="flex: 1; height: 1px; background: linear-gradient(to right, rgba(139, 94, 60, 0), rgba(139, 94, 60, 0.4), rgba(139, 94, 60, 0));"></div>
              </div>

              <!-- Corps du message -->
              <div class="fantasy-whisper-body" style="
                font-family: 'Garamond', 'Palatino Linotype', serif;
                font-size: 0.95rem;
                line-height: 1.35;
                color: #3b2f20;
                word-break: break-word;
              ">
                ${foundry.utils.escapeHTML(message)}
              </div>

              <!-- Bouton d'action "Répondre" (Style laiton or brossé 3D) -->
              <div class="whisper-actions" style="text-align: left;">
                <button type="button"
                        class="whisper-reply fantasy-whisper-reply-btn"
                        data-reply-to="${game.user.id}"
                        style="
                          background: linear-gradient(to bottom, #d4af37, #aa7c11);
                          border: 1px solid #8b5e3c;
                          border-radius: 4px;
                          color: #ffffff !important;
                          font-family: 'Garamond', 'Palatino Linotype', serif;
                          font-size: 0.75rem;
                          font-weight: bold;
                          text-transform: uppercase;
                          padding: 3px 8px;
                          cursor: pointer;
                          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
                          transition: all 0.15s ease;
                          display: inline-block;
                          margin-top: 6px;
                        ">
                  Répondre
                </button>
              </div>
            </div>
          </div>
        `;

                // ALIAS DE L'EN-TÊTE NATIF FOUNDRY (le nom affiché au-dessus de la carte, à côté de l'horodatage) :
                // sans "speaker" explicite, Foundry prend par défaut le personnage assigné à l'utilisateur
                // (game.user.character), ce qui affichait le PJ du joueur au lieu de son nom. On force donc :
                // - le Gamemaster => son personnage assigné (ex. "Meneur de jeu"), sinon son nom de compte
                // - un joueur => toujours son nom de compte, jamais celui de son PJ
                const senderAlias = game.user.isGM ? (game.user.character?.name || game.user.name) : game.user.name;

                // Création du message de chuchotement (whisper) dans Foundry
                ChatMessage.create({
                    content,
                    speaker: { alias: senderAlias },
                    type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                    whisper: [recipientId],
                    // Mémorisation de l'auteur dans les flags pour permettre d'identifier à qui répondre
                    flags: { world: { whisperReply: { replyTo: game.user.id } } }
                });

                return true;
            }
        }, { action: "cancel", label: "Annuler" }]
    });

    dialog.render({ force: true });
})();