/* GENERATED FILE: do not edit. Edit build/uninstall-macros.template.js (or the MACROS
   table in build/build.py), then run: python build/build.py

   Macro: cleans up everything install-macros.js installs.
   - Removes hotbar slots __SLOT_RANGE__ from EVERY user in the world (whether currently
     connected or not), without touching the rest of their personal hotbar
   - Deletes the __MACRO_COUNT__ macros installed by install-macros.js: the 5 trait-roll-*
     macros, custom-roll, private-message, and start-session (start-session has
     no hotbar slot to remove — only its Macro document gets deleted)
   - Also does a final one-time cleanup of the old simple-roll-* macros
     (slots 11-15), which were replaced by the custom-roll palette and are no
     longer reinstalled by install-macros.js at all (see LEGACY_* below)
   Asks for confirmation first, since this is destructive and irreversible.

   Macros are looked up by their technical identifier (flags.world.macroKey),
   never by their display name (freely renameable, so not a reliable lookup
   key) — see install-macros.js for the full rationale behind this split.

   NOTE: the icon SVG files generated under worlds/<world>/macro-icons/ are NOT
   deleted: Foundry v13 exposes no public file-deletion method (verified via
   Object.getOwnPropertyNames(FilePicker): browse/configurePath/createDirectory/
   upload all exist, but no delete). They are harmless leftovers and can be
   removed by hand from Foundry's file manager if desired. install-macros.js
   now reuses an existing file instead of recreating one on every reinstall, so
   they no longer accumulate over time. */

// Technical identifiers of the macros currently installed by install-macros.js
// (generated from the MACROS table in build/build.py, same source as install-macros.js)
const INSTALLED_MACRO_KEYS = [
__INSTALLED_MACRO_KEYS__
];

// Hotbar slots used by install-macros.js (generated, same source)
const INSTALLED_SLOTS = [__INSTALLED_SLOTS__];

// Old simple-roll-* macros (replaced by the custom-roll palette): install-macros.js
// no longer installs these, but we clean them up here one last time if they're still around.
const LEGACY_MACRO_KEYS = ["macro-1d4", "macro-1d6", "macro-1d8", "macro-1d10", "macro-1d12"];
const LEGACY_SLOTS = [11, 12, 13, 14, 15];

(async () => {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Nettoyage" },
    content: `
      <p>Cette action va, pour TOUS les joueurs du monde (connectés ou non) :</p>
      <ul>
        <li>retirer les emplacements __SLOT_RANGE__ (et les anciens 11-15 s'ils traînent encore) de leur barre de raccourcis (le reste de leur barre n'est pas touché) ;</li>
        <li>supprimer les macros installées par install-macros.js.</li>
      </ul>
      <p>Cette action est irréversible. Continuer ?</p>
    `
  });
  if (!confirmed) return;

  // --- 1. Remove the installed slots from every user's hotbar ---
  // Rebuild each user's hotbar without the installed slots, then replace the whole field
  // ("recursive: false"): the "hotbar.-=N" deletion syntax is rejected by the hotbar field's
  // validator on this version of Foundry.
  const slotsToClear = [...INSTALLED_SLOTS, ...LEGACY_SLOTS];
  for (const user of game.users) {
    const filteredHotbar = Object.fromEntries(
      Object.entries(user.hotbar).filter(([slot]) => !slotsToClear.includes(Number(slot)))
    );
    if (Object.keys(filteredHotbar).length !== Object.keys(user.hotbar).length) {
      await user.update({ hotbar: filteredHotbar }, { recursive: false });
    }
  }

  // --- 2. Delete the macros installed by install-macros.js (+ the old simple-roll-* ones) ---
  let deletedMacroCount = 0;
  for (const macroKey of [...INSTALLED_MACRO_KEYS, ...LEGACY_MACRO_KEYS]) {
    const macro = game.macros.find(m => m.getFlag("world", "macroKey") === macroKey);
    if (!macro) continue;
    await macro.delete();
    deletedMacroCount++;
  }

  ui.hotbar.render(true);
  ui.notifications.info(
    `Nettoyage terminé pour ${game.users.size} utilisateur(s) : ${deletedMacroCount} macro(s) supprimée(s).`
  );
  // start-session registers its hooks only once per session (game._whisperReplyHooked):
  // deleting the macro here does not remove hooks already active in the current session.
  ui.notifications.warn("Rafraîchis la fenêtre de Foundry (F5) pour que la suppression de start-session prenne effet.");
})();
