import { fadeActorDataModel } from "/systems/fantastic-depths/module/actor/dataModel/fadeActorDataModel.mjs";

export class CharacterDataModel extends fadeActorDataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      const baseSchema = super.defineSchema();
      return {
         ...baseSchema,
         isRetainer: new fields.BooleanField({ initial: false }),
         details: new fields.SchemaField({
            morale: new fields.NumberField({ initial: 9 }),
            alignment: new fields.StringField({ initial: "Neutral" }),
            level: new fields.NumberField({ initial: 0 }),
            xp: new fields.SchemaField({
               value: new fields.NumberField({ initial: 0 }),
               bonus: new fields.NumberField({ initial: 0 }),
               next: new fields.NumberField({ initial: 0 }),
            }),
            class: new fields.StringField({ initial: "" }),
            species: new fields.StringField({ initial: "" }),
            title: new fields.StringField({ initial: "" }),
            age: new fields.NumberField({ initial: 20 }),
            sex: new fields.StringField({ initial: "" }),
            height: new fields.StringField({ initial: "" }),
            weight: new fields.StringField({ initial: "" }),
            eyes: new fields.StringField({ initial: "" }),
            hair: new fields.StringField({ initial: "" }),
            size: new foundry.data.fields.StringField({ initial: "M" }),
         }),         
         retainer: new fields.SchemaField({
            max: new fields.NumberField({ initial: 0 }),
            morale: new fields.NumberField({ initial: 0 }),
            loyalty: new fields.NumberField({ initial: 0 }),
            wage: new fields.StringField({ initial: "" }),
         }),
      };
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
