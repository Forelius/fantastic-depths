export class fadeActor extends Actor {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context)
   }

   /** @override */
   async _preCreate(data, options, userId) {
      const allowed = await super._preCreate(data, options, userId);

      const changeData = {};

      switch (this.type) {
         case "character":
         case "npc":
            Object.assign(changeData, {
               "prototypeToken.sight": {
                  "enabled": true,
                  "visionMode": "basic",
               },
               "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.FRIENDLY,
               "prototypeToken.actorLink": true,
               "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.HOVER
            });
            break;
         case "monster":
            break;         
      }

      await this.updateSource(changeData);

      return allowed;
   }

   /** @override */
   prepareData() {
      super.prepareData();
   }

   /** @override */
   prepareBaseData() {
      this._prepareMovement();
      const systemData = this.system;
      systemData.ac = systemData.ac || {};

      systemData.hp = systemData.hp || {};
      systemData.hp.value = systemData.hp.value || 5;
      systemData.hp.max = systemData.hp.max || 5;
      systemData.hp.hd = systemData.hp.hd || "1d8";
      systemData.thac0 = systemData.thac0 || {};

      systemData.savingThrows = systemData.savingThrows || {};
      const savingThrows = ["death", "wand", "paralysis", "breath", "spell"];
      savingThrows.forEach(savingThrow => {
         systemData.savingThrows[savingThrow] = systemData.savingThrows[savingThrow] || { value: 15 };
      });
   }

   /**
 * @override
 * Prepare all embedded Document instances which exist within this primary Document.
 * @memberof ClientDocumentMixin#
 * active effects are applied
 */
   prepareEmbeddedDocuments() {
      super.prepareEmbeddedDocuments();
   }

   getRollData() {
      const data = { ...this.system };
      return data;
   }

   _prepareMovement() {
      const systemData = this.system;
      systemData.movement = systemData.movement || {};
      systemData.movement.turn = systemData.movement.turn || 120;
      systemData.movement.round = Math.floor(systemData.movement.turn / 3);
      systemData.movement.day = Math.floor(systemData.movement.turn / 5);
      systemData.movement.run = systemData.movement.turn;
   }
}