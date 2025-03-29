import { ToHitTHAC0, ToHitAAC, ToHitClassic, ToHitDarkDungeons, ToHitHeroic } from './toHitSystems.mjs';
import { MoraleCheck, AbilityCheck, ActorArmor } from './defaultSystems.mjs'
import { BasicEncumbrance, ClassicEncumbrance, ExpertEncumbrance } from './encumbranceSystem.mjs';

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
   }

   registerSystem(key, callback) {
      this.systemDictionary[key] = callback;
   }

   getSystem(key) {
      return this.systemDictionary[key];
   }
}