/* Spend a Benny (jeton).

   A player spends one of the Bennies of their assigned character, the Game Master spends one of
   the GM's own Bennies. A player who owns several characters first chooses, in a small window,
   which character spends the Benny. The SWADE system does the work (the Benny count, its Dice So
   Nice animation, its hooks, the "hard choices" rule): this macro only calls spendBenny() and
   posts a card in the chat, drawn by start-session.js (see its "ROLL CARDS" block) from the data
   stored in the message flags (flags.world.bennyCard).

   No window for the GM or for a player with one character at most. When the Benny cannot be
   spent, a notification says why. */

(async () => {
  const user = game.user;

  // This needs a SWADE system that provides User#spendBenny
  if (typeof user.spendBenny !== "function") {
    ui.notifications.warn(t("benny.api_missing"));
    return;
  }

  // The characters a player owns explicitly (never through the default ownership). The GM has no
  // choice to make: the GM spends the GM's own Bennies.
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  const owned = user.isGM ? [] : game.actors
    .filter(actor => actor.type === "character" && (actor.ownership?.[user.id] ?? 0) >= OWNER)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Several characters: the player chooses which one spends the Benny
  if (owned.length > 1) {
    await chooseCharacter(owned);
    return;
  }

  // A player spends the Bennies of their assigned character; without one there is nothing to spend
  if (!user.isGM && !user.character) {
    ui.notifications.warn(t("benny.no_character"));
    return;
  }

  // The card is signed by the assigned character, or by the GM's account name if there is none
  // (same convention as the private messages)
  await spend(user, user.character?.name || user.name, user.character?.img || user.avatar);

  // Spends a Benny of "source" (the user, or one of the characters) and posts the card. Returns
  // true when the Benny was spent; otherwise a notification says why.
  async function spend(source, name, avatar) {
    let spent;
    try {
      spent = await source.spendBenny();
    } catch (error) {
      console.error("Custom | Could not spend a Benny", error);
      ui.notifications.warn(t("benny.not_allowed"));
      return false;
    }

    // spendBenny() answers false when there is no Benny left
    if (!spent) {
      ui.notifications.warn(t("benny.none_left"));
      return false;
    }

    // What is left after this one (the character's Bennies, or the GM's pool), shown in small text
    // under the message. spendBenny() has finished updating the count at this point.
    const remaining = Number.isInteger(source.bennies) ? source.bennies : undefined;

    // The text of the content is only a fallback, shown if start-session.js is not active on a client
    ChatMessage.create({
      speaker: { alias: name },
      content: `<p>${foundry.utils.escapeHTML(t("benny.spent", { name }))}</p>`,
      flags: { world: { bennyCard: { name, avatar, ...(remaining === undefined ? {} : { remaining }) } } }
    });
    return true;
  }

  // The window: one avatar per character (portrait to click, name, Bennies now). A character with
  // no Benny left is greyed out and cannot be chosen; the assigned character is chosen at first.
  async function chooseCharacter(characters) {
    if (typeof characters[0].spendBenny !== "function") {
      ui.notifications.warn(t("benny.api_missing"));
      return;
    }
    if (!characters.some(actor => actor.bennies > 0)) {
      ui.notifications.warn(t("benny.none_left"));
      return;
    }

    const escape = (text) => foundry.utils.escapeHTML(String(text));
    const count = (actor) => (Number.isInteger(actor.bennies) ? actor.bennies : 0);

    let selectedId = characters.find(actor => actor.id === user.character?.id && count(actor) > 0)?.id ?? null;

    const tileHtml = (actor) => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:92px;${count(actor) > 0 ? "" : "opacity:0.4;"}">
        <img class="spend-avatar" data-actor-id="${escape(actor.id)}" data-empty="${count(actor) > 0 ? "0" : "1"}" src="${escape(actor.img)}" alt="${escape(actor.name)}" title="${escape(actor.name)}" style="width:64px;height:64px;object-fit:cover;cursor:${count(actor) > 0 ? "pointer" : "not-allowed"};box-sizing:border-box;border-radius:6px;border:2px solid transparent;transition:border-color 0.15s ease, box-shadow 0.15s ease;" />
        <div style="font-size:0.95rem;font-weight:bold;text-align:center;overflow-wrap:anywhere;line-height:1.15;">${escape(actor.name)}</div>
        <div style="font-size:0.8rem;opacity:0.75;">${escape(t("give.bennies", { n: count(actor) }))}</div>
      </div>`;

    const dialog = new foundry.applications.api.DialogV2({
      window: { title: t("spend.title") },
      content: `
        <div style="min-width:280px;max-width:560px;">
          <div style="padding:0 4px;text-align:center;font-size:0.85rem;font-style:italic;opacity:0.75;">${escape(t("spend.hint"))}</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;align-items:flex-start;padding:8px 4px;">
            ${characters.map(tileHtml).join("")}
          </div>
        </div>
      `,
      buttons: [
        {
          action: "spend",
          label: t("spend.button"),
          default: true,
          callback: async () => {
            const actor = characters.find(candidate => candidate.id === selectedId);
            if (!actor) {
              ui.notifications.warn(t("spend.pick_one"));
              return false;
            }
            await spend(actor, actor.name, actor.img);
            return true;
          }
        },
        { action: "cancel", label: t("common.cancel") }
      ]
    });

    await dialog.render({ force: true });
    const root = dialog.element;

    // Border of an avatar (JS listeners rather than a CSS ":hover" rule: a <style> tag in the content
    // of a DialogV2 does not get applied, see custom-roll.js): orange under the mouse, cyan when chosen
    const HOVER_BORDER_COLOR = "var(--color-border-highlight, #ff6400)";
    const SELECTED_BORDER_COLOR = "#26c6da";

    const applyBorder = (el) => {
      const hovered = el.dataset.hovered === "1" && el.dataset.empty !== "1";
      const color = hovered ? HOVER_BORDER_COLOR : (el.dataset.actorId === selectedId ? SELECTED_BORDER_COLOR : null);
      el.style.borderColor = color ?? "transparent";
      el.style.boxShadow = color ? `0 0 6px ${color}` : "none";
    };

    // The "Spend" button waits for a choice
    const refresh = () => {
      root.querySelectorAll(".spend-avatar").forEach(applyBorder);
      const button = root.querySelector('button[data-action="spend"]');
      if (button) button.disabled = !selectedId;
    };

    root.querySelectorAll(".spend-avatar").forEach(el => {
      el.addEventListener("mouseenter", () => { el.dataset.hovered = "1"; applyBorder(el); });
      el.addEventListener("mouseleave", () => { delete el.dataset.hovered; applyBorder(el); });
      el.addEventListener("click", () => {
        if (el.dataset.empty === "1") return;
        selectedId = el.dataset.actorId;
        refresh();
      });
    });

    refresh();
  }
})();
