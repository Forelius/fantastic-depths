export class fadeActor extends Actor {
   constructor(data, context) {
      /** @see CONFIG.Actor.documentClasses in module/scripts/configure-documents */
      if (data.type in CONFIG.Actor.documentClasses && !context?.extended) {
         /**
          * When the constructor for the new class will call it's super(),
          * the extended flag will be true, thus bypassing this whole process
          * and resume default behavior
          */
         return new CONFIG.Actor.documentClasses[data.type](data, {
            ...{ extended: true },
            ...context
         })
      }
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context)
   }

   /** @override */
   async _preCreate(data, options, userId) {
      const allowed = await super._preCreate(data, options, userId);

      const changeData = {};

      switch (this.type) {
         case "character":
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
         case "npc":
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
      console.log("actor.prepareBaseData()");
      const systemData = this.system;
      systemData.ac = systemData.ac || {};

      systemData.hp = systemData.hp || {};
      systemData.hp.value = systemData.hp.value || 5;
      systemData.hp.max = systemData.hp.max || 5;
      systemData.hp.hd = systemData.hp.hd || "1d8";

      systemData.savingThrows = systemData.savingThrows || {};
      const savingThrows = ["death", "wand", "paralysis", "breath", "spell"];
      savingThrows.forEach(savingThrow => {
         systemData.savingThrows[savingThrow] = systemData.savingThrows[savingThrow] || { value: 15 };
      });
   }
   /** @override */
   prepareDerivedData() {
      const actorData = this;

      if (actorData.type === 'npc') {
         this._prepDerivedDataNpc();
      }
   }

   getRollData() {
      const data = { ...this.system };

      if (this.type === 'npc') {
         this._getNpcRollData(data);
      }

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

   _prepDerivedDataNpc() {
      const systemData = this.system;
      systemData.xp = systemData.cr * systemData.cr * 100;
   }

   _getNpcRollData(data) {
      if (this.type !== 'npc') return;
      // Process additional NPC data here.
   }
}