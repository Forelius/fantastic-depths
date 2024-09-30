export class fadeActor extends Actor {
   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context)
   }

   /** @override */
   async _preCreate(data, options, userId) {
      const allowed = await super._preCreate(data, options, userId);
      const fdPath = `systems/fantastic-depths/assets/img/actor`;
      const changeData = {};

      switch (this.type) {
         case "character":
            Object.assign(changeData, {
               "prototypeToken.sight": {
                  "enabled": true,
                  "visionMode": "basic",
               },
               "img": `${fdPath}/fighter1.webp`, // Set the actor image
               "prototypeToken.texture.src": `${fdPath}/fighter1a.webp`, // Set the token image
               "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.FRIENDLY,
               "prototypeToken.actorLink": true,
               "prototypeToken.scale": 0.9,
               "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.HOVER
            });
            break;
         case "npc":
            Object.assign(changeData, {
               "prototypeToken.sight": {
                  "enabled": true,
                  "visionMode": "basic",
               },
               "img": `${fdPath}/hero1.webp`, // Set the actor image
               "prototypeToken.texture.src": `${fdPath}/hero1a.webp`, // Set the token image
               "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.NEUTRAL,
               "prototypeToken.actorLink": true,
               "prototypeToken.scale": 0.9,
               "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.HOVER
            });
            break;
         case "monster":
            Object.assign(changeData, {
               "img": `${fdPath}/monster1.webp`, // Set the actor image
               "prototypeToken.texture.src": `${fdPath}/monster1a.webp`, // Set the token image
               "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
               "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.HOSTILE,
               "prototypeToken.actorLink": false,
               "prototypeToken.scale": 0.9
            });
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

      this._prepareSpells();
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareMods();
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

   prepareSavingThrows(className, classLevel) {
      const systemData = this.system;
      // Replace hyphen with underscore for "Magic-User"
      const classNameInput = className.toLowerCase().replace('_', '-');
      const classes = CONFIG.FADE.Classes;
      // Find a match in the FADE.Classes data
      const classData = Object.values(classes).find(cdata => cdata.name.toLowerCase() === classNameInput);

      if (classData !== undefined) {
         const savesData = classData.saves.find(save => classLevel <= save.level);
         for (let saveType in savesData) {
            if (systemData.savingThrows.hasOwnProperty(saveType)) {
               systemData.savingThrows[saveType].value = savesData[saveType];
            }
         }
      }
   }

   _prepareMods() {
      const systemData = this.system;
      systemData.mod = systemData.mod ?? {};
      systemData.mod.ac = systemData.mod.ac ?? null;
      systemData.mod.toHit = null;
      systemData.mod.toHitRanged = null;
      systemData.mod.dmg = null;
      systemData.mod.dmgRanged = null;
   }

   _prepareMovement() {
      const systemData = this.system;
      systemData.movement = systemData.movement || {};
      systemData.movement.turn = systemData.movement.turn || 0;
      systemData.movement.round = systemData.movement.turn > 0 ? Math.floor(systemData.movement.turn / 3) : 0;
      systemData.movement.day = systemData.movement.turn > 0 ? Math.floor(systemData.movement.turn / 5) : 0;
      systemData.movement.run = systemData.movement.turn;
      systemData.flight = systemData.flight || {};
      systemData.flight.turn = systemData.flight.turn || 0;
      systemData.flight.round = systemData.flight.turn > 0 ? Math.floor(systemData.flight.turn / 3) : 0;
      systemData.flight.day = systemData.flight.turn > 0 ? Math.floor(systemData.flight.turn / 5) : 0;
      systemData.flight.run = systemData.flight.turn;
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
         systemData.ac.total = equippedArmor.system.totalAc;
      }

      if (equippedShield) {
         systemData.ac.shield = equippedShield.system.ac + (equippedShield.system.ac.mod ?? 0);
         systemData.ac.total -= systemData.ac.shield;
      }

      // Now dex modifier and other mods.
      systemData.ac.total = systemData.ac.total - (systemData.mod.ac ?? 0) - (systemData.abilities?.dex.mod ?? 0);
   }

   _prepareSpells() {
      const systemData = this.system;
      systemData.spellSlots = systemData.spellSlots || {};
      for (let i = 0; i < 9; i++) {
         systemData.spellSlots[i] = systemData.spellSlots[i] || {};
         systemData.spellSlots[i].spellLevel = i + 1;
         systemData.spellSlots[i].used = systemData.spellSlots[i].used || 0;
         systemData.spellSlots[i].max = systemData.spellSlots[i].max || 0;
      }
   }
}