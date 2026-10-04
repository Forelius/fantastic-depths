/**
 * Token HUD control to override movement timescale (turn / round / day).
 * Click cycles configured timescales, then clears back to inference.
 */
export function registerTokenMovementHud() {
   Hooks.on("renderTokenHUD", (app, html) => {
      const tokenDoc = app?.document ?? app?.object?.document;
      if (!tokenDoc?.actor?.system?.movement) return;

      const actorMovement = game.fade?.registry?.getSystem?.("actorMovement");
      if (!actorMovement) return;

      const root = html instanceof HTMLElement ? html : (html?.[0] ?? html);
      if (!(root instanceof HTMLElement)) return;
      if (root.querySelector(".fade-movement-timescale")) return;

      const timescales = actorMovement.getConfiguredTimescales();
      if (!timescales.length) return;

      const override = actorMovement.getTimescaleOverride(tokenDoc);
      const effective = actorMovement.getTimescale(tokenDoc);
      const label = actorMovement.getTimescaleLabel(effective);
      const tooltip = override
         ? game.i18n.localize("FADE.Actor.Movement.timescale.hint")
         : game.i18n.format("FADE.Actor.Movement.timescale.inferred", { scale: label });

      const col = root.querySelector(".col.left")
         ?? root.querySelector(".left")
         ?? root.querySelector("[class*='left']")
         ?? root;
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("control-icon", "fade-movement-timescale");
      if (override) button.classList.add("active");
      button.dataset.tooltip = tooltip;
      button.setAttribute("aria-label", tooltip);
      button.innerHTML = `<i class="fa-solid fa-gauge-high"></i><span class="fade-movement-timescale-label">${label}</span>`;

      button.addEventListener("click", async (event) => {
         event.preventDefault();
         event.stopPropagation();
         const current = actorMovement.getTimescaleOverride(tokenDoc);
         let next: string | null = timescales[0];
         if (current) {
            const idx = timescales.indexOf(current);
            next = idx >= 0 && idx < timescales.length - 1 ? timescales[idx + 1] : null;
         }
         await actorMovement.setTimescale(tokenDoc, next);
         app.render();
      });

      col.appendChild(button);
   });
}
