import { FDItem } from "../item/FDItem.js";
import { GearItem } from "../item/GearItem.js";
import { ArmorItem } from "../item/ArmorItem.js";
import { WeaponItem } from "../item/WeaponItem.js";
import { SpecialAbilityItem } from "../item/SpecialAbilityItem.js";
import { SkillItem } from "../item/SkillItem.js";
import { LightItem } from "../item/LightItem.js";
import { SpellItem } from "../item/SpellItem.js";
import { ActorMasteryItem } from "../item/ActorMasteryItem.js";
import { ClassDefinitionItem } from "../item/ClassDefinitionItem.js";
import { MasteryDefinitionItem } from "../item/MasteryDefinitionItem.js";
import { ConditionItem } from "../item/ConditionItem.js";
import { AncestryDefinitionItem } from "../item/AncestryDefinitionItem.js";
import { ActorClassItem } from "../item/ActorClassItem.js";
import { AmmoItem } from "../item/AmmoItem.js";

const handler = {
   construct(_item, ...args) {
      const context = args[0][1];
      const data = args[0][0];
      const itemType: string = data.type;

      let result = null;
      if (itemType === "armor") result = new ArmorItem(data, context);
      else if (itemType === "weapon") result = new WeaponItem(data, context);
      else if (itemType === "item") result = new GearItem(data, context);
      else if (itemType === "treasure") result = new GearItem(data, context);
      else if (itemType === "specialAbility") result = new SpecialAbilityItem(data, context);
      else if (itemType === "mastery") result = new ActorMasteryItem(data, context);
      else if (itemType === "skill") result = new SkillItem(data, context);
      else if (itemType === "light") result = new LightItem(data, context);
      else if (itemType === "spell") result = new SpellItem(data, context);
      else if (itemType === "class") result = new ClassDefinitionItem(data, context);
      else if (itemType === "weaponMastery") result = new MasteryDefinitionItem(data, context);
      else if (itemType === "condition") result = new ConditionItem(data, context);
      else if (itemType === "species") result = new AncestryDefinitionItem(data, context);
      else if (itemType === "actorClass") result = new ActorClassItem(data, context);
      else if (itemType === "ammo") result = new AmmoItem(data, context);
      else throw new Error(`Item constructor error: Type=${itemType} not defined by ItemFactory.`);
      return result;
   }
};

export const ItemFactory = new Proxy(FDItem, handler);