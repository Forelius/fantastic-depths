export class fadeChatMessage extends ChatMessage {
   /** @inheritDoc */
   async getHTML(...args) {
      this.toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      const html = await super.getHTML();
      this._addAttackTargets(html[0]);
      this._addApplyDamage(html[0]);
      return html;
   }

   /**
    * Add the apply button to a damage chat message if GM.
    * @param {any} html The chat message HTMLElement
    */
   _addApplyDamage(html) {
      const attackData = this.getFlag(game.system.id, "attackdata");
      if (!game.user.isGM || !attackData) return;
      const mdata = attackData.mdata;
      const damage = attackData.damage;
      const tray = document.createElement("div");
      let innerHTML = `
 <div class="card-tray">
   <label class="collapser">`;
      if (mdata.type === 'heal') {
         innerHTML += `
      <i class="fa-solid fa-heart" inert></i>`;
      } else {
         innerHTML += `
      <i class="fa-solid fa-heart-crack" inert></i>`;
      }
      innerHTML += `
      <span>${game.i18n.localize("FADE.Chat.apply")}</span>
   </label>
   <div class="collapsible-content">`;
      if (mdata.type === 'heal') {
         innerHTML += `
         <button class="apply-heal" type="button" data-tooltip="${game.i18n.localize("FADE.Chat.applyHealingDesc")}" `;
      } else {
         innerHTML += `
         <button class="apply-damage" type="button" data-tooltip="${game.i18n.localize("FADE.Chat.applyDamageDesc")}" `;
      }
      innerHTML += `
              data-attacktype="${mdata.attacktype}"
              data-attackmode="${mdata.attackmode}"
              data-damagetype="${mdata.damagetype}"
              data-attackerid="${mdata.attackerid}"
              data-weaponid="${mdata.weaponid}"
              data-amount="${damage}"
              data-label="${mdata.label}"
              data-desc="${mdata.desc}">
         <i class="fa-solid fa-reply-all fa-flip-horizontal"></i>
         <span style="margin-left:2px;">${game.i18n.localize("FADE.Chat.apply")}</span>
      </button>
   </div>
</div>`;
      tray.innerHTML = innerHTML
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
            let targetac = this.toHitSystem === 'aac' ? 19 - target.targetac : target.targetac;
            targetInfo += `<div class="ac flex1"><i class="fas fa-shield-halved"></i> <span>${targetac}</span></div>`;
         } else if (target.message) {
            targetInfo += `<div class="flex2">${target.message}</div>`;
         }
         targetInfo += `</div>`;
         return targetInfo;
      }).join('');
      html.querySelector(".message-content")?.appendChild(tray);
   }
}