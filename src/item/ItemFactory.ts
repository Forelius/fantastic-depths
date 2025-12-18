import { FDItem } from "../item/FDItem";
import { GearItem } from "../item/GearItem";
import { ArmorItem } from "../item/ArmorItem";
import { WeaponItem } from "../item/WeaponItem";
import { SpecialAbilityItem } from "../item/SpecialAbilityItem";
import { SkillItem } from "../item/SkillItem";
import { LightItem } from "../item/LightItem";
import { SpellItem } from "../item/SpellItem";
import { ActorMasteryItem } from "../item/ActorMasteryItem";
import { ClassDefinitionItem } from "../item/ClassDefinitionItem";
import { MasteryDefinitionItem } from "../item/MasteryDefinitionItem";
import { ConditionItem } from "../item/ConditionItem";
import { AncestryDefinitionItem } from "../item/AncestryDefinitionItem";
import { ActorClassItem } from "../item/ActorClassItem";
import { AmmoItem } from "../item/AmmoItem";

const handler = {
   construct(_item, { type, data, context }:any = {}) {
      let result = null;
      if (type === "armor") result = new ArmorItem(data, context);
      else if (type === "weapon") result = new WeaponItem(data, context);
      else if (type === "item") result = new GearItem(data, context);
      else if (type === "treasure") result = new GearItem(data, context);
      else if (type === "specialAbility") result = new SpecialAbilityItem(data, context);
      else if (type === "mastery") result = new ActorMasteryItem(data, context);
      else if (type === "skill") result = new SkillItem(data, context);
      else if (type === "light") result = new LightItem(data, context);
      else if (type === "spell") result = new SpellItem(data, context);
      else if (type === "class") result = new ClassDefinitionItem(data, context);
      else if (type === "weaponMastery") result = new MasteryDefinitionItem(data, context);
      else if (type === "condition") result = new ConditionItem(data, context);
      else if (type === "species") result = new AncestryDefinitionItem(data, context);
      else if (type === "actorClass") result = new ActorClassItem(data, context);
      else if (type === "ammo") result = new AmmoItem(data, context);
      else throw new Error(`Item constructor error: Type=${type} not defined by ItemFactory.`);
      return result;
   }
};

export const ItemFactory = new Proxy(FDItem, handler);
