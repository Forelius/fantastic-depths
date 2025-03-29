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
            species: new fields.StringField({ initial: "Human" }),
            title: new fields.StringField({ initial: "" }),
            age: new fields.NumberField({ initial: 20 }),
            sex: new fields.StringField({ initial: "Male" }),
            height: new fields.StringField({ initial: "6" }),
            weight: new fields.StringField({ initial: "170 lbs." }),
            eyes: new fields.StringField({ initial: "Blue" }),
            hair: new fields.StringField({ initial: "Brown" }),
            size: new foundry.data.fields.StringField({ initial: "M" }),
         }),
         abilities: new fields.SchemaField({
            str: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
            }),
            int: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
            }),
            wis: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
            }),
            dex: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
            }),
            con: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
            }),
            cha: new fields.SchemaField({
               value: new fields.NumberField({ initial: 10 }),
               total: new fields.NumberField({ initial: 10 }),
               mod: new fields.NumberField({ initial: 0 }),
               loyaltyMod: new fields.NumberField({ initial: 0 }),
            }),
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
      for (let [key, ability] of Object.entries(this.abilities)) {         
         ability.total = ability.value;
      }
      this.encumbrance.max = this.encumbrance.max || game.fade.registry.getSystem("encumbranceSystem").CONFIG.maxLoad;
   }

   /** @override */
   prepareDerivedData() {
      this._prepareDerivedAbilities();
      super.prepareDerivedData();
      this._prepareWrestling();
   }

   _prepareDerivedAbilities() {
      // Initialize ability score modifiers
      const abilityScoreModSystem = game.settings.get(game.system.id, "abilityScoreModSystem");
      const adjustments = CONFIG.FADE.abilityScoreModSystem[abilityScoreModSystem]?.mods;
      for (let [key, ability] of Object.entries(this.abilities)) {
         let adjustment = adjustments.find(item => ability.total <= item.max);
         ability.mod = adjustment ? adjustment.value : adjustments[0].value;
      }

      // Retainer
      let charisma = this.abilities.cha.value;
      let adjustment = adjustments.find(item => charisma <= item.max);
      this.retainer.max = this.retainer.max > 0 ? this.retainer.max : adjustment.maxRetainers;
      this.retainer.morale = this.retainer.morale > 0 ? this.retainer.morale : (adjustment.retainerMorale ?? 10);
   }

   _prepareWrestling() {
      // Wrestling skill
      this.wrestling = Math.ceil(this.details.level / 2) + this.ac.value;
      this.wrestling += this.abilities.str.mod + this.abilities.dex.mod;
   } 
}
