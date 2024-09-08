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
      systemData.details = systemData.details || {};
      systemData.ac = systemData.ac || {};
      systemData.hp = systemData.hp || {};
      systemData.hp.value = systemData.hp.value || 5;
      systemData.hp.max = systemData.hp.max || 5;
      if (this.type === "monster") {
         systemData.hp.hd = systemData.hp.hd || "1";
      } else {
         systemData.hp.hd = systemData.hp.hd || "1d8";
      }
      systemData.thac0 = systemData.thac0 || {};

      systemData.savingThrows = systemData.savingThrows || {};
      const savingThrows = ["death", "wand", "paralysis", "breath", "spell"];
      savingThrows.forEach(savingThrow => {
         systemData.savingThrows[savingThrow] = systemData.savingThrows[savingThrow] || { value: 15 };
      });
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareArmorClass();
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

   _prepareArmorClass() {
      const systemData = this.system;

      let baseAC = CONFIG.FADE.Armor.acNaked;
      systemData.ac.naked = baseAC;
      systemData.ac.value = baseAC;
      systemData.ac.total = baseAC;
      systemData.ac.mod = 0;
      systemData.ac.shield = 0;

      const equippedArmor = this.items.find(item =>
         item.type === 'armor' && item.system.equipped && !item.system.isShield
      );

      const equippedShield = this.items.find(item =>
         item.type === 'armor' && item.system.equipped && item.system.isShield
      );

      // If an equipped armor is found
      if (equippedArmor) {
         systemData.ac.value = equippedArmor.system.ac;
         systemData.ac.mod = equippedArmor.system.mod ?? 0;
         systemData.ac.total = equippedArmor.system.totalAc - (systemData.abilities?.dex.mod ?? 0);
      }
      if (equippedShield) {
         systemData.ac.shield = equippedShield.system.ac + (equippedShield.system.ac.mod ?? 0);
         systemData.ac.total -= systemData.ac.shield;
      }
   }
}