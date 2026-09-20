/* Spend a Benny (jeton).

   A player spends one of the Bennies of their assigned character, the Game Master spends one of
   the GM's own Bennies. The SWADE system does the work (the Benny count, its Dice So Nice
   animation, its hooks, the "hard choices" rule): this macro only calls user.spendBenny() and
   posts a card in the chat, drawn by start-session.js (see its "ROLL CARDS" block) from the data
   stored in the message flags (flags.world.bennyCard).

   No interface. When the Benny cannot be spent, a notification says why. */

(async () => {
  const user = game.user;

  // This needs a SWADE system that provides User#spendBenny
  if (typeof user.spendBenny !== "function") {
    ui.notifications.warn(t("benny.api_missing"));
    return;
  }

  // A player spends the Bennies of their assigned character; without one there is nothing to spend
  if (!user.isGM && !user.character) {
    ui.notifications.warn(t("benny.no_character"));
    return;
  }

  let spent;
  try {
    spent = await user.spendBenny();
  } catch (error) {
    console.error("Custom | Could not spend a Benny", error);
    ui.notifications.warn(t("benny.not_allowed"));
    return;
  }

  // spendBenny() answers false when there is no Benny left
  if (!spent) {
    ui.notifications.warn(t("benny.none_left"));
    return;
  }

  // The card: signed by the assigned character, or by the GM's account name if there is none
  // (same convention as the private messages). The text below is only a fallback, shown if
  // start-session.js is not active on a client.
  const name = user.character?.name || user.name;
  const avatar = user.character?.img || user.avatar;

  // What is left after this one (the assigned character's Bennies, or the GM's pool), shown in
  // small text under the message. spendBenny() has finished updating the count at this point.
  const remaining = Number.isInteger(user.bennies) ? user.bennies : undefined;

  ChatMessage.create({
    speaker: { alias: name },
    content: `<p>${foundry.utils.escapeHTML(t("benny.spent", { name }))}</p>`,
    flags: { world: { bennyCard: { name, avatar, ...(remaining === undefined ? {} : { remaining }) } } }
  });
})();
