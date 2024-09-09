// actor-character.mjs
import { fadeActor } from './fadeActor.mjs';

export class MonsterActor extends fadeActor {

   constructor(data, context) {
      /** Default behavior, just call super() and do all the default Item inits */
      super(data, context)
   }

   /** @override */
   prepareData() {
      super.prepareData();
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      const systemData = this.system;

      systemData.details = systemData.details || {};
      systemData.details.xpAward = !isNaN(systemData.details.xpAward) ? systemData.details.xpAward : 5;
      systemData.details.abilityCount = !isNaN(systemData.details.abilityCount) ? systemData.details.abilityCount : 0;
      systemData.details.intelligence = systemData.details.intelligence || 6;
      systemData.details.size = systemData.details.size || "M";
      systemData.details.monsterType = systemData.details.monsterType || "Monster (Common)";
      systemData.na = systemData.na || {};
      systemData.na.wandering = systemData.na.wandering || "1d4";
      systemData.na.lair = systemData.na.lair || "1d6";

      systemData.treasure = systemData.treasure || "";
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
      // Wrestling skill
      const systemData = this.system;
      //systemData.wrestling = Math.ceil(systemData.hp.hd * 2) + systemData.ac.value;
      //if (systemData.abilities) {
      //   systemData.wrestling = systemData.wrestling + systemData.abilities.str.mod + systemData.abilities.dex.mod;
      //}
   }

   /**
    * @override
    * Prepare all embedded Document instances which exist within this primary Document.
    * @memberof ClientDocumentMixin#
    * active effects are applied
    */
   prepareEmbeddedDocuments() {
      super.prepareEmbeddedDocuments();
      //console.log("CharacterActor.prepareEmbeddedDocuments", this);
   }

   /** @override */
   getRollData() {
      const data = super.getRollData();
      return data;
   }
}