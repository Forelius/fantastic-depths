import { DialogFactory } from "../dialog/DialogFactory.js";
import { FDActorBase } from "./FDActorBase.js";

/**
 * Extends the base actor with physical stats: HP, movement, encumbrance, and AC.
 * @extends {FDActorBase}
 */
export class FDPhysicalActor extends FDActorBase {
   /**
    * World setting key for the HP death threshold based on actor type.
    * Characters use characterDeathHp; monsters and vehicles use monsterDeathHp.
    * @param {string} actorType
    * @returns {string}
    */
   static getDeathHpSettingKey(actorType: string): string {
      return actorType === "character" ? "characterDeathHp" : "monsterDeathHp";
   }

   /**
    * HP threshold at or below which an actor of the given type is considered dead.
    * @param {string} actorType
    * @returns {number}
    */
   static getDeathHpThreshold(actorType: string): number {
      const value = game.settings.get(game.system.id, FDPhysicalActor.getDeathHpSettingKey(actorType));
      return typeof value === "number" ? value : 0;
   }

   /**
    * Whether the given HP value is at or below the death threshold for the actor type.
    * @param {string} actorType
    * @param {number} hpValue
    * @returns {boolean}
    */
   static isHpDead(actorType: string, hpValue: number): boolean {
      return hpValue <= FDPhysicalActor.getDeathHpThreshold(actorType);
   }

   /** HP threshold at or below which this actor is considered dead. */
   getDeathHpThreshold(): number {
      return FDPhysicalActor.getDeathHpThreshold(this.type);
   }

   /**
    * Whether the given HP value is at or below this actor's death threshold.
    * @param {number} hpValue
    * @returns {boolean}
    */
   isHpDead(hpValue: number): boolean {
      return FDPhysicalActor.isHpDead(this.type, hpValue);
   }

   /** override */
   prepareDerivedData() {
      super.prepareDerivedData();
      if (this.id) {
         game.fade.registry.getSystem("encumbranceSystem").prepareDerivedData(this);
         game.fade.registry.getSystem("actorMovement").prepareMovementRates(this);
         game.fade.registry.getSystem("armorSystem").prepareDerivedData(this);
      }
   }

   /**
    * Handler for the updateActor hook.
    * @param {any} updateData
    * @param {any} options
    * @param {String} userId
    */
   async onUpdateActor(updateData, _options, _userId) {
      await super.onUpdateActor(updateData, _options, _userId);
      // Hit points updated.
      if (updateData.system?.hp?.value !== undefined && updateData.system?.combat?.isDead === undefined) {
         const hpValue = updateData.system.hp.value;
         if (this.isHpDead(hpValue)) {
            await this.update({ "system.combat.isDead": true });
            this.toggleStatusEffect("dead", { active: true });
         } else {
            await this.update({ "system.combat.isDead": false });
            this.toggleStatusEffect("dead", { active: false });
         }
      }
   }

   /**
    * Handle how changes to a Token attribute bar are applied to the Actor.
    * This allows for game systems to override this behavior and deploy special logic.
    * override
    * @param {string} attribute    The attribute path
    * @param {number} value        The target attribute value
    * @param {boolean} isDelta     Whether the number represents a relative change (true) or an absolute change (false)
    * @param {boolean} isBar       Whether the new value is part of an attribute bar, or just a direct value
    * @returns {Promise<typeof Actor>}  The updated Actor document
    */
   async modifyTokenAttribute(attribute: string, value: number, isDelta: boolean = false, isBar: boolean = true): Promise<Actor> {
      if (this.isOwner === false) return this;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let result: Actor = this;
      // If delta damage...
      if (isDelta === true && attribute === "hp") {
         // Try debouncing to prevent ENTER key from propogating
         setTimeout(() => this.#handleHPChange(value), 100);
      } else {
         result = await super.modifyTokenAttribute(attribute, value, isDelta, isBar);
      }
      return result;
   }

   async #handleHPChange(value) {
      let damageType = null;
      const attackType = null;
      const weapon = null;
      if (value < 0) {
         const dataset = { dialog: "damageType" };
         const dialogResp = await DialogFactory(dataset, this);
         damageType = dialogResp.damageType;
      } else {
         damageType = "heal";
      }
      const dmgSys = game.fade.registry.getSystem("damageSystem");
      dmgSys.ApplyDamage(this, value, damageType, attackType, weapon);
   }
}
