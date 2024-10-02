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
      const systemData = this.system;

      systemData.config = systemData.config || {
         isSpellcaster: false,
      };
      systemData.encumbrance = systemData.encumbrance || {
         max: CONFIG.FADE.Encumbrance.max
      }
      this._prepareMovement();
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

      if (systemData.config.isSpellcaster === true) {
         this._prepareSpells();
      }
   }

   /** @override */
   async prepareDerivedData() {
      super.prepareDerivedData();
      this._prepareMods();
      this._prepareArmorClass();
      await this._prepareEncumbrance();
      await this._prepareDerivedMovement();
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
      systemData.movement = systemData.movement || {
         max: CONFIG.FADE.Encumbrance.table[0].mv
      };
      delete systemData.movement.maxFlight;
      systemData.flight = systemData.flight || {
         max: 0
      };
      if (this.type === "monster") {
         systemData.movement.max = systemData.movement.max || systemData.movement.turn || 0;
         systemData.flight.max = systemData.flight.max || systemData.flight.turn || 0;
      } else {
         systemData.movement.max = systemData.movement.max || CONFIG.FADE.Encumbrance.table[0].mv;
         systemData.flight.max = systemData.flight.max || 0;
      }
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

   async _prepareEncumbrance() {
      const systemData = this.system;
      const encSetting = await game.settings.get(game.system.id, "encumbrance");

      systemData.encumbrance = systemData.encumbrance || {};

      let enc = 0;
      // If using detailed encumbrance, similar to expert rules...
      if (encSetting === 'expert') {
         enc = this.items.reduce((sum, item) => {
            const itemWeight = item.system.weight || 0;
            const itemQuantity = item.system.quantity || 1;
            return sum + (itemWeight * itemQuantity);
         }, 0);
         systemData.encumbrance.value = enc || 0;
      }
      // Else if using simple encumbrance, similar to basic rules...
      else if (encSetting === 'basic') {
         enc = this.items.filter((item) => {
            return item.type === "armor";
         }).reduce((sum, item) => {
            const itemWeight = item.system.weight || 0;
            const itemQuantity = item.system.quantity || 1;
            return sum + (itemWeight * itemQuantity);
         }, 0);
         systemData.encumbrance.value = enc || 0;
      } else {
         systemData.encumbrance.value = 0;
      }

      // If not a monster...
      if (this.type !== "monster") {
         let encTier = CONFIG.FADE.Encumbrance.table.find(tier => enc <= tier.max && tier.max > 0)
            || CONFIG.FADE.Encumbrance.table[CONFIG.FADE.Encumbrance.table.length - 1];
         systemData.encumbrance.label = encTier.label;
         // This is a maximum movement for the current encumbered tier
         systemData.encumbrance.mv = encTier.mv > 0 ? encTier.mv : 0;
      }
      // Else this is a monster
      else {
         // Monsters don't have a gradiated scale, instead none, half or full.
         if (enc >= systemData.encumbrance.max) {
            let encTier = CONFIG.FADE.Encumbrance.table.find(tier => tier.mvFactor < 0);
            systemData.encumbrance.label = encTier.label;
            systemData.encumbrance.mv = 0;
         } else if (enc >= systemData.encumbrance.max / 2) {
            let encTier = CONFIG.FADE.Encumbrance.table.find(tier => tier.mvFactor == 0.5);
            systemData.encumbrance.label = encTier.label;
            systemData.encumbrance.mv = Math.round(systemData.movement.max/2);
         } else {
            let encTier = CONFIG.FADE.Encumbrance.table.find(tier => tier.mvFactor == 1.0);
            systemData.encumbrance.label = encTier.label;
            systemData.encumbrance.mv = systemData.movement.max;
         }
      }
   }

   async _prepareDerivedMovement() {
      // if this is an npc...otherwise handled by subclass
      if (this.type === "npc") {
         const systemData = this.system;
         const encSetting = await game.settings.get(game.system.id, "encumbrance");

         systemData.movement.turn = systemData.movement.turn || 0;
         systemData.flight.turn = systemData.flight.turn || 0;

         systemData.movement.round = systemData.movement.turn > 0 ? Math.floor(systemData.movement.turn / 3) : 0;
         systemData.movement.day = systemData.movement.turn > 0 ? Math.floor(systemData.movement.turn / 5) : 0;
         systemData.movement.run = systemData.movement.turn;

         systemData.flight.round = systemData.flight.turn > 0 ? Math.floor(systemData.flight.turn / 3) : 0;
         systemData.flight.day = systemData.flight.turn > 0 ? Math.floor(systemData.flight.turn / 5) : 0;
         systemData.flight.run = systemData.flight.turn;
      }
   }
}