/* Give Bennies (jetons) to players. Game Master only.

   A window, in the spirit of the dice palette (custom-roll.js), shows the avatars of the
   characters of the connected players. Clicking an avatar selects the character (cyan border,
   orange on hover); the "All" tile selects or unselects every character, and a click on a player's
   name selects all of that player's characters. "Give" gives one Benny to each selected character
   with the SWADE system (actor.getBenny(): the count, the Dice So Nice animation, the hooks), then
   posts one card in the chat, drawn by start-session.js (see its "ROLL CARDS" block) from the data
   stored in the message flags (flags.world.bennyGiveCard).

   The characters shown are the actors of type "character" that a connected player (not the GM) owns
   explicitly. A player can own several characters, and a character belongs to one player at a
   time: every character is listed once, and each one gets its own avatar and its own Benny, even
   when they belong to the same player (the choice is made per character, not per player). */

(async () => {
  // Only the Game Master can give Bennies
  if (!game.user.isGM) {
    ui.notifications.warn(t("give.gm_only"));
    return;
  }

  // The characters to offer, grouped by player: the characters of type "character" that a connected
  // player owns explicitly (never through the default ownership: an actor that everybody owns by
  // default is not offered as the character of every player). A character is listed once, so that
  // it never gets two Bennies if two accounts happen to own it.
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  const players = game.users
    .filter(user => user.active && !user.isGM)
    .sort((a, b) => a.name.localeCompare(b.name));

  const placed = new Map(); // actor id -> { actor, player }
  for (const player of players) {
    for (const actor of game.actors) {
      if (actor.type === "character" && !placed.has(actor.id) && (actor.ownership?.[player.id] ?? 0) >= OWNER) {
        placed.set(actor.id, { actor, player });
      }
    }
  }

  // Display order: by player, then by character name
  const entries = [...placed.values()].sort((a, b) =>
    a.player.name.localeCompare(b.player.name) || a.actor.name.localeCompare(b.actor.name)); // { actor, player }

  if (!entries.length) {
    ui.notifications.warn(t("give.no_characters"));
    return;
  }

  // This needs a SWADE system that provides Actor#getBenny
  if (typeof entries[0].actor.getBenny !== "function") {
    ui.notifications.warn(t("give.api_missing"));
    return;
  }

  const escape = (text) => foundry.utils.escapeHTML(String(text));

  // Foundry's HTML sanitizer strips inline <svg> elements from the content of a DialogV2, so the
  // "All" icon goes in a plain <img> tag as a data URI (same technique as custom-roll.js).
  const svgToDataUri = (svg) => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

  // Icon embedded directly in the code (see icons/select-all-characters.svg in the project): a
  // macro script runs inside the browser with no access to the local filesystem. It must stay
  // identical to the file: build.py checks it.
  const SELECT_ALL_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 1254 1254" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:affinity="https://www.affinity.studio/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Background"><path d="M85.11,0l1083.779,-0c1.902,0.811 1.623,1.226 3.712,1.583c31.217,5.34 58.506,30.738 68.082,49.487c13.733,26.889 10.563,31.721 12.086,36.313c0.196,0.59 1.034,0.812 1.229,1.402l-0,1077.656c-0.208,0.596 -1.096,0.776 -1.304,1.371c-0.811,2.328 0.175,11.725 -9.919,30.692c-28.333,53.24 -71.654,52.626 -76.195,54.108c-0.617,0.201 -0.749,1.186 -1.366,1.387l-1075.207,0c-0.61,-0.198 -0.765,-1.148 -1.376,-1.346c-0.93,-0.302 -1.114,0.977 -12.112,-1.642c-45.956,-10.943 -71.213,-53.871 -74.973,-80.849c-0.284,-2.037 -0.731,-1.758 -1.547,-3.721l0,-1077.656c0.207,-0.587 1.018,-0.822 1.225,-1.408c3.191,-9.051 -0.782,-10.407 11.973,-35.156c16.1,-31.237 48.17,-46.292 65.841,-50.101c4.375,-0.943 4.415,-0.673 4.781,-0.801c0.939,-0.328 0.293,-0.97 1.291,-1.319Z" style="fill:#e6f6fd;"/><path d="M822.806,807.576c3.001,41.158 1.062,57.889 -19.04,66.985c-6.809,3.081 -7.116,2.65 -152.886,2.768c-174.678,0.142 -174.639,0.83 -189.788,-0.175c-17.384,-1.153 -30.547,-15.546 -30.748,-32.784c-0.151,-12.924 -9.221,-92.326 66.499,-141.659c20.058,-13.068 51.425,-23.58 57.478,-20.335c30.211,16.196 71.348,24.087 111.115,13.271c24.886,-6.768 33.823,-15.074 38.114,-14.227c37.965,7.499 108.372,39.374 119.256,126.156Z" style="fill:#014183;"/><path d="M630.082,436.018c142.097,7.024 159.284,194.898 35.572,237.133c-71.148,24.289 -158.561,-24.222 -160.736,-112.888c-1.689,-68.851 57.352,-126.311 125.164,-124.245Z" style="fill:#014083;"/><path d="M866.353,631.834c55.628,4.321 67.719,-18.763 80.767,-15.934c45.398,9.842 96.216,51.556 97.572,119.478c0.828,41.493 -1.615,45.363 -3.699,48.665c-10.316,16.342 -18.531,14.324 -70.491,14.258c-126.297,-0.161 -127.596,0.732 -128.381,-1.761c-2.833,-8.99 -3.577,-44.864 -45.29,-88.324c-24.685,-25.718 -55.926,-36.688 -56.068,-38.951c-0.294,-4.674 14.001,-20.453 15.447,-22.049c19.51,-21.535 55.783,-33.394 59.859,-31.482c16.578,7.775 21.313,12.343 50.285,16.099Z" style="fill:#014183;"/><path d="M413.725,786.905c-0.799,4.072 -1.537,11.146 -4.035,11.278c-0.083,0.004 -171.671,0.491 -176.418,-0.254c-29.809,-4.675 -24.016,-42.57 -24.016,-42.958c0.005,-11.122 -6.991,-72.603 48.083,-115.649c25.817,-20.178 52.662,-24.767 55.299,-23.43c10.592,5.369 52.457,29.693 109.023,7.486c11.194,-4.394 14.531,-9.118 20.888,-7.416c6.747,1.806 50.939,13.637 70.158,51.971c1.773,3.536 -1.987,1.954 -24.404,15.324c-46.328,27.632 -63.774,71.211 -66.848,78.891c-3.27,8.168 -3.42,8.081 -7.729,24.756Z" style="fill:#014083;"/><path d="M878.658,413.974c105.231,5.164 137.468,133.322 47.461,186.191c-44.055,25.877 -129.592,11.043 -145.831,-70.439c-6.727,-33.756 8.42,-111.053 98.37,-115.752Z" style="fill:#014083;"/><path d="M377.798,414.019c115.344,7.023 130.459,153.681 31.957,191.836c-75.406,29.208 -166.721,-47.095 -123.215,-137.151c25.239,-52.243 82.753,-54.37 91.258,-54.684Z" style="fill:#014083;"/><path d="M1058.67,397.752c-30.101,-3.348 -24.772,-20.948 -25.091,-57.924c-0.366,-42.359 0.658,-95.447 -0.585,-96.773c-1.69,-1.803 -119.381,-0.328 -142.103,-0.845c-24.369,-0.555 -32.052,-36.14 -9.559,-47.635c3.925,-2.006 4.144,-2.261 129.582,-2.13c30.82,0.032 57.81,-4.51 70.05,22.364c3.374,7.407 3.353,7.688 3.277,122.572c-0.026,39.812 4.177,59.038 -25.572,60.373Z" style="fill:#0699fd;"/><path d="M194.098,397.714c-2.562,-0.235 -23.356,-2.143 -24.215,-21.171c-0.178,-3.952 -0.105,-146.005 -0.08,-146.921c0.571,-20.619 16.916,-36.751 37.765,-37.201c0.349,-0.008 153.711,-0.011 155.536,0.019c23.636,0.392 32.585,34.067 9.921,47.211c-5.309,3.079 -5.76,2.577 -142.185,2.592c-7.088,0.001 -10.494,-2.546 -10.434,4.518c0.408,48.273 0.138,92.384 0.089,100.417c-0.168,27.528 4.071,48.925 -26.397,50.537Z" style="fill:#0699fd;"/><path d="M1036.421,860.172c0.902,-1.347 7.201,-10.754 16.094,-12.314c9.547,-1.674 17.072,0.708 19.26,2.007c14.495,8.599 12.437,21.67 12.474,26.344c0.088,11.07 0.797,100.692 -0.03,138.377c-0.392,17.864 -14.506,34.497 -34.164,36.213c-2.58,0.225 -157.717,0.192 -160.342,0.051c-29.439,-1.577 -28.14,-46.156 0.011,-49.16c3.857,-0.412 122.761,-0.139 133.436,-0.114c7.256,0.017 10.484,1.908 10.436,-5.364c-0.045,-6.857 -0.462,-70.77 -0.008,-85.716c0.809,-26.611 -2.578,-36.994 2.832,-50.326Z" style="fill:#0699fd;"/><path d="M169.772,883.555c0.028,-4.569 -4.104,-30.307 18.168,-35.674c21.799,-5.253 29.687,12.298 30.808,14.791c3.594,7.996 0.93,98.916 1.755,136.034c0.113,5.079 3.568,2.479 137.693,2.882c34.498,0.104 33.529,37.029 15.594,46.687c-5.515,2.97 -5.897,2.693 -130.706,2.64c-30.424,-0.013 -57.159,4.305 -69.511,-20.558c-4.436,-8.929 -3.769,-9.403 -3.802,-146.802Z" style="fill:#079afd;"/><path d="M458.452,342.418c-35.081,-43.64 -35.61,-43.117 -38.471,-47.048c-5.211,-7.158 -3.644,-23.364 9.212,-29.091c13.082,-5.828 21.831,0.508 37.466,21.297c3.576,4.755 47.607,58.715 47.693,58.828c12.588,16.567 -7.312,39.397 -26.125,29.721c-3.199,-1.646 -4.47,-2.299 -29.775,-33.706Z" style="fill:#0698fd;"/><path d="M763.23,316.305c0.652,-0.831 4.515,-5.758 8.242,-10.307c23.81,-29.067 23.83,-28.943 25.884,-31.475c20.297,-25.017 46.757,0.366 36.085,20.049c-1.184,2.183 -60.886,74.967 -60.906,74.991c-13.657,16.027 -29.393,6.95 -34.319,-0.583c-9.966,-15.239 3.99,-26.078 25.014,-52.675Z" style="fill:#0698fd;"/><path d="M626.384,207.22c2.157,0.195 18.544,1.676 20.638,17.521c0.931,7.046 0.289,84.475 0.228,91.82c-0.157,18.87 -19.015,22.653 -26.929,19.428c-16.234,-6.613 -13.623,-13.938 -13.704,-64.738c-0.08,-49.68 -3.028,-60.525 19.768,-64.032Z" style="fill:#0699fd;"/><path d="M626.37,1056.646c-1.996,-0.221 -16.934,-1.877 -18.994,-16.42c-1.065,-7.52 -0.24,-76.539 -0.161,-83.194c0.239,-19.985 26.225,-26.904 36.953,-9.464c1.837,2.986 3.096,5.033 2.41,43.753c-0.801,45.18 6.021,62.947 -20.208,65.325Z" style="fill:#0799fd;"/><path d="M747.384,959.678c-15,-18.694 -15.246,-18.436 -16.491,-20.101c-5.404,-7.226 -4.41,-21.035 4.86,-27.292c19.187,-12.951 32.969,11.719 36.834,16.202c4.524,5.247 34.017,41.292 36.963,44.892c22.191,27.12 -9.727,43.277 -24.993,31.157c-5.085,-4.037 -34.292,-41.194 -37.172,-44.858Z" style="fill:#0799fd;"/><path d="M437.008,990.09c1.193,-12.166 3.608,-11.452 34.347,-49.797c2.961,-3.694 2.99,-3.616 19.777,-24.125c14.739,-18.006 41.53,-0.826 34.036,18.963c-2.329,6.15 -3.02,5.824 -51.218,64.291c-12.433,15.082 -33.539,13.157 -36.941,-9.331Z" style="fill:#0799fd;"/></g></svg>`;

  // Selection state: the ids of the selected characters
  const selected = new Set();

  // One avatar tile: the portrait to click, the name of the character, the name of the player (click
  // it to select all of that player's characters) and the Bennies the character has now.
  const tileHtml = ({ actor, player }) => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:92px;">
      <img class="give-avatar" data-actor-id="${escape(actor.id)}" src="${escape(actor.img)}" alt="${escape(actor.name)}" title="${escape(actor.name)}" style="width:64px;height:64px;object-fit:cover;cursor:pointer;box-sizing:border-box;border-radius:6px;border:2px solid transparent;transition:border-color 0.15s ease, box-shadow 0.15s ease;" />
      <div style="font-size:0.95rem;font-weight:bold;text-align:center;overflow-wrap:anywhere;line-height:1.15;">${escape(actor.name)}</div>
      <div class="give-player" data-user-id="${escape(player.id)}" style="font-size:0.8rem;opacity:0.75;text-align:center;overflow-wrap:anywhere;cursor:pointer;line-height:1.15;">${escape(player.name)}</div>
      <div style="font-size:0.8rem;opacity:0.75;">${escape(t("give.bennies", { n: Number.isInteger(actor.bennies) ? actor.bennies : 0 }))}</div>
    </div>`;

  // The "All" tile, then one group per player (a thin vertical rule on the left of each group, like
  // the one that separates the Joker from the dice in the palette)
  const allTileHtml = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:92px;">
      <img class="give-all" src="${svgToDataUri(SELECT_ALL_ICON_SVG)}" alt="${escape(t("give.all"))}" title="${escape(t("give.all"))}" style="width:64px;height:64px;cursor:pointer;box-sizing:border-box;border-radius:6px;border:2px solid transparent;transition:border-color 0.15s ease, box-shadow 0.15s ease;" />
      <div style="font-size:0.95rem;font-weight:bold;">${escape(t("give.all"))}</div>
    </div>`;

  const groupsHtml = players
    .map(player => ({ player, tiles: entries.filter(entry => entry.player === player) }))
    .filter(group => group.tiles.length)
    .map(group => `
      <div style="display:flex;gap:12px;padding-left:16px;border-left:1px solid rgba(127,127,127,0.5);">
        ${group.tiles.map(tileHtml).join("")}
      </div>`)
    .join("");

  const dialog = new foundry.applications.api.DialogV2({
    window: { title: t("give.title") },
    content: `
      <div style="width:560px;">
        <!-- Discreet hint: what to do, then how many characters are selected. Its height is always
             reserved so that the avatars do not jump when the text changes. -->
        <div class="give-hint" style="min-height:1.3em;padding:0 4px;text-align:center;font-size:0.85rem;font-style:italic;opacity:0.75;"></div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;align-items:flex-start;padding:8px 4px;">
          ${allTileHtml}
          ${groupsHtml}
        </div>
      </div>
    `,
    buttons: [
      {
        action: "give",
        label: t("give.button"),
        default: true,
        callback: async () => giveBennies()
      },
      { action: "cancel", label: t("common.cancel") }
    ]
  });

  await dialog.render({ force: true });
  const root = dialog.element;

  // Border of a tile (JS listeners rather than a CSS ":hover" rule: a <style> tag in the content of a
  // DialogV2 does not get applied, see custom-roll.js): orange under the mouse, cyan when selected.
  const HOVER_BORDER_COLOR = "var(--color-border-highlight, #ff6400)";
  const SELECTED_BORDER_COLOR = "#26c6da";

  const isSelected = (el) => el.classList.contains("give-all")
    ? selected.size === entries.length
    : selected.has(el.dataset.actorId);

  const applyBorder = (el) => {
    const color = el.dataset.hovered === "1" ? HOVER_BORDER_COLOR : (isSelected(el) ? SELECTED_BORDER_COLOR : null);
    el.style.borderColor = color ?? "transparent";
    el.style.boxShadow = color ? `0 0 6px ${color}` : "none";
  };

  const refresh = () => {
    root.querySelectorAll(".give-avatar, .give-all").forEach(applyBorder);
    root.querySelector(".give-hint").textContent = selected.size
      ? t("give.hint_count", { n: selected.size })
      : t("give.hint_pick");
  };

  root.querySelectorAll(".give-avatar, .give-all").forEach(el => {
    el.addEventListener("mouseenter", () => { el.dataset.hovered = "1"; applyBorder(el); });
    el.addEventListener("mouseleave", () => { delete el.dataset.hovered; applyBorder(el); });
  });

  // A character: selected / unselected
  root.querySelectorAll(".give-avatar").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.actorId;
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      refresh();
    });
  });

  // "All": selects every character, or unselects them all when they already are
  root.querySelector(".give-all").addEventListener("click", () => {
    if (selected.size === entries.length) selected.clear();
    else entries.forEach(entry => selected.add(entry.actor.id));
    refresh();
  });

  // A player's name: selects all of that player's characters, or unselects them when they already are
  root.querySelectorAll(".give-player").forEach(el => {
    el.addEventListener("click", () => {
      const ids = entries.filter(entry => entry.player.id === el.dataset.userId).map(entry => entry.actor.id);
      if (ids.every(id => selected.has(id))) ids.forEach(id => selected.delete(id));
      else ids.forEach(id => selected.add(id));
      refresh();
    });
  });

  refresh();

  // Gives one Benny to each selected character, one after the other (so that the messages and the
  // animations of the system come in order). A failure does not stop the others. Returns false to
  // keep the window open when nothing is selected.
  async function giveBennies() {
    const chosen = entries.filter(entry => selected.has(entry.actor.id));
    if (!chosen.length) {
      ui.notifications.warn(t("give.pick_one"));
      return false;
    }

    const served = [];
    const failed = [];
    for (const { actor } of chosen) {
      try {
        await actor.getBenny();
        served.push(actor);
      } catch (error) {
        console.error(`Custom | Could not give a Benny to ${actor.name}`, error);
        failed.push(actor);
      }
    }

    if (failed.length) {
      ui.notifications.warn(t("give.failed", { names: failed.map(actor => actor.name).join(", ") }));
    }

    // One card for everybody who got a Benny, signed by the GM's assigned character or, if there is
    // none, by the GM's account name (same convention as the private messages). The text of the
    // content is only a fallback, shown if start-session.js is not active on a client.
    if (served.length) {
      const name = game.user.character?.name || game.user.name;
      ChatMessage.create({
        speaker: { alias: name },
        content: `<p>${escape(t("give.given", { name }))} ${escape(served.map(actor => actor.name).join(", "))}</p>`,
        flags: { world: { bennyGiveCard: { name, recipients: served.map(actor => ({ name: actor.name, avatar: actor.img })) } } }
      });
    }

    return true;
  }
})();
