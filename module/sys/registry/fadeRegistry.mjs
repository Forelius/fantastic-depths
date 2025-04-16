import { ToHitTHAC0, ToHitAAC, ToHitClassic, ToHitDarkDungeons, ToHitHeroic } from './ToHitSystem.mjs';
import { MoraleCheck, AbilityCheck, ActorArmor } from './DefaultSystem.mjs'
import { BasicEncumbrance, ClassicEncumbrance, ExpertEncumbrance } from './EncSystem.mjs';
import { IndivInit } from './IndivInit.mjs';
import { GroupInit } from './GroupInit.mjs';
import { WeaponMasterySystem } from './WeaponMastery.mjs';
import { Wrestling } from "./Wrestling.mjs";
import { Shove } from "./Shove.mjs";
import { UserTables } from "./UserTables.mjs";

export class fadeRegistry {
   constructor() {
      this.systemDictionary = {};
      this.eventDictionary = {};
   }

   // TODO: These if/else blocks shouldn't be necessary. Registry should know how to handle or move out of registry.
   async registerDefaultSystems() {
      this.registerSystem('moraleCheck', new MoraleCheck(), MoraleCheck);
      this.registerSystem('abilityCheck', new AbilityCheck(), AbilityCheck);
      this.registerSystem('actorArmor', new ActorArmor(), ActorArmor);

      const masteryEnabled = game.settings.get(game.system.id, "weaponMastery");
      if (masteryEnabled) {
         this.registerSystem('weaponMasterySystem', new WeaponMasterySystem(), WeaponMasterySystem);
      }

      const toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      if (toHitSystem === 'thac0') {
         this.registerSystem('toHitSystem', new ToHitTHAC0(), ToHitTHAC0);
      } else if (toHitSystem === 'aac') {
         this.registerSystem('toHitSystem', new ToHitAAC(), ToHitAAC);
      } else if (toHitSystem === 'classic') {
         this.registerSystem('toHitSystem', new ToHitClassic(), ToHitClassic);
      } else if (toHitSystem === 'darkdungeons') {
         this.registerSystem('toHitSystem', new ToHitDarkDungeons(), ToHitDarkDungeons);
      } else if (toHitSystem === 'heroic') {
         this.registerSystem('toHitSystem', new ToHitHeroic(), ToHitHeroic);
      }

      const encSetting = game.settings.get(game.system.id, "encumbrance");
      if (encSetting === 'classic') {
         this.registerSystem('encumbranceSystem', new ClassicEncumbrance(), ClassicEncumbrance);
      } else if (encSetting === 'expert') {
         this.registerSystem('encumbranceSystem', new ExpertEncumbrance(), ExpertEncumbrance);
      } else {
         this.registerSystem('encumbranceSystem', new BasicEncumbrance({ encSetting }), BasicEncumbrance);
      }

      const initiativeMode = game.settings.get(game.system.id, "initiativeMode");
      if (initiativeMode === 'group') {
         this.registerSystem('initiativeSystem', new GroupInit(), GroupInit);
      } else {
         this.registerSystem('initiativeSystem', new IndivInit(), IndivInit);
      }

      this.registerSystem('wrestling', Wrestling, Wrestling);
      this.registerSystem('shove', Shove, Shove);
      this.registerSystem('userTables', new UserTables(), UserTables);
   }

   registerSystem(id, instance, type) {
      this.systemDictionary[id] = { id, type, instance };
   }

   getSystem(id, getAsObject = false) {
      if (getAsObject) {
         return this.systemDictionary[id];
      } else {
         return this.systemDictionary[id]?.instance;
      }
   }

   getSystemType(id) {
      return this.systemDictionary[id]?.type;
   }
}