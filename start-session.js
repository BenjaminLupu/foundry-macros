// À charger une fois par client (module monde ou macro d’amorçage)

console.log('Custom | Session starts');

console.log('Custom | Session start macros');

if (!game._whisperReplyHooked) {

    console.log('Custom | Hook on renderChatMessage for whispers');

    game._whisperReplyHooked = true;

    Hooks.on("renderChatMessage", (message, $html) => {

        const html = $html[0];

        // MASQUAGE DYNAMIQUE : Si l'utilisateur qui regarde le chat log est l'auteur du message,
        // on lui cache le bouton "Répondre" pour éviter l'auto-réponse.
        if (message.user.id === game.user.id) {
            html.querySelectorAll(".whisper-reply")?.forEach(btn => {
                btn.style.display = "none";
            });
        }

        // TITRE DYNAMIQUE : Modifie le titre du message selon que le client actuel est l'envoyeur
        // (icône 📤) ou le destinataire (icône 📥). Le libellé reste toujours "message"
        // (jamais "réponse"), qu'il s'agisse d'un message initial ou d'une réponse.
        const headerEl = html.querySelector(".fantasy-whisper-header");
        if (headerEl) {
            if (message.user.id === game.user.id) {
                // Si l'utilisateur connecté est l'auteur du chuchotement
                headerEl.innerHTML = "📤 Envoi message privé";
            } else {
                // Si l'utilisateur connecté est le destinataire du chuchotement
                headerEl.innerHTML = "📥 Réception message privé";
            }
        }

        // DESTINATAIRE DANS L'EN-TÊTE NATIF FOUNDRY (la ligne horodatée "... à: Destinataire" au-dessus
        // de la carte) : Foundry l'affiche à partir du nom de compte des destinataires (message.whisper),
        // ce qui donne par exemple "à: Gamemaster". On le remplace par le personnage assigné au Gamemaster
        // (ex. "Meneur de jeu") quand celui-ci fait partie des destinataires du chuchotement.
        // On ne touche qu'aux nœuds de texte situés HORS de notre carte (.swade-chat-message), pour ne
        // jamais modifier par erreur le corps du message si un joueur y a tapé le mot "Gamemaster".
        if (message.whisper?.length) {
            const cardEl = html.querySelector(".swade-chat-message");
            message.whisper.forEach(recipientId => {
                const recipient = game.users.get(recipientId);
                if (!recipient?.isGM) return; // seul le destinataire Gamemaster est concerné
                const gmDisplayName = recipient.character?.name || recipient.name;
                if (gmDisplayName === recipient.name) return; // pas de personnage assigné : rien à corriger

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

        // Helper pour ouvrir une saisie et envoyer un whisper
        const replyFlow = async (targetIds) => {
            const dlg = new foundry.applications.api.DialogV2({
                window: { title: "Répondre en privé" },
                content: `
          <div class="form-group" style="width:600px;">
            <label for="reply-text">Message :</label>
            <textarea id="reply-text" rows="4" class="w-full"></textarea>
          </div>
      `,
                buttons: [{
                    action: "send",
                    label: "Envoyer",
                    default: true,
                    callback: (event, button) => {
                        const text = button.form.querySelector("#reply-text")?.value.trim();
                        if (!text) return true;

                        // Récupération dynamique de l'avatar du joueur actuel qui répond
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
              /* Animations de survol (hover) locales pour le bouton Répondre */
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

            <!-- Image de l'avatar de réponse (verrouillée inline à 64px, alignée sur trait-roll.js, pour bypasser les styles Foundry) -->
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
              <!-- En-tête de la réponse privée -->
              <div class="fantasy-whisper-header" style="
                font-family: 'Garamond', 'Palatino Linotype', serif;
                font-weight: bold;
                font-size: 0.9rem;
                color: #5b3a1e; /* Même couleur accent que le résultat final dans trait-roll.js */
                letter-spacing: 0.5px;
                text-transform: uppercase;
              ">
                📩 Réponse privée
              </div>

              <!-- Séparateur ornemental (ligne dégradée avec diamant central) -->
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

              <!-- Corps de la réponse -->
              <div class="fantasy-whisper-body" style="
                font-family: 'Garamond', 'Palatino Linotype', serif;
                font-size: 0.95rem;
                line-height: 1.35;
                color: #3b2f20;
                word-break: break-word;
              ">
                ${foundry.utils.escapeHTML(text)}
              </div>

              <!-- Bouton d'action "Répondre" (laiton or brossé 3D) -->
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

                        // ALIAS DE L'EN-TÊTE NATIF FOUNDRY (voir même logique dans private-message.js) :
                        // Gamemaster => son personnage assigné, joueur => toujours son nom de compte.
                        const senderAlias = game.user.isGM ? (game.user.character?.name || game.user.name) : game.user.name;

                        // Création du whisper de réponse avec flag whisperReply pour mémoriser l'auteur
                        ChatMessage.create({
                            content: content,
                            speaker: { alias: senderAlias },
                            type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
                            whisper: targetIds,
                            flags: { world: { whisperReply: { replyTo: game.user.id } } }
                        });
                        return true;
                    }
                }, { action: "cancel", label: "Annuler" }]
            });
            dlg.render({ force: true });
        };

        // Bouton "Répondre" (à l’auteur)
        html.querySelectorAll(".whisper-reply")?.forEach(btn => {
            btn.addEventListener("click", async () => {
                const replyToFlag = message.getFlag("world", "whisperReply");
                const authorId = replyToFlag?.replyTo ?? message.user.id;
                const target = game.users.get(authorId);
                if (!target) return ui.notifications.warn("Auteur introuvable.");
                await replyFlow([authorId]);
            });
        });

    });

}

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