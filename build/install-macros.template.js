/* Generated on __GENERATED_AT__
   GENERATED FILE: do not edit. Edit build/install-macros.template.js (or the macro
   sources / the MACROS table in build/build.py), then run: python build/build.py

   Install macro: creates (or updates, if it already exists) each of the
   trait-roll-*, custom-roll, private-message, and start-session macros as a
   Foundry Macro document, assigns it its SVG icon (from the icons/ folder) if
   it has one, then assigns it to the same hotbar slot for EVERY user in the
   world (whether currently connected or not) if a slot is defined, with
   "OBSERVER" permission (can view/execute, cannot modify or delete) so that
   every player can use them, not just the installing GM.

   The simple-roll-* macros have been removed (replaced by the custom-roll
   palette, which covers the same "roll a single die" need).

   start-session has neither a hotbar slot nor an icon (slot/icon are null in
   MACROS below): it's a session-startup script (whisper hooks, die
   colorsets), not a macro players click on. Since its hooks are protected by
   a guard flag (game._whisperReplyHooked) that prevents double-registration,
   reinstalling it only takes effect on the NEXT session load: the Foundry
   window must be refreshed afterward for the updated code to take effect.

   The display name (and therefore the hotbar tooltip text, which comes from
   the Macro document's "name" field) is kept separate from the technical
   identifier used to find/update the macro from one run to the next: that
   identifier is stored in flags.world.macroKey rather than in "name", so the
   display name can be freely customized without breaking "does this macro
   already exist" detection. For the same reason the name in MACROS is only a
   default: it is applied when the macro is created, and an existing macro is
   never renamed on reinstall (only its code and permissions are refreshed), so
   a customized name (e.g. the one Macro Runner uses to launch start-session at
   startup) survives updates.

   Each macro's code and each icon's SVG are embedded directly in this file (a
   Foundry macro script runs inside the browser, with no access to the local
   filesystem: it cannot read trait-roll-d4.js or icons/d4-wild-die.svg from
   disk).

   Hotbar slots: trait-roll-d4..d12 in 1-5, custom-roll in 6, spend-benny in 7,
   private-message in 8, give-bennies-to-players in 9 (Game Masters only: the
   players do not even see that macro), start-session with no slot.

   Icon assignment: d4-wild-die.svg etc. for trait-roll-* (trait die + wild
   die), custom-roll.svg for custom-roll, spend-benny.svg, private-message.svg,
   the icon given in the MACROS table for give-bennies-to-players, none for
   start-session.

   Macro (hotbar) icon assignment technique: see Tests/test-svg-icon.js. A
   Foundry document's "img" field requires a file path with a valid extension
   (a base64 data URI is rejected): so we actually write a real .svg file via
   FilePicker.upload, then point "img" at that file. The file name is derived
   from the technical identifier plus a deterministic hash of the SVG content
   (stable as long as the icon doesn't change, unique otherwise), and an
   already-existing file is reused rather than uploading a new one each time
   (Foundry offers no scriptable way to delete old ones).

   FilePicker is referenced via foundry.applications.apps.FilePicker.implementation
   rather than the global "FilePicker" (deprecated since Foundry v13, to be removed in v15).

   NOTE: conversely, the die icons displayed INSIDE the chat message posted by
   trait-roll-* and custom-roll (not the macro's own icon) use a base64 data
   URI embedded directly in an <img> tag, since an inline <svg> there gets
   stripped by the HTML sanitizer Foundry applies to chat message content.

   Creating "script"-type macros requires being the Gamemaster (or having
   enabled the "Allow Players to Create Script Macros" setting). */

__I18N__

// Deterministic (non-random) hash of a string, used to derive a stable, unique
// file name from the SVG's content.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(hash, 31) + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

(async () => {
  // Foundry v13: the global "FilePicker" is deprecated in favor of this namespaced path.
  const FilePickerImpl = foundry.applications.apps.FilePicker.implementation;

  const MACROS = [
__MACROS__
  ];

  // Dedicated folder inside the world's data, created if it doesn't already exist
  const targetDir = `worlds/${game.world.id}/macro-icons`;
  try {
    await FilePickerImpl.createDirectory("data", targetDir);
  } catch (_e) {
    // Folder already exists: nothing to do
  }

  // List existing files once, to avoid re-uploading an icon that was already written
  // during a previous run.
  const existingFiles = new Set((await FilePickerImpl.browse("data", targetDir).catch(() => null))?.files ?? []);

  let needsRefresh = false;

  for (const { name, macroKey, slot, command, icon, requiresRefresh, gmOnly } of MACROS) {
    // ownership.default set to OBSERVER: gives every player the right to view/execute the
    // macro, without granting the right to modify or delete it (reserved to OWNER). A macro that is
    // only for the Game Master (gmOnly) gets NONE: the players cannot even see it.
    const ownership = {
      default: gmOnly ? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE : CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
    };

    // Looked up by technical identifier (flags.world.macroKey), not by "name" (the display
    // name, freely customizable and therefore not a reliable lookup key).
    let macro = game.macros.find(m => m.getFlag("world", "macroKey") === macroKey);
    if (macro) {
      await macro.update({ command, ownership });
    } else {
      macro = await Macro.create({ name, type: "script", command, ownership, flags: { world: { macroKey } } });
    }

    // Icon: some macros (e.g. start-session) don't have one.
    if (icon) {
      const fileName = `macro-icon-${macroKey}-${hashString(icon)}.svg`;
      const existingPath = [...existingFiles].find(path => path.endsWith(`/${fileName}`));

      let iconPath = existingPath;
      if (!iconPath) {
        const file = new File([icon], fileName, { type: "image/svg+xml" });
        const response = await FilePickerImpl.upload("data", targetDir, file, {});
        iconPath = response?.path;
        if (!iconPath) console.warn(`Custom | Failed to upload the icon for "${name}" (insufficient permissions?).`);
      }

      if (iconPath) await macro.update({ img: iconPath });
    }

    // Hotbar slot: some macros (e.g. start-session) don't have one.
    if (slot != null) {
      // Assign the macro to the same hotbar slot for EVERY user in the world, whether
      // connected or not (a GM is allowed to modify any player's User document, "active" or
      // not; game.users lists every account in the world, not just those currently online).
      // A macro that is only for the Game Master is only assigned to the GMs.
      for (const user of game.users) {
        if (gmOnly && !user.isGM) continue;
        await user.assignHotbarMacro(macro, slot);
      }
    }

    if (requiresRefresh) needsRefresh = true;

    console.log(`Custom | Macro "${name}" (${macroKey}) installed${slot != null ? ` in slot ${slot} for ${game.users.size} user(s)` : ""}`);
  }

  ui.hotbar.render(true);
  ui.notifications.info(t("install.done", { count: MACROS.length }));
  if (needsRefresh) {
    ui.notifications.warn(t("install.refresh"));
  }
})();