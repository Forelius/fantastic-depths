import { fadeItemSheet } from './fadeItemSheet.mjs';
/**
 * Sheet class for WeaponItem.
 */
export class WeaponItemSheet extends fadeItemSheet {
   /**
    * Get the default options for the WeaponItem sheet.
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['fantastic-depths', 'sheet', 'item'],
         template: "systems/fantastic-depths/templates/item/WeaponItemSheet.hbs",
         width: 540,
         height: 360,
         resizable: true,
         tabs: [
            {
               navSelector: '.sheet-tabs',
               contentSelector: '.sheet-body',
               initial: 'description',
            },
         ],
      });
   }

   /**
    * Prepare data to be used in the Handlebars template.
    */
   async getData(options) {
      const context = await super.getData(options);
      const itemData = context.data;
      context.usesAmmo = itemData.system.ammoType?.length > 0;

      // Weapon types
      const weaponTypes = [];
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.monster.long'), value: 'monster' });
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.handheld.long'), value: 'handheld' });
      weaponTypes.push({ text: game.i18n.localize('FADE.Mastery.weaponTypes.all.long'), value: 'all' });
      context.weaponTypes = weaponTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      const damageTypes = [];
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.physical'), value: 'physical' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.breath'), value: 'breath' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.fire'), value: 'fire' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.frost'), value: 'frost' });
      damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.poison'), value: 'poison' });
      context.damageTypes = damageTypes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});
      // TODO: Magic damage type  indicates that a different set of parameters is passed to getDamageRoll.
      // This is not a good design, but not addressing it at the moment, so remove this option.
      //context.damageTypes.push({ text: game.i18n.localize('FADE.DamageTypes.types.magic'), value: 'magic' });

      const weaponSizes = [];
      weaponSizes.push({ text: game.i18n.localize('FADE.none'), value: null });
      weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.S'), value: 'S' });
      weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.M'), value: 'M' });
      weaponSizes.push({ text: game.i18n.localize('FADE.Actor.sizes.L'), value: 'L' });
      context.weaponSizes = weaponSizes.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      const weaponGrips = [];
      weaponGrips.push({ text: game.i18n.localize('FADE.none'), value: null });
      weaponGrips.push({ text: game.i18n.localize('FADE.Weapon.grip.oneAbbr'), value: '1H' });
      weaponGrips.push({ text: game.i18n.localize('FADE.Weapon.grip.twoAbbr'), value: '2H' });
      context.weaponGrips = weaponGrips.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      // Saving throws
      const saves = [];
      saves.push({ value: "", text: game.i18n.localize('None') });
      const saveItems = game.items.filter(item => item.type === 'specialAbility' && item.system.category === 'save')
         .sort((a, b) => a.system.shortName.localeCompare(b.system.shortName));
      saves.push(...saveItems.map((save) => {
         return { value: save.system.customSaveCode, text: save.system.shortName }
      }));
      context.savingThrows = saves.reduce((acc, item) => { acc[item.value] = item.text; return acc; }, {});

      return context;
   }
}
