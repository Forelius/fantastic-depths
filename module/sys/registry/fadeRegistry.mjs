import { ToHitTHAC0, ToHitAAC, ToHitClassic, ToHitDarkDungeons, ToHitHeroic } from './ToHitSystem.mjs';
import { MoraleCheck, AbilityCheck, ActorArmor } from './DefaultSystem.mjs'
import { BasicEncumbrance, ClassicEncumbrance, ExpertEncumbrance } from './EncSystem.mjs';
import { IndivInit } from './IndivInit.mjs';
import { GroupInit } from './GroupInit.mjs';

export class fadeRegistry {
   constructor() {
      this.systemDictionary = {};
      this.eventDictionary = {};
   }

   async registerDefaultSystems() {
      this.registerSystem('moraleCheck', new MoraleCheck());
      this.registerSystem('abilityCheck', new AbilityCheck());
      this.registerSystem('actorArmor', new ActorArmor());

      const toHitSystem = game.settings.get(game.system.id, "toHitSystem");
      if (toHitSystem === 'thac0') {
         this.registerSystem('toHitSystem', new ToHitTHAC0());
      } else if (toHitSystem === 'aac') {
         this.registerSystem('toHitSystem', new ToHitAAC());
      } else if (toHitSystem === 'classic') {
         this.registerSystem('toHitSystem', new ToHitClassic());
      } else if (toHitSystem === 'darkdungeons') {
         this.registerSystem('toHitSystem', new ToHitDarkDungeons());
      } else if (toHitSystem === 'heroic') {
         this.registerSystem('toHitSystem', new ToHitHeroic());
      }

      const encSetting = game.settings.get(game.system.id, "encumbrance");
      if (encSetting === 'classic') {
         this.registerSystem('encumbranceSystem', new ClassicEncumbrance());
      } else if (encSetting === 'expert') {
         this.registerSystem('encumbranceSystem', new ExpertEncumbrance());
      } else {
         this.registerSystem('encumbranceSystem', new BasicEncumbrance({ encSetting }));
      }

      const initiativeMode = game.settings.get(game.system.id, "initiativeMode");
      if (initiativeMode === 'group') {
         this.registerSystem('initiativeSystem', new GroupInit());
      } else {
         this.registerSystem('initiativeSystem', new IndivInit());
      }
   }

   registerSystem(key, callback) {
      this.systemDictionary[key] = callback;
   }

   getSystem(key) {
      return this.systemDictionary[key];
   }
}