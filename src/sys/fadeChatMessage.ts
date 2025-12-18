import { CodeMigrate } from "./migration";

export class fadeChatMessage extends ChatMessage {
   /** @inheritDoc */
   async getHTML(options) {
      let html = await super.getHTML(options);
      // Foundry v12...
      if ((Number(game.version) < 13)) {
         if (html instanceof Element === false) {
            // In case jquery, due to v12/v13 inconsistency
            html = html[0];
         }
         html = await this.#getForRender(html);
      }
      return html;
   }

   /** @inheritDoc */
   async renderHTML(options) {
      // Remove after v12/v13 compatibility
      //if (super.getHTML === undefined) {
         let html = await super.renderHTML(options);
         if (html instanceof Element === false) {
            // In case jquery, due to v12/v13 inconsistency
            html = html[0];
         }
         return await this.#getForRender(html);
      //}
   }

   async #getForRender(html) {
      // Damage and heal buttons
      let dmgHeal = await this.#addDamageRollButton();
      dmgHeal += await this.#addHealRollButton();
      if (dmgHeal.length > 0) {
         const tempDiv = document.createElement('div');
         tempDiv.innerHTML = dmgHeal;
         html.querySelector(".message-content")?.append(...Array.from(tempDiv.children));
      }

      // Other action buttons
      const actions = await this.#getActionRollButtons();
      if (actions?.length > 0) {
         const actionsTray = document.createElement("div");
         actionsTray.innerHTML = `<div id="actionTray" class="card-tray">
   <label class="collapser">
      <i class="fas fa-bolt-lightning" inert></i>
      <span>${game.i18n.localize("FADE.Chat.actions.name")}</span>
   </label>
   <div id="actionList" class="collapsible-content">      
   </div>
</div>`;
         actionsTray.classList.add("actionTray");
         const actionList = actionsTray.querySelector("#actionList");
         actionList.innerHTML = actions;
         html.querySelector(".message-content")?.appendChild(actionsTray);
      }

      await this.#addApplyDamage(html);
      await this.#addApplyCondition(html);
      this.#addActionTargets(html);
      return html;
   }

   async #getActionRollButtons() {
      let result = null;
      const data = this.getFlag(game.system.id, "actions")?.filter(i => i.type !== "save");
      const owneruuid = this.getFlag(game.system.id, "owneruuid");
      if (!data || data?.length == 0 || !owneruuid) return result;
      const owner = await fromUuid(owneruuid);
      // Only those with permission make it past here.
      if (owner?.testUserPermission(game.user, "OWNER")) {
         const content = await CodeMigrate.RenderTemplate('systems/fantastic-depths/templates/chat/roll-action-btns.hbs', { actions: data });
         result = document.createElement("div");
         result.innerHTML = content;
      }
      return result?.outerHTML ?? "";
   }

   async #addDamageRollButton() {
      let result = null;
      const data = this.getFlag(game.system.id, "damageRoll");
      const owneruuid = this.getFlag(game.system.id, "owneruuid");
      const itemuuid = this.getFlag(game.system.id, "itemuuid");
      if (!data || !owneruuid || !itemuuid) return result;
      const owner = await fromUuid(owneruuid);
      // Only those with permission make it past here.
      if (owner?.testUserPermission(game.user, "OWNER")) {
         const content = await CodeMigrate.RenderTemplate('systems/fantastic-depths/templates/chat/roll-dmg-btn.hbs', { ...data, owneruuid, itemuuid });
         result = document.createElement("div");
         result.innerHTML = content;
      }
      return result?.outerHTML ?? "";
   }

   async #addHealRollButton() {
      let result = null;
      const data = this.getFlag(game.system.id, "healRoll");
      const owneruuid = this.getFlag(game.system.id, "owneruuid");
      const itemuuid = this.getFlag(game.system.id, "itemuuid");
      if (!data || !owneruuid || !itemuuid) return result;
      const owner = await fromUuid(owneruuid);
      // Only those with permission make it past here.
      if (owner?.testUserPermission(game.user, "OWNER")) {
         const content = await CodeMigrate.RenderTemplate('systems/fantastic-depths/templates/chat/roll-heal-btn.hbs', { ...data, owneruuid, itemuuid });
         result = document.createElement("div");
         result.innerHTML = content;
      }
      return result?.outerHTML ?? "";
   }

   /**
    * Add the apply button to a damage chat message if GM.
    * @param {any} html The chat message HTMLElement
    */
   async #addApplyDamage(html) {
      const attackData = this.getFlag(game.system.id, "attackdata");
      if (!game.user.isGM || !attackData) return;
      const chatData = { attackData };
      const content = await CodeMigrate.RenderTemplate('systems/fantastic-depths/templates/chat/apply-dmg-btns.hbs', chatData);
      const tray = document.createElement("div");
      tray.innerHTML = content;
      html.querySelector(".message-content")?.appendChild(tray);
   }

   async #addApplyCondition(html) {
      const conditions = this.getFlag(game.system.id, "conditions");
      if (!game.user.isGM || !conditions) return;
      const chatData = { conditions };
      const content = await CodeMigrate.RenderTemplate("systems/fantastic-depths/templates/chat/apply-conditions.hbs", chatData);
      const tray = document.createElement("div");
      tray.innerHTML = content;
      html.querySelector(".message-content")?.appendChild(tray);
   }

   /**
   * Add target informat to attack message if GM.
   * @param {any} html The chat message HTMLElement
   * @protected
   */
   #addActionTargets(html) {
      const targets = this.getFlag(game.system.id, "targets");
      if (!targets?.length) return;

      const tray = document.createElement("div");
      tray.innerHTML = `<div id="targetsTray" class="card-tray">
   <label class="collapser">
      <i class="fas fa-bullseye" inert></i>
      <span>${game.i18n.localize("FADE.Chat.targets")}</span>
   </label>
   <div id="targetsList" class="collapsible-content">      
   </div>
</div>`;
      const targetsList = tray.querySelector("#targetsList");
      targetsList.innerHTML = targets.map((target) => {
         let targetInfo = `<div class="flexrow">`;
         // Success
         if (game.user.isGM && target.success !== undefined && target.success !== null) {
            targetInfo += `<i class="fas ${target.success ? "fa-check" : "fa-times"} flex0" style="color: ${target.success ? "green" : "red"};"></i>`;
         }
         targetInfo += `<div class="flex3" style="margin-left:5px;">${target.targetname}</div>`;
         // AC
         if (game.user.isGM && target.targetac !== undefined && target.targetac !== null) {
            targetInfo += `<div class="ac flex1"><i class="fas fa-shield-halved"></i> <span>${target.targetac}</span></div>`;
         }
         // Message
         else if (game.user.isGM && target.message) {
            targetInfo += `<div class="flex2">${target.message}</div>`;
         }
         targetInfo += `</div>`;
         return targetInfo;
      }).join('');
      html.querySelector(".message-content")?.appendChild(tray);
   }
}
