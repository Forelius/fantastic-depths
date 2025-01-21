export class fadeChatMessage extends ChatMessage {
   /** @inheritDoc */
   async getHTML(...args) {
      this.toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      const html = await super.getHTML();
      this._addAttackTargets(html[0]);
      await this._addApplyDamage(html[0]);
      return html;
   }

   /**
    * Add the apply button to a damage chat message if GM.
    * @param {any} html The chat message HTMLElement
    */
   async _addApplyDamage(html) {
      const attackData = this.getFlag(game.system.id, "attackdata");
      if (!game.user.isGM || !attackData) return;
      const chatData = { attackData };
      let content = await renderTemplate('systems/fantastic-depths/templates/chat/damage-buttons.hbs', chatData);
      const tray = document.createElement("div");
      tray.innerHTML = content;
      html.querySelector(".message-content")?.appendChild(tray);
   }

   /**
   * Add target informat to attack message if GM.
   * @param {any} html The chat message HTMLElement
   * @protected
   */
   _addAttackTargets(html) {
      const targets = this.getFlag(game.system.id, "targets");
      if (!game.user.isGM || !targets?.length) return;

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
         if (target.success !== undefined && target.success !== null) {
            targetInfo += `<i class="fas ${target.success ? "fa-check" : "fa-times"} flex0" style="color: ${target.success ? "green" : "red"};"></i>`;
         }
         targetInfo += `<div class="flex3" style="margin-left:5px;">${target.targetname}</div>`;
         if (target.targetac !== undefined && target.targetac !== null) {
            targetInfo += `<div class="ac flex1"><i class="fas fa-shield-halved"></i> <span>${target.targetac}</span></div>`;
         } else if (target.message) {
            targetInfo += `<div class="flex2">${target.message}</div>`;
         }
         targetInfo += `</div>`;
         return targetInfo;
      }).join('');
      html.querySelector(".message-content")?.appendChild(tray);
   }
}