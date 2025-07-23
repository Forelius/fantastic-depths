import { FDCombatActorDM } from "/systems/fantastic-depths/module/actor/dataModel/FDCombatActorDM.mjs";

export class CharacterDataModel extends FDCombatActorDM {
   static defineSchema() {
      const { fields } = foundry.data;
      const baseSchema = super.defineSchema();
      let characterSchema = {
         isRetainer: new fields.BooleanField({ initial: false }),
         details: new fields.SchemaField({
            morale: new fields.NumberField({ initial: 9 }),
            alignment: new fields.StringField({ initial: "Neutral" }),
            // Aka ancestry
            species: new fields.StringField({ initial: "" }),
            age: new fields.NumberField({ initial: 20 }),
            sex: new fields.StringField({ initial: "" }),
            height: new fields.StringField({ initial: "" }),            
            eyes: new fields.StringField({ initial: "" }),
            hair: new fields.StringField({ initial: "" }),
            //---------------------------------------------------
            level: new fields.StringField({ initial: "1" }),
            xp: new fields.SchemaField({
               value: new fields.StringField({ initial: "0" }),
               bonus: new fields.StringField({ initial: "0" }),
               next: new fields.StringField({ initial: "0" }),
            }),
            class: new fields.StringField({ initial: "" }),
            title: new fields.StringField({ initial: "" }),
            // Only the class key, not the level like monster does for castAs
            classKey: new fields.StringField({ required: false, nullable: true, initial: null }),
            castAsKey: new fields.StringField({ nullable: true, required: false, initial: null }),
            //---------------------------------------------------
         }),
         retainer: new fields.SchemaField({
            max: new fields.NumberField({ initial: 0 }),
            morale: new fields.NumberField({ initial: 0 }),
            loyalty: new fields.NumberField({ initial: 0 }),
            wage: new fields.StringField({ initial: "" }),
         }),
      };
      foundry.utils.mergeObject(characterSchema, baseSchema);
      return characterSchema;
   }

   /** @override */
   prepareBaseData() {
      super.prepareBaseData();
      this.encumbrance.max = this.encumbrance.max || game.fade.registry.getSystem("encumbranceSystem").CONFIG.maxLoad;
   }

   /** @override */
   prepareDerivedData() {
      super.prepareDerivedData();
   }

   getParsedHD() {
      const classSystem = game.fade.registry.getSystem("classSystem");
      return classSystem.getParsedHD(classSystem.getHighestHD(this.parent));
   }

   _prepareDerivedAbilities() {
      super._prepareDerivedAbilities();
      const abilityScoreModSystem = game.settings.get(game.system.id, "abilityScoreModSystem");
      const adjustments = CONFIG.FADE.abilityScoreModSystem[abilityScoreModSystem]?.mods;
      // Retainer
      const charisma = this.abilities.cha.total;
      const adjustment = adjustments.find(item => charisma <= item.max);
      this.retainer.max = this.retainer.max > 0 ? this.retainer.max : adjustment.maxRetainers;
      this.retainer.morale = this.retainer.morale > 0 ? this.retainer.morale : (adjustment.retainerMorale ?? 10);
   }
}
