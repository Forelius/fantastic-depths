export class fadeChatMessage extends ChatMessage {
   /** @inheritDoc */
   async getHTML(...args) {
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
      tray.innerHTML = `
 <div class="card-tray">
   <label class="collapser">
      <i class="fa-solid fa-heart-crack" inert></i>
      <span>Apply</span>
   </label>
   <div class="collapsible-content">
      <button class="apply-damage" type="button" title="Apply damage to target."
              data-attacktype="${mdata.attacktype}"
              data-attackmode="${mdata.attackmode}"
              data-damagetype="${mdata.damagetype}"
              data-attackerid="${mdata.attackerid}"
              data-weaponid="${mdata.weaponid}"
              data-amount="${damage}"
              data-label="${mdata.label}"
              data-desc="${mdata.desc}">
         <i class="fa-solid fa-reply-all fa-flip-horizontal"></i>
         <span style="margin-left:2px;">Apply</span>
      </button>
   </div>
</div>
    `;
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
      //  tray.classList.add("dnd5e2");
      tray.innerHTML = `
 <div id="targetsTray" class="card-tray">
   <label class="collapser">
      <i class="fas fa-bullseye" inert></i>
      <span>Targets</span>
   </label>
   <div id="targetsList" class="collapsible-content">      
   </div>
</div>
    `;
      const targetsList = tray.querySelector("#targetsList");
      targetsList.innerHTML = targets.map((target) => {
         return [`
      <div class="flexrow">         
         <i class="fas ${target.success ? "fa-check" : "fa-times"} flex0" style="color: ${target.success ? "green" : "red"};"></i>
         <div class="flex3" style="margin-left:5px;">${target.targetname}</div>
         <div class="ac flex1">
            <i class="fas fa-shield-halved"></i>
            <span>${target.targetac}</span>
         </div>
      </div>
         `]
      });
      //  evaluation.querySelectorAll("li.target").forEach(target => {
      //     target.addEventListener("click", this._onTargetMouseDown.bind(this));
      //     target.addEventListener("pointerover", this._onTargetHoverIn.bind(this));
      //     target.addEventListener("pointerout", this._onTargetHoverOut.bind(this));
      //  });
      html.querySelector(".message-content")?.appendChild(tray);
   }
}